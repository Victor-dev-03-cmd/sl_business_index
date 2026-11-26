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

export async function hasHttpFileProof(hostname:string,expected:string):Promise<boolean>{
  // The hostname is already validated by the route, but repeat an invariant
  // here to prevent future callers accidentally reaching arbitrary endpoints.
  if(!/^[a-z0-9.-]{4,253}$/.test(hostname)||hostname.startsWith('.')||
     hostname.endsWith('.')||hostname.includes('..')||
     !/^slbi-verify=[a-f0-9]{48}$/.test(expected))return false;

  // Resolve BEFORE the request and pin the approved IP in the socket lookup.
  // This removes DNS rebinding between validation and the actual connection.
  // IPv6-only hosts fail safely rather than risking complex mapped IP ranges.
  let addresses;
  try{addresses=await Promise.race([
    lookup(hostname,{all:true,family:4,verbatim:true}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('resolver_timeout')),3500)),
  ])}catch{return false}
  if(!addresses.length||addresses.length>20||
    addresses.some(record=>record.family!==4||!isAllowedPublicIPv4(record.address)))return false;

  const pinned=addresses[0].address;
  return new Promise<boolean>(resolve=>{
    let finished=false;
    let deadline:ReturnType<typeof setTimeout>|undefined;
    const done=(value:boolean)=>{if(!finished){finished=true;if(deadline)clearTimeout(deadline);resolve(value)}};
    const req=httpsRequest({
      protocol:'https:',hostname,servername:hostname,
      port:443,path:SEO_HTTP_PROOF_PATH,method:'GET',
      // HTTPS hostname validation and SNI remain bound to the user's host,
      // while the actual TCP connection uses only our approved IP.
      lookup:(_host,_options,callback)=>callback(null,pinned,4),
      agent:false,
      headers:{'Accept':'text/plain','Accept-Encoding':'identity','User-Agent':'SLBI-Domain-Verification/1.0'},
      timeout:TIMEOUT_MS,
    },res=>{
      // No redirects, auth screens, status 206 or CDN fallbacks accepted.
      if(res.statusCode!==200){res.resume();done(false);return}
      const contentType=String(res.headers['content-type']||'');
      if(contentType&&!/^(text\/plain|application\/octet-stream)(;|$)/i.test(contentType)){
        res.resume();done(false);return;
      }
      let size=0;
      const chunks:Buffer[]=[];
      res.on('data',(chunk:Buffer)=>{
        size+=chunk.length;
        if(size>MAX_BYTES){req.destroy();done(false);return}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8').trim();
        done(text===expected);
      });
      res.on('error',()=>done(false));
    });
    req.on('timeout',()=>{req.destroy();done(false)});
    req.on('error',()=>done(false));
    req.end();
    deadline=setTimeout(()=>{req.destroy();done(false)},TIMEOUT_MS+500);
    deadline.unref?.();
  });
}
