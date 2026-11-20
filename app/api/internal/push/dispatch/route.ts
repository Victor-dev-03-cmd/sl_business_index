import {createSign,timingSafeEqual} from 'node:crypto'
import {firebaseConfig} from '@/lib/push/config'
import {serviceClient} from '@/lib/push/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const reply=(status:number,body:object)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
type Job={id:string;token:string;attempts:number}
function authorized(r:Request){
  const secret=process.env.SLBI_FCM_DISPATCH_SECRET||''
  const provided=r.headers.get('authorization')||''
  const expected='Bearer '+secret
  return secret.length>=32&&Buffer.byteLength(provided)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(provided),Buffer.from(expected))
}
async function accessToken(){
  const service=JSON.parse(process.env.SLBI_FIREBASE_SERVICE_ACCOUNT_JSON||'{}')
  const now=Math.floor(Date.now()/1000)
  const encode=(x:object)=>Buffer.from(JSON.stringify(x)).toString('base64url')
  const input=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:service.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000})
  const signature=createSign('RSA-SHA256').update(input).sign(service.private_key.replace(/\\n/g,'\n')).toString('base64url')
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+signature}),signal:AbortSignal.timeout(8000),cache:'no-store'})
  if(!r.ok)throw new Error('OAuth failed')
  const data=await r.json();if(typeof data.access_token!=='string')throw new Error('No access token')
  return data.access_token as string
}
export async function POST(request:Request){
  if(!authorized(request))return reply(403,{error:'Forbidden'})
  const cfg=firebaseConfig();if(!cfg)return reply(503,{error:'Not configured'})
  try{
    const admin=serviceClient()
    const {data:jobs,error}=await admin.rpc('slbi_claim_fcm_jobs',{p_limit:20})
    if(error)throw Error('Queue unavailable')
    if(!jobs?.length)return reply(200,{sent:0})
    const token=await accessToken()
    let sent=0,failed=0
    await Promise.all((jobs as Job[]).map(async job=>{
      try{
        // Recheck the registration at send time, including revoked sessions.
        const {data:valid,error:checkError}=await admin.rpc('slbi_fcm_job_valid',{p_id:job.id})
        if(checkError)throw Error('Device check failed')
        if(!valid){await admin.from('fcm_delivery_jobs').delete().eq('id',job.id);return}
        const r=await fetch('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(cfg.config.projectId)+'/messages:send',{
          method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({message:{token:job.token,data:{id:job.id},webpush:{headers:{Urgency:'high',TTL:'300'}}}}),signal:AbortSignal.timeout(8000),cache:'no-store'})
        if(r.ok){sent++;await admin.from('fcm_delivery_jobs').delete().eq('id',job.id);return}
        const data=await r.json().catch(()=>({}))
        const unregistered=data.error?.details?.some((x:{errorCode?:string})=>x.errorCode==='UNREGISTERED')
        if(unregistered){await admin.from('fcm_devices').delete().eq('token',job.token);return}
        throw Error('FCM rejected message')
      }catch{
        failed++;
        if(job.attempts>=5)await admin.from('fcm_delivery_jobs').delete().eq('id',job.id)
        // Lease expiry makes transient failures eligible for retry.
      }
    }))
    return reply(200,{sent,failed})
  }catch{return reply(503,{error:'Dispatch unavailable'})}
}
