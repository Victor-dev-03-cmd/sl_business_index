import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {stateDigest} from '@/lib/marketing/oauth-provider-contract';
import {decryptPreviewValue,encryptPreviewValue,getGooglePreviewConfig,
  safeGoogleSuccessRedirect} from '@/lib/marketing/oauth-runtime';
import {exchangeVerifiedGoogleMailbox} from '@/lib/marketing/oauth-google';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const error=(status:number,message:string)=>Response.json({error:message},{
  status,headers:{'cache-control':'private, no-store','referrer-policy':'no-referrer'},
});
/** A provider redirects here with a short-lived one-time state, never a credential cookie. */
export async function GET(request:Request){
  const config=getGooglePreviewConfig();
  if(!config)return error(503,'Google Mail connector is not enabled.');
  try{
    const u=new URL(request.url);
    if(u.origin!==config.origin||u.pathname!=='/api/marketing/oauth/google_mail/callback')
      return error(400,'Invalid connector callback origin.');
    const state=u.searchParams.get('state')||'';
    const code=u.searchParams.get('code');
    const providerError=u.searchParams.get('error');
    if(u.searchParams.getAll('state').length!==1||
       u.searchParams.getAll('code').length>1||
       u.searchParams.getAll('error').length>1||
       (code!==null&&providerError!==null))return error(400,'Invalid callback parameters.');
    const digest=stateDigest(state,config.stateSecret);
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return error(401,'Reconnect after signing in.');
    const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(denied)return denied;
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return error(503,'Connector database unavailable.');
    const service=createServiceClient(url,key,{
      auth:{persistSession:false,autoRefreshToken:false},
    });
    // The privileged state lookup never returns values to the client. State is
    // random, HMAC'd in DB and additionally tied to the current SSR identity.
    const {data:intent,error:lookupError}=await service.from('marketing_oauth_intents')
      .select('user_id,business_id,provider,redirect_uri,consumed_at,expires_at')
      .eq('state_digest',digest).maybeSingle();
    if(lookupError||!intent||intent.user_id!==user.id||
       intent.provider!=='google_mail'||intent.redirect_uri!==config.redirectUri||
       intent.consumed_at!==null||Date.parse(intent.expires_at)<=Date.now())
      return error(400,'Invalid or expired authorization state.');
    const {data:owned,error:ownedError}=await client.from('businesses')
      .select('id').eq('id',intent.business_id).eq('owner_id',user.id).maybeSingle();
    if(ownedError)return error(503,'Ownership verification unavailable.');
    if(!owned)return error(403,'Business ownership required.');

    // Atomically consume state before handling OAuth code. Only service_role
    // may call this function. It independently rechecks owner and verified Pro.
    const {data:claimed,error:claimError}=await service.rpc('slbi_claim_marketing_oauth_intent',{
      p_state_digest:digest,p_owner_id:user.id,p_business_id:intent.business_id,
      p_provider:'google_mail',p_redirect_uri:config.redirectUri,
    });
    if(claimError)return error(503,'OAuth callback storage not ready.');
    if(!Array.isArray(claimed)||claimed.length!==1)return error(400,'Authorization state was already used.');
    const ciphertext=claimed[0].encrypted_pkce_verifier;
    if(typeof ciphertext!=='string')return error(400,'Authorization state is incomplete.');
    if(providerError){
      return Response.redirect(safeGoogleSuccessRedirect(config,'cancelled'),303);
    }
    if(!code)return error(400,'Missing Google authorization code.');
    const verifier=decryptPreviewValue(ciphertext,config.encryptionKey,{
      ownerId:user.id,businessId:intent.business_id,
      provider:'google_mail',purpose:'pkce',subject:digest,
    });
    const mailbox=await exchangeVerifiedGoogleMailbox(config,code,verifier);
    // The initial preview connector must have offline renewal or it fails
    // closed rather than appearing "connected" with an unusable credential.
    if(!mailbox.refreshToken)return error(409,'Google did not grant offline access; reconnect is required.');
    const current=await getMarketingAccessForUser(user.id,client);
    const gate=rejectMarketingAccess(current);
    if(gate)return gate;
    const {data:stillOwned,error:againError}=await client.from('businesses')
      .select('id').eq('id',intent.business_id).eq('owner_id',user.id).maybeSingle();
    if(againError||!stillOwned)return error(403,'Business ownership could not be confirmed.');

    const ctx={ownerId:user.id,businessId:intent.business_id,provider:'google_mail' as const};
    const accessCipher=encryptPreviewValue(mailbox.accessToken,config.encryptionKey,{
      ...ctx,purpose:'access_token',subject:mailbox.sub,
    });
    const refreshCipher=encryptPreviewValue(mailbox.refreshToken,config.encryptionKey,{
      ...ctx,purpose:'refresh_token',subject:mailbox.sub,
    });
    // One SQL transaction upserts both metadata and encrypted secrets or
    // neither. The function independently rechecks verified Pro + ownership.
    const {data:connectionId,error:saveError}=await service.rpc(
      'slbi_store_verified_marketing_connection',{
        p_owner_id:user.id,p_business_id:intent.business_id,p_provider:'google_mail',
        p_external_account_id:mailbox.sub,p_account_display_name:mailbox.email,
        p_account_type:'mailbox',p_granted_scopes:mailbox.scopes,
        p_expires_at:mailbox.expiresAt,
        p_encrypted_access:accessCipher,p_encrypted_refresh:refreshCipher,
        p_encryption_key_id:config.encryptionKeyId,
      },
    );
    if(saveError||!connectionId)return error(503,'Verified connection could not be saved.');
    return Response.redirect(safeGoogleSuccessRedirect(config,'connected'),303);
  }catch{
    // Do not include state, provider codes, email or token errors in logs.
    return error(503,'OAuth callback could not be completed.');
  }
}
