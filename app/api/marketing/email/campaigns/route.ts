import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {normalizeLocalCampaign} from '@/lib/marketing/email-hub-contract';
import {audienceService} from '@/lib/audience/server';
import {httpsLink} from '@/lib/marketing/email-studio';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'},
});
const missingTable=(code?:string)=>['42P01','PGRST205','PGRST202','42883'].includes(code||'');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function ownerContext(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return {client,user:null,denied:reply(401,{error:'Please sign in.'})};
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  return {client,user,denied};
}
export async function GET(request:Request){
  const {client,user,denied}=await ownerContext();
  if(denied)return denied;
  if(!user)return reply(401,{error:'Please sign in.'});
  const businessId=new URL(request.url).searchParams.get('businessId');
  if(businessId&&!UUID.test(businessId))return reply(400,{error:'Invalid business.'});
  let query=client.from('marketing_email_campaign_drafts')
    .select('id,business_id,draft,revision,updated_at')
    .eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(150);
  if(businessId)query=query.eq('business_id',businessId);
  const {data,error}=await query;
  if(error)return reply(503,{error:missingTable(error.code)?
    'Campaign sync is being prepared. Your browser drafts remain available.':
    'Could not load your campaigns.',code:'CAMPAIGN_STORE_UNAVAILABLE'});
  const drafts=(data||[]).map(row=>({
    draft:row.draft,revision:row.revision,updatedAt:row.updated_at,
  })).filter(x=>Boolean(x.draft));
  return reply(200,{drafts,source:'server',verified:true});
}
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin save rejected.'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return reply(415,{error:'JSON required.'});
  let raw:unknown;
  try{
    const text=await request.text();
    if(Buffer.byteLength(text,'utf8')>48000)return reply(413,{error:'Campaign exceeds size limit.'});
    raw=JSON.parse(text);
  }catch{return reply(400,{error:'Invalid campaign JSON.'});}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))
    return reply(400,{error:'Invalid campaign payload.'});
  const body=raw as Record<string,unknown>;
  if(typeof body.expectedRevision!=='number'||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0||body.expectedRevision>1e9)
    return reply(400,{error:'Invalid campaign revision.'});
  const {client,user,denied}=await ownerContext();
  if(denied)return denied;
  if(!user)return reply(401,{error:'Please sign in.'});
  const source=body.draft;
  if(!source||typeof source!=='object'||Array.isArray(source))
    return reply(400,{error:'Invalid draft.'});
  const attempted=source as Record<string,unknown>;
  if(typeof attempted.businessId!=='string'||!UUID.test(attempted.businessId))
    return reply(400,{error:'Invalid business.'});
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,slug,website_url,status')
    .eq('id',attempted.businessId).eq('owner_id',user.id)
    .eq('status','approved').maybeSingle();
  if(businessError)return reply(503,{error:'Could not verify business ownership.'});
  if(!business)return reply(403,{error:'Select an approved business you own.'});
  const valid=normalizeLocalCampaign(source,user.id,[business.id]);
  if(!valid||!valid.title.trim()||!httpsLink(valid.ctaUrl))
    return reply(400,{error:'Review your campaign title, content, and secure CTA link.'});
  if(valid.audiencePlan?.source==='imported'){
    const service=audienceService();if(!service)return reply(503,{error:'Contact lists unavailable.'});
    const {data,error}=await service.rpc('slbi_email_import_lists',{p_owner:user.id,p_business:business.id,p_list:valid.audiencePlan.listId,p_offset:0});
    if(error)return reply(503,{error:'Could not verify imported contact list.'});
    if(!data)return reply(400,{error:'Select an imported contact list owned by this business.'});
  }
  // Only pass a whitelisted data contract to SQL. No recipient emails, tokens
  // or private correspondence can be smuggled into campaign JSON.
  const {data,error}=await client.rpc('slbi_email_save_draft',{
    p_id:valid.id,p_business_id:valid.businessId,
    p_title:valid.title.trim(),p_draft:valid,
    p_expected_revision:Number(body.expectedRevision),
  });
  if(error)return reply(missingTable(error.code)?503:409,{
    error:missingTable(error.code)?'Campaign sync is not yet available.':
      'Could not save this campaign. Refresh if another tab edited the draft.',
    code:error.code||'SAVE_FAILED'});
  const result=Array.isArray(data)?data[0]:null;
  if(!result?.saved_id)return reply(409,{error:'Draft was edited in another tab, is no longer authorized, or campaign limit was reached. Your local copy is preserved.',code:'REVISION_CONFLICT'});
  return reply(200,{saved:true,revision:result.saved_revision,
    updatedAt:result.saved_updated_at,id:result.saved_id,source:'server'});
}
