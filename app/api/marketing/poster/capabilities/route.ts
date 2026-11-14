import 'server-only';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(body:Record<string,unknown>,status=200)=>Response.json(body,{
  status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'},
});
/**
 * Never claim AI generation is available from the client-side credit action alone.
 * The provider, global budget, private storage and paid credit action must all be ready.
 * This endpoint reveals no credential, tenant data, storage path or provider billable quota.
 */
export async function GET(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return response({available:false},401);
  const access=await getMarketingAccessForUser(user.id,client);
  const denied=rejectMarketingAccess(access);
  if(denied)return denied;
  const unavailable={available:false,creditCost:null,reason:'Real AI image generation is not connected or funded yet. Your account will not be charged.'};
  if(process.env.SLBI_POSTER_IMAGE_AI_ENABLED!=='true'||!process.env.OPENAI_API_KEY)
    return response(unavailable);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)return response(unavailable);
  try{
    const admin=createAdminClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const day=new Date().toISOString().slice(0,10);
    const [action,limits,bucket]=await Promise.all([
      admin.from('growth_credit_actions').select('credit_cost,is_enabled')
        .eq('action_key','ai_poster_design').maybeSingle(),
      admin.from('marketing_poster_daily_limits').select('attempts,max_attempts')
        .eq('day_utc',day).maybeSingle(),
      admin.storage.getBucket('slbi-poster-ai-private'),
    ]);
    const cost=action.data?.credit_cost;
    const ready=!action.error&&!limits.error&&!bucket.error&&bucket.data?.public===false
      &&action.data?.is_enabled===true&&Number.isInteger(cost)&&cost>0&&cost<=100
      &&Boolean(limits.data)&&Number(limits.data!.max_attempts)>Number(limits.data!.attempts);
    if(!ready)return response(unavailable);
    return response({available:true,creditCost:cost,reason:null});
  }catch{return response(unavailable);}
}
