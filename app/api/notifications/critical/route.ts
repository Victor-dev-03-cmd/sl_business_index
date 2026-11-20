import {createClient} from '@/lib/supabase/server'
import {emitTrustedAlert} from '@/lib/push/alerts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const reply=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'private, no-store'}})
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('content-type')!=='application/json')return reply(403)
  const {data:{user},error}=await (await createClient()).auth.getUser()
  if(error||!user)return reply(401)
  // Only a fixed self-directed event; never accept recipient, error text or stack.
  if((request.headers.get('content-length')||'0')!=='0'&&Number(request.headers.get('content-length'))>64)return reply(413)
  const raw=await request.text()
  if(raw!=='{"event":"render_failure"}')return reply(400)
  await emitTrustedAlert(user.id,'critical_frontend')
  return reply(204)
}
