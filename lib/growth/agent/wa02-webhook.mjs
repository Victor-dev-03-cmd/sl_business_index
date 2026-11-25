/** WA02 signed webhook foundation. */
export const WA02_VERSION = 'neurogrowth-wa02-v1';
import {createHmac,timingSafeEqual} from 'node:crypto';
const bad=reason=>({ok:false,reason});
const goodSecret=s=>typeof s==='string'&&Buffer.byteLength(s,'utf8')>=24;
const mac=(s,b)=>createHmac('sha256',s).update(b).digest();
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(a,b);
const hex=(p,t,v)=>mac(p,Buffer.from(t+':'+v)).toString('hex');
export function verifyMetaSubscribeQuery(raw,token){
  if(!goodSecret(token)||typeof raw!=='string'||raw.length>2048)return bad('invalid_configuration');
  const q=new URLSearchParams(raw.startsWith('?')?raw.slice(1):raw);
  const keys=[...q.keys()];
  if(keys.length!==3||new Set(keys).size!==3||!['hub.mode','hub.challenge','hub.verify_token'].every(k=>q.has(k)))return bad('malformed_challenge');
  const challenge=q.get('hub.challenge'),provided=q.get('hub.verify_token');
  if(q.get('hub.mode')!=='subscribe'||!challenge||!(/^[A-Za-z0-9_-]{1,256}$/).test(challenge)||!provided)return bad('malformed_challenge');
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
 if(typeof m.id!=='string'||!/^wamid[.A-Za-z0-9_:-]{3,250}$/.test(m.id)||
 typeof m.from!=='string'||!/^\d{6,20}$/.test(m.from)||
 typeof m.timestamp!=='string'||!/^\d{10}$/.test(m.timestamp)||
 typeof m.text?.body!=='string'||m.text.body.length>1024)
 return bad('malformed_text_event');
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
