/**
 * Gmail Growth AI groundwork — safe, deterministic triage in the isolated preview.
 * No LLM, persistent inbox storage, new AI training data or automatic sends.
 * All provider content is untrusted: classification never executes its instructions.
 */
export type GmailTriageKind='customer_enquiry'|'booking_request'|'support_request'|'promotion'|'other';
export type GmailTriage={
  kind:GmailTriageKind;
  label:string;
  nextStep:string;
  requiresHumanReview:true;
  outboundAuthorized:false;
};

const KEYWORDS:readonly {kind:GmailTriageKind;label:string;nextStep:string;terms:readonly string[]}[]=[
  {kind:'support_request',label:'Support / issue',nextStep:'Review the issue and prepare a helpful reply draft.',terms:['refund','complaint','problem','not working','support','error','பிரச்சனை','புகார்','உதவி','ගැටලු','පැමිණිල්ල']},
  {kind:'booking_request',label:'Booking / appointment',nextStep:'Check availability before writing a booking reply.',terms:['appointment','booking','reservation','schedule a visit','சந்திப்பு','முன்பதிவு','நேரம்','වෙන්කරවා','හමුවීම']},
  {kind:'customer_enquiry',label:'Customer enquiry',nextStep:'Check verified business facts before drafting a response.',terms:['quotation','quote','price','enquiry','inquiry','availability','how much','விலை','விசாரணை','கிடைக்குமா','මිල','විමසීම','ගාස්තු']},
  {kind:'promotion',label:'Marketing / promotion',nextStep:'Do not add this sender to a marketing audience without recorded opt-in.',terms:['discount','promotion','newsletter','offer','marketing','சலுகை','விளம்பரம்','වට්ටම්','ප්‍රවර්ධන']},
];
export function classifyGmailSubject(subject:unknown):GmailTriage{
  const clean=typeof subject==='string'
    ?subject.normalize('NFKC').slice(0,180).toLocaleLowerCase():''; 
  const selected=KEYWORDS.find(x=>x.terms.some(t=>clean.includes(t)));
  return {
    kind:selected?.kind||'other',
    label:selected?.label||'Needs review',
    nextStep:selected?.nextStep||'Review the message manually before proposing any action.',
    requiresHumanReview:true,
    outboundAuthorized:false,
  };
}
export type GmailPreviewMessage={
  id:string;
  from:string;
  subject:string;
  date:string;
  triage:GmailTriage;
};

function getHeader(headers:unknown,name:'From'|'Subject'|'Date'):string{
  if(!Array.isArray(headers))return '';
  const match=headers.find(h=>h&&typeof h==='object'&&
    typeof (h as {name?:unknown}).name==='string'&&
    (h as {name:string}).name.toLowerCase()===name.toLowerCase()) as {value?:unknown}|undefined;
  return typeof match?.value==='string'?match.value.replace(/[\u0000-\u001F\u007F]/g,' ').slice(0,name==='Subject'?180:220):'';
}
const ID=/^[A-Za-z0-9_-]{1,128}$/;
async function googleJson(url:string,token:string,http:typeof fetch):Promise<Record<string,unknown>>{
  const response=await http(url,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/json'},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw new Error('Google mailbox preview unavailable');
  if(Number(response.headers.get('content-length')||0)>131072)throw new Error('Google mailbox response too large');
  const raw=await response.text();
  if(raw.length>131072)throw new Error('Google mailbox response too large');
  const obj:unknown=JSON.parse(raw);
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('Invalid Google mailbox result');
  return obj as Record<string,unknown>;
}

/** Official Gmail REST API. Only INBOX message headers: never body, attachments,
 * raw messages, recipients list, full mailbox sync, or provider writes.
 * Invoked only by the authenticated preview route after exact owner/scope gates.
 */
export async function readGmailPreviewHeaders(token:string,http:typeof fetch=fetch):Promise<GmailPreviewMessage[]>{
  if(typeof token!=='string'||token.length<10||token.length>16000)throw new Error('Invalid access token');
  const list=await googleJson('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&labelIds=INBOX',token,http);
  const ids=Array.isArray(list.messages)?list.messages.slice(0,5).map(x=>
    x&&typeof x==='object'?(x as {id?:unknown}).id:null).filter((id):id is string=>typeof id==='string'&&ID.test(id)):[];
  const result:GmailPreviewMessage[]=[];
  // Sequential, capped requests: prevent bursts and bound provider costs.
  for(const id of ids){
    const path='https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id)
      +'?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date';
    const item=await googleJson(path,token,http);
    if(item.id!==id)throw new Error('Google mailbox ID mismatch');
    const payload=item.payload as {headers?:unknown}|undefined;
    const subject=getHeader(payload?.headers,'Subject')||'(no subject)';
    result.push({id,from:getHeader(payload?.headers,'From')||'Unknown sender',
      subject,date:getHeader(payload?.headers,'Date'),triage:classifyGmailSubject(subject)});
  }
  return result;
}

export async function refreshGooglePreviewAccessToken(
  config:{clientId:string;clientSecret:string},refreshToken:string,http:typeof fetch=fetch,
):Promise<string>{
  if(typeof refreshToken!=='string'||refreshToken.length<10||refreshToken.length>16000)
    throw new Error('Invalid refresh credential');
  const response=await http('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken,
      client_id:config.clientId,client_secret:config.clientSecret}),
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)throw new Error('Google mailbox authorization expired');
  const result=await response.json() as Record<string,unknown>;
  if(result.token_type!=='Bearer'||typeof result.access_token!=='string'||
     result.access_token.length<10||result.access_token.length>16000)
    throw new Error('Invalid refreshed Google authorization');
  return result.access_token;
}
