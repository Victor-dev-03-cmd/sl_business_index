import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=file('app/vendor/reviews/page.tsx');
const guard=file('docs/growth/p1/P1_REVIEW_INTEGRITY_REVIEW_ONLY.sql');

test('vendor review listing uses owner scope, published-only results and bounded pagination',()=>{
  assert.match(page,/\.eq\('owner_id', user\.id\)/);
  assert.match(page,/\.in\('business_id', rows\.map\(b => b\.id\)\)/);
  assert.match(page,/\.eq\('is_approved', true\)/);
  assert.match(page,/\.range\(offset, offset \+ REVIEW_PAGE_SIZE - 1\)/);
  assert.match(page,/MAX_REVIEW_ROWS = 5000/);
  assert.match(page,/reviewLimitReached/);
});

test('review metrics do not call a capped sample complete',()=>{
  assert.match(page,/incomplete|incorrect totals|partial exports/i);
  assert.match(page,/loading \|\| error \|\| reviewLimitReached/);
  assert.match(page,/disabled=\{loading \|\| !!error \|\| reviewLimitReached/);
});

test('reply mutation rechecks login and handles uniqueness races with reload',()=>{
  assert.match(page,/supabase\.auth\.getUser\(\)/);
  assert.match(page,/\.eq\('review_id', current\.id\)/);
  assert.match(page,/\.insert\(\{ review_id: current\.id, vendor_id: user\.id, reply_text: text \}\)/);
  assert.match(page,/caught\.code === '23505'/);
  assert.match(page,/await load\(\)/);
});

test('review safety SQL is explicitly review-only until DB-specific tests pass',()=>{
  assert.match(guard,/DO NOT APPLY TO LIVE PRODUCTION/);
  assert.match(guard,/review_replies_one_per_review_idx/);
  assert.match(guard,/UNIQUE INDEX CONCURRENTLY/);
  assert.match(guard,/vendor_id=\(select auth\.uid\(\)\)/);
  assert.match(guard,/r\.is_approved IS TRUE/);
  assert.match(guard,/TRUNCATE/);
  assert.match(guard,/Concurrent double-reply/);
});
