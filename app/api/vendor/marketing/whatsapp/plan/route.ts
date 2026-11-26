import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {planWA04OwnerRequest} from '@/lib/growth/agent/wa04-owner-operator.mjs';
import {routeML07StudioRequest} from '@/lib/growth/agent/ml07-studio-router.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(status:number,code:string)=>Response.json({ok:false,code},{status,headers:HEADERS});
function sameOrigin(request:Request){
 try{
  const origin=request.headers.get('origin');
  const target=new URL(request.url);
  return Boolean(origin)&&new URL(origin!).origin===target.origin
    &&origin===target.origin;
 }catch{return false;}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply(403,'origin_not_allowed');
 if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
  return reply(415,'json_required');
 const length=Number(request.headers.get('content-length')||'0');
 if(!Number.isFinite(length)||length>2000)return reply(413,'request_too_large');
 let body:Record<string,unknown>;
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw,'utf8')>2000)return reply(413,'request_too_large');
  const parsed:unknown=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
   return reply(400,'invalid_request');
  body=parsed as Record<string,unknown>;
 }catch{return reply(400,'invalid_request');}
 if(Object.keys(body).sort().join('|')!=='businessId|locale|request'
    ||typeof body.businessId!=='string'||!UUID.test(body.businessId)
    ||typeof body.request!=='string'
    ||!['auto','en','ta','si'].includes(String(body.locale)))
  return reply(400,'invalid_request');
 const locale=body.locale as 'auto'|'en'|'ta'|'si';
 const plan=planWA04OwnerRequest(body.request,locale);
 const studio=routeML07StudioRequest(body.request,locale);
 if(!plan.ok)return reply(400,plan.reason);
 if(!studio.ok)return reply(400,studio.reason ?? 'invalid_request');
 try{
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return reply(401,'sign_in_required');
  // Do not trust a business name, owner, plan or entitlement from the browser.
  const {data:business,error}=await supabase.from('businesses')
   .select('id,name,status').eq('id',body.businessId).eq('owner_id',user.id)
   .maybeSingle();
  if(error)return reply(503,'ownership_unavailable');
  if(!business)return reply(404,'business_not_owned');
  if(business.status!=='approved')return reply(409,'approved_business_required');
  // No DB writes, provider tokens, model invocation, external send, or approval.
  return Response.json({ok:true,business:{id:business.id,name:business.name},
    plan,studio}, {headers:HEADERS});
 }catch{return reply(503,'planning_unavailable');}
}
