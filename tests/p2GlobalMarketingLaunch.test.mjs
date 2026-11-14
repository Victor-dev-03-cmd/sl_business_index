import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MARKETING_STUDIO_APPS} from '../lib/marketing/studio-apps.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('global catalogue is exactly 12 coming-soon apps until explicitly released',()=>{
  const sql=read('docs/growth/p2/P2_MARKETING_GLOBAL_BASELINE_PRODUCTION.sql');
  const store=read('app/vendor/marketing/components/MarketingAppStore.tsx');
  const page=read('app/vendor/marketing/page.tsx');
  assert.equal(MARKETING_STUDIO_APPS.length,12);
  for(const app of MARKETING_STUDIO_APPS){
    assert.ok(sql.includes("('"+app.id+"','coming_soon')"),app.id);
  }
  assert.match(sql,/marketing_studio_app_rollouts/);
  assert.match(sql,/FOR SELECT TO authenticated/);
  assert.match(sql,/REVOKE ALL ON public\.marketing_studio_app_rollouts FROM PUBLIC,anon,authenticated/);
  assert.match(store,/launchStatus==='live'/);
  assert.match(store,/Coming soon/);
  assert.match(store,/return <article/);
  assert.match(store,/launchStatuses\[app\.id\]\?\?'coming_soon'/);
  assert.match(page,/from\('marketing_studio_app_rollouts'\)/);
  assert.match(page,/launchStatuses=\{launchStatuses\}/);
  assert.match(page,/No launch is inferred/);
  assert.doesNotMatch(store,/installPlugin\(|autoPublish\(|sendEmail\(/);
});

test('production P2 baseline is additive and fails closed for provider operations',()=>{
  const sql=read('docs/growth/p2/P2_MARKETING_GLOBAL_BASELINE_PRODUCTION.sql');
  const config=read('lib/marketing/oauth-runtime.ts');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.marketing_oauth_intents/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.marketing_connections/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.marketing_connection_secrets/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.social_brand_profiles/);
  assert.match(sql,/slbi_store_claimed_google_mail_connection/);
  assert.match(sql,/invalidated_at=clock_timestamp\(\)/);
  assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.slbi_store_verified_marketing_connection/);
  assert.match(config,/env\.VERCEL_ENV!=='preview'/);
  assert.doesNotMatch(sql,/TRUNCATE|DROP TABLE public\.marketing_campaigns/);
  assert.doesNotMatch(sql,/\('.*','live'\)/);
});
