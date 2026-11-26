/**
 * Official Meta WhatsApp test-number callback safety gate.
 * No WhatsApp message, recipient phone number or text is persisted, logged or
 * exposed to an LLM; no provider token is used; no external message is sent.
 */
import {verifyMetaSubscribeQuery,inspectSignedWhatsAppWebhook} from './wa02-webhook.mjs';
const ID=/^[0-9]{6,25}$/;
const secret=s=>typeof s==='string'&&Buffer.byteLength(s,'utf8')>=24;
export const WA03B_KEYS=Object.freeze([
 'SLBI_WA_SANDBOX_WEBHOOK_ENABLED','SLBI_META_APP_SECRET','SLBI_META_VERIFY_TOKEN',
 'SLBI_WA_IDENTITY_PEPPER','SLBI_WA_TEST_WABA_ID','SLBI_WA_TEST_PHONE_NUMBER_ID',
]);
export function inspectWA03BConfig(env){
 const missing=WA03B_KEYS.slice(1).filter(k=>k.endsWith('_ID')
  ?!ID.test(env?.[k]||''):!secret(env?.[k]));
 const enabled=env?.SLBI_WA_SANDBOX_WEBHOOK_ENABLED==='true';
 return {enabled,ready:enabled&&missing.length===0,missing,
   mode:'official_test_number_only'};
}
export function verifyWA03BChallenge(query,env){
 if(!inspectWA03BConfig(env).ready)return {ok:false,code:'disabled'};
 const result=verifyMetaSubscribeQuery(query,env.SLBI_META_VERIFY_TOKEN);
 return result.ok?{ok:true,challenge:result.challenge}:
   {ok:false,code:'invalid_challenge'};
}
export function inspectWA03BInbound(raw,signature,env,nowMs){
 if(!inspectWA03BConfig(env).ready)return {ok:false,code:'disabled'};
 const verified=inspectSignedWhatsAppWebhook({
   rawBody:raw,signatureHeader:signature,appSecret:env.SLBI_META_APP_SECRET,
   identityPepper:env.SLBI_WA_IDENTITY_PEPPER,nowMs,
 });
 // Expose only fixed diagnostic categories; never log/return raw body, phone,
 // webhook signature, token or secret. A failed check always remains HTTP 403.
 if(!verified.ok){
   if(verified.reason==='invalid_signature')return {ok:false,code:'signature_invalid'};
   if(verified.reason==='invalid_configuration')return {ok:false,code:'validator_unavailable'};
   // Safe, fixed parser-step label only, never the input or a variable field.
   // Helps distinguish real message structure from Meta dashboard samples.
   const steps=[
     'invalid_json','unexpected_meta_object','malformed_entry',
     'malformed_change','too_many_messages','malformed_event',
     'malformed_text_event','future_message','too_many_events',
   ];
   const reason=steps.includes(verified.reason)?verified.reason:'other_payload_invalid';
   const fields=['id','sender','timestamp','body'];
   const detail=reason==='malformed_text_event'&&fields.includes(verified.field)
     ?reason+'_'+verified.field:reason;
   return {ok:false,code:'payload_invalid',detail};
 }
 // Require exact owned test WABA / test phone to reject unexpected live number.
 if(!verified.events.every(e=>e.wabaId===env.SLBI_WA_TEST_WABA_ID
   &&e.phoneNumberId===env.SLBI_WA_TEST_PHONE_NUMBER_ID))
  return {ok:false,code:'unexpected_number'};
 return {ok:true,eventCount:verified.events.length,
   messageStored:false,rawPhoneStored:false,modelInvoked:false,
   businessLinked:false,outboundPerformed:false};
}
