import 'server-only';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {isPosterIntelligenceEnabled} from '@/lib/marketing/poster-gemini-intelligence';
import {transcribeSlbiVendorAudio,SlbiVoiceProviderError,
  type SlbiVoiceLanguage} from '@/lib/marketing/voice/slbi-gemini-transcription';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
const MAX_AUDIO_BYTES=1_500_000;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const MIME_TYPES=new Set(['audio/webm','audio/ogg','audio/wav','audio/mp4','audio/mpeg','audio/mp3']);
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'},
});

/**
 * Backend-only, owner-authenticated microphone transcription.
 * The frontend will attach MediaRecorder audio after UX approval. The returned
 * original-language transcript is SHOWN to the vendor for correction; it never
 * silently triggers a paid image call. No audio or transcript is persisted.
 *
 * Strict daily quota uses service-role-only atomic database reservation. Do not
 * expose a public anonymous Gemini transcription proxy.
 */
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin microphone access is blocked.'});
  if(!isPosterIntelligenceEnabled())
    return reply(503,{error:'Multilingual voice transcription is not configured yet.'});
  const rawType=request.headers.get('content-type')||'';
  const mime=rawType.split(';')[0].trim().toLowerCase();
  if(!MIME_TYPES.has(mime))return reply(415,{error:'Unsupported microphone audio format.'});
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX_AUDIO_BYTES)return reply(413,{error:'Voice recording is too large. Try a shorter message.'});
  const businessId=request.headers.get('x-slbi-business-id')||'';
  if(!UUID.test(businessId))return reply(400,{error:'Choose a business before speaking.'});

  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return reply(401,{error:'Sign in to use the AI microphone.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return denied;
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,name,category,city').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
  if(businessError)return reply(503,{error:'Business ownership check unavailable.'});
  if(!business)return reply(404,{error:'The selected business is not owned by your account.'});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)return reply(503,{error:'Voice quota service is not configured.'});
  let bytes:Uint8Array;
  try{
    bytes=new Uint8Array(await request.arrayBuffer());
    if(bytes.length<800||bytes.length>MAX_AUDIO_BYTES)
      return reply(413,{error:'Recording is too large (1.5 MB maximum). Please shorten it or type the remaining details.'});
  }catch{return reply(400,{error:'Invalid microphone recording.'});}
  // Validate provider configuration before reserving a vendor's voice allowance.
  const key=process.env.GEMINI_API_KEY?.trim();
  if(!key)return reply(503,{code:'VOICE_NOT_CONFIGURED',
    error:'Voice service needs administrator configuration. Your text remains unchanged.'});
  // The server alone may reserve usage; errors always deny further Gemini calls.
  const admin=createAdminClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:approved,error:quotaError}=await admin.rpc('marketing_poster_voice_try_reserve',{p_user_id:user.id});
  if(quotaError)return reply(503,{error:'Voice usage limit cannot be verified.'});
  if(approved!==true)return reply(429,{code:'VOICE_DAILY_LIMIT',
    error:'Daily voice allowance reached. Retry after 00:00 UTC; your existing text is safe.'});
  const languageHint=request.headers.get('x-slbi-language');
  const language:SlbiVoiceLanguage=
    languageHint==='ta'||languageHint==='si'||languageHint==='en'?
      languageHint:'auto';
  try{
    // The Gemini provider has ONE shared Sri Lankan multilingual prompt,
    // ONE quota reservation above and one bounded retry for transient failures.
    const transcript=await transcribeSlbiVendorAudio({
      key,bytes,language,
      // Safari MediaRecorder emits audio-only MP4/AAC; Gemini documents
      // audio/m4a, not audio/mp4, as its supported MIME for that container.
      mime:mime==='audio/mp4'?'audio/m4a':mime,
      business:{name:business.name,category:business.category,city:business.city},
    });
    return reply(200,{transcript,languageHint:language,reviewBeforeGenerating:true});
  }catch(e){
    if(e instanceof SlbiVoiceProviderError)
      return reply(e.status,{code:e.code,error:e.message});
    console.warn('SLBI voice unexpected backend error',
      e instanceof Error?e.name:'unknown');
    return reply(503,{code:'VOICE_NETWORK',
      error:'Voice service connection interrupted. Retry your retained recording.'});
  }
}
