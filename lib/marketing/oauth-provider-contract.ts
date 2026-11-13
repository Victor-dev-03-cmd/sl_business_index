/**
 * SLBI Marketing P2-07 — provider authorization primitives.
 * NOT a live OAuth endpoint. The adapter must be activated only after:
 * server-side Pro/tenant verification, a one-time DB state transaction,
 * provider app review, encrypted token persistence, and callback tests.
 *
 * Based on RFC 9700: exact redirect_uri, transaction-bound state, PKCE S256.
 */
import 'server-only';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export type ProviderFamily='meta_pages'|'instagram_professional'|'whatsapp_business'|'google_mail'|'microsoft_mail';
export type ProviderCapability='publish'|'read_messages'|'send_message'|'read_mail'|'send_mail'|'read_insights';
export type ConnectionStatus='pending'|'connected'|'expired'|'revoked'|'error';
export type ProviderAccountType='managed_page'|'professional_profile'|'business_phone'|'mailbox';

export type MarketingProviderAdapter={
  id:ProviderFamily;
  accountTypes:readonly ProviderAccountType[];
  capabilities:readonly ProviderCapability[];
  /** Provider metadata is verified during activation, not trusted from a browser. */
  authorizationEndpoint:string;
  tokenEndpoint:string;
  supportsPkce:boolean;
  requestedScopes:readonly string[];
};

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SAFE_TOKEN=/^[A-Za-z0-9_-]{32,128}$/;
const B64URL=(bytes:Buffer)=>bytes.toString('base64url');

/** Return 32 bytes of CSPRNG entropy; never derive OAuth state from a user ID. */
export function createOAuthState():string{
  return B64URL(randomBytes(32));
}
export function createPkceVerifier():string{
  return B64URL(randomBytes(64));
}
export function pkceS256Challenge(verifier:string):string{
  if(!SAFE_TOKEN.test(verifier))throw new Error('Invalid PKCE verifier');
  return B64URL(createHash('sha256').update(verifier,'ascii').digest());
}
export function stateDigest(state:string,secret:string):string{
  if(!SAFE_TOKEN.test(state)||secret.length<32)throw new Error('Invalid OAuth secret or state');
  return B64URL(createHmac('sha256',secret).update(state,'ascii').digest());
}
/** Timing safe equality after strict decoding; reject missing/short/invalid input. */
export function secureStateDigestMatch(a:string,b:string):boolean{
  try{
    const left=Buffer.from(a,'base64url'),right=Buffer.from(b,'base64url');
    return left.length===32&&right.length===32&&timingSafeEqual(left,right);
  }catch{return false;}
}

export type OAuthPendingIntent={
  userId:string;
  businessId:string;
  provider:ProviderFamily;
  stateDigest:string;
  pkceVerifierEncrypted:string;
  redirectUri:string;
  expiresAt:string;
  consumedAt:null;
};
export function validateOAuthPendingIntent(input:unknown,now:number):input is OAuthPendingIntent{
  if(!input||typeof input!=='object'||Array.isArray(input))return false;
  const v=input as Record<string,unknown>;
  return typeof v.userId==='string'&&UUID.test(v.userId)
    &&typeof v.businessId==='string'&&UUID.test(v.businessId)
    &&typeof v.provider==='string'&&['meta_pages','instagram_professional','whatsapp_business','google_mail','microsoft_mail'].includes(v.provider)
    &&typeof v.stateDigest==='string'&&Buffer.from(v.stateDigest,'base64url').length===32
    &&typeof v.pkceVerifierEncrypted==='string'&&v.pkceVerifierEncrypted.length>=32
    &&typeof v.redirectUri==='string'
    &&v.redirectUri.startsWith('https://')
    &&typeof v.expiresAt==='string'
    &&Number.isFinite(Date.parse(v.expiresAt))
    &&Date.parse(v.expiresAt)>now
    &&Date.parse(v.expiresAt)<=now+15*60*1000
    &&v.consumedAt===null;
}

/** Never accept redirect destinations supplied by a vendor or OAuth callback. */
export function makeAuthorizationUrl(args:{
  endpoint:string;clientId:string;redirectUri:string;state:string;
  scope:readonly string[];pkceChallenge:string|null;
}):string{
  const u=new URL(args.endpoint);
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.hash)
    throw new Error('OAuth authorization endpoint must be HTTPS');
  const redirect=new URL(args.redirectUri);
  if(redirect.protocol!=='https:'||redirect.username||redirect.password||redirect.hash)
    throw new Error('OAuth callback must be a pre-registered HTTPS URL');
  if(!args.clientId||args.clientId.length>200||!SAFE_TOKEN.test(args.state))
    throw new Error('Invalid client identifier or state');
  if(args.scope.length>20||args.scope.some(s=>!/^[\w.:/-]{1,100}$/.test(s)))
    throw new Error('Invalid provider scope');
  if(args.pkceChallenge!==null&&!/^[A-Za-z0-9_-]{43}$/.test(args.pkceChallenge))
    throw new Error('Invalid PKCE S256 challenge');
  u.searchParams.set('response_type','code');
  u.searchParams.set('client_id',args.clientId);
  u.searchParams.set('redirect_uri',redirect.href);
  u.searchParams.set('state',args.state);
  if(args.scope.length)u.searchParams.set('scope',args.scope.join(' '));
  if(args.pkceChallenge){
    u.searchParams.set('code_challenge',args.pkceChallenge);
    u.searchParams.set('code_challenge_method','S256');
  }
  return u.toString();
}

export function providerSupportsAction(
  adapter:MarketingProviderAdapter,
  action:ProviderCapability,
):boolean{
  return adapter.capabilities.includes(action);
}

/** Deliberately no Facebook personal-profile publishing adapter. */
export const MARKETING_PROVIDER_CONTRACTS={
  meta_pages:{id:'meta_pages',accountTypes:['managed_page'],capabilities:['publish','read_insights'],authorizationEndpoint:'https://www.facebook.com/dialog/oauth',tokenEndpoint:'https://graph.facebook.com/oauth/access_token',supportsPkce:false,requestedScopes:['pages_show_list','pages_read_engagement','pages_manage_posts']},
  instagram_professional:{id:'instagram_professional',accountTypes:['professional_profile'],capabilities:['publish','read_insights'],authorizationEndpoint:'https://www.instagram.com/oauth/authorize',tokenEndpoint:'https://api.instagram.com/oauth/access_token',supportsPkce:false,requestedScopes:['instagram_business_basic','instagram_business_content_publish']},
  whatsapp_business:{id:'whatsapp_business',accountTypes:['business_phone'],capabilities:['read_messages','send_message'],authorizationEndpoint:'https://www.facebook.com/dialog/oauth',tokenEndpoint:'https://graph.facebook.com/oauth/access_token',supportsPkce:false,requestedScopes:['whatsapp_business_management','whatsapp_business_messaging']},
  google_mail:{id:'google_mail',accountTypes:['mailbox'],capabilities:['send_mail'],authorizationEndpoint:'https://accounts.google.com/o/oauth2/v2/auth',tokenEndpoint:'https://oauth2.googleapis.com/token',supportsPkce:true,requestedScopes:['https://www.googleapis.com/auth/gmail.send']},
  microsoft_mail:{id:'microsoft_mail',accountTypes:['mailbox'],capabilities:['send_mail'],authorizationEndpoint:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',tokenEndpoint:'https://login.microsoftonline.com/common/oauth2/v2.0/token',supportsPkce:true,requestedScopes:['Mail.Send','offline_access']},
} as const satisfies Record<ProviderFamily,MarketingProviderAdapter>;
