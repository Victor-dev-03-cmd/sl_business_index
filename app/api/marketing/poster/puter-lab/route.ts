import 'server-only';
import {createGeminiPosterDesignBlueprint} from '@/lib/marketing/poster-gemini-design-blueprint';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {isPosterInternalQAAccount} from '@/lib/marketing/poster-review-access-server';
import {
  preparePosterBusinessFacts,createGeminiPosterBrief,
  isPosterIntelligenceEnabled,PosterIntelligenceError,
} from '@/lib/marketing/poster-gemini-intelligence';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=40;
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const reply=(status:number,body:unknown)=>Response.json(body,{
  status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'},
});

/**
 * Internal QA-only Puter experiments. This API supplies the SAME owner-verified
 * public business facts used by the production poster service. It never proxies
 * image requests, stores posters or exposes a privileged credential.
 */
async function owner(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return {client,userId:''};
  return {client,userId:await isPosterInternalQAAccount(user.id,client)?user.id:''};
}

export async function GET(){
  const {client,userId}=await owner();
  if(!userId)return reply(403,{error:'This image lab is available only to the internal QA owner.'});
  const {data:owned,error}=await client.from('businesses')
    .select('id,name,category,description,phone,email,address,detailed_address,city,website_url')
    .eq('owner_id',userId).order('name').limit(75);
  if(error)return reply(503,{error:'Owner business details are temporarily unavailable.'});
  if(!owned?.length)return reply(200,{businesses:[]});
  const {data:brands,error:brandError}=await client.from('social_brand_profiles')
    .select('business_id,brand_name,slogan,primary_color,accent_color,tone')
    .eq('owner_id',userId).in('business_id',owned.map(b=>b.id)).limit(75);
  if(brandError)return reply(503,{error:'Verified brand details are unavailable.'});
  const byId=new Map((brands||[]).map(b=>[b.business_id,b]));
  const businesses=owned.map(b=>({
    id:b.id,name:b.name,facts:preparePosterBusinessFacts(b,byId.get(b.id)||null),
  }));
  return reply(200,{businesses});
}

/**
 * Explicit user-initiated Gemini creative brief. Uses the EXISTING atomic daily
 * voice quota as a strict budget. Voice transcriptions and briefs share it.
 * No anonymous generative proxy; no background calls on GET or page load.
 */
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin Gemini briefing is blocked.'});
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))
    return reply(415,{error:'JSON is required.'});
  if(Number(request.headers.get('content-length')||0)>5_000)
    return reply(413,{error:'Creative brief is too large.'});
  let body:Record<string,unknown>;
  try{
    const raw=await request.text();
    if(raw.length>5_000)return reply(413,{error:'Creative brief is too large.'});
    const parsed=JSON.parse(raw) as unknown;
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid input');
    body=parsed as Record<string,unknown>;
  }catch{return reply(400,{error:'Invalid brief request.'});}
  const id=body.businessId;
  const prompt=body.prompt;
  const language=body.language;
  const wantsBlueprint=body.mode==='blueprint';
  const format=body.format;
  if(typeof id!=='string'||!uuid.test(id)||typeof prompt!=='string'||
      prompt.trim().length<5||prompt.length>1200||!['ta','si','en'].includes(String(language)))
    return reply(400,{error:'Select your business, language and a 5–1,200 character description.'});
  if(wantsBlueprint&&!['square','portrait','story','landscape'].includes(String(format)))
    return reply(400,{error:'Choose a supported exact poster export format.'});

  const {client,userId}=await owner();
  if(!userId)return reply(403,{error:'Internal QA ownership is required.'});
  if(!isPosterIntelligenceEnabled())
    return reply(503,{error:'Gemini creative briefing is not configured.'});
  const {data:business,error:bizError}=await client.from('businesses')
    .select('id,name,category,description,phone,email,address,detailed_address,city,website_url')
    .eq('id',id).eq('owner_id',userId).maybeSingle();
  if(bizError)return reply(503,{error:'Business ownership check unavailable.'});
  if(!business)return reply(404,{error:'The selected business does not belong to you.'});
  const {data:brand,error:brandError}=await client.from('social_brand_profiles')
    .select('brand_name,slogan,primary_color,accent_color,tone')
    .eq('owner_id',userId).eq('business_id',id).maybeSingle();
  if(brandError)return reply(503,{error:'Verified brand details are unavailable.'});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return reply(503,{error:'Gemini daily quota is not configured.'});
  const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:approved,error:quotaError}=await admin.rpc('marketing_poster_voice_try_reserve',{p_user_id:userId});
  if(quotaError)return reply(503,{error:'Gemini usage cannot be verified.'});
  if(approved!==true)
    return reply(429,{error:'Shared daily Gemini voice/brief quota reached. You can still type and compose without Gemini.'});
  try{
    const facts=preparePosterBusinessFacts(business,brand);
    if(wantsBlueprint){
      const blueprint=await createGeminiPosterDesignBlueprint({
        userRequest:prompt.trim(),facts,preferredLanguage:language as 'ta'|'si'|'en',
        format:format as 'square'|'portrait'|'story'|'landscape',
        campaignStyle:typeof body.campaignStyle==='string'?body.campaignStyle.slice(0,80):'',
        // Only a vendor-reviewed field may justify this numeric offer.
        approvedOffer:typeof body.approvedOffer==='string'?body.approvedOffer.slice(0,60):'',
      });
      return reply(200,{blueprint,reviewBeforeGenerating:true});
    }
    const brief=await createGeminiPosterBrief({
      userRequest:prompt.trim(),facts,preferredLanguage:language as 'ta'|'si'|'en',isEdit:false,
    });
    return reply(200,{brief,reviewBeforeGenerating:true});
  }catch(e){
    if(e instanceof PosterIntelligenceError&&e.kind==='quota')
      return reply(429,{error:'Gemini quota exhausted. Use your original prompt to generate the background.'});
    return reply(503,{error:'Gemini could not prepare a valid design blueprint. Your original prompt and approved copy remain editable.'});
  }
}
