import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyMetaSubscribeQuery,verifyMetaRawSignature,inspectSignedWhatsAppWebhook,assessReplyPolicy} from '../../lib/growth/agent/wa02-webhook.mjs';
import {createSyntheticLinkIntent,evaluateSignedLinkConfirmationDryRun,evaluateSignedOwnerMessageDryRun} from '../../lib/growth/agent/wa02-linking.mjs';
const NOW=Date.parse('2026-11-25T15:50:00.000Z');
const APP='meta-app-secret-abcdefghijklmnopqrstuvwxyz';
const VERIFY='webhook-verify-token-abcdefghijklmnopqrstuvwxyz';
const PEPPER='private-identity-pepper-abcdefghijklmnopqrstuvwxyz';
const U='11111111-1111-4111-8111-111111111111';
const B='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WABA='123456789012345',PHONE='234567890123456',SENDER='94771234567';
const scope=()=>({ownerId:U,ownedApprovedBusinessIds:[B]});
function payload(text='SLBI LINK placeholder',options={}){
 const obj={object:'whatsapp_business_account',entry:[{id:options.wabaId??WABA,
 changes:[{field:'messages',value:{messaging_product:'whatsapp',
 metadata:{phone_number_id:options.phoneId??PHONE},messages:[{
 id:options.msgId??'wamid.HBg123456789abcdef',from:options.from??SENDER,
 timestamp:String(Math.floor((options.time??NOW)/1000)),type:'text',text:{body:text},
 }]}}]}]};
 return Buffer.from(JSON.stringify(obj),'utf8');
}
const signature=raw=>'sha256='+createHmac('sha256',APP).update(raw).digest('hex');
const input=(raw,extra={})=>({rawBody:raw,signatureHeader:signature(raw),appSecret:APP,identityPepper:PEPPER,nowMs:NOW,...extra});
const intent=()=>createSyntheticLinkIntent({serverOwnerScope:scope(),businessId:B,
 channelBindingId:'link:owner-1',wabaId:WABA,phoneNumberId:PHONE,
 identityPepper:PEPPER,nowMs:NOW-1000});

test('valid Meta challenge requires exact secret and no duplicates',()=>{
 const good=verifyMetaSubscribeQuery('hub.mode=subscribe&hub.challenge=98765&hub.verify_token='+VERIFY,VERIFY);
 assert.deepEqual(good,{ok:true,challenge:'98765'});
 assert.equal(verifyMetaSubscribeQuery('hub.mode=subscribe&hub.challenge=12&hub.verify_token=wrong',VERIFY).ok,false);
 assert.equal(verifyMetaSubscribeQuery('hub.mode=subscribe&hub.challenge=12&hub.verify_token='+VERIFY+'&hub.verify_token=duplicate',VERIFY).ok,false);
 assert.equal(verifyMetaSubscribeQuery('hub.mode=unsubscribe&hub.challenge=12&hub.verify_token='+VERIFY,VERIFY).ok,false);
});
test('realistic padded base64 WhatsApp IDs are allowed, malformed IDs rejected',()=>{
 const base=JSON.parse(payload('hello').toString('utf8'));
 const msg=base.entry[0].changes[0].value.messages[0];
 msg.id='wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQUQ0N0VFMDA2MTQ0RkJFNkNDNAA=';
 const raw=Buffer.from(JSON.stringify(base));
 const result=inspectSignedWhatsAppWebhook(input(raw));
 assert.equal(result.ok,true);
 assert.equal(result.events.length,1);
 assert.match(result.events[0].messageIdHash,/^[a-f0-9]{64}$/);
 for(const badId of ['wamid.', 'wamid.bad*id', 'notwamid.xyz', 'wamid.'+'a'.repeat(251)]){
  msg.id=badId;
  const bytes=Buffer.from(JSON.stringify(base));
  assert.equal(inspectSignedWhatsAppWebhook(input(bytes)).reason,'malformed_text_event');
 }
});
test('raw Meta signature validates untampered bytes before JSON parsing',()=>{
 const raw=payload();assert.equal(verifyMetaRawSignature(raw,signature(raw),APP),true);
 assert.equal(verifyMetaRawSignature(Buffer.concat([raw,Buffer.from(' ')]),signature(raw),APP),false);
 assert.equal(verifyMetaRawSignature(raw,'sha256=xyz',APP),false);
 assert.equal(verifyMetaRawSignature(raw,signature(raw),'wrong'),false);
 assert.equal(verifyMetaRawSignature(raw.toString('utf8'),signature(raw),APP),false);
});
test('sanitized signed envelopes expose no phone numbers or text',()=>{
 const r=inspectSignedWhatsAppWebhook(input(payload('private marketing message')));
 assert.equal(r.ok,true);assert.equal(r.events.length,1);
 assert.match(r.events[0].senderHash,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(r).includes(SENDER),false);
 assert.equal(JSON.stringify(r).includes('private marketing message'),false);
 assert.equal(JSON.stringify(r).includes('wamid.HBg'),false);
});
test('unsigned, future and expired messages deny or produce no events',()=>{
 const raw=payload('test',{time:NOW+120000});
 assert.equal(inspectSignedWhatsAppWebhook(input(raw)).ok,false);
 const old=payload('test',{time:NOW-20*60000});
 assert.equal(inspectSignedWhatsAppWebhook(input(old)).events.length,0);
 const wrong=input(payload());wrong.signatureHeader='sha256='+('0'.repeat(64));
 assert.equal(inspectSignedWhatsAppWebhook(wrong).ok,false);
});
test('link intent requires verified owner/business and is short-lived',()=>{
 const r=intent();assert.equal(r.ok,true);
 assert.equal(r.intent.ownerId,U);assert.equal(r.intent.businessId,B);
 assert.equal(r.intent.expiresAtMs-r.intent.issuedAtMs,300000);
 assert.match(r.oneTimePrivateInstruction,/^SLBI LINK [A-Za-z0-9_-]{32}$/);
 assert.equal(JSON.stringify(r.intent).includes(r.oneTimePrivateInstruction),false);
 const cross=createSyntheticLinkIntent({serverOwnerScope:scope(),businessId:OTHER,
  channelBindingId:'link:owner-1',wabaId:WABA,phoneNumberId:PHONE,
  identityPepper:PEPPER,nowMs:NOW});
 assert.equal(cross.ok,false);
});
test('signed code with matching WABA/phone produces mock-only link candidate',async()=>{
 const r=intent(),raw=payload(r.oneTimePrivateInstruction);
 const result=await evaluateSignedLinkConfirmationDryRun({
  ...input(raw),intent:r.intent,serverOwnerScope:scope(),
  atomicConsumeVerifiedLink:async()=>true});
 assert.equal(result.ok,true);
 assert.equal(result.status,'synthetic_link_candidate');
 assert.equal(result.linkPersisted,false);assert.equal(result.messagesSent,false);
 assert.equal(JSON.stringify(result).includes(SENDER),false);
});
test('wrong code, wrong business receiver, invalid signature and stale intent deny',async()=>{
 const r=intent();const run=(raw,extra={})=>evaluateSignedLinkConfirmationDryRun({
  ...input(raw),intent:r.intent,serverOwnerScope:scope(),
  atomicConsumeVerifiedLink:async()=>true,...extra});
 assert.equal((await run(payload('SLBI LINK wrong'))).ok,false);
 assert.equal((await run(payload(r.oneTimePrivateInstruction,{phoneId:'7777777777'}))).ok,false);
 assert.equal((await run(payload(r.oneTimePrivateInstruction),{signatureHeader:'sha256='+('a'.repeat(64))})).ok,false);
 assert.equal((await run(payload(r.oneTimePrivateInstruction),{nowMs:NOW+301000})).ok,false);
 assert.equal((await run(payload(r.oneTimePrivateInstruction),{serverOwnerScope:{ownerId:U,ownedApprovedBusinessIds:[]}})).ok,false);
});
test('atomic claim denies link replay, store outage and ambiguous sender events',async()=>{
 const r=intent(),raw=payload(r.oneTimePrivateInstruction),seen=new Set();
 const claim=c=>{if(seen.has(c.intentId))return false;seen.add(c.intentId);return true;};
 const args={...input(raw),intent:r.intent,serverOwnerScope:scope(),atomicConsumeVerifiedLink:claim};
 assert.equal((await evaluateSignedLinkConfirmationDryRun(args)).ok,true);
 assert.equal((await evaluateSignedLinkConfirmationDryRun(args)).ok,false);
 assert.equal((await evaluateSignedLinkConfirmationDryRun({...args,atomicConsumeVerifiedLink:null})).ok,false);
 assert.equal((await evaluateSignedLinkConfirmationDryRun({...args,atomicConsumeVerifiedLink:()=>{throw Error('DB down')}})).ok,false);
});
test('signed owner messages require active exact binding, RLS owner and dedupe',async()=>{
 const raw=payload('prepare campaign'),parsed=inspectSignedWhatsAppWebhook(input(raw)),e=parsed.events[0];
 const binding={ownerId:U,businessId:B,channelBindingId:'link:owner-1',
  wabaId:WABA,phoneNumberId:PHONE,senderHash:e.senderHash,status:'active'};
 const seen=new Set(),reserve=c=>{if(seen.has(c.messageIdHash))return false;seen.add(c.messageIdHash);return true;};
 const args={...input(raw),serverVerifiedBindings:[binding],serverOwnerScopes:[scope()],atomicReserveMessageOnce:reserve};
 const ok=await evaluateSignedOwnerMessageDryRun(args);
 assert.equal(ok.status,'synthetic_owner_message_candidate');assert.equal(ok.agentExecuted,false);
 assert.equal((await evaluateSignedOwnerMessageDryRun(args)).ok,false);
 assert.equal((await evaluateSignedOwnerMessageDryRun({...args,serverVerifiedBindings:[{...binding,status:'revoked'}]})).ok,false);
 assert.equal((await evaluateSignedOwnerMessageDryRun({...args,serverOwnerScopes:[]})).ok,false);
 assert.equal((await evaluateSignedOwnerMessageDryRun({...args,serverVerifiedBindings:[binding,binding]})).ok,false);
 assert.equal(JSON.stringify(ok).includes('prepare campaign'),false);
});
test('policy rejects AI eligibility, non opt-in, customer marketing and expired freeform window',()=>{
 const p={nowMs:NOW,lastInboundAtMs:NOW-1000,optedIn:true,approvedTemplate:false,
  metaEligibility:'confirmed_by_meta'};
 assert.equal(assessReplyPolicy(p).window,'in_session');
 assert.equal(assessReplyPolicy({...p,metaEligibility:'unknown'}).ok,false);
 assert.equal(assessReplyPolicy({...p,optedIn:false}).ok,false);
 assert.equal(assessReplyPolicy({...p,recipientKind:'customer'}).ok,false);
 assert.equal(assessReplyPolicy({...p,lastInboundAtMs:NOW-86400001}).ok,false);
 assert.equal(assessReplyPolicy({...p,lastInboundAtMs:NOW-86400001,approvedTemplate:true}).window,'template_only');
});
