import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Google Mail disconnect API requires real SSR owner, exact origin and preview-only runtime',()=>{
  const route=read('app/api/marketing/oauth/google_mail/disconnect/route.ts');
  const runtime=read('lib/marketing/oauth-runtime.ts');
  assert.match(route,/getGooglePreviewConfig\(\)/);
  assert.match(runtime,/env\.VERCEL_ENV!=='preview'/);
  assert.match(route,/exactOAuthRequestOrigin/);
  assert.match(route,/auth\.getUser\(\)/);
  assert.match(route,/from\('businesses'\)/);
  assert.match(route,/\.eq\('owner_id',user\.id\)/);
  assert.match(route,/slbi_disconnect_google_mail_connection/);
  assert.match(route,/Object\.keys\(v\)\.length!==2/);
  assert.match(route,/Buffer\.byteLength\(raw,'utf8'\)>1024/);
  assert.match(route,/providerPermissionsRevoked:false/);
  assert.match(route,/Response\.json/);
  assert.doesNotMatch(route,/getMarketingAccessForUser|sendEmail|console\.log|console\.error/);
  assert.doesNotMatch(route,/fetch\('https:\/\/oauth2\.googleapis\.com/);
});

test('Staging SQL token purge is service-only and owner-scoped, including expired Pro cleanup',()=>{
  const sql=read('docs/growth/p2/P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY.sql');
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/SET search_path=''/);
  assert.match(sql,/b\.owner_id=p_owner_id/);
  assert.match(sql,/c\.user_id=p_owner_id/);
  assert.match(sql,/c\.business_id=p_business_id/);
  assert.match(sql,/c\.provider='google_mail'/);
  assert.match(sql,/DELETE FROM public\.marketing_connection_secrets/);
  assert.match(sql,/UPDATE public\.marketing_oauth_intents/);
  assert.match(sql,/consumed_at IS NULL/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/);
  assert.match(sql,/TO service_role/);
  assert.doesNotMatch(sql,/p_plan_name|google\.com\/revoke|DROP TABLE/);
  const docker=read('.github/workflows/p2-marketing-brand-foundation.yml');
  assert.match(docker,/P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY\.sql/);
  assert.match(docker,/tests\/p2-oauth\/disconnect-verify\.sql/);
});

test('Preview connection card requests confirmation and reports remote grant separately',()=>{
  const ui=read('app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx');
  const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
  assert.match(ui,/window\.confirm/);
  assert.match(ui,/api\/marketing\/oauth\/google_mail\/disconnect/);
  assert.match(ui,/JSON\.stringify\(\{businessId:ownedBusinessId,connectionId\}\)/);
  assert.match(ui,/router\.refresh\(\)/);
  assert.match(ui,/SLBI stored credentials removed/);
  assert.match(ui,/Google Account security settings/);
  assert.match(page,/\.select\('id,business_id,account_display_name,status,connected_at'\)/);
  assert.match(read('app/vendor/marketing-engine\/(pro)\/layout.tsx'),/MarketingProOnly/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|access_token|refresh_token/);
});
