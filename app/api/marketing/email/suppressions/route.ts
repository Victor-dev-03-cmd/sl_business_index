import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {normalizeSuppressionEmail} from '@/lib/marketing/email-suppression-contract';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(status:number,payload:Record<string,unknown>)=>Response.json(payload,{
  status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'},
});
async function ownerContext(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return {client,user:null,denied:reply(401,{error:'Sign in to manage email exclusions.'})};
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  return {client,user,denied};
}
export async function GET(request:Request){
  const {client,user,denied}=await ownerContext();
  if(denied)return denied;
  if(!user)return reply(401,{error:'Sign in first.'});
  const businessId=new URL(request.url).searchParams.get('businessId');
  if(!businessId||!UUID.test(businessId))return reply(400,{error:'Select a business.'});
  const {data,count,error}=await client.from('marketing_email_suppressions')
    .select('email,reason,created_at',{count:'exact'})
    .eq('owner_id',user.id).eq('business_id',businessId)
    .order('created_at',{ascending:false}).limit(100);
  if(error)return reply(503,{error:'The suppression registry is not ready.',code:'SUPPRESSION_REGISTRY_UNAVAILABLE'});
  return reply(200,{count:count||0,items:(data||[]).map(r=>({
    email:r.email,reason:r.reason,createdAt:r.created_at,
  })),limited:(count||0)>100});
}
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin changes are blocked.'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return reply(415,{error:'JSON required.'});
  let body:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>600)return reply(413,{error:'Request too large.'});
    body=JSON.parse(raw);
  }catch{return reply(400,{error:'Invalid request.'});}
  if(!body||typeof body!=='object'||Array.isArray(body))
    return reply(400,{error:'Invalid request.'});
  const value=body as Record<string,unknown>;
  const email=normalizeSuppressionEmail(value.email);
  const businessId=value.businessId;
  if(typeof businessId!=='string'||!UUID.test(businessId)||!email)
    return reply(400,{error:'Enter a valid business and email address.'});
  const {client,user,denied}=await ownerContext();
  if(denied)return denied;
  if(!user)return reply(401,{error:'Sign in first.'});
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id').eq('id',businessId).eq('owner_id',user.id)
    .eq('status','approved').maybeSingle();
  if(businessError||!business)return reply(403,{error:'An approved business you own is required.'});
  const {count,error:countError}=await client.from('marketing_email_suppressions')
    .select('id',{count:'exact',head:true})
    .eq('owner_id',user.id).eq('business_id',businessId);
  if(countError)return reply(503,{error:'The suppression registry is not ready.',code:'SUPPRESSION_REGISTRY_UNAVAILABLE'});
  if((count||0)>=10000)return reply(409,{error:'Suppression limit reached. Contact support.'});
  const {error}=await client.from('marketing_email_suppressions').insert({
    owner_id:user.id,business_id:businessId,email,reason:'manual',
  });
  if(error?.code==='23505')return reply(200,{saved:true,alreadyExcluded:true});
  if(error)return reply(503,{error:'Could not save the email exclusion.',code:'SUPPRESSION_SAVE_FAILED'});
  return reply(201,{saved:true,alreadyExcluded:false});
}
