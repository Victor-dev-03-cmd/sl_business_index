import {createClient} from '@/lib/supabase/server'
import {serviceClient} from '@/lib/push/server'
import {firebaseConfig} from '@/lib/push/config'
export const runtime='nodejs'
const reply=(status:number,body:object)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
async function handle(request:Request,remove:boolean){
  if(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))return reply(403,{error:'Origin rejected'})
  if(!remove&&!firebaseConfig())return reply(503,{error:'Push service not configured'})
  const client=await createClient()
  const {data:{user},error}=await client.auth.getUser()
  if(error||!user)return reply(401,{error:'Sign in required'})
  const {data:claims}=await client.auth.getClaims()
  const sid=claims?.claims.session_id
  if(typeof sid!=='string')return reply(401,{error:'Session not verified'})
  let token:unknown
  try{const raw=await request.text();if(raw.length>4096)return reply(413,{error:'Request too large'});token=JSON.parse(raw).token}catch{return reply(400,{error:'Invalid request'})}
  if(typeof token!=='string'||token.length<20||token.length>2048||!/^[A-Za-z0-9:_-]+$/.test(token))return reply(400,{error:'Invalid device token'})
  try{
    const admin=serviceClient()
    const result=remove?await admin.from('fcm_devices').delete().eq('token',token).eq('user_id',user.id):await admin.rpc('slbi_register_fcm_device',{p_token:token,p_user:user.id,p_session:sid})
    if(result.error)return reply(409,{error:'Device registration could not be saved'})
    return reply(200,{ok:true})
  }catch{return reply(503,{error:'Device service unavailable'})}
}
export const POST=(r:Request)=>handle(r,false)
export const DELETE=(r:Request)=>handle(r,true)
