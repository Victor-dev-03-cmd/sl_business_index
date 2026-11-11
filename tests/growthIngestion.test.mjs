import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GROWTH_ALLOWED_EVENTS, GROWTH_ALLOWED_CHANNELS,
  isPrivacyOptOut, isSameOrigin, validateGrowthEvent,
} from '../lib/growth/ingestion-contract.ts';

const eventPayload = {business_id:'123e4567-e89b-42d3-a456-426614174000',event_type:'view'};
const route = readFileSync(new URL('../app/api/analytics/log/route.ts',import.meta.url),'utf8');
const sql = readFileSync(new URL('../docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql',import.meta.url),'utf8');
const dashboard = readFileSync(new URL('../app/vendor/insights/page.tsx',import.meta.url),'utf8');

test('growth event payload allowlist strips untrusted metadata and rejects forged values',()=>{
  const accepted=validateGrowthEvent({...eventPayload,metadata:{rawLocation:'private'},city:'arbitrary',channel:'business_detail'});
  assert.equal(accepted.ok,true);
  if(accepted.ok){
    assert.deepEqual(Object.keys(accepted.value).sort(),['businessId','channel','eventId','eventType']);
    assert.equal(accepted.value.eventId,null);
  }
  assert.equal(validateGrowthEvent({...eventPayload,event_type:'lead_form_submit'}).ok,false);
  assert.equal(validateGrowthEvent({...eventPayload,event_type:'purchase'}).ok,false);
  assert.equal(validateGrowthEvent({...eventPayload,business_id:'../../admin'}).ok,false);
  assert.equal(validateGrowthEvent({...eventPayload,channel:'attacker'}).ok,false);
  assert.equal(validateGrowthEvent({...eventPayload,event_id:'not-uuid'}).ok,false);
  assert.equal(validateGrowthEvent([]).ok,false);
  assert.deepEqual(GROWTH_ALLOWED_EVENTS,['view','call_click','location_click']);
  assert.ok(GROWTH_ALLOWED_CHANNELS.includes('business_detail'));
});

test('same-origin and privacy opt-out are mandatory',()=>{
  assert.equal(isSameOrigin('https://www.slbusinessindex.com/api/analytics/log','https://www.slbusinessindex.com'),true);
  assert.equal(isSameOrigin('https://www.slbusinessindex.com/api/analytics/log','https://attacker.example'),false);
  assert.equal(isSameOrigin('https://www.slbusinessindex.com/api/analytics/log',null),false);
  assert.equal(isSameOrigin('https://www.slbusinessindex.com/api/analytics/log','null'),false);
  assert.equal(isSameOrigin('http://www.slbusinessindex.com/api/analytics/log','http://www.slbusinessindex.com'),false);
  assert.equal(isPrivacyOptOut({get:key=>key==='sec-gpc'?'1':null}),true);
  assert.equal(isPrivacyOptOut({get:key=>key==='dnt'?'1':null}),true);
  assert.equal(isPrivacyOptOut({get:()=>null}),false);
});

test('ingestion route fails closed until both server credentials and schema exist',()=>{
  assert.match(route,/GROWTH_EVENT_INGESTION_ENABLED !== 'true'/);
  assert.match(route,/process\.env\.VERCEL !== '1'/);
  assert.match(route,/process\.env\.SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route,/GROWTH_RATE_LIMIT_SECRET/);
  assert.match(route,/createHmac\('sha256'/);
  assert.match(route,/isPrivacyOptOut\(request\.headers\)/);
  assert.match(route,/server\.rpc\('slbi_record_growth_event'/);
  assert.doesNotMatch(route,/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.match(sql,/security invoker/i);
  assert.match(sql,/drop policy if exists "Anyone can insert logs"/);
  assert.match(sql,/revoke insert on public\.analytics_logs from public, anon, authenticated/);
  assert.match(sql,/revoke all on function public\.slbi_record_growth_event/);
  assert.match(sql,/status = 'approved'/);
});

test('vendor insights remains vendor-owned, RLS-protected and not a sales calculator',()=>{
  assert.match(dashboard,/\.eq\('owner_id', user\.id\)/);
  assert.match(dashboard,/\.eq\('status', 'approved'\)/);
  assert.match(dashboard,/\.from\('analytics_logs'\)/);
  assert.match(dashboard,/\.from\('leads'\)/);
  assert.match(dashboard,/not verified payments, completed sales or revenue/);
  assert.doesNotMatch(dashboard,/service_role|SUPABASE_SECRET_KEY/);
});
