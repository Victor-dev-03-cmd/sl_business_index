/**
 * Official Google OAuth code exchange + OIDC UserInfo verification (preview only).
 * Do not import into browser components; no email-send endpoint is implemented.
 */
import {GOOGLE_SEND_SCOPE,type GooglePreviewOAuthConfig} from './oauth-runtime.ts';
export type VerifiedGoogleMailbox={
  sub:string;email:string;scopes:string[];accessToken:string;refreshToken:string|null;expiresAt:string;
};
type HttpFetch=typeof fetch;
export async function exchangeVerifiedGoogleMailbox(
  config:GooglePreviewOAuthConfig,code:string,verifier:string,
  http:HttpFetch=fetch,
):Promise<VerifiedGoogleMailbox>{
  if(!/^[\w./-]{8,4096}$/.test(code)||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier))
    throw new Error('Invalid OAuth authorization code or PKCE');
  const res=await http('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      code,client_id:config.clientId,client_secret:config.clientSecret,
      redirect_uri:config.redirectUri,code_verifier:verifier,grant_type:'authorization_code',
    }),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
  });
  if(!res.ok)throw new Error('OAuth token exchange rejected');
  const data=await res.json() as Record<string,unknown>;
  const scopes=typeof data.scope==='string'?data.scope.split(/\s+/).filter(Boolean):[];
  if(data.token_type!=='Bearer'||typeof data.access_token!=='string'||
     data.access_token.length<10||data.access_token.length>16000||
     !scopes.includes(GOOGLE_SEND_SCOPE)||!scopes.includes('openid')||
     !(scopes.includes('email')||scopes.includes('https://www.googleapis.com/auth/userinfo.email')))
    throw new Error('OAuth token scopes incomplete');
  const accessToken=data.access_token;
  const expires=typeof data.expires_in==='number'?data.expires_in:Number(data.expires_in);
  if(!Number.isSafeInteger(expires)||expires<=0||expires>86400)
    throw new Error('Invalid token expiration');
  const identity=await http('https://openidconnect.googleapis.com/v1/userinfo',{
    method:'GET',headers:{authorization:'Bearer '+accessToken},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
  });
  if(!identity.ok)throw new Error('Unable to verify Google account');
  const owner=await identity.json() as Record<string,unknown>;
  if(typeof owner.sub!=='string'||owner.sub.length<3||owner.sub.length>255||
     typeof owner.email!=='string'||owner.email.length>160||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)||
     owner.email_verified!==true)throw new Error('Unverified Google account');
  const refresh=data.refresh_token;
  if(refresh!==undefined&&(typeof refresh!=='string'||refresh.length<10||refresh.length>16000))
    throw new Error('Invalid Google refresh token');
  return {
    sub:owner.sub,email:owner.email,scopes,
    accessToken,refreshToken:typeof refresh==='string'?refresh:null,
    expiresAt:new Date(Date.now()+expires*1000).toISOString(),
  };
}
