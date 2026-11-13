import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createOAuthState,createPkceVerifier,pkceS256Challenge,stateDigest,
  secureStateDigestMatch,validateOAuthPendingIntent,makeAuthorizationUrl,
  MARKETING_PROVIDER_CONTRACTS,providerSupportsAction,
} from '../lib/marketing/oauth-provider-contract.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const now=Date.parse('2026-11-13T12:00:00Z');
const id='11111111-1111-4111-8111-111111111111';

test('OAuth CSRF state is random and 256-bit; HMAC never stores raw state',()=>{
  const a=createOAuthState(),b=createOAuthState(),key='S'.repeat(64);
  assert.notEqual(a,b);
  assert.equal(Buffer.from(a,'base64url').length,32);
  assert.equal(Buffer.from(b,'base64url').length,32);
  const digest=stateDigest(a,key);
  assert.notEqual(digest,a);
  assert.equal(secureStateDigestMatch(digest,stateDigest(a,key)),true);
  assert.equal(secureStateDigestMatch(digest,stateDigest(b,key)),false);
  assert.equal(secureStateDigestMatch(digest,'invalid'),false);
  assert.throws(()=>stateDigest(a,'short'));
  assert.throws(()=>stateDigest('../',key));
});

test('PKCE challenge is generated via SHA256 with 64 random verifier bytes',()=>{
  const v=createPkceVerifier(),w=createPkceVerifier();
  assert.notEqual(v,w);
  assert.equal(Buffer.from(v,'base64url').length,64);
  assert.equal(pkceS256Challenge(v).length,43);
  assert.notEqual(pkceS256Challenge(v),pkceS256Challenge(w));
  assert.throws(()=>pkceS256Challenge('bad'));
});

test('OAuth intent rejects expired, replayed, invalid redirect, cross-tenant shape',()=>{
  const good={userId:id,businessId:id,provider:'google_mail',
    stateDigest:stateDigest(createOAuthState(),'X'.repeat(64)),
    pkceVerifierEncrypted:'ciphertext_envelope_256bit_authorized_only',
    redirectUri:'https://slbusinessindex.com/api/marketing/oauth/google_mail/callback',
    expiresAt:new Date(now+10*60*1000).toISOString(),consumedAt:null};
  assert.equal(validateOAuthPendingIntent(good,now),true);
  for(const bad of [
    {...good,userId:'bad'}, {...good,businessId:'bad'},
    {...good,provider:'facebook_personal'}, {...good,consumedAt:new Date(now).toISOString()},
    {...good,redirectUri:'http://evil.com'}, {...good,expiresAt:new Date(now-1).toISOString()},
    {...good,expiresAt:new Date(now+16*60*1000).toISOString()},
    {...good,pkceVerifierEncrypted:'short'},
    {...good,stateDigest:'bad'},
  ])assert.equal(validateOAuthPendingIntent(bad,now),false,JSON.stringify(bad).slice(0,180));
});

test('authorization URL uses exact HTTPS redirect, state and PKCE S256',()=>{
  const state=createOAuthState(),verifier=createPkceVerifier();
  const challenge=pkceS256Challenge(verifier);
  const callback='https://slbusinessindex.com/api/marketing/oauth/google_mail/callback';
  const url=makeAuthorizationUrl({
    endpoint:'https://accounts.google.com/o/oauth2/v2/auth',
    clientId:'sample-developer-client-id',redirectUri:callback,state,
    scope:['https://www.googleapis.com/auth/gmail.send'],pkceChallenge:challenge,
  });
  const p=new URL(url);
  assert.equal(p.searchParams.get('redirect_uri'),callback);
  assert.equal(p.searchParams.get('state'),state);
  assert.equal(p.searchParams.get('code_challenge_method'),'S256');
  assert.equal(p.searchParams.get('code_challenge'),challenge);
  assert.equal(p.searchParams.get('response_type'),'code');
  assert.ok(!url.includes(verifier));
  assert.throws(()=>makeAuthorizationUrl({
    endpoint:'http://untrusted.example/auth',clientId:'x',redirectUri:callback,
    state,scope:[],pkceChallenge:null,
  }));
  assert.throws(()=>makeAuthorizationUrl({
    endpoint:'https://accounts.google.com/o/oauth2/v2/auth',clientId:'x',
    redirectUri:'https://evil.com:443/#payload',state,scope:[],pkceChallenge:null,
  }));
});

test('Provider capabilities are limited to authorized official account types',()=>{
  const adapters=Object.values(MARKETING_PROVIDER_CONTRACTS);
  assert.equal(adapters.length,5);
  assert.ok(!adapters.some(a=>a.accountTypes.includes('personal_profile')));
  assert.equal(providerSupportsAction(MARKETING_PROVIDER_CONTRACTS.google_mail,'send_mail'),true);
  assert.equal(providerSupportsAction(MARKETING_PROVIDER_CONTRACTS.google_mail,'publish'),false);
  assert.equal(providerSupportsAction(MARKETING_PROVIDER_CONTRACTS.meta_pages,'publish'),true);
  assert.equal(providerSupportsAction(MARKETING_PROVIDER_CONTRACTS.meta_pages,'read_mail'),false);
  assert.equal(MARKETING_PROVIDER_CONTRACTS.instagram_professional.accountTypes[0],'professional_profile');
});

test('Pro tenant gate and private encrypted token vault are DB-enforced',()=>{
  const sql=read('docs/growth/p2/P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql');
  assert.match(sql,/marketing_connection_secrets/);
  assert.match(sql,/marketing_oauth_intents/);
  assert.match(sql,/consumed_at timestamptz/);
  assert.match(sql,/UNIQUE\(user_id,business_id,provider,external_account_id\)/);
  assert.match(sql,/REVOKE ALL ON public\.marketing_oauth_intents/);
  assert.match(sql,/GRANT SELECT ON public\.marketing_connections TO authenticated/);
  assert.match(sql,/g\.plan_name IN \('Professional','Enterprise'\)/);
  assert.match(sql,/b\.owner_id=\(SELECT auth\.uid\(\)\)/);
  assert.doesNotMatch(sql,/GRANT SELECT ON public\.marketing_connection_secrets TO authenticated/);
});
