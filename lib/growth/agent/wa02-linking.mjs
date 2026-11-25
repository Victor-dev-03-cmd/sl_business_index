/** WA-02: mock-only owner binding and incoming replay contract. No live accounts. */
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {WA02_VERSION,inspectSignedWhatsAppWebhook} from './wa02-webhook.mjs';
const bad=reason=>({ok:false,reason});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ACCOUNT=/^[0-9]{6,25}$/,HEX=/^[a-f0-9]{64}$/;
const REF=/^[a-zA-Z0-9:_-]{6,80}$/;
const scoped=(s,b)=>s&&UUID.test(s.ownerId)&&UUID.test(b)&&
 Array.isArray(s.ownedApprovedBusinessIds)&&s.ownedApprovedBusinessIds.includes(b);
const goodPepper=p=>typeof p==='string'&&Buffer.byteLength(p,'utf8')>=24;
const textHash=(p,t)=>createHmac('sha256',p).update('text:'+t).digest('hex');
const TTL=300000;
/** Mock-only intent; real request MUST be initiated from signed-in RLS-verified owner. */
export function createSyntheticLinkIntent({serverOwnerScope,businessId,channelBindingId,
 wabaId,phoneNumberId,identityPepper,nowMs,expectedSenderHash=null}){
 if(!Number.isSafeInteger(nowMs)||nowMs<=0||!scoped(serverOwnerScope,businessId)||
 !REF.test(channelBindingId)||!ACCOUNT.test(wabaId)||!ACCOUNT.test(phoneNumberId)||
 !goodPepper(identityPepper)||(expectedSenderHash!==null&&!HEX.test(expectedSenderHash)))
 return bad('unverified_link_configuration');
 const text='SLBI LINK '+randomBytes(24).toString('base64url');
 const intent=Object.freeze({version:WA02_VERSION,intentId:randomUUID(),ownerId:serverOwnerScope.ownerId,
 businessId,channelBindingId,wabaId,phoneNumberId,expectedSenderHash,
 confirmationHash:textHash(identityPepper,text),issuedAtMs:nowMs,expiresAtMs:nowMs+TTL});
 return {ok:true,intent,oneTimePrivateInstruction:text};
}
function validIntent(i,scope,now){
 return i&&i.version===WA02_VERSION&&UUID.test(i.intentId)&&UUID.test(i.ownerId)&&
 scoped(scope,i.businessId)&&scope.ownerId===i.ownerId&&REF.test(i.channelBindingId)&&
 ACCOUNT.test(i.wabaId)&&ACCOUNT.test(i.phoneNumberId)&&HEX.test(i.confirmationHash)&&
 (i.expectedSenderHash===null||HEX.test(i.expectedSenderHash))&&
 Number.isSafeInteger(i.issuedAtMs)&&Number.isSafeInteger(i.expiresAtMs)&&
 i.expiresAtMs-i.issuedAtMs===TTL&&now>=i.issuedAtMs&&now<i.expiresAtMs;
}
/** Dry-run only. Atomic DB callback MUST reserve intent + unique sender across tenants. */
export async function evaluateSignedLinkConfirmationDryRun({intent,serverOwnerScope,rawBody,
 signatureHeader,appSecret,identityPepper,nowMs,atomicConsumeVerifiedLink}){
 if(!Number.isSafeInteger(nowMs)||!validIntent(intent,serverOwnerScope,nowMs))
 return bad('expired_or_unowned_intent');
 const parsed=inspectSignedWhatsAppWebhook({rawBody,signatureHeader,appSecret,identityPepper,nowMs});
 if(!parsed.ok)return parsed;
 const matches=parsed.events.filter(e=>e.wabaId===intent.wabaId&&
 e.phoneNumberId===intent.phoneNumberId&&e.textHash===intent.confirmationHash&&
 e.messageTimestampMs>=intent.issuedAtMs&&
 (intent.expectedSenderHash===null||intent.expectedSenderHash===e.senderHash));
 if(matches.length!==1)return bad('missing_or_ambiguous_link_code');
 if(typeof atomicConsumeVerifiedLink!=='function')return bad('atomic_link_store_required');
 const e=matches[0];
 const claim=Object.freeze({intentId:intent.intentId,ownerId:intent.ownerId,
 businessId:intent.businessId,channelBindingId:intent.channelBindingId,
 wabaId:e.wabaId,phoneNumberId:e.phoneNumberId,senderHash:e.senderHash,
 messageIdHash:e.messageIdHash,expiresAtMs:intent.expiresAtMs});
 try{if(await atomicConsumeVerifiedLink(claim)!==true)return bad('link_replayed_or_sender_conflict');}
 catch{return bad('link_store_unavailable');}
 return {ok:true,status:'synthetic_link_candidate',ownerId:intent.ownerId,
 businessId:intent.businessId,channelBindingId:intent.channelBindingId,
 senderHash:e.senderHash,linkPersisted:false,messagesSent:false};
}
/** Process no command; server-injected binding is only a mock for future RLS lookup. */
export async function evaluateSignedOwnerMessageDryRun({rawBody,signatureHeader,appSecret,
 identityPepper,nowMs,serverVerifiedBindings,serverOwnerScopes,atomicReserveMessageOnce}){
 const parsed=inspectSignedWhatsAppWebhook({rawBody,signatureHeader,appSecret,identityPepper,nowMs});
 if(!parsed.ok)return parsed;
 if(!Array.isArray(serverVerifiedBindings)||!Array.isArray(serverOwnerScopes)||
 typeof atomicReserveMessageOnce!=='function')return bad('missing_trusted_binding_store');
 if(parsed.events.length!==1)return bad('ambiguous_inbound_event');
 const e=parsed.events[0],matches=serverVerifiedBindings.filter(b=>
 b&&b.status==='active'&&b.wabaId===e.wabaId&&b.phoneNumberId===e.phoneNumberId&&
 b.senderHash===e.senderHash&&UUID.test(b.ownerId)&&UUID.test(b.businessId)&&
 REF.test(b.channelBindingId));
 if(matches.length!==1)return bad('missing_revoked_or_ambiguous_binding');
 const binding=matches[0];
 if(serverOwnerScopes.filter(s=>scoped(s,binding.businessId)&&s.ownerId===binding.ownerId).length!==1)
 return bad('owner_scope_not_verified');
 const claim=Object.freeze({ownerId:binding.ownerId,businessId:binding.businessId,
 channelBindingId:binding.channelBindingId,messageIdHash:e.messageIdHash});
 try{if(await atomicReserveMessageOnce(claim)!==true)return bad('duplicate_or_unavailable_message');}
 catch{return bad('message_store_unavailable');}
 return {ok:true,status:'synthetic_owner_message_candidate',ownerId:binding.ownerId,
 businessId:binding.businessId,channelBindingId:binding.channelBindingId,
 messageIdHash:e.messageIdHash,rawMessageExposed:false,agentExecuted:false,messagesSent:false};
}
