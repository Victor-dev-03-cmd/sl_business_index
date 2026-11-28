import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {audienceService,audienceReply as reply,UUID} from '@/lib/audience/server';
import {EMAIL_IMPORT_MAX_BYTES,EMAIL_IMPORT_MAX_CONTACTS,EMAIL_IMPORT_SOURCES,normalizeImportEmail,type ImportSource} from '@/lib/marketing/email-import-contract';
export const dynamic='force-dynamic';
async function access(){
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return {response:reply(401,{error:'Sign in first.'})} as const;
 const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));if(denied)return {response:denied} as const;
 const service=audienceService();if(!service)return {response:reply(503,{error:'Contact service unavailable.'})} as const;
 return {user,service} as const;
}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,businessId=p.get('businessId'),listId=p.get('listId'),offset=Number(p.get('offset')||0);
 if(!businessId||!UUID.test(businessId)||(listId!==null&&!UUID.test(listId))||!Number.isInteger(offset)||offset<0||offset>5000)return reply(400,{error:'Invalid list selection.'});
 const auth=await access();if('response' in auth)return auth.response;
 const {data,error}=await auth.service.rpc('slbi_email_import_lists',{p_owner:auth.user.id,p_business:businessId,p_list:listId,p_offset:offset});
 if(error)return reply(503,{error:'Contact lists unavailable.'});
 if(!data)return reply(403,{error:'Select an approved business and list you own.'});
 return reply(200,data);
}
async function body(request:Request){
 if(!isSameOrigin(request.url,request.headers.get('origin'))||!request.headers.get('content-type')?.startsWith('application/json'))throw Error('Invalid request.');
 const reader=request.body?.getReader();if(!reader)throw Error('Invalid request.');
 const chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>EMAIL_IMPORT_MAX_BYTES){await reader.cancel();throw Error('File too large.')}chunks.push(r.value);}}finally{reader.releaseLock();}
 const raw=new Uint8Array(total);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length;}
 const v:unknown=JSON.parse(new TextDecoder().decode(raw));if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid request.');
 return v as Record<string,unknown>;
}
export async function POST(request:Request){
 const auth=await access();if('response' in auth)return auth.response;
 let v:Record<string,unknown>;try{v=await body(request)}catch{return reply(400,{error:'Invalid or oversized import.'})}
 if(typeof v.businessId!=='string'||!UUID.test(v.businessId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>100||!EMAIL_IMPORT_SOURCES.includes(v.source as ImportSource)||v.attested!==true||!Array.isArray(v.emails)||v.emails.length<1||v.emails.length>EMAIL_IMPORT_MAX_CONTACTS)return reply(400,{error:'Choose a list name, valid contacts and confirm marketing permission.'});
 const normalized=v.emails.map(normalizeImportEmail);if(normalized.some(e=>e===null))return reply(400,{error:'Invalid email address in import.'});
 const {data,error}=await auth.service.rpc('slbi_email_import_create',{p_owner:auth.user.id,p_business:v.businessId,p_name:v.name.trim(),p_source:v.source,p_emails:[...new Set(normalized)],p_attested:true});
 if(error)return reply(error.message.includes('LIMIT')?409:503,{error:error.message.includes('LIMIT')?'List or contact limit reached. Remove old lists first.':'Unable to save contacts.'});
 if(!data)return reply(403,{error:'Select an approved business you own.'});
 return reply(201,data);
}
export async function DELETE(request:Request){
 const auth=await access();if('response' in auth)return auth.response;
 let v:Record<string,unknown>;try{v=await body(request)}catch{return reply(400,{error:'Invalid request.'})}
 if(typeof v.businessId!=='string'||!UUID.test(v.businessId)||typeof v.listId!=='string'||!UUID.test(v.listId)||(v.email!==undefined&&!normalizeImportEmail(v.email)))return reply(400,{error:'Invalid list or contact.'});
 const {data,error}=await auth.service.rpc('slbi_email_import_remove',{p_owner:auth.user.id,p_business:v.businessId,p_list:v.listId,p_email:v.email===undefined?null:normalizeImportEmail(v.email)});
 if(error)return reply(503,{error:'Unable to remove contacts.'});
 if(!data)return reply(404,{error:'List or contact not found.'});
 return reply(200,{removed:true});
}
