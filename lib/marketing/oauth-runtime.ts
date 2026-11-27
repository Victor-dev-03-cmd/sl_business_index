/**
 * P2-07 first-party Google Mail OAuth. Preview remains isolated; production
 * has a separate explicit OFF-by-default release gate and fixed canonical origin.
 * No sending, messaging, credential exposure or KMS compliance claims.
 */
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {makeAuthorizationUrl,pkceS256Challenge} from './oauth-provider-contract.ts';

export const GOOGLE_SEND_SCOPE='https://www.googleapis.com/auth/gmail.send';
/** Restricted Gmail scope: NEVER request without isolated preview flag and owner consent. */
export const GOOGLE_READ_SCOPE='https://www.googleapis.com/auth/gmail.readonly';
export const GOOGLE_IDENTITY_SCOPES=['openid','email'] as const;
export const GOOGLE_CALLBACK_PATH='/api/marketing/oauth/google_mail/callback';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GooglePreviewOAuthConfig={
  origin:string;redirectUri:string;clientId:string;clientSecret:string;
  stateSecret:string;encryptionKey:Buffer;encryptionKeyId:string;
  gmailReadEnabled:boolean;
};
function exactOrigin(raw:string):string|null{
  try {
    const u=new URL(raw);
    if(u.protocol!=='https:'||!u.hostname||u.username||u.password||
       u.pathname!=='/'||u.search||u.hash||u.origin!==raw.replace(/\/$/,'')) return null;
    return u.origin;
  }catch{return null;}
}
/** The release flag is preview-only even if production secrets are configured. */
export function getGooglePreviewConfig(env:NodeJS.ProcessEnv=process.env):GooglePreviewOAuthConfig|null{
  if(env.VERCEL_ENV!=='preview'||
     env.SLBI_MARKETING_OAUTH_PREVIEW_ENABLED!=='true'||
     env.SLBI_MARKETING_OAUTH_GOOGLE_ENABLED!=='true')return null;
  const origin=exactOrigin(env.SLBI_MARKETING_OAUTH_ORIGIN||'');
  const keyString=env.SLBI_MARKETING_OAUTH_ENCRYPTION_KEY||'';
  const key=/^[A-Za-z0-9_-]{43}$/.test(keyString)?Buffer.from(keyString,'base64url'):Buffer.alloc(0);
  const stateSecret=env.SLBI_MARKETING_OAUTH_STATE_SECRET||'';
  const clientId=env.SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID||'';
  const clientSecret=env.SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET||'';
  const encryptionKeyId=env.SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID||'';
  if(!origin||key.length!==32||stateSecret.length<32||clientId.length<12||
     clientSecret.length<8||!/^[A-Za-z0-9_-]{3,64}$/.test(encryptionKeyId))return null;
  return {origin,redirectUri:origin+GOOGLE_CALLBACK_PATH,clientId,clientSecret,
    stateSecret,encryptionKey:key,encryptionKeyId,
    gmailReadEnabled:env.SLBI_MARKETING_OAUTH_GMAIL_READ_PREVIEW_ENABLED==='true'};
}
/** A production-ready adapter is NOT an assertion of Google verification.
 * Live activation is an explicit manual release gate and never inherited from Preview.
 * No Gmail permission is granted simply because this config exists.
 */
export type GoogleConnectorConfig=GooglePreviewOAuthConfig & {deployment:'preview'|'production'};
export const GOOGLE_PRODUCTION_ORIGIN='https://www.slbusinessindex.com';
export function getGoogleConnectorConfig(env:NodeJS.ProcessEnv=process.env):GoogleConnectorConfig|null{
  if(env.VERCEL_ENV==='preview'){
    const preview=getGooglePreviewConfig(env);
    return preview?{...preview,deployment:'preview'}:null;
  }
  if(env.VERCEL_ENV!=='production'||
    env.SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED!=='true'||
    env.SLBI_MARKETING_OAUTH_GOOGLE_ENABLED!=='true'||
    exactOrigin(env.SLBI_MARKETING_OAUTH_ORIGIN||'')!==GOOGLE_PRODUCTION_ORIGIN)
    return null;
  const keyString=env.SLBI_MARKETING_OAUTH_ENCRYPTION_KEY||'';
  const key=/^[A-Za-z0-9_-]{43}$/.test(keyString)?Buffer.from(keyString,'base64url'):Buffer.alloc(0);
  const stateSecret=env.SLBI_MARKETING_OAUTH_STATE_SECRET||'';
  const clientId=env.SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID||'';
  const clientSecret=env.SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET||'';
  const encryptionKeyId=env.SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID||'';
  if(key.length!==32||stateSecret.length<32||clientId.length<12||
     clientSecret.length<8||!/^[A-Za-z0-9_-]{3,64}$/.test(encryptionKeyId))
    return null;
  return {deployment:'production',origin:GOOGLE_PRODUCTION_ORIGIN,
    redirectUri:GOOGLE_PRODUCTION_ORIGIN+GOOGLE_CALLBACK_PATH,
    clientId,clientSecret,stateSecret,encryptionKey:key,encryptionKeyId,
    // Restricted Gmail scope is independently disabled by default in live mode.
    gmailReadEnabled:env.SLBI_MARKETING_OAUTH_GMAIL_READ_PRODUCTION_ENABLED==='true'};
}
/** Disconnect must keep working after an operator disables OAuth or rotates keys.
 * The authenticated server still checks ownership and runs the privileged,
 * owner-bound revocation RPC; these origins never come from request parameters.
 */
export function getGoogleDisconnectOrigin(env:NodeJS.ProcessEnv=process.env):string|null{
  if(env.VERCEL_ENV==='production')return GOOGLE_PRODUCTION_ORIGIN;
  if(env.VERCEL_ENV==='preview')return exactOrigin(env.SLBI_MARKETING_OAUTH_ORIGIN||'');
  return null;
}
export type GoogleConnectorReadiness={
  configured:boolean;gmailReadEnabled:boolean;environment:'production'|'preview'|'unavailable';
  reason:'ready'|'google_setup_required'|'environment_unavailable';
};
/** Public-safe setup status: never exposes whether a particular secret is set. */
export function getGoogleConnectorReadiness(env:NodeJS.ProcessEnv=process.env):GoogleConnectorReadiness{
  const environment=env.VERCEL_ENV==='production'?'production':
    env.VERCEL_ENV==='preview'?'preview':'unavailable';
  if(environment==='unavailable')return {configured:false,gmailReadEnabled:false,
    environment,reason:'environment_unavailable'};
  const config=getGoogleConnectorConfig(env);
  return {configured:Boolean(config),gmailReadEnabled:Boolean(config?.gmailReadEnabled),
    environment,reason:config?'ready':'google_setup_required'};
}

export function validateOAuthStartBody(value:unknown):string|null{
  if(!value||Array.isArray(value)||typeof value!=='object')return null;
  const obj=value as Record<string,unknown>;
  if(Object.keys(obj).length!==1||typeof obj.businessId!=='string'||
     !UUID.test(obj.businessId))return null;
  return obj.businessId;
}
export function exactOAuthRequestOrigin(requestUrl:string,originHeader:string|null,configuredOrigin:string):boolean{
  try{
    const request=new URL(requestUrl);
    if(request.origin!==configuredOrigin||!originHeader)return false;
    const supplied=new URL(originHeader);
    return supplied.origin===configuredOrigin&&supplied.href===configuredOrigin+'/';
  }catch{return false;}
}
export type CipherContext={
  ownerId:string;businessId:string;provider:'google_mail';
  purpose:'pkce'|'access_token'|'refresh_token';subject:string;
};
function additionalData(context:CipherContext):Buffer{
  return Buffer.from(JSON.stringify(['slbi-p2-07-v1',context.ownerId,context.businessId,
    context.provider,context.purpose,context.subject]),'utf8');
}
/** AES-256-GCM for disposable preview only, NOT a managed KMS/vault integration. */
export function encryptPreviewValue(plain:string,key:Buffer,context:CipherContext):string{
  if(key.length!==32||!plain||plain.length>16000)throw new Error('Invalid encryption input');
  const nonce=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(additionalData(context));
  const ciphertext=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);
  return ['v1',nonce.toString('base64url'),ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url')].join('.');
}
export function decryptPreviewValue(envelope:string,key:Buffer,context:CipherContext):string{
  const p=envelope.split('.');
  if(p.length!==4||p[0]!=='v1'||key.length!==32)throw new Error('Invalid ciphertext');
  const nonce=Buffer.from(p[1],'base64url'),tag=Buffer.from(p[3],'base64url');
  if(nonce.length!==12||tag.length!==16)throw new Error('Invalid ciphertext');
  const decipher=createDecipheriv('aes-256-gcm',key,nonce);
  decipher.setAAD(additionalData(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(p[2],'base64url')),decipher.final()]).toString('utf8');
}
export function makeGooglePreviewAuthUrl(config:GooglePreviewOAuthConfig,state:string,verifier:string):string{
  const u=new URL(makeAuthorizationUrl({
    endpoint:'https://accounts.google.com/o/oauth2/v2/auth',
    clientId:config.clientId,redirectUri:config.redirectUri,state,
    scope:[...GOOGLE_IDENTITY_SCOPES,GOOGLE_SEND_SCOPE,
      ...(config.gmailReadEnabled?[GOOGLE_READ_SCOPE]:[])],
    pkceChallenge:pkceS256Challenge(verifier),
  }));
  u.searchParams.set('access_type','offline');
  // Always let the vendor select the mailbox they intend to connect. Without
  // select_account, Google may silently reuse the browser's developer account.
  // Consent remains explicit so a fresh offline refresh token can be requested.
  // Never send login_hint: the SLBI login identity is not the Gmail mailbox.
  u.searchParams.set('prompt','select_account consent');
  return u.href;
}
export function safeGoogleSuccessRedirect(config:GooglePreviewOAuthConfig,result:'connected'|'cancelled'|'failed'):string{
  const u=new URL('/vendor/marketing-engine/connections',config.origin);
  u.searchParams.set('oauth',result);
  return u.href;
}
