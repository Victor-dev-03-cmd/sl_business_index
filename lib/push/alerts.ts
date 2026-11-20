import 'server-only'
import {serviceClient} from '@/lib/push/server'
type BillingEvent='billing_submitted'|'billing_cancelled'|'billing_reviewing'|'billing_awaiting_payment'|'billing_rejected'|'billing_activated'
type CriticalEvent='critical_billing'|'critical_server'|'critical_frontend'
export async function emitTrustedAlert(userId:string|null,event:BillingEvent|CriticalEvent,reference=''){
  try{
    const client=serviceClient()
    const {error}=await client.rpc('slbi_emit_trusted_alert',{p_user:userId,p_event:event,p_reference:reference})
    if(error)console.warn('SLBI notification bridge unavailable',event)
  }catch{console.warn('SLBI notification bridge unavailable',event)}
}
export async function billingFailure(userId:string){
  await Promise.all([emitTrustedAlert(userId,'critical_billing'),emitTrustedAlert(null,'critical_billing')])
}
