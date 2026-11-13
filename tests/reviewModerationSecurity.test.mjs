import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReviewSubmission } from '../lib/reviews/submission-contract.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const businessId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const valid = { businessId, userName: 'யாழ்ப்பாணம் Reviewer', rating: 5, comment: 'Very helpful service, thank you.' };

test('Only allowlisted customer review input can reach the server', () => {
  assert.equal(validateReviewSubmission(valid).ok, true);
  for (const row of [
    { ...valid, is_approved: true },
    { ...valid, moderation_status: 'approved' },
    { ...valid, user_id: businessId },
    { ...valid, sentiment: 'positive' },
    { ...valid, created_at: new Date().toISOString() },
  ]) {
    assert.deepEqual(validateReviewSubmission(row), { ok: false, reason: 'unexpected-fields' });
  }
  assert.equal(validateReviewSubmission({ ...valid, userName: 'සමන්ත' }).ok, true);
  assert.equal(validateReviewSubmission({ ...valid, rating: 0 }).ok, false);
  assert.equal(validateReviewSubmission({ ...valid, rating: 5.5 }).ok, false);
  assert.equal(validateReviewSubmission({ ...valid, comment: 'x' }).ok, false);
});

test('Public submit route is origin-checked, authenticated and pending-only', () => {
  const route = read('app/api/reviews/submit/route.ts');
  assert.match(route, /SLBI_REVIEW_MODERATION_READY/);
  assert.match(route, /isSameOrigin\(request\.url, request\.headers\.get\('origin'\)\)/);
  assert.match(route, /validateReviewSubmission\(payload\)/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /\.eq\('status', 'approved'\)/);
  assert.match(route, /business\.owner_id === user\.id/);
  assert.match(route, /user_id: user\.id/);
  assert.match(route, /is_approved: false/);
  assert.match(route, /moderation_status: 'pending'/);
  assert.match(route, /error\.code === '23505'/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
});

test('Business detail review form never controls approval or inserts directly', () => {
  const component = read('app/business/[slug]/BusinessDetailsClient.tsx');
  const handler = component.slice(component.indexOf('const handleReviewSubmit'), component.indexOf('const handleEnquirySubmit'));
  assert.match(handler, /fetch\('\/api\/reviews\/submit'/);
  assert.match(handler, /data\.status !== 'pending'/);
  assert.doesNotMatch(handler, /\.from\(["']reviews["']\)/);
  assert.doesNotMatch(handler, /is_approved|sentiment|user_id|\/api\/reviews\/moderate/);
});

test('Admin queue requires a verified staff role and only decides pending rows', () => {
  const api = read('app/api/admin/reviews/route.ts');
  assert.match(api, /auth\.getUser\(\)/);
  assert.match(api, /\.from\('profiles'\)/);
  assert.match(api, /\['admin', 'ceo'\]/);
  assert.match(api, /\.eq\('moderation_status', 'pending'\)/);
  assert.match(api, /isSameOrigin\(request\.url, request\.headers\.get\('origin'\)\)/);
  assert.match(api, /moderated_by: access\.user\.id/);
  assert.match(api, /moderation_note: note \|\| null/);
  assert.match(api, /\.select\('id,moderation_status'\)\.maybeSingle\(\)/);
  assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
  const nav = read('app/admin/layout.tsx');
  assert.match(nav, /\/admin\/review-queue/);
  const page = read('app/admin/review-queue/page.tsx');
  assert.match(page, /Approve & publish/);
  assert.match(page, /Confirm rejection/);
  assert.match(page, /credentials: 'same-origin'/);
});

test('Anonymous AI-only moderation is retired and public review approval cannot be spoofed by SQL', () => {
  const hono = read('app/api/[[...route]]/route.ts');
  assert.match(hono, /app\.post\('\/reviews\/moderate', \(c\) => c\.json\(/);
  assert.match(hono, /, 410\)/);
  const sql = read('docs/growth/p1/P1_REVIEW_MODERATION_LOCKDOWN_STAGING_ONLY.sql');
  assert.match(sql, /ALTER COLUMN is_approved SET DEFAULT false/);
  assert.match(sql, /is_approved IS FALSE/);
  assert.match(sql, /moderation_status = 'pending'/);
  assert.match(sql, /reviews_one_per_signed_in_user_and_business/);
  assert.match(sql, /REVOKE ALL ON public\.reviews FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /DROP POLICY IF EXISTS "Users can update own reviews"/);
  assert.match(sql, /slbi_review_moderation_audit/);
  assert.match(sql, /review_staff_decide_pending/);
  assert.match(sql, /STAGING \/ DISPOSABLE DB ONLY/);
});
