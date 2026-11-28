import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {decryptPreviewValue,exactOAuthRequestOrigin,getGoogleConnectorConfig,GOOGLE_SEND_SCOPE}
  from '@/lib/marketing/oauth-runtime';
import {refreshGooglePreviewAccessToken} from '@/lib/marketing/gmail-intelligence';
import {normalizeLocalCampaign} from '@/lib/marketing/email-hub-contract';
import {isSafeSenderAddress,makeGmailSelfTestRaw,renderEmailMarkup}
  from '@/lib/marketing/email-renderer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,headers:{'cache-control':'private, no-store','referrer-policy':'no-referrer',
    'x-content-type-options':'nosniff'},
});

/** An individual vendor click authorizes exactly one test TO THE SAME
 * connected Gmail account, not to a customer, CSV recipient or marketing list.
 * No provider calls occur outside a validated POST. No automatic retry. */
export async function POST(request:Request){
  if(process.env.SLBI_EMAIL_GMAIL_TEST_ENABLED!=='true')
    return reply(503,{error:'Test sending is not activated for this environment.'});
  const config=getGoogleConnectorConfig();
  if(!config)return reply(503,{error:'Google Mail connector is unavailable.'});
  if(!exactOAuthRequestOrigin(request.url,request.headers.get('origin'),config.origin))
    return reply(403,{error:'Test email must be requested from the SLBI site.'});
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return reply(415,{error:'JSON required.'});

  let raw:unknown;
  try{
    const text=await request.text();
    if(Buffer.byteLength(text,'utf8')>44000)return reply(413,{error:'Test email exceeds size limit.'});
    raw=JSON.parse(text);
  }catch{return reply(400,{error:'Invalid test email.'});}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))
    return reply(400,{error:'Invalid test email payload.'});
  const body=raw as Record<string,unknown>;
  if(Object.keys(body).sort().join(',')!=='businessId,connectionId,draft,requestKey'||
    typeof body.businessId!=='string'||!UUID.test(body.businessId)||
    typeof body.connectionId!=='string'||!UUID.test(body.connectionId)||
    typeof body.requestKey!=='string'||!UUID.test(body.requestKey))
    return reply(400,{error:'Invalid test sender or request ID.'});

  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return reply(401,{error:'Sign in to send a test to your own Gmail.'});
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return denied;
  const {data:business,error:businessError}=await client.from('businesses')
    .select('id,name,logo_url,address,city,status')
    .eq('id',body.businessId).eq('owner_id',user.id).eq('status','approved').maybeSingle();
  if(businessError)return reply(503,{error:'Business authorization unavailable.'});
  if(!business)return reply(403,{error:'Select an approved business that you own.'});

  const valid=normalizeLocalCampaign(body.draft,user.id,[business.id]);
  if(!valid||valid.layout==='custom'||valid.subject.trim().length<8)
    return reply(400,{error:'Use a valid, reviewed visual email campaign for a self-test.'});

  const {data:connection,error:connectionError}=await client.from('marketing_connections')
    .select('id,user_id,business_id,provider,status,account_display_name,external_account_id,granted_scopes')
    .eq('id',body.connectionId).eq('user_id',user.id).eq('business_id',business.id)
    .eq('provider','google_mail').eq('status','connected').maybeSingle();
  if(connectionError)return reply(503,{error:'Sender verification unavailable.'});
  if(!connection||!Array.isArray(connection.granted_scopes)||
     !connection.granted_scopes.includes(GOOGLE_SEND_SCOPE)||
     !isSafeSenderAddress(connection.account_display_name||''))
    return reply(403,{error:'Connect Gmail with verified send permission before testing.'});
  const ownMailbox=connection.account_display_name as string;
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!supabaseUrl||!serviceKey)return reply(503,{error:'Secure provider storage unavailable.'});
  const service=createServiceClient(supabaseUrl,serviceKey,{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  });
  const {data:brand,error:brandError}=await client.from('social_brand_profiles')
    .select('brand_name,accent_color')
    .eq('business_id',business.id).eq('owner_id',user.id).maybeSingle();
  if(brandError)return reply(503,{error:'Brand Kit unavailable.'});

  // A reserve consumes the one-time request key even if the provider times out,
  // preventing duplicate sends through repeated clicks.
  const {data:reservation,error:reserveError}=await service.rpc('slbi_reserve_email_self_test',{
    p_owner_id:user.id,p_business_id:business.id,p_connection_id:connection.id,
    p_request_key:body.requestKey,p_recipient:ownMailbox,
  });
  if(reserveError)return reply(503,{error:'Test sending limit is not ready.'});
  if(typeof reservation!=='string'||!UUID.test(reservation))
    return reply(429,{error:'Daily self-test limit reached, or this request has already been used. Maximum three tests per business and eight per owner each UTC day.'});
  const testId=reservation;
  const settle=async(state:'sent'|'failed'|'unknown',messageId?:string)=>{
    try{
      await service.from('marketing_email_test_sends').update({
        state,provider_message_id:messageId||null,resolved_at:new Date().toISOString(),
      }).eq('id',testId).eq('owner_id',user.id).eq('business_id',business.id);
    }catch{/* Audit record remains reserved, never silently retried. */}
  };

  try{
    // Ciphertext can ONLY be read after a fresh owner/connection/RLS validation.
    const {data:secret,error:secretError}=await service.from('marketing_connection_secrets')
      .select('encrypted_refresh_token,encryption_key_id')
      .eq('connection_id',connection.id).maybeSingle();
    if(secretError||!secret||
       secret.encryption_key_id!==config.encryptionKeyId||
       typeof secret.encrypted_refresh_token!=='string')
      throw Error('credential');
    const refreshToken=decryptPreviewValue(secret.encrypted_refresh_token,config.encryptionKey,{
      ownerId:user.id,businessId:business.id,provider:'google_mail',
      purpose:'refresh_token',subject:connection.external_account_id,
    });
    const accessToken=await refreshGooglePreviewAccessToken(config,refreshToken);
    const rendered=renderEmailMarkup(valid,{
      name:brand?.brand_name||business.name,
      logoUrl:business.logo_url,address:business.address,city:business.city,
      accentColor:brand?.accent_color,
    },{mode:'self_test'});
    const rawMessage=makeGmailSelfTestRaw(ownMailbox,valid.subject,rendered.html,rendered.text);
    const provider=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
      method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
      headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
      body:JSON.stringify({raw:rawMessage}),
    });
    if(!provider.ok){
      await settle(provider.status>=500?'unknown':'failed');
      return reply(502,{error:provider.status>=500?
        'Google returned a temporary error. Check your Gmail inbox before attempting another test.':
        'Google did not accept this self-test. Recheck your connected Gmail account.'});
    }
    const payload:unknown=await provider.json();
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      typeof (payload as {id?:unknown}).id!=='string'){
      await settle('unknown');
      return reply(502,{error:'Google response was uncertain. Check your inbox before testing again.'});
    }
    const providerId=(payload as {id:string}).id;
    await settle('sent',providerId.slice(0,200));
    return reply(200,{
      acceptedByGoogle:true,testOnly:true,recipient:ownMailbox,
      campaignSent:false,deliveryNotGuaranteed:true,
      warnings:rendered.warnings,
      notice:'Google accepted the one-mailbox test. Check your Gmail inbox and spam folder.',
    });
  }catch{
    // Distinguish provider receipt uncertainty only via persistent audit:
    // no automatic retry, no token/secret/address details logged.
    await settle('unknown');
    return reply(503,{error:'Self-test could not be confirmed. Check your connected Gmail inbox before trying again.'});
  }
}
export async function GET(){return reply(405,{error:'Method not supported.'});}
