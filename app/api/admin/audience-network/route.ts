import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {audienceService,audienceReply as reply,UUID} from '@/lib/audience/server';
export const dynamic='force-dynamic';
async function control(requestId:string|null,decision:string|null){
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return reply(401,{error:'Sign in first.'});
 const {data:profile,error:roleError}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(roleError||!profile||!['admin','ceo'].includes(profile.role))return reply(403,{error:'Staff access required.'});
 const service=audienceService();if(!service)return reply(503,{error:'Network registry unavailable.'});
 const {data,error:controlError}=await service.rpc('slbi_audience_admin_control',{p_actor:user.id,p_request:requestId,p_decision:decision});
 if(controlError)return reply(409,{error:'Request could not be reviewed. Refresh and retry.'});
 if(!data)return reply(403,{error:'Staff access required.'});
 return reply(200,{network:data});
}
export async function GET(){return control(null,null);}
export async function POST(request:Request){
 if(!isSameOrigin(request.url,request.headers.get('origin')))return reply(403,{error:'Cross-origin changes blocked.'});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'JSON required.'});
 try{const raw=await request.text();if(raw.length>256)return reply(413,{error:'Request too large.'});const b=JSON.parse(raw);if(typeof b?.requestId!=='string'||!UUID.test(b.requestId)||!['approved','rejected','revoked'].includes(b.decision))return reply(400,{error:'Invalid review.'});return control(b.requestId,b.decision);}catch{return reply(400,{error:'Invalid request.'});}
}
