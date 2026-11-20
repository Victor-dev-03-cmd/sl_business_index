import type {Instrumentation} from 'next'
export const onRequestError:Instrumentation.onRequestError=async(_error,_request,context)=>{
  if(process.env.NEXT_RUNTIME!=='nodejs')return
  // A failed notification route must not recursively generate alerts.
  if(context.routePath.startsWith('/api/internal/push')||context.routePath.startsWith('/api/notifications/critical')||context.routePath.startsWith('/api/push/'))return
  try{
    const {emitTrustedAlert}=await import('./lib/push/alerts')
    // No stack, raw message, URL, query or personal data enters the inbox.
    await emitTrustedAlert(null,'critical_server')
  }catch{console.warn('SLBI critical notification unavailable')}
}
