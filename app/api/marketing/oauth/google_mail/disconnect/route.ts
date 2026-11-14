import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {exactOAuthRequestOrigin,getGooglePreviewConfig}
  from '@/lib/marketing/oauth-runtime';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const responseHeaders={'cache-control':'private, no-store','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff'};
const fail=(status:number,error:string)=>Response.json({error},{
  status,headers:responseHeaders,
});

/**
 * Preview-only LOCAL disconnect. Deletes SLBI token ciphertext atomically and
 * marks the account revoked in our DB. It does NOT claim to revoke the Google
 * OAuth grant remotely or delete any unrelated business/customer records.
 *
 * Unlike sending/connecting, an EXPIRED Pro owner can disconnect their data.
 */
export async function POST(request:Request){
  const config=getGooglePreviewConfig();
  if(!config)return fail(503,'Connector disconnect is not enabled in this environment.');
  if(!exactOAuthRequestOrigin(request.url,request.headers.get('origin'),config.origin))
    return fail(403,'Disconnect must be requested from this site.');
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return fail(415,'JSON body required.');
  const length=Number(request.headers.get('content-length')||'0');
  if(!Number.isFinite(length)||length>1024)return fail(413,'Request too large.');

  let ids:{businessId:string;connectionId:string};
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>1024)return fail(413,'Request too large.');
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))
      return fail(400,'Invalid disconnect request.');
    const v=value as Record<string,unknown>;
    if(Object.keys(v).length!==2||typeof v.businessId!=='string'
      ||typeof v.connectionId!=='string'||!UUID.test(v.businessId)
      ||!UUID.test(v.connectionId))return fail(400,'Invalid connection selection.');
    ids={businessId:v.businessId,connectionId:v.connectionId};
  }catch{return fail(400,'Invalid disconnect request.');}

  try{
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return fail(401,'Sign in to disconnect your account.');
    const {data:owned,error:ownershipError}=await client.from('businesses')
      .select('id').eq('id',ids.businessId).eq('owner_id',user.id).maybeSingle();
    if(ownershipError)return fail(503,'Ownership verification is unavailable.');
    if(!owned)return fail(404,'Connection not found.');

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return fail(503,'Connector storage is unavailable.');
    const service=createServiceClient(url,key,{auth:{
      persistSession:false,autoRefreshToken:false,
    }});
    // Trusted service-role-only RPC rechecks owner/business/connection match.
    // No token text is fetched, decrypted, logged or sent to the browser.
    const {data:removed,error}=await service.rpc(
      'slbi_disconnect_google_mail_connection',{
        p_owner_id:user.id,p_business_id:ids.businessId,
        p_connection_id:ids.connectionId,
      },
    );
    if(error)return fail(503,'Connector disconnect is not ready.');
    if(removed!==true)return fail(404,'Connection not found.');
    return Response.json({
      disconnected:true,providerPermissionsRevoked:false,
      notice:'SLBI stored credentials were deleted. Revoke SLBI access in your Google account security settings to remove the Google grant.',
    },{status:200,headers:responseHeaders});
  }catch{
    return fail(503,'Unable to disconnect this connection.');
  }
}
