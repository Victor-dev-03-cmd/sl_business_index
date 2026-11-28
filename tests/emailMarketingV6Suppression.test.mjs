import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSuppressionEmail,safeSuppressionCount} from '../lib/marketing/email-suppression-contract.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('docs/growth/EMAIL_V6_SUPPRESSION_REVIEW_ONLY.sql');
const api=read('app/api/marketing/email/suppressions/route.ts');
const hub=read('app/vendor/marketing/engine/components/EmailMarketingHub.tsx');
test('manual exclusion email validator normalizes and rejects injected invalid entries',()=>{
  assert.equal(normalizeSuppressionEmail('  ExAmPlE@Example.COM '),'example@example.com');
  assert.equal(normalizeSuppressionEmail('user+promo@foo.co.uk'),'user+promo@foo.co.uk');
  for(const input of [undefined,null,12,'','abc','me@example','me@localhost','me@@example.org',
    'a;b@example.org','a,b@example.org','anyone@example.org\nBcc: victim@ex.org','test@bad domain.com',
    'a'.repeat(255)+'@foo.com'])assert.equal(normalizeSuppressionEmail(input),null,String(input));
  assert.equal(safeSuppressionCount(0),0);
  assert.equal(safeSuppressionCount(25),25);
  assert.equal(safeSuppressionCount(null),null);
  assert.equal(safeSuppressionCount(-1),null);
});
test('owner-only immutable manual suppressions with explicit RLS and no owner delete',()=>{
  assert.match(sql,/CREATE TABLE public\.marketing_email_suppressions/i);
  assert.match(sql,/UNIQUE \(business_id,email\)/i);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql,/REVOKE ALL ON public\.marketing_email_suppressions FROM PUBLIC, anon, authenticated/i);
  assert.match(sql,/GRANT SELECT, INSERT ON public\.marketing_email_suppressions TO authenticated/i);
  assert.match(sql,/owner_id=\(select auth\.uid\(\)\)/i);
  assert.match(sql,/b\.owner_id=\(select auth\.uid\(\)\)/i);
  assert.match(sql,/b\.status='approved'/);
  assert.doesNotMatch(sql,/GRANT[^;]*UPDATE|GRANT[^;]*DELETE/i);
  assert.doesNotMatch(sql,/marketing_campaigns\s+SET|DELETE FROM public\.leads/i);
});
test('Suppression API is owner/Pro checked, no bulk delivery and no public export',()=>{
  for(const token of ['auth.getUser()','getMarketingAccessForUser','rejectMarketingAccess','isSameOrigin',
    'normalizeSuppressionEmail',"eq('owner_id',user.id)","eq('business_id',businessId)",
    "eq('status','approved')",'method']) {
    if(token==='method')continue;
    assert.ok(api.includes(token),token);
  }
  assert.match(api,/Buffer\.byteLength\(raw,'utf8'\)>600/);
  assert.match(api,/alreadyExcluded:true/);
  assert.match(api,/\.limit\(100\)/);
  assert.doesNotMatch(api,/service_role|gmail\.send|messages\/send|api\.resend\.com|MAIL_API_KEY/i);
});
test('Audience UI fails closed and reports correct manual exclusion state',()=>{
  assert.match(hub,/email-v6-suppressions/);
  assert.match(hub,/exclusionState==='unavailable'/);
  assert.match(hub,/exclusionState!=='ready'/);
  assert.match(hub,/Do-not-email registry/);
  assert.match(hub,/not a subscriber list/);
  assert.match(hub,/exclusionCount===null\?'—'/);
  assert.match(hub,/credentials:'same-origin'/);
  assert.doesNotMatch(hub,/removeSuppression|deleteExclusion/);
});
