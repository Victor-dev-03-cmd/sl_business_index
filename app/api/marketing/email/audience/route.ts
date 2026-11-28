import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {audienceService,audienceReply as reply,UUID} from '@/lib/audience/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const businessId=params.get('businessId');const language=params.get('language')||'all';
 if(!['all','en','ta','si'].includes(language))return reply(400,{error:'Invalid language.'});
 if(!businessId||!UUID.test(businessId))return reply(400,{error:'Select a business.'});
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return reply(401,{error:'Sign in first.'});
 const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));if(denied)return denied;
 const service=audienceService();if(!service)return reply(503,{error:'Audience service unavailable.'});
 const {data,error:summaryError}=await service.rpc('slbi_audience_owner_summary',{p_owner:user.id,p_business:businessId,p_language:language});
 if(summaryError)return reply(503,{error:'Audience registry unavailable.'});
 if(!data)return reply(403,{error:'An approved business you own is required.'});
 return reply(200,{summary:data});
}
