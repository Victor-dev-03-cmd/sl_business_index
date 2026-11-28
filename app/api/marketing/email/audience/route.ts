import {isSameOrigin} from '@/lib/growth/ingestion-contract';
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
 if(params.get('view')==='lists'){
   const offset=Number(params.get('offset')||'0');
   if(!Number.isInteger(offset)||offset<0||offset>10000)return reply(400,{error:'Invalid page.'});
   const {data,error:listError}=await service.rpc('slbi_audience_lists',{p_owner:user.id,p_business:businessId,p_offset:offset});
   if(listError)return reply(503,{error:'Subscriber list unavailable.'});
   if(!data)return reply(403,{error:'An approved business you own is required.'});
   return reply(200,{lists:data});
 }
 const {data,error:summaryError}=await service.rpc('slbi_audience_owner_summary',{p_owner:user.id,p_business:businessId,p_language:language});
 if(summaryError)return reply(503,{error:'Audience registry unavailable.'});
 if(!data)return reply(403,{error:'An approved business you own is required.'});
 return reply(200,{summary:data});
}

export async function POST(request:Request){
 if(!isSameOrigin(request.url,request.headers.get('origin')))return reply(403,{error:'Cross-origin changes blocked.'});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'JSON required.'});
 let body:unknown;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>2048)return reply(413,{error:'Request too large.'});body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request.'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid request.'});
 const v=body as Record<string,unknown>;
 if(typeof v.businessId!=='string'||!UUID.test(v.businessId)||typeof v.count!=='number'||!Number.isInteger(v.count)||v.count<1||v.count>100||typeof v.language!=='string'||!['all','en','ta','si'].includes(v.language)||typeof v.purpose!=='string'||v.purpose.trim().length<5||v.purpose.trim().length>300)return reply(400,{error:'Choose up to 100 recipients and describe your campaign.'});
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return reply(401,{error:'Sign in first.'});
 const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));if(denied)return denied;
 const service=audienceService();if(!service)return reply(503,{error:'Audience service unavailable.'});
 const {data,error:requestError}=await service.rpc('slbi_audience_request',{p_owner:user.id,p_business:v.businessId,p_count:v.count,p_language:v.language,p_purpose:v.purpose.trim()});
 if(requestError)return reply(requestError.message.includes('ACTIVE_REQUEST')?409:503,{error:requestError.message.includes('ACTIVE_REQUEST')?'This business already has a pending or active request.':'Could not submit the request.'});
 if(!data)return reply(403,{error:'An approved business you own is required.'});
 return reply(201,{request:data});
}
