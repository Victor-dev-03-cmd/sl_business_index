import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {decryptPreviewValue,exactOAuthRequestOrigin,getGoogleConnectorConfig,GOOGLE_READ_SCOPE}
  from '@/lib/marketing/oauth-runtime';
import {refreshGooglePreviewAccessToken,readGmailPreviewHeaders}
  from '@/lib/marketing/gmail-intelligence';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff'};
const reply=(status:number,error:string)=>Response.json({error},{status,headers});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Vendor-triggered preview only: no automatic sync, external model calls,
 * mailbox storage, sends, CRM contact creation or personal-data training.
 * Requires Google Restricted Scope consent AND fresh RLS owner verification.
 */
export async function POST(request:Request){
  const config=getGoogleConnectorConfig();
  if(!config?.gmailReadEnabled)return reply(503,'Gmail inbox preview is not enabled.');
  if(!exactOAuthRequestOrigin(request.url,request.headers.get('origin'),config.origin))
    return reply(403,'Mailbox preview must be requested from this site.');
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return reply(415,'JSON body required.');
  const length=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(length)||length>512)return reply(413,'Request too large.');
  let ids:{businessId:string;connectionId:string};
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>512)return reply(413,'Request too large.');
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))
      return reply(400,'Invalid request.');
    const obj=value as Record<string,unknown>;
    if(Object.keys(obj).length!==2||typeof obj.businessId!=='string'||
       typeof obj.connectionId!=='string'||!UUID.test(obj.businessId)||
       !UUID.test(obj.connectionId))return reply(400,'Invalid mailbox selection.');
    ids={businessId:obj.businessId,connectionId:obj.connectionId};
  }catch{return reply(400,'Invalid request.');}

  try{
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply(401,'Sign in to preview your mailbox.');
    const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(denied)return denied;
    const {data:owned,error:ownerError}=await client.from('businesses')
      .select('id,status').eq('id',ids.businessId).eq('owner_id',user.id).maybeSingle();
    if(ownerError)return reply(503,'Unable to verify business ownership.');
    if(!owned||owned.status!=='approved')return reply(403,'Approved owned business required.');
    const {data:connection,error:connectionError}=await client.from('marketing_connections')
      .select('id,user_id,business_id,external_account_id,provider,status,granted_scopes')
      .eq('id',ids.connectionId).eq('user_id',user.id).eq('business_id',ids.businessId)
      .eq('provider','google_mail').eq('status','connected').maybeSingle();
    if(connectionError)return reply(503,'Mailbox connection verification unavailable.');
    if(!connection||!Array.isArray(connection.granted_scopes)||
       !connection.granted_scopes.includes(GOOGLE_READ_SCOPE))
      return reply(403,'Connect Gmail with explicit read permission before previewing inbox.');
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!secretKey)return reply(503,'Connector storage unavailable.');
    const service=createServiceClient(url,secretKey,{
      auth:{autoRefreshToken:false,persistSession:false},
    });
    // Service client is used only after server-authenticated owner + Pro +
    // connection RLS validation. Secret ciphertext never leaves this route.
    const {data:secret,error:secretError}=await service.from('marketing_connection_secrets')
      .select('encrypted_refresh_token,encryption_key_id')
      .eq('connection_id',ids.connectionId).maybeSingle();
    if(secretError||!secret||secret.encryption_key_id!==config.encryptionKeyId||
       typeof secret.encrypted_refresh_token!=='string')
      return reply(503,'Mailbox credential unavailable. Reconnect your account.');
    const refreshToken=decryptPreviewValue(secret.encrypted_refresh_token,config.encryptionKey,{
      ownerId:user.id,businessId:ids.businessId,provider:'google_mail',
      purpose:'refresh_token',subject:connection.external_account_id,
    });
    const accessToken=await refreshGooglePreviewAccessToken(config,refreshToken);
    const messages=await readGmailPreviewHeaders(accessToken);
    return Response.json({preview:true,stored:false,sent:false,
      consentScope:GOOGLE_READ_SCOPE,messages},{status:200,headers});
  }catch{
    // Never log Gmail message bodies, sender addresses, tokens or content.
    return reply(503,'Unable to load the authorized mailbox preview.');
  }
}
export async function GET(){return reply(405,'Method not supported.');}
