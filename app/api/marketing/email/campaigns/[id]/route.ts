import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';

export const runtime='nodejs';export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response=(status:number,v:Record<string,unknown>)=>Response.json(v,{
  status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'},
});
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request.url,request.headers.get('origin')))return response(403,{error:'Invalid origin.'});
  const {id}=await params;
  if(!UUID.test(id))return response(400,{error:'Invalid campaign.'});
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return response(401,{error:'Sign in required.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,db));
  if(denied)return denied;
  const {data,error}=await db.from('marketing_email_campaign_drafts').delete()
    .eq('id',id).eq('owner_id',user.id).select('id').maybeSingle();
  if(error)return response(503,{error:'Could not remove campaign.'});
  if(!data)return response(404,{error:'Campaign not found or not owned by you.'});
  return response(200,{deleted:true,id});
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!UUID.test(id))return response(400,{error:'Invalid campaign.'});
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return response(401,{error:'Sign in required.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,db));
  if(denied)return denied;
  const {data:campaign,error}=await db.from('marketing_email_campaign_drafts')
    .select('id,revision,updated_at').eq('id',id).eq('owner_id',user.id).maybeSingle();
  if(error)return response(503,{error:'Cannot load campaign history.'});
  if(!campaign)return response(404,{error:'Campaign not found.'});
  const {data:history,error:historyError}=await db.from('marketing_email_campaign_draft_history')
    .select('revision,snapshot,created_at').eq('owner_id',user.id).eq('campaign_id',id)
    .order('revision',{ascending:false}).limit(20);
  if(historyError)return response(503,{error:'History currently unavailable.'});
  return response(200,{currentRevision:campaign.revision,
    history:(history||[]).map(x=>({revision:x.revision,draft:x.snapshot,createdAt:x.created_at}))});
}
