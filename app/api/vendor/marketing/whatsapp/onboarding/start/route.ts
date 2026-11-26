import 'server-only';
import {createClient} from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164=/^\+[1-9][0-9]{7,14}$/;
const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
};
const fail=(code:string,status:number)=>Response.json({ok:false,code},{status,headers:HEADERS});

/** Never issue WhatsApp Web QR codes or OTPs; signup must be Meta-hosted. */
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin||request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
   return fail('invalid_origin',403);
  if(Number(request.headers.get('content-length')||0)>2048)return fail('invalid_request',400);
  const raw=await request.text();
  if(raw.length>2048)return fail('invalid_request',400);
  const input:unknown=JSON.parse(raw);
  if(!input||typeof input!=='object'||Array.isArray(input))return fail('invalid_request',400);
  const obj=input as Record<string,unknown>;
  if(Object.keys(obj).sort().join(',')!=='businessId,method,phone'
   ||typeof obj.businessId!=='string'||!UUID.test(obj.businessId)
   ||(obj.method!=='phone'&&obj.method!=='qr')
   ||(obj.method==='phone'&&!(typeof obj.phone==='string'&&E164.test(obj.phone)))
   ||(obj.method==='qr'&&obj.phone!==null))return fail('invalid_request',400);
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return fail('sign_in_required',401);
  const {data:business,error:businessError}=await client.from('businesses')
   .select('id,status').eq('id',obj.businessId).eq('owner_id',user.id).maybeSingle();
  if(businessError)return fail('ownership_unavailable',503);
  if(!business)return fail('business_not_owned',404);
  if(business.status!=='approved')return fail('business_not_approved',403);
  // MUST stay fail closed until server-side verified Meta Tech Provider onboarding
  // exists: OAuth state, official Embedded Signup session, checked WABA/phone IDs,
  // encrypted scoped tokens, webhook subscription, provider receipt and audit.
  // There is intentionally NO feature flag or shortcut to turn this into a fake link.
  return fail('meta_approval_pending',503);
 }catch{return fail('invalid_request',400);}
}
