import 'server-only';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {isPosterInternalQAAccount} from '@/lib/marketing/poster-review-access-server';
import {GEMINI_POSTER_MODEL} from '@/lib/marketing/poster-gemini-intelligence';
import {GEMINI_EMAIL_SCHEMA,emailModelPrompt,parseEmailAiOutput,validateEmailAiRequest}
  from '@/lib/marketing/email-ai-contract';
import {httpsLink} from '@/lib/marketing/email-studio';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,headers:{'cache-control':'private, no-store','referrer-policy':'no-referrer'},
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MARKER='SLBI_EMAIL_AI_DRAFT_V1:';

/**
 * Actual Gemini call with shared, approved social-draft credit reservation,
 * internal QA only until a separate email credit ledger is launched.
 * No recipients, contacts or Gmail messages are accessed or transmitted.
 */
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Invalid request origin.'});
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))
    return reply(415,{error:'JSON request required.'});
  if(process.env.SLBI_MARKETING_AI_ENABLED!=='true'||
     process.env.SLBI_MARKETING_EMAIL_AI_ENABLED!=='true')
    return reply(503,{error:'Gemini Email AI is not activated for this environment.'});
  const key=process.env.GEMINI_API_KEY?.trim();
  const serverUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!key||!serverUrl||!adminKey)return reply(503,{error:'AI credit/provider configuration unavailable.'});
  let parsed:unknown;
  try{
    const body=await request.text();
    if(Buffer.byteLength(body,'utf8')>3600)return reply(413,{error:'Campaign request is too large.'});
    parsed=JSON.parse(body);
  }catch{return reply(400,{error:'Invalid JSON.'});}
  const draftRequest=validateEmailAiRequest(parsed);
  if(!draftRequest)return reply(400,{error:'Provide valid campaign facts, language, request key and HTTPS CTA.'});

  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(!user||authError)return reply(401,{error:'Sign in to generate email copy.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return denied;
  if(!await isPosterInternalQAAccount(user.id,client))
    return reply(403,{error:'Gemini Email AI remains in approved internal QA.'});
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,name,category,city,website_url,slug,status')
    .eq('owner_id',user.id).eq('id',draftRequest.businessId).maybeSingle();
  if(businessError)return reply(503,{error:'Business authorization unavailable.'});
  if(!business||business.status!=='approved')return reply(403,{error:'An approved owned business is required.'});
  const profile='https://www.slbusinessindex.com/business/'+(business.slug||business.id);
  const allowedCTA=new Set([httpsLink(profile),httpsLink(business.website_url)].filter(Boolean));
  if(!allowedCTA.has(httpsLink(draftRequest.ctaUrl)))
    return reply(400,{error:'CTA must match the owned business profile or saved website.'});
  const {data:brand,error:brandError}=await client.from('social_brand_profiles')
    .select('brand_name,tone,guidelines,languages')
    .eq('owner_id',user.id).eq('business_id',business.id).maybeSingle();
  if(brandError||!brand)return reply(409,{error:'Save your Brand Kit before generating email copy.'});
  if(!Array.isArray(brand.languages)||!brand.languages.includes(draftRequest.language))
    return reply(400,{error:'Enable this language in Brand Kit first.'});
  const admin=createAdminClient(serverUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:reservation,error:reserveError}=await admin.rpc('marketing_reserve_ai_draft',{
    p_user_id:user.id,p_business_id:business.id,p_request_key:draftRequest.requestKey,
  });
  if(reserveError)return reply(429,{error:'Insufficient approved AI credits or provider quota.'});
  const job=Array.isArray(reservation)?reservation[0]:null;
  if(!job||typeof job.job_id!=='string'||!UUID.test(job.job_id))
    return reply(503,{error:'AI credit reservation failed.'});
  if(job.job_state==='completed'){
    const {data:existing}=await client.from('marketing_ai_drafts')
      .select('caption').eq('job_id',job.job_id).eq('user_id',user.id).maybeSingle();
    if(existing?.caption?.startsWith(MARKER)){
      const safe=parseEmailAiOutput(existing.caption.slice(MARKER.length));
      if(safe)return reply(200,{draft:safe,cached:true,reviewRequired:true,creditSource:'shared_marketing_draft'});
    }
    return reply(409,{error:'This request has already completed. Review AI drafts in your library.'});
  }
  if(job.job_state==='refunded')return reply(409,{error:'This request was refunded. Use a new request key.'});
  if(job.job_state!=='reserved'||job.newly_created!==true)
    return reply(409,{error:'Request already in progress. Do not repeat the payment.'});

  let failure='provider';
  try{
    const prompt=emailModelPrompt(draftRequest,{
      businessName:business.name,category:business.category||'',city:business.city||'',
      brandName:brand.brand_name,tone:brand.tone||'professional',guidelines:brand.guidelines||'',
    });
    const response=await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/'+GEMINI_POSTER_MODEL+':generateContent',{
      method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(24000),
      headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:prompt.system}]},
        contents:[{role:'user',parts:[{text:prompt.user}]}],
        generationConfig:{
          temperature:0.45,maxOutputTokens:2200,responseMimeType:'application/json',
          responseSchema:GEMINI_EMAIL_SCHEMA,
        },
      }),
    });
    if(!response.ok)throw Error('Provider unavailable');
    const result=await response.json() as {
      candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>;
      usageMetadata?:{promptTokenCount?:number;candidatesTokenCount?:number};
    };
    const raw=(result.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
    failure='output';
    const structured=parseEmailAiOutput(raw);
    if(!structured)throw Error('Invalid model output');
    const serial=MARKER+JSON.stringify(structured);
    if(serial.length>3500)throw Error('Model output exceeds safe storage contract');
    failure='persist';
    const {data:finished,error:finishError}=await admin.rpc('marketing_complete_ai_draft',{
      p_job_id:job.job_id,p_language:draftRequest.language,p_caption:serial,
      p_model_id:GEMINI_POSTER_MODEL,
      p_input_tokens:Math.min(5000,Math.max(0,result.usageMetadata?.promptTokenCount||0)),
      p_output_tokens:Math.min(5000,Math.max(0,result.usageMetadata?.candidatesTokenCount||0)),
    });
    if(finishError||!finished)throw Error('Could not settle AI draft credit');
    return reply(201,{draft:structured,reviewRequired:true,cached:false,
      creditSource:'shared_marketing_draft',chargedCredits:job.charged_credits});
  }catch{
    let refunded=false;
    try{
      const {data,error}=await admin.rpc('marketing_refund_ai_draft',{p_job_id:job.job_id});
      refunded=!error&&data===true;
    }catch{/* state kept for reconciliation */}
    return reply(503,{error:failure==='provider'?'Gemini is temporarily unavailable.':
      failure==='output'?'Gemini returned an invalid draft.':'Draft could not be stored.',
      refundConfirmed:refunded,
      notice:refunded?'Credit refunded.':'Credit reconciliation required. Do not retry with a different request key.'});
  }
}
export async function GET(){return reply(405,{error:'Method not supported.'});}
