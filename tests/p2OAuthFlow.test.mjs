import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {
  getGooglePreviewConfig,validateOAuthStartBody,exactOAuthRequestOrigin,
  encryptPreviewValue,decryptPreviewValue,makeGooglePreviewAuthUrl,GOOGLE_SEND_SCOPE,
} from '../lib/marketing/oauth-runtime.ts';
import {exchangeVerifiedGoogleMailbox} from '../lib/marketing/oauth-google.ts';
const environment={
  VERCEL_ENV:'preview',SLBI_MARKETING_OAUTH_PREVIEW_ENABLED:'true',
  SLBI_MARKETING_OAUTH_GOOGLE_ENABLED:'true',
  SLBI_MARKETING_OAUTH_ORIGIN:'https://slbi-preview.example',
  SLBI_MARKETING_OAUTH_ENCRYPTION_KEY:randomBytes(32).toString('base64url'),
  SLBI_MARKETING_OAUTH_STATE_SECRET:'S'.repeat(48),
  SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID:'test-client-id-abcdefghijklmnopqrstuvwxyz',
  SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET:'dev-fake-secret-not-real',
  SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID:'preview-k1',
};
const config=getGooglePreviewConfig(environment);
assert.ok(config);
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const own={ownerId:uuid,businessId:'11111111-1111-4111-8111-111111111111',
  provider:'google_mail',purpose:'pkce',subject:'synthetic-digest'};
test('preview config remains off by default and never runs in production',()=>{
  assert.equal(getGooglePreviewConfig({...environment,VERCEL_ENV:'production'}),null);
  assert.equal(getGooglePreviewConfig({...environment,SLBI_MARKETING_OAUTH_GOOGLE_ENABLED:'false'}),null);
  assert.equal(getGooglePreviewConfig({...environment,SLBI_MARKETING_OAUTH_ORIGIN:'https://evil.example/path'}),null);
  assert.equal(getGooglePreviewConfig({...environment,SLBI_MARKETING_OAUTH_ENCRYPTION_KEY:'invalid'}),null);
});
test('start body and origin are strict, reject redirect injection',()=>{
  assert.equal(validateOAuthStartBody({businessId:uuid}),uuid);
  assert.equal(validateOAuthStartBody({businessId:uuid,ownerId:uuid}),null);
  assert.equal(validateOAuthStartBody({businessId:'not-uuid'}),null);
  assert.ok(exactOAuthRequestOrigin(config.redirectUri,'https://slbi-preview.example',config.origin));
  assert.equal(exactOAuthRequestOrigin(config.redirectUri,'https://evil.example',config.origin),false);
  assert.equal(exactOAuthRequestOrigin('https://evil.example/api','https://evil.example',config.origin),false);
});
test('PKCE envelope has AEAD tenant, purpose and state binding',()=>{
  const encrypted=encryptPreviewValue('long-secret-verifier-'.repeat(5),config.encryptionKey,own);
  assert.ok(!encrypted.includes('long-secret-verifier'));
  assert.equal(decryptPreviewValue(encrypted,config.encryptionKey,own),'long-secret-verifier-'.repeat(5));
  assert.throws(()=>decryptPreviewValue(encrypted,config.encryptionKey,{...own,ownerId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}));
  assert.throws(()=>decryptPreviewValue(encrypted,config.encryptionKey,{...own,subject:'wrong-intent'}));
});
test('Google consent URL uses exact callback and minimum send + OIDC scopes',()=>{
  const u=new URL(makeGooglePreviewAuthUrl(config,'A'.repeat(43),'B'.repeat(86)));
  assert.equal(u.origin,'https://accounts.google.com');
  assert.equal(u.searchParams.get('redirect_uri'),config.redirectUri);
  assert.equal(u.searchParams.get('code_challenge_method'),'S256');
  assert.equal(u.searchParams.get('access_type'),'offline');
  assert.deepEqual(u.searchParams.get('scope').split(' ').sort(),['openid','email',GOOGLE_SEND_SCOPE].sort());
});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('Google mailbox exchange verifies exact scope and stable account sub',async()=>{
  let calls=0;
  const mock=async(url,init)=>{
    calls++;
    if(calls===1){
      assert.equal(url,'https://oauth2.googleapis.com/token');
      assert.equal(init.method,'POST');
      assert.equal(init.body.get('code_verifier'),'B'.repeat(86));
      return response({token_type:'Bearer',access_token:'synthetic-access-token-12345',
        refresh_token:'synthetic-refresh-token-12345',expires_in:3600,
        scope:'openid email '+GOOGLE_SEND_SCOPE});
    }
    assert.equal(url,'https://openidconnect.googleapis.com/v1/userinfo');
    assert.equal(init.headers.authorization,'Bearer synthetic-access-token-12345');
    return response({sub:'google-stable-sub-12345',email:'owner@example.com',email_verified:true});
  };
  const result=await exchangeVerifiedGoogleMailbox(config,'synthetic-code-12345','B'.repeat(86),mock);
  assert.equal(result.sub,'google-stable-sub-12345');
  assert.equal(result.email,'owner@example.com');
  assert.equal(calls,2);
});
test('OAuth rejects token missing gmail.send before identity request',async()=>{
  let calls=0;
  const mock=async()=>{calls++;return response({token_type:'Bearer',access_token:'synthetic-access-token-12345',
    expires_in:3600,scope:'openid email'});};
  await assert.rejects(exchangeVerifiedGoogleMailbox(config,'synthetic-code-12345','B'.repeat(86),mock));
  assert.equal(calls,1);
});
test('OAuth rejects unverified identity and provider error',async()=>{
  let calls=0;
  const mock=async()=>{calls++;
    return calls===1?response({token_type:'Bearer',access_token:'synthetic-access-token-12345',
      expires_in:3600,scope:'openid email '+GOOGLE_SEND_SCOPE})
      :response({sub:'google-sub',email:'owner@example.com',email_verified:false});
  };
  await assert.rejects(exchangeVerifiedGoogleMailbox(config,'synthetic-code-12345','B'.repeat(86),mock));
  const invalid=async()=>response({error:'invalid_grant'},400);
  await assert.rejects(exchangeVerifiedGoogleMailbox(config,'synthetic-code-12345','B'.repeat(86),invalid));
});

import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('start and callback do not trust browser identity or enable live sends',()=>{
  const start=read('app/api/marketing/oauth/google_mail/start/route.ts');
  const callback=read('app/api/marketing/oauth/google_mail/callback/route.ts');
  assert.match(start,/auth\.getUser\(\)/);
  assert.match(start,/getMarketingAccessForUser/);
  assert.match(start,/exactOAuthRequestOrigin/);
  assert.match(start,/marketing_oauth_intents/);
  assert.match(callback,/auth\.getUser\(\)/);
  assert.match(callback,/slbi_claim_marketing_oauth_intent/);
  assert.match(callback,/slbi_store_verified_marketing_connection/);
  assert.match(callback,/decryptPreviewValue/);
  assert.match(callback,/getMarketingAccessForUser/);
  assert.doesNotMatch(callback,/messages\/send|publishApproved|console\.log/);
});
test('connection metadata and encrypted credential are saved atomically',()=>{
  const sql=read('docs/growth/p2/P2_07_OAUTH_CONNECTION_STORE_STAGING_ONLY.sql');
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/marketing_connections/);
  assert.match(sql,/marketing_connection_secrets/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/);
  assert.match(sql,/g\.plan_name IN \('Professional','Enterprise'\)/);
  assert.match(sql,/b\.owner_id=p_owner_id/);
});
