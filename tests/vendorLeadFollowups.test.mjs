import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LEAD_FOLLOWUP_MAX_DAYS,
  followUpState, localFollowUpInput, parseFollowUpInput,
} from '../lib/growth/lead-followups.ts';

const now = Date.parse('2026-11-13T00:00:00.000Z');
const file = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('in-app reminder state distinguishes future, due soon, overdue, and completed', () => {
  assert.equal(followUpState({due_at:'2026-11-15T12:00:00Z',done_at:null},now),'scheduled');
  assert.equal(followUpState({due_at:'2026-11-13T12:00:00Z',done_at:null},now),'due-soon');
  assert.equal(followUpState({due_at:'2026-11-12T23:59:59Z',done_at:null},now),'overdue');
  assert.equal(followUpState({due_at:'2026-11-12T23:59:59Z',done_at:'2026-11-13T00:05:00Z'},now),'completed');
  assert.equal(followUpState({due_at:'2026-11-13T00:00:00Z',done_at:null},now),'overdue');
});

test('follow-up user-local date converts to a stable UTC instant', () => {
  const utc = '2026-11-14T08:30:00.000Z';
  const local = localFollowUpInput(utc);
  const check = parseFollowUpInput(local,now);
  assert.equal(check.ok,true);
  if(check.ok) assert.equal(check.utc,utc);
  assert.equal(LEAD_FOLLOWUP_MAX_DAYS,365);
});

test('bad input, past dates, impossible dates and distant follow-ups are rejected', () => {
  for(const entry of ['','invalid','2026-02-30T12:00','2026-11-13T00:00','2028-01-01T13:00']) {
    assert.equal(parseFollowUpInput(entry,now).ok,false,entry);
  }
  assert.equal(localFollowUpInput('invalid-date'),'');
});

test('Leads CRM uses paginated owner-scoped data and never calls a sample the full pipeline', () => {
  const source = file('app/vendor/leads/page.tsx');
  assert.match(source,/\.eq\('owner_id', user\.id\)/);
  assert.match(source,/\.in\('business_id', ownedRows\.map\(b => b\.id\)\)/);
  assert.match(source,/\.range\(offset, offset \+ LEAD_PAGE_SIZE - 1\)/);
  assert.match(source,/leadLimitReached/);
  assert.match(source,/incomplete pipeline metrics/);
});

test('reminders are persisted only for owner-visible CRM leads; no fake message delivery', () => {
  const source = file('app/vendor/leads/page.tsx');
  assert.match(source,/\.from\('lead_followups'\)/);
  assert.match(source,/\.upsert\(/);
  assert.match(source,/\.update\(\{ done_at:/);
  assert.match(source,/followUpReadiness === 'available'/);
  assert.match(source,/Follow-up scheduling is not available until the reviewed database migration is applied/);
  assert.match(source,/Not an automatic customer notification, SMS or email/);
  assert.match(source,/Recorded source:/);
  assert.match(source,/\.from\('lead_notes'\)/);
  assert.match(source,/supabase\.auth\.getUser\(\)/);
});

test('review-only schema never allows cross-vendor or anon follow-up read/write', () => {
  const sql = file('docs/growth/p1/P1_VENDOR_LEAD_FOLLOWUPS_REVIEW_ONLY.sql');
  assert.match(sql,/ALTER TABLE public\.lead_followups ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.lead_followups FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/FOR SELECT TO authenticated/);
  assert.match(sql,/FOR INSERT TO authenticated/);
  assert.match(sql,/FOR UPDATE TO authenticated/);
  assert.match(sql,/b\.owner_id=\(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/REVIEW ONLY/);
  assert.match(sql,/DO NOT EXECUTE ON PRODUCTION/);
  assert.match(sql,/TRUNCATE/);
});
