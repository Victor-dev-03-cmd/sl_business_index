import {firebaseConfig} from '@/lib/push/config'
export const dynamic='force-dynamic'
export function GET(request:Request){
  const data=firebaseConfig()
  const headers={'Cache-Control':'private, no-store, max-age=0'}
  if(new URL(request.url).searchParams.get('format')==='script'){
    return new Response('self.SLBI_FIREBASE_CONFIG='+JSON.stringify(data?.config||null)+';',{
      headers:{...headers,'Content-Type':'application/javascript; charset=utf-8'}
    })
  }
  return Response.json(data?{enabled:true,...data}:{enabled:false},{headers})
}
