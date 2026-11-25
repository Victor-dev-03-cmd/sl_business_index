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
