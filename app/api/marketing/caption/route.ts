import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {
  buildCaptionMessages,CAPTION_MODEL,MAX_OUTPUT_TOKENS,
  sanitizeModelCaption,validateCaptionInput,
} from '@/lib/marketing/caption-contract';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const response=(status:number,body:Record<string,unknown>)=>
  Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const missingSchema=(code?:string)=>code==='42P01'||code==='PGRST205'||code==='42883'||code==='PGRST202';

const safeAdmin=()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return null;
  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};

export async function GET(request:Request){
  const businessId=new URL(request.url).searchParams.get('businessId');
  if(!businessId||!uuid.test(businessId))return response(400,{error:'Choose a valid business.'});
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return response(401,{error:'Sign in to view your marketing drafts.'});
  const proDenied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(proDenied)return proDenied;
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
  if(businessError)return response(503,{error:'Cannot validate business ownership.'});
  if(!business)return response(404,{error:'Business not found for this account.'});
  const {data,error}=await client.from('marketing_ai_drafts')
    .select('id,business_id,language,caption,review_status,model_id,created_at,updated_at')
    .eq('business_id',businessId).eq('user_id',user.id)
    .order('created_at',{ascending:false}).limit(25);
  if(error)return response(503,{error:missingSchema(error.code)?
    'AI caption drafts are not enabled in this environment.':'Could not load your drafts.'});
  return response(200,{drafts:data||[]});
}

export async function PATCH(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return response(403,{error:'Cross-origin modifications are blocked.'});
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return response(401,{error:'Sign in to review your caption.'});
  const proDenied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(proDenied)return proDenied;
  let v:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>6500)return response(413,{error:'Caption too long.'});
    v=JSON.parse(raw);
  }catch{return response(400,{error:'Invalid JSON.'});}
  if(!v||typeof v!=='object'||Array.isArray(v))return response(400,{error:'Invalid draft.'});
  const obj=v as Record<string,unknown>;
  if(Object.keys(obj).some(k=>!['id','caption','status'].includes(k)) ||
     typeof obj.id!=='string'||!uuid.test(obj.id) ||
     typeof obj.status!=='string'||!['pending_review','approved','rejected'].includes(obj.status))
    return response(400,{error:'Invalid review fields.'});
  const caption=sanitizeModelCaption(obj.caption);
  if(!caption)return response(400,{error:'Enter a readable caption (2–3000 characters).'});
  const {data,error}=await client.from('marketing_ai_drafts')
    .update({caption,review_status:obj.status})
    .eq('id',obj.id).eq('user_id',user.id)
    .select('id,caption,review_status,updated_at').maybeSingle();
  if(error)return response(503,{error:missingSchema(error.code)?
    'Caption editing is not enabled in this environment.':'Unable to save caption review.'});
  if(!data)return response(404,{error:'Draft is not available to this account.'});
  return response(200,{draft:data});
}

export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return response(403,{error:'Cross-origin AI requests are blocked.'});
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return response(415,{error:'JSON is required.'});
  // Hard OFF unless the owner explicitly configures a budget and enables
  // the server flag + the database-owned ai_social_draft action.
  if(process.env.SLBI_MARKETING_AI_ENABLED!=='true')
    return response(503,{error:'AI Caption Generation is not enabled yet. Manual captions remain available.'});
  const admin=safeAdmin(),key=process.env.GROQ_API_KEY;
  if(!admin||!key)return response(503,{error:'AI provider or credit backend is not configured.'});
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return response(401,{error:'Sign in to create an AI caption.'});
  const proDenied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(proDenied)return proDenied;
  let parsed:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>4200)return response(413,{error:'Campaign brief is too long.'});
    parsed=JSON.parse(raw);
  }catch{return response(400,{error:'Invalid campaign JSON.'});}
  const check=validateCaptionInput(parsed);
  if(!check.ok)return response(400,{error:check.error});
  const brief=check.value;
  // Tenant ownership is verified on an authenticated SSR client first,
  // and *again* inside the privileged transactional reservation function.
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,name,category,city')
    .eq('id',brief.businessId).eq('owner_id',user.id).maybeSingle();
  if(businessError)return response(503,{error:'Unable to verify business ownership.'});
  if(!business)return response(404,{error:'Business not found for this account.'});
  const {data:brand,error:brandError}=await client.from('social_brand_profiles')
    .select('brand_name,slogan,audience,tone,guidelines,languages')
    .eq('business_id',brief.businessId).eq('owner_id',user.id).maybeSingle();
  if(brandError)return response(503,{error:'Brand Profile is unavailable. Save your Brand Profile first.'});
  if(!brand)return response(409,{error:'Create a Business Brand Profile before using AI captions.'});
  if(!Array.isArray(brand.languages)||!brand.languages.includes(brief.language))
    return response(400,{error:'Enable this language in your Business Brand Profile first.'});

  const {data:reservation,error:reservationError}=await admin.rpc('marketing_reserve_ai_draft',{
    p_user_id:user.id,p_business_id:brief.businessId,p_request_key:brief.requestKey,
  });
  if(reservationError){
    console.warn('Marketing AI credit reservation unavailable',reservationError.code);
    return response(429,{error:'AI credits, quotas or provider budget do not allow this request.'});
  }
  const reserved=Array.isArray(reservation)?reservation[0]:null;
  if(!reserved?.job_id||!uuid.test(reserved.job_id))
    return response(503,{error:'Could not reserve AI credits safely.'});

  if(reserved.job_state==='completed'){
    const {data:cached,error}=await client.from('marketing_ai_drafts')
      .select('id,caption,language,review_status,created_at').eq('job_id',reserved.job_id)
      .eq('user_id',user.id).maybeSingle();
    if(!error&&cached)return response(200,{draft:cached,cached:true});
    return response(409,{error:'This request completed. Refresh your draft library.'});
  }
  if(reserved.job_state!=='reserved')return response(409,{error:'This request has already been processed.'});

  // If an identical request is concurrently in flight, a response is
  // intentionally not regenerated: only newly-created reservations may call
  // the provider. RPC returns the same ID for an existing reservation, so
  // prevent repeat calls by requiring a per-request in-progress lease later.
  // Current release flag remains OFF until atomic claim is implemented.
  if(!reserved.newly_created)return response(409,{error:'Caption request is already in progress. Refresh your drafts.'});

  const messages=buildCaptionMessages({
    businessName:business.name,
    category:business.category||'',
    city:business.city||'',
    brandName:brand.brand_name,
    slogan:brand.slogan||'',
    audience:brand.audience||'',
    tone:brand.tone||'professional',
    guidelines:brand.guidelines||'',
  },brief);

  try{
    const upstream=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',signal:AbortSignal.timeout(18000),
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:CAPTION_MODEL,
        messages,temperature:0.35,max_completion_tokens:MAX_OUTPUT_TOKENS,
        stream:false,
      }),
      cache:'no-store',
    });
    if(!upstream.ok)throw new Error('Provider HTTP '+upstream.status);
    const result=await upstream.json() as {
      choices?:Array<{message?:{content?:string}}>;
      usage?:{prompt_tokens?:number;completion_tokens?:number};
    };
    const caption=sanitizeModelCaption(result.choices?.[0]?.message?.content);
    if(!caption)throw new Error('Provider returned an unusable caption');
    const {data:draftId,error:finalError}=await admin.rpc('marketing_complete_ai_draft',{
      p_job_id:reserved.job_id,
      p_language:brief.language,p_caption:caption,p_model_id:CAPTION_MODEL,
      p_input_tokens:result.usage?.prompt_tokens||0,
      p_output_tokens:result.usage?.completion_tokens||0,
    });
    if(finalError||!draftId)throw new Error('Unable to settle or save completed AI draft');
    return response(201,{
      draft:{id:draftId,caption,language:brief.language,review_status:'pending_review'},
      cached:false,
      remainingCredits:reserved.remaining_credits,
      chargedCredits:reserved.charged_credits,
      notice:'AI draft only. Verify every fact and approve it before publishing.',
    });
  }catch(e){
    // A failing provider call cannot permanently consume a vendor's credits.
    try{
      const {error:refundError}=await admin.rpc('marketing_refund_ai_draft',{p_job_id:reserved.job_id});
      if(refundError)console.error('Marketing AI refund requires reconciliation',refundError.code);
    }catch{console.error('Marketing AI refund requires reconciliation');}
    console.warn('AI provider request failed',e instanceof Error?e.name:'unknown');
    return response(503,{error:'AI caption could not be generated; reserved credits are eligible for refund. Please retry later.'});
  }
}
