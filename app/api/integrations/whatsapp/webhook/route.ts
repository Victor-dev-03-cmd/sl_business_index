import {inspectWA03BInbound,verifyWA03BChallenge} from '@/lib/growth/agent/wa03b-test-webhook.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const reply=(body:string,status:number)=>
 new Response(body,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
/** For Meta test number. Requires server-only Vercel env and enabled sandbox. */
export async function GET(request:Request){
 try{
  const result=verifyWA03BChallenge(new URL(request.url).search,process.env);
  return result.ok?reply(result.challenge,200):
   reply('Verification unavailable',result.code==='disabled'?503:403);
 }catch{return reply('Verification unavailable',403);}
}
/** Meta verifies raw HMAC. No persistence, WhatsApp reply or agent execution. */
export async function POST(request:Request){
 try{
  if(Number(request.headers.get('content-length')||0)>262144)return reply('Payload too large',413);
  const body=new Uint8Array(await request.arrayBuffer());
  if(body.byteLength>262144)return reply('Payload too large',413);
  const result=inspectWA03BInbound(body,request.headers.get('x-hub-signature-256'),process.env,Date.now());
  if(!result.ok){
   // Fixed reason code only: never log raw payload, signatures, IDs or secrets.
   const safeReason=['disabled','signature_invalid','validator_unavailable',
    'payload_invalid','unexpected_number'].includes(result.code)
    ?result.code:'rejected';
   // The detail is a small internal allowlist of parser stages, never user data.
   const safeDetails=['invalid_json','unexpected_meta_object','malformed_entry',
    'malformed_change','too_many_messages','malformed_event',
    'malformed_text_event','future_message','too_many_events',
    'other_payload_invalid'];
   const rawStep='detail' in result?result.detail:undefined;
   const detail=safeReason==='payload_invalid'&&typeof rawStep==='string'
    &&safeDetails.includes(rawStep)?rawStep:'none';
   console.warn('SLBI WA sandbox webhook POST rejected:',safeReason,detail);
   return reply('Webhook unavailable',result.code==='disabled'?503:403);
  }
  return reply('EVENT_RECEIVED',200);
 }catch{return reply('Webhook unavailable',403);}
}
