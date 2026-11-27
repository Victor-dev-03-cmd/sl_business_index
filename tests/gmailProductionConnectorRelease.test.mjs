import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
 getGooglePreviewConfig,getGoogleConnectorConfig,getGoogleConnectorReadiness,
 getGoogleDisconnectOrigin,GOOGLE_PRODUCTION_ORIGIN,GOOGLE_READ_SCOPE,
 GOOGLE_SEND_SCOPE,makeGooglePreviewAuthUrl,GOOGLE_CALLBACK_PATH,
 exactOAuthRequestOrigin,
} from '../lib/marketing/oauth-runtime.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base={
 VERCEL_ENV:'production',
 SLBI_MARKETING_OAUTH_GOOGLE_ENABLED:'true',
 SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED:'true',
 SLBI_MARKETING_OAUTH_ORIGIN:'https://www.slbusinessindex.com',
 SLBI_MARKETING_OAUTH_STATE_SECRET:'s'.repeat(48),
 SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID:'test-client-id-abcdefghijklmnopqrstuvwxyz',
 SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET:'dummy-client-secret',
 SLBI_MARKETING_OAUTH_ENCRYPTION_KEY:randomBytes(32).toString('base64url'),
 SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID:'production-v1',
};
test('Production OAuth is disabled by default, even with old Preview flags',()=>{
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED:'false'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_GOOGLE_ENABLED:'false'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_ORIGIN:'https://evil.example'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_ORIGIN:'http://www.slbusinessindex.com'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_ORIGIN:'https://slbusinessindex.com'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_ORIGIN:'https://www.slbusinessindex.com/redirect'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET:''}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_ENCRYPTION_KEY:'wrong'}),null);
 assert.equal(getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_STATE_SECRET:'short'}),null);
 assert.equal(getGoogleConnectorConfig({...base,VERCEL_ENV:'development'}),null);
 assert.equal(getGooglePreviewConfig({...base,SLBI_MARKETING_OAUTH_PREVIEW_ENABLED:'true'}),null);
});
test('Production OAuth uses only the exact canonical redirect URI; no arbitrary origins',()=>{
 const config=getGoogleConnectorConfig(base);
 assert.ok(config);
 assert.equal(config.deployment,'production');
 assert.equal(config.origin,GOOGLE_PRODUCTION_ORIGIN);
 assert.equal(config.redirectUri,GOOGLE_PRODUCTION_ORIGIN+GOOGLE_CALLBACK_PATH);
 assert.equal(config.gmailReadEnabled,false);
 const url=new URL(makeGooglePreviewAuthUrl(config,'A'.repeat(43),'B'.repeat(86)));
 assert.equal(url.hostname,'accounts.google.com');
 assert.equal(url.searchParams.get('redirect_uri'),config.redirectUri);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('access_type'),'offline');
 assert.equal(url.searchParams.get('scope').includes(GOOGLE_SEND_SCOPE),true);
 assert.equal(url.searchParams.get('scope').includes(GOOGLE_READ_SCOPE),false);
 assert.equal(exactOAuthRequestOrigin(config.origin+'/api/marketing/oauth/google_mail/start',
   'https://www.slbusinessindex.com',config.origin),true);
 assert.equal(exactOAuthRequestOrigin(config.origin+'/api/marketing/oauth/google_mail/start',
   'https://other.example',config.origin),false);
});
test('Google restricted inbox read is a separate independent OFF-by-default production gate',()=>{
 const disabled=getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_GMAIL_READ_PREVIEW_ENABLED:'true'});
 assert.ok(disabled);
 assert.equal(disabled.gmailReadEnabled,false);
 const enabled=getGoogleConnectorConfig({...base,SLBI_MARKETING_OAUTH_GMAIL_READ_PRODUCTION_ENABLED:'true'});
 assert.ok(enabled);
 assert.equal(enabled.gmailReadEnabled,true);
 const url=new URL(makeGooglePreviewAuthUrl(enabled,'A'.repeat(43),'B'.repeat(86)));
 assert.ok(url.searchParams.get('scope').split(' ').includes(GOOGLE_READ_SCOPE));
 assert.equal(getGoogleConnectorReadiness({...base,SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED:'false'}).reason,'google_setup_required');
 assert.equal(getGoogleConnectorReadiness(base).configured,true);
 assert.equal(getGoogleConnectorReadiness(base).gmailReadEnabled,false);
});
test('Owner can still disconnect after OAuth flag or credentials are disabled',()=>{
 const disabled={VERCEL_ENV:'production',SLBI_MARKETING_OAUTH_GOOGLE_ENABLED:'false'};
 assert.equal(getGoogleConnectorConfig(disabled),null);
 assert.equal(getGoogleDisconnectOrigin(disabled),GOOGLE_PRODUCTION_ORIGIN);
 assert.equal(getGoogleDisconnectOrigin({VERCEL_ENV:'preview',SLBI_MARKETING_OAUTH_ORIGIN:'https://preview.example'}),'https://preview.example');
 assert.equal(getGoogleDisconnectOrigin({VERCEL_ENV:'development'}),null);
 const route=read('app/api/marketing/oauth/google_mail/disconnect/route.ts');
 assert.match(route,/getGoogleDisconnectOrigin\(\)/);
 assert.match(route,/exactOAuthRequestOrigin/);
 assert.match(route,/auth\.getUser\(\)/);
 assert.match(route,/slbi_disconnect_google_mail_connection/);
 assert.doesNotMatch(route,/messages\/send|\.insert\(/);
});
test('End-to-end production code uses same verified owner/approved business with encrypted intent store',()=>{
 const start=read('app/api/marketing/oauth/google_mail/start/route.ts');
 const callback=read('app/api/marketing/oauth/google_mail/callback/route.ts');
 const preview=read('app/api/marketing/oauth/google_mail/preview/route.ts');
 for(const src of [start,callback,preview])assert.match(src,/getGoogleConnectorConfig\(\)/);
 for(const src of [start,callback])assert.match(src,/auth\.getUser\(\)/);
 assert.match(start,/slbi_begin_marketing_oauth_intent/);
 assert.match(start,/business\.status!=='approved'/);
 assert.match(callback,/slbi_claim_marketing_oauth_intent/);
 assert.match(callback,/slbi_store_claimed_google_mail_connection/);
 assert.match(callback,/intent\.business_id/);
 assert.match(callback,/stillOwned\.status!=='approved'/);
 assert.match(preview,/GOOGLE_READ_SCOPE/);
 assert.match(preview,/auth\.getUser\(\)/);
 assert.match(preview,/readGmailPreviewHeaders/);
 for(const src of [start,callback,preview]){
  assert.doesNotMatch(src,/messages\/send|\.insert\(|console\.log/);
 }
});
test('Callback opens Gmail panel and reports only real stored connection status',()=>{
 const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
 const grid=read('app/vendor/marketing/engine/components/ConnectorGrid.tsx');
 const gmail=read('app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx');
 const email=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
 assert.match(page,/getGoogleConnectorConfig\(\)/);
 assert.match(page,/oauthResult==='connected'/);
 assert.match(grid,/oauthNotice\?'gmail':null/);
 assert.match(page,/googleConnected=\{googleConnected\}/);
 assert.match(gmail,/connected\.length>0\?\(/);
 assert.match(gmail,/Google setup required/);
 assert.match(gmail,/Connect Gmail/);
 assert.match(gmail,/disconnectingId\|\|busy/);
 assert.match(email,/getGoogleConnectorConfig\(\)/);
 assert.match(email,/marketing_connections/);
});
