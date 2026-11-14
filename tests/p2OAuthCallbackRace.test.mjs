import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Google callback passes the exact claimed intent, never a browser-selected ID',()=>{
  const api=read('app/api/marketing/oauth/google_mail/callback/route.ts');
  assert.match(api,/const claimedIntentId=claimed\[0\]\.intent_id/);
  assert.match(api,/p_intent_id:claimedIntentId/);
  assert.match(api,/slbi_store_claimed_google_mail_connection/);
  assert.doesNotMatch(api,/slbi_store_verified_marketing_connection/);
  assert.match(api,/auth\.getUser\(\)/);
  assert.match(api,/getMarketingAccessForUser/);
  assert.match(api,/\.eq\('owner_id',user\.id\)/);
});

test('staging SQL binds one-time store to owner and protects local disconnect race',()=>{
  const sql=read('docs/growth/p2/P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql');
  assert.match(sql,/ADD COLUMN IF NOT EXISTS invalidated_at/);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS stored_at/);
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.slbi_store_claimed_google_mail_connection/);
  assert.match(sql,/p_intent_id uuid/);
  assert.match(sql,/v_intent\.invalidated_at IS NOT NULL/);
  assert.match(sql,/v_intent\.stored_at IS NOT NULL/);
  assert.match(sql,/v_intent\.consumed_at IS NULL/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/FOR UPDATE/);
  assert.match(sql,/stored_at=clock_timestamp\(\)/);
  assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.slbi_store_verified_marketing_connection/);
  assert.match(sql,/FROM service_role/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.slbi_store_claimed_google_mail_connection/);
  assert.match(sql,/invalidated_at=clock_timestamp\(\)/);
  assert.match(sql,/SET consumed_at=COALESCE\(i\.consumed_at,clock_timestamp\(\)\)/);
  assert.match(sql,/AND i\.invalidated_at IS NULL/);
  assert.match(sql,/STAGING \/ DISPOSABLE POSTGRES ONLY/);
});
