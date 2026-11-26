import 'server-only';

import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {BlockList} from 'node:net';

// Public fixed endpoint; callers never supply a URL, path or port.
export const SEO_HTTP_PROOF_PATH='/.well-known/slbi-verification.txt';
const MAX_BYTES=512;
const TIMEOUT_MS=6500;

// Deny private, local, metadata, shared, test and other non-public IPv4
// address ranges. HTTP proof only uses pinned public IPv4 A records.
const blocked=new BlockList();
for(const [address,mask] of [
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],
  ['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],
  ['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],
  ['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],
  ['224.0.0.0',4],['240.0.0.0',4],
] as const)blocked.addSubnet(address,mask,'ipv4');

export const isAllowedPublicIPv4=(address:string)=>!blocked.check(address,'ipv4');


type HttpProofFailureCode =
  | 'verification_file_bad_hostname'
  | 'verification_file_dns_error'
  | 'verification_file_unsafe_dns'
  | 'verification_file_unreachable'
  | 'verification_file_redirect'
  | 'verification_file_http_status'
  | 'verification_file_content_type'
  | 'verification_file_too_large'
  | 'verification_file_token_mismatch'
  | 'verification_file_tls_error'
  | 'verification_file_timeout';

export type HttpProofCheck =
  | {ok:true}
  | {ok:false;code:HttpProofFailureCode};

const failure=(code:HttpProofFailureCode):HttpProofCheck=>({ok:false,code});

/** Exact public HTTP proof, with safe non-secret diagnostics for the owner. */
export async function inspectHttpFileProof(hostname:string,expected:string):Promise<HttpProofCheck>{
  // Never fetch any URL, path, port or IP furnished by the web client.
  if(!/^[a-z0-9.-]{4,253}$/.test(hostname)||hostname.startsWith('.')||
     hostname.endsWith('.')||hostname.includes('..')||
     !/^slbi-verify=[a-f0-9]{48}$/.test(expected))return failure('verification_file_bad_hostname');

  // Resolve the domain once, reject private addresses and pin the public IP
  // to the TLS socket while validating the original hostname certificate.
  let addresses;
  try{addresses=await Promise.race([
    lookup(hostname,{all:true,family:4,verbatim:true}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('resolver_timeout')),3500)),
  ])}catch{return failure('verification_file_dns_error')}
  if(!addresses.length||addresses.length>20||
    addresses.some(record=>record.family!==4||!isAllowedPublicIPv4(record.address)))
    return failure('verification_file_unsafe_dns');

  // CDN-backed hosts (including Vercel) can resolve to several public IPs.
  // A first-edge TCP error must not automatically mean the proof is missing.
  // Keep the original hostname/SNI and pin each HTTPS attempt independently.
  const attempts=[...new Set(addresses.map(record=>record.address))].slice(0,3);
  const deadline=Date.now()+TIMEOUT_MS;
  let lastFailure:HttpProofCheck=failure('verification_file_unreachable');
  for(let index=0;index<attempts.length;index++){
    const remaining=deadline-Date.now();
    if(remaining<350)break;
    const budget=Math.min(remaining,Math.max(1200,Math.floor(remaining/(attempts.length-index))));
    const result=await inspectPublicIp(hostname,expected,attempts[index],budget);
    if(result.ok)return result;
    lastFailure=result;
    // Do NOT treat a direct HTTP response as an unavailable connection.
    // A mismatched token must never be mistaken for a successful proof.
    if(!['verification_file_unreachable','verification_file_timeout','verification_file_tls_error'].includes(result.code))
      return result;
  }
  return lastFailure;
}

/** One bounded TLS request to a DNS-validated, pinned public address. */
function inspectPublicIp(hostname:string,expected:string,pinned:string,timeoutMs:number):Promise<HttpProofCheck>{
  return new Promise<HttpProofCheck>(resolve=>{
    let finished=false;
    let deadline:ReturnType<typeof setTimeout>|undefined;
    const done=(result:HttpProofCheck)=>{
      if(finished)return;
      finished=true;
      if(deadline)clearTimeout(deadline);
      resolve(result);
    };
    const req=httpsRequest({
      protocol:'https:',hostname,servername:hostname,
      port:443,path:SEO_HTTP_PROOF_PATH,method:'GET',
      lookup:(_host,_options,callback)=>callback(null,pinned,4),
      agent:false,
      headers:{'Accept':'text/plain','Accept-Encoding':'identity','User-Agent':'SLBI-Domain-Verification/1.0'},
      timeout:timeoutMs,
    },res=>{
      if(res.statusCode!==200){
        res.resume();
        done(failure(res.statusCode&&res.statusCode>=300&&res.statusCode<400
          ?'verification_file_redirect':'verification_file_http_status'));
        return;
      }
      const contentType=String(res.headers['content-type']||'');
      if(contentType&&!/^(text\/plain|application\/octet-stream)(;|$)/i.test(contentType)){
        res.resume();done(failure('verification_file_content_type'));return;
      }
      let size=0;
      const chunks:Buffer[]=[];
      res.on('data',(chunk:Buffer)=>{
        size+=chunk.length;
        if(size>MAX_BYTES){
          done(failure('verification_file_too_large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8').trim();
        done(text===expected?{ok:true}:failure('verification_file_token_mismatch'));
      });
      res.on('aborted',()=>done(failure('verification_file_unreachable')));
      res.on('error',()=>done(failure('verification_file_unreachable')));
    });
    req.on('timeout',()=>{done(failure('verification_file_timeout'));req.destroy()});
    req.on('error',(err:NodeJS.ErrnoException)=>{
      done(failure(err.code&&/(CERT|TLS|SSL|ALTNAME|SELF_SIGNED)/i.test(err.code)
        ?'verification_file_tls_error':'verification_file_unreachable'));
    });
    // Timeout covers TLS handshake, response headers and full text body.
    deadline=setTimeout(()=>{done(failure('verification_file_timeout'));req.destroy()},timeoutMs);
    deadline.unref?.();
    req.end();
  });
}

export async function hasHttpFileProof(hostname:string,expected:string):Promise<boolean>{
  return (await inspectHttpFileProof(hostname,expected)).ok;
}
