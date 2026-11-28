import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {audienceService,audienceReply as reply,UUID} from '@/lib/audience/server';
export const dynamic='force-dynamic';
const businessActions=['follow','unfollow','news_on','news_off','push_on','push_off','subscribe','unsubscribe'];
const networkActions=['network_subscribe','network_unsubscribe'];
export async function GET(request:Request){
 const businessId=new URL(request.url).searchParams.get('businessId');
 if(businessId!==null&&!UUID.test(businessId))return reply(400,{error:'Invalid business.'});
 const client=await createClient();
 const {data:{user},error}=await client.auth.getUser();
 if(!businessId&&(error||!user))return reply(401,{error:'Sign in to manage your preferences.'});
 const service=audienceService();
 if(!service)return reply(503,{error:'Audience service unavailable.'});
 const {data,error:readError}=await service.rpc('slbi_audience_read',{p_user:error?null:user?.id||null,p_business:businessId});
 if(readError)return reply(503,{error:'Audience service unavailable.'});
 if(!data)return reply(404,{error:'Business unavailable.'});
 return reply(200,{signedIn:Boolean(user&&!error),state:data});
}
export async function POST(request:Request){
 if(!isSameOrigin(request.url,request.headers.get('origin')))return reply(403,{error:'Cross-origin changes blocked.'});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'JSON required.'});
 let body:unknown;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>1024)return reply(413,{error:'Request too large.'});body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request.'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid request.'});
 const v=body as Record<string,unknown>;
 const action=v.action;
 const businessId=v.businessId??null;
 const language=v.language??'en';
 if(typeof action!=='string'||typeof language!=='string'||!['en','ta','si'].includes(language)||
   !(businessActions.includes(action)&&typeof businessId==='string'&&UUID.test(businessId)||networkActions.includes(action)&&businessId===null))return reply(400,{error:'Invalid preference.'});
 if(['subscribe','network_subscribe'].includes(action)&&v.consentVersion!=='slbi-audience-sharing-v2')return reply(400,{error:'Review and accept the current email sharing terms.'});
 const client=await createClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return reply(401,{error:'Sign in to manage your preferences.'});
 const service=audienceService();if(!service)return reply(503,{error:'Audience service unavailable.'});
 const {data,error:writeError}=await service.rpc('slbi_audience_change',{p_user:user.id,p_business:businessId,p_action:action,p_language:language});
 if(writeError){
   if(writeError.message.includes('VERIFIED_EMAIL_REQUIRED'))return reply(409,{error:'Verify your account email before subscribing.'});
   if(writeError.message.includes('PREFERENCE_RATE_LIMIT'))return reply(429,{error:'Too many preference changes. Try again shortly.'});
   if(writeError.message.includes('MEMBERSHIP_LIMIT'))return reply(409,{error:'Manage your existing 200 business subscriptions before adding another.'});
   if(writeError.message.includes('FOLLOW_REQUIRED'))return reply(409,{error:'Follow this business first.'});
   if(writeError.message.includes('BUSINESS_UNAVAILABLE'))return reply(404,{error:'Business unavailable.'});
   return reply(503,{error:'Could not save preferences. Please retry.'});
 }
 return reply(200,{signedIn:true,state:data});
}
