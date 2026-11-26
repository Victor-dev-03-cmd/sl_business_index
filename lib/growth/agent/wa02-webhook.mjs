/** WA02 signed webhook foundation. */
export const WA02_VERSION = 'neurogrowth-wa02-v1';
import {createHmac,timingSafeEqual} from 'node:crypto';
const bad=(reason,field)=>field?({ok:false,reason,field}):({ok:false,reason});
const goodSecret=s=>typeof s==='string'&&Buffer.byteLength(s,'utf8')>=24;
const mac=(s,b)=>createHmac('sha256',s).update(b).digest();
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(a,b);
const hex=(p,t,v)=>mac(p,Buffer.from(t+':'+v)).toString('hex');
export function verifyMetaSubscribeQuery(raw,token){
  if(!goodSecret(token)||typeof raw!=='string'||raw.length>2048)return bad('invalid_configuration');
  const q=new URLSearchParams(raw.startsWith('?')?raw.slice(1):raw);
  const keys=[...q.keys()];
  // Meta can send both its canonical hub.* keys and mirrored hub_* aliases.
  // Accept only complete forms with identical mirrored values, never partial
  // aliases, additional parameters, or duplicate keys.
  const dotted=['hub.mode','hub.challenge','hub.verify_token'];
  const underscored=['hub_mode','hub_challenge','hub_verify_token'];
  const hasDotted=dotted.every(k=>q.has(k));
  const hasUnderscored=underscored.every(k=>q.has(k));
  if((!hasDotted&&!hasUnderscored)||
   keys.length!==(hasDotted?3:0)+(hasUnderscored?3:0)||
   new Set(keys).size!==keys.length)return bad('malformed_challenge');
  if(hasDotted&&hasUnderscored&&dotted.some((k,i)=>q.get(k)!==q.get(underscored[i])))
   return bad('malformed_challenge');
  const names=hasDotted?dotted:underscored;
  const challenge=q.get(names[1]),provided=q.get(names[2]);
  if(q.get(names[0])!=='subscribe'||!challenge||!(/^[A-Za-z0-9_-]{1,256}$/).test(challenge)||!provided)return bad('malformed_challenge');
  if(!equal(Buffer.from(provided),Buffer.from(token)))return bad('token_mismatch');
  return {ok:true,challenge};
}
export function verifyMetaRawSignature(rawBody,header,appSecret){
 if(!goodSecret(appSecret)||!(Buffer.isBuffer(rawBody)||rawBody instanceof Uint8Array)||
 rawBody.byteLength<1||rawBody.byteLength>262144||typeof header!=='string'||
 !(/^sha256=[a-f0-9]{64}$/).test(header))return false;
 return equal(mac(appSecret,rawBody),Buffer.from(header.slice(7),'hex'));
}
function parseTextMessage(m,waba,phone,pepper,nowMs){
 if(!m||typeof m.type!=='string')return bad('malformed_event');
 if(m.type!=='text')return {ok:true,skip:true};
 if(typeof m.id!=='string'||!/^wamid\.[A-Za-z0-9_+/=-]{3,250}$/.test(m.id))
  return bad('malformed_text_event','id');
 if(typeof m.from!=='string'||!/^\d{6,20}$/.test(m.from))
  return bad('malformed_text_event','sender');
 if(typeof m.timestamp!=='string'||!/^\d{10}$/.test(m.timestamp))
  return bad('malformed_text_event','timestamp');
 if(typeof m.text?.body!=='string'||m.text.body.length>1024)
  return bad('malformed_text_event','body');
 const ts=Number(m.timestamp)*1000;
 if(ts>nowMs+60000)return bad('future_message');
 if(ts<nowMs-900000)return {ok:true,skip:true};
 const scope=waba+':'+phone;
 return {ok:true,event:Object.freeze({
  wabaId:waba,phoneNumberId:phone,
  senderHash:hex(pepper,'sender:'+scope,m.from),
  messageIdHash:hex(pepper,'message:'+scope,m.id),
  textHash:hex(pepper,'text',m.text.body.trim()),messageTimestampMs:ts,
 })};
}
export function inspectSignedWhatsAppWebhook({rawBody,signatureHeader,appSecret,identityPepper,nowMs}){
 if(!goodSecret(identityPepper)||!Number.isSafeInteger(nowMs)||nowMs<=0)return bad('invalid_configuration');
 if(!verifyMetaRawSignature(rawBody,signatureHeader,appSecret))return bad('invalid_signature');
 let data;try{data=JSON.parse(Buffer.from(rawBody).toString('utf8'));}catch{return bad('invalid_json');}
 if(!data||data.object!=='whatsapp_business_account'||!Array.isArray(data.entry)||data.entry.length>8)return bad('unexpected_meta_object');
 const events=[];
 for(const entry of data.entry){
  if(!/^[0-9]{6,25}$/.test(entry?.id)||!Array.isArray(entry.changes)||entry.changes.length>8)return bad('malformed_entry');
  for(const change of entry.changes){
   const value=change?.value,phone=value?.metadata?.phone_number_id;
   if(change?.field!=='messages'||value?.messaging_product!=='whatsapp'||
    typeof phone!=='string'||!/^[0-9]{6,25}$/.test(phone))return bad('malformed_change');
   const msgs=value.messages??[];
   if(!Array.isArray(msgs)||msgs.length>32)return bad('too_many_messages');
   for(const msg of msgs){
    const r=parseTextMessage(msg,entry.id,phone,identityPepper,nowMs);
    if(!r.ok)return r;
    if(!r.skip)events.push(r.event);
    if(events.length>32)return bad('too_many_events');
   }
  }
 }
 return {ok:true,signatureVerified:true,events:Object.freeze(events)};
}

/** No delivery; confirms opt-in, 24h/template rule and Meta eligibility gate. */
export function assessReplyPolicy({nowMs,lastInboundAtMs,optedIn,approvedTemplate,metaEligibility,recipientKind='owner'}){
 if(!Number.isSafeInteger(nowMs)||!Number.isSafeInteger(lastInboundAtMs)||
 lastInboundAtMs<=0||lastInboundAtMs>nowMs)return bad('invalid_window');
 if(metaEligibility!=='confirmed_by_meta')return bad('meta_eligibility_unconfirmed');
 if(optedIn!==true)return bad('opt_in_required');
 if(recipientKind!=='owner')return bad('customer_marketing_out_of_scope');
 if(nowMs-lastInboundAtMs<86400000)
 return {ok:true,window:'in_session',templateRequired:false,sent:false};
 if(approvedTemplate!==true)return bad('approved_template_required');
 return {ok:true,window:'template_only',templateRequired:true,sent:false};
}
