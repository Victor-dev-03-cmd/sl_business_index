import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { isSameOrigin } from '@/lib/growth/ingestion-contract';
import { validateLeadSubmission } from '@/lib/growth/lead-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TurnstileVerification={success:boolean;hostname?:string;action?:string;['error-codes']?:string[]};
const reply=(status:number,error:string)=>Response.json({success:false,error},{status,headers:{'Cache-Control':'no-store'}});

/**
 * Owner-vendor enquiry ingestion. Disabled until secrets, private DB RPC,
 * mobile compatibility and rate-limit migration have been verified.
 * Never fall back to arbitrary public INSERT when enabled.
 */
export async function POST(request:Request){
  if(process.env.SLBI_SECURE_LEADS_ENABLED!=='true')return reply(503,'secure-leads-not-enabled');
  if(process.env.VERCEL!=='1')return reply(503,'untrusted-origin');
  if(!isSameOrigin(request.url,request.headers.get('origin')))return reply(403,'origin-check-failed');
  if(!String(request.headers.get('content-type')||'').startsWith('application/json'))return reply(415,'invalid-content-type');
  const headerLength=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(headerLength)||headerLength>6_000)return reply(413,'payload-too-large');

  let payload:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>6_000)return reply(413,'payload-too-large');
    payload=JSON.parse(raw);
  }catch{return reply(400,'invalid-json');}
  const checked=validateLeadSubmission(payload);
  if(!checked.ok)return reply(400,checked.reason);

  const privateKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hashSecret=process.env.GROWTH_RATE_LIMIT_SECRET;
  const turnstileSecret=process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if(!privateKey||!supabaseUrl||!hashSecret||hashSecret.length<32||!turnstileSecret){
    return reply(503,'secure-leads-not-configured');
  }
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',').at(-1)?.trim();
  if(!ip||ip.length>80||!/^[0-9a-f:.]+$/i.test(ip))return reply(503,'untrusted-client-ip');

  const lead=checked.value;
  try{
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        secret:turnstileSecret,response:lead.turnstileToken,
        idempotency_key:lead.requestId,
      }),
      signal:AbortSignal.timeout(7_000),
      cache:'no-store',
    });
    if(!verify.ok)return reply(503,'verification-unavailable');
    const checkedToken=await verify.json() as TurnstileVerification;
    const host=new URL(request.url).hostname;
    // Host binding + action binding protect cross-site or copied challenge tokens.
    if(!checkedToken.success||checkedToken.action!=='business_enquiry'||checkedToken.hostname!==host){
      return reply(403,'verification-failed');
    }
  }catch{return reply(503,'verification-unavailable');}

  const hour=Math.floor(Date.now()/3_600_000);
  const rateBucket=createHmac('sha256',hashSecret)
    .update('lead-person|'+ip+'|'+lead.businessId+'|'+hour).digest('hex');
  const businessBucket=createHmac('sha256',hashSecret)
    .update('lead-listing|'+lead.businessId+'|'+hour).digest('hex');

  try{
    // server-only privileged client; NEVER instantiated in browser code.
    const supabase=createClient(supabaseUrl,privateKey,{
      auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
    });
    const {data,error}=await supabase.rpc('slbi_submit_verified_lead',{
      p_request_id:lead.requestId,p_business_id:lead.businessId,
      p_name:lead.name,p_email:lead.email,p_phone:lead.phone,p_message:lead.message,
      p_rate_bucket:rateBucket,p_business_bucket:businessBucket,
    });
    if(error){
      // Protect customer PII and connection strings: do not log the raw error.
      console.error('Secure lead submission unavailable',error.code||'database');
      return reply(503,'submission-unavailable');
    }
    if(typeof data!=='string')return reply(429,'request-limit-or-ineligible-business');
    return Response.json({success:true,recorded:true},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch{return reply(503,'submission-unavailable');}
}

export function GET(){return reply(405,'method-not-supported');}
