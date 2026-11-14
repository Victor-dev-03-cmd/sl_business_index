import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {
  buildPosterCreativePrompt,validatePosterCreativeInput,POSTER_PROMPT_VERSION,
} from '@/lib/marketing/poster-creative-engine';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
const BUCKET='slbi-poster-ai-private';
const requestUuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const reply=(status:number,body:Record<string,unknown>)=>
  Response.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
const trustedAdmin=()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return null;
  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};
const model=()=>process.env.SLBI_POSTER_IMAGE_MODEL==='gpt-image-2.5-sunburst'
  ?'gpt-image-2.5-sunburst' as const:'gpt-image-2.5-flare' as const;

/**
 * Paid image creation is OFF unless all three owner-controlled release gates exist:
 * environment flag, separate DB credit action + global budget, and provider key.
 * Image output is private; there are NO public URLs, social posts or model calls on GET.
 */
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin image generation is blocked.'});
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return reply(415,{error:'JSON is required.'});
  if(process.env.SLBI_POSTER_IMAGE_AI_ENABLED!=='true')
    return reply(503,{error:'AI Image Generation is not enabled yet. Premium creative prompt preview is available.'});
  const key=process.env.OPENAI_API_KEY,admin=trustedAdmin();
  if(!key||!admin)return reply(503,{error:'AI image provider and private storage are not configured.'});
  if(Number(request.headers.get('content-length')||0)>7000)
    return reply(413,{error:'Creative request is too large.'});
  let raw:unknown;
  try{
    const body=await request.text();
    if(Buffer.byteLength(body,'utf8')>7000)return reply(413,{error:'Creative request is too large.'});
    raw=JSON.parse(body);
  }catch{return reply(400,{error:'Invalid creative request.'});}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))
    return reply(400,{error:'Invalid creative request.'});
  const object=raw as Record<string,unknown>;
  if(Object.keys(object).some(k=>!['requestKey','acceptedCredits'].includes(k)&&
     !['businessId','format','style','mood','layout','objective','language','subject','offer','audience','notes'].includes(k)))
    return reply(400,{error:'Unexpected generation fields.'});
  if(typeof object.requestKey!=='string'||!requestUuid.test(object.requestKey))
    return reply(400,{error:'A fresh request key is required.'});
  const requestKey=object.requestKey;
  if(!Number.isInteger(object.acceptedCredits)||Number(object.acceptedCredits)<1||Number(object.acceptedCredits)>100)
    return reply(400,{error:'Confirm the current per-image Growth Credit price first.'});
  const {requestKey:_unused,acceptedCredits:_credits,...brief}=object;
  const checked=validatePosterCreativeInput(brief);
  if(!checked.ok)return reply(400,{error:checked.error});

  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return reply(401,{error:'Sign in to create premium artwork.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return denied;
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,name,category,city').eq('id',checked.value.businessId)
    .eq('owner_id',user.id).maybeSingle();
  if(businessError)return reply(503,{error:'Business ownership validation unavailable.'});
  if(!business)return reply(404,{error:'You do not own this business.'});
  const {data:brand,error:brandError}=await client.from('social_brand_profiles')
    .select('brand_name,primary_color,accent_color,tone,guidelines')
    .eq('business_id',business.id).eq('owner_id',user.id).maybeSingle();
  if(brandError)return reply(503,{error:'Brand Kit validation unavailable.'});
  if(!brand)return reply(409,{error:'Set up your business Brand Kit before creating AI artwork.'});

  const {data:bucket,error:bucketError}=await admin.storage.getBucket(BUCKET);
  if(bucketError||!bucket||bucket.public)
    return reply(503,{error:'Private image storage is not available. No credits were charged.'});

  const art=buildPosterCreativePrompt(checked.value,{
    businessName:business.name,category:business.category||'',city:business.city||'',
    brandName:brand.brand_name||business.name,
    primaryColor:brand.primary_color||'',accentColor:brand.accent_color||'',
    tone:brand.tone||'',guidelines:brand.guidelines||'',
  });
  // Hash server-derived brand facts as well as user input. Identical idempotency
  // keys cannot be reused with changed creative instructions or another brand.
  const briefHash=createHash('sha256').update(
    JSON.stringify({prompt:art.prompt,model:model(),providerSize:art.providerSize})
  ).digest('hex');
  const {data:reservation,error:reserveError}=await admin.rpc('marketing_poster_reserve',{
    p_user_id:user.id,p_business_id:business.id,p_request_key:requestKey,
    p_brief_hash:briefHash,p_expected_credits:object.acceptedCredits,
  });
  if(reserveError){
    console.warn('Poster budget reservation denied',reserveError.code);
    return reply(429,{error:'Verified Pro plan, poster credits or global AI budget do not allow this request.'});
  }
  const job=Array.isArray(reservation)?reservation[0]:null;
  if(!job?.job_id||!requestUuid.test(job.job_id))
    return reply(503,{error:'Could not reserve premium image credits.'});
  if(job.job_state==='completed'&&typeof job.asset_path==='string'){
    return reply(200,{jobId:job.job_id,artworkUrl:'/api/marketing/poster/artwork?jobId='+job.job_id,
      cached:true,chargedCredits:job.charged_credits,promptVersion:POSTER_PROMPT_VERSION});
  }
  if(!job.newly_created||job.job_state!=='reserved')
    return reply(409,{error:'This image request is already in progress or settled. Check the artwork library.'});

  const {data:claimed,error:claimError}=await admin.rpc('marketing_poster_claim',{p_job_id:job.job_id});
  if(claimError||claimed!==true){
    try{await admin.rpc('marketing_poster_refund',{p_job_id:job.job_id});}catch{}
    return reply(409,{error:'Image generation could not be claimed. Reserved credits are eligible for refund.'});
  }

  const path=user.id+'/'+business.id+'/'+job.job_id+'.png';
  let uploaded=false;
  try{
    const result=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',signal:AbortSignal.timeout(90000),cache:'no-store',
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:model(),prompt:art.prompt,quality:'high',
        size:art.providerSize,n:1,output_format:'png',background:'opaque',
        moderation:'auto',
        safety_identifier:createHash('sha256').update(user.id).digest('hex').slice(0,32),
      }),
    });
    if(!result.ok)throw Error('Image provider returned '+result.status);
    const payload=await result.json() as {data?:Array<{b64_json?:string}>};
    const encoded=payload.data?.[0]?.b64_json;
    if(typeof encoded!=='string'||!encoded.length||encoded.length>24000000)
      throw Error('Image provider response is invalid or oversized.');
    const binary=Buffer.from(encoded,'base64');
    if(binary.length<64||binary.length>15000000||
       !binary.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
      throw Error('Expected a safe PNG image from provider.');
    const normalized=await sharp(binary,{limitInputPixels:20000000})
      .resize(art.targetSize.width,art.targetSize.height,{fit:'cover',position:'centre'})
      .png({compressionLevel:8}).toBuffer();
    if(normalized.length>12000000)throw Error('Generated PNG exceeds private bucket limits.');
    const {error:uploadError}=await admin.storage.from(BUCKET)
      .upload(path,normalized,{contentType:'image/png',upsert:false,cacheControl:'0'});
    if(uploadError)throw Error('Private artwork upload failed.');
    uploaded=true;
    const {data:settled,error:settleError}=await admin.rpc('marketing_poster_complete',{
      p_job_id:job.job_id,p_storage_path:path,p_model:model(),p_prompt_version:art.version,
    });
    if(settleError||settled!==true)throw Error('Image credit settlement failed.');
    return reply(201,{
      jobId:job.job_id,artworkUrl:'/api/marketing/poster/artwork?jobId='+job.job_id,
      cached:false,chargedCredits:job.charged_credits,promptVersion:art.version,
      review:'Artwork is a draft. Verify authenticity, commercial rights and editable text before exporting.',
    });
  }catch(err){
    if(uploaded){
      try{await admin.storage.from(BUCKET).remove([path]);}catch{}
    }
    try{
      const {error}=await admin.rpc('marketing_poster_refund',{p_job_id:job.job_id});
      if(error)console.error('Poster AI credit refund needs reconciliation',error.code);
    }catch{console.error('Poster AI credit refund needs reconciliation');}
    console.warn('Poster image generation failed',err instanceof Error?err.name:'unknown');
    return reply(503,{error:'AI image could not be completed. Reserved credits are eligible for refund; no image was published.'});
  }
}
