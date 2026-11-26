import 'server-only';

import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getWebsiteGuideHostname} from '@/lib/seo/owner-readiness';
import {randomBytes} from 'node:crypto';
import {resolveTxt} from 'node:dns/promises';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDERS=new Set(['Vercel','Cloudflare','GoDaddy','Namecheap','Hostinger','Other provider']);
type Operation='start'|'verify'|'disconnect';
type Payload={action:Operation;businessId:string;hostname?:string;provider?:string};
const denied=(status:number,code:string)=>Response.json({ok:false,code},{status,headers});

function safeHostname(value:unknown):string|null {
  if(typeof value!=='string')return null;
  const host=getWebsiteGuideHostname(value);
  if(!host)return null;
  // This feature is for public, registrable DNS domains only.
  if(host==='slbusinessindex.com'||host.endsWith('.slbusinessindex.com')||
    /\.(?:internal|local|localhost|test|invalid|example|onion|arpa)$/.test(host))return null;
  return host;
}

function admin(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  // Never return this client/credential to the browser or AI context.
  return createAdminClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
}

const asPublicConnection=(record:Record<string,unknown>)=>({
  hostname:record.hostname,
  provider:record.provider,
  state:record.state,
  txtRecordName:record.txt_record_name,
  txtValue:record.verification_token,
  verifiedAt:record.verified_at,
  expiresAt:record.verification_expires_at,
});

async function hasDnsProof(name:string,value:string):Promise<boolean> {
  // No HTTP fetch or user-supplied IP access. Query TXT only at a fixed
  // subdomain of the strictly validated hostname.
  const result=await Promise.race([
    resolveTxt(name),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('dns_timeout')),6500)),
  ]);
  return result.some(parts=>parts.join('')===value);
}

/**
 * SLBI verification proves control of a DNS TXT record, not ownership of the
 * corresponding Google Search Console property and not website-write consent.
 */
export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return denied(403,'invalid_origin');
    if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return denied(415,'invalid_content_type');
    if(Number(request.headers.get('content-length')||0)>1400)return denied(413,'body_too_large');
    const raw=await request.text();
    if(raw.length>1400)return denied(413,'body_too_large');
    const payload:unknown=JSON.parse(raw);
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return denied(400,'invalid_request');
    const body=payload as Record<string,unknown>;
    if(typeof body.businessId!=='string'||!UUID.test(body.businessId)||
      !['start','verify','disconnect'].includes(String(body.action)))return denied(400,'invalid_request');
    const action=body.action as Operation;
    const required=action==='start'?'action,businessId,hostname,provider':'action,businessId';
    if(Object.keys(body).sort().join(',')!==required.split(',').sort().join(','))return denied(400,'invalid_request');

    const userClient=await createClient();
    const {data:{user},error:authError}=await userClient.auth.getUser();
    if(authError||!user||user.is_anonymous)return denied(401,'sign_in_required');
    const {data:business,error:ownershipError}=await userClient.from('businesses')
      .select('id,owner_id,status').eq('id',body.businessId).eq('owner_id',user.id).maybeSingle();
    if(ownershipError)return denied(503,'ownership_check_unavailable');
    if(!business)return denied(404,'business_not_owned');

    const store=admin();
    if(!store)return denied(503,'domain_service_not_configured');
    const {data:existing,error:existingError}=await store.from('seo_domain_connections')
      .select('id,owner_id,business_id,hostname,provider,state,verification_token,txt_record_name,verified_at,verification_expires_at,last_checked_at,created_at')
      .eq('business_id',business.id).maybeSingle();
    if(existingError)return denied(503,'domain_storage_unavailable');
    if(existing&&existing.owner_id!==user.id)return denied(409,'ownership_changed');

    if(action==='disconnect'){
      if(!existing)return Response.json({ok:true,connection:null},{headers});
      const {error}=await store.from('seo_domain_connections').delete().eq('id',existing.id).eq('owner_id',user.id);
      return error?denied(503,'disconnect_failed'):Response.json({ok:true,connection:null},{headers});
    }
    if(action==='start'){
      const hostname=safeHostname(body.hostname);
      const provider=body.provider;
      if(!hostname||typeof provider!=='string'||!PROVIDERS.has(provider))return denied(400,'invalid_domain');
      if(existing&&existing.hostname===hostname){
        return Response.json({ok:true,connection:asPublicConnection(existing)},{headers});
      }
      if(existing&&Date.now()-Date.parse(existing.created_at)<60_000)return denied(429,'try_later');
      const challenge='slbi-verify='+randomBytes(24).toString('hex');
      const fields={
        owner_id:user.id,business_id:business.id,hostname,provider,
        verification_token:challenge,txt_record_name:'_slbi-verify.'+hostname,
        state:'pending',verified_at:null,verification_expires_at:null,
        last_checked_at:null,updated_at:new Date().toISOString(),
      };
      const {data:saved,error}=existing
        ?await store.from('seo_domain_connections').update(fields).eq('id',existing.id).eq('owner_id',user.id)
          .select('hostname,provider,state,verification_token,txt_record_name,verified_at,verification_expires_at').single()
        :await store.from('seo_domain_connections').insert(fields)
          .select('hostname,provider,state,verification_token,txt_record_name,verified_at,verification_expires_at').single();
      if(error)return denied(error.code==='23505'?409:503,error.code==='23505'?'domain_already_claimed':'domain_save_failed');
      return Response.json({ok:true,connection:asPublicConnection(saved as Record<string,unknown>)},{headers});
    }

    if(!existing)return denied(404,'domain_not_started');
    if(existing.state==='verified'&&existing.verification_expires_at&&
      Date.parse(existing.verification_expires_at)>Date.now()){
      return Response.json({ok:true,connection:asPublicConnection(existing)},{headers});
    }
    const last=existing.last_checked_at?Date.parse(existing.last_checked_at):0;
    if(last&&Date.now()-last<30_000)return denied(429,'verification_rate_limited');
    // Durable throttle is committed before any DNS lookup, so 3rd-party DNS
    // failures never turn a check into a success or a hot retry loop.
    const {error:throttleError}=await store.from('seo_domain_connections').update({
      last_checked_at:new Date().toISOString(),
    }).eq('id',existing.id).eq('owner_id',user.id);
    if(throttleError)return denied(503,'verification_unavailable');
    let found=false;
    try{found=await hasDnsProof(existing.txt_record_name,existing.verification_token)}
    catch{/* NXDOMAIN, propagation delays, resolver failures all fail closed. */}
    if(!found)return denied(409,'dns_record_not_found');
    const now=new Date();
    const {data:verified,error:saveError}=await store.from('seo_domain_connections').update({
      state:'verified',verified_at:now.toISOString(),
      verification_expires_at:new Date(now.getTime()+30*24*60*60_000).toISOString(),
      updated_at:now.toISOString(),
    }).eq('id',existing.id).eq('owner_id',user.id).eq('verification_token',existing.verification_token)
      .select('hostname,provider,state,verification_token,txt_record_name,verified_at,verification_expires_at').single();
    if(saveError)return denied(503,'verification_save_failed');
    return Response.json({ok:true,connection:asPublicConnection(verified as Record<string,unknown>)},{headers});
  }catch{
    return denied(400,'invalid_request');
  }
}
