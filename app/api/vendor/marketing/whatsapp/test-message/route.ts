import 'server-only';
import {createClient} from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164=/^\+[1-9][0-9]{7,14}$/;
const headers={'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const denied=(status:number,code:string)=>Response.json({ok:false,code,messageSent:false},
 {status,headers});

/** Fail closed. No global sandbox number or Meta credential may impersonate a vendor. */
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin
   ||request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
   return denied(403,'invalid_origin');
  if(Number(request.headers.get('content-length')||0)>1024)return denied(400,'invalid_request');
  const raw=await request.text();
  if(raw.length>1024)return denied(400,'invalid_request');
  const data:unknown=JSON.parse(raw);
  if(!data||Array.isArray(data)||typeof data!=='object')return denied(400,'invalid_request');
  const v=data as Record<string,unknown>;
  if(Object.keys(v).sort().join(',')!=='businessId,consent,recipient'
   ||typeof v.businessId!=='string'||!UUID.test(v.businessId)
   ||typeof v.recipient!=='string'||!E164.test(v.recipient)
   ||v.consent!==true)return denied(400,'invalid_request');
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return denied(401,'sign_in_required');
  const {data:business,error:ownerError}=await client.from('businesses')
   .select('id,status').eq('id',v.businessId).eq('owner_id',user.id).maybeSingle();
  if(ownerError)return denied(503,'ownership_unavailable');
  if(!business)return denied(404,'business_not_owned');
  if(business.status!=='approved')return denied(403,'business_not_approved');
  // A test send requires a confirmed vendor Meta Embedded Signup, an encrypted
  // provider token, provider receipt, and an approved template (or 24-hour
  // service window). None of those is safely enabled by the current sandbox.
  // The actual send must be implemented behind a separate audited approval
  // and durable outbound receipt, never via the shared SLBI test number.
  return denied(503,'vendor_test_messaging_not_approved');
 }catch{return denied(400,'invalid_request');}
}
