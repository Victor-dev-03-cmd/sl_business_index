import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Permanent internal QA Pro is verified by trusted DB entitlement, never browser email or a global switch',()=>{
  const s=read('lib/marketing/poster-review-access-server.ts');
  assert.match(s,/import 'server-only'/);
  assert.match(s,/isPosterInternalQAAccount/);
  assert.match(s,/from\('growth_entitlements'\)/);
  assert.match(s,/\.eq\('user_id',userId\)/);
  assert.match(s,/payment_reference!==OWNER_QA_GRANT/);
  assert.match(s,/evaluateMarketingEntitlement\(data\)/);
  assert.doesNotMatch(s,/madhulaxsan@gmail\.com|localStorage|NEXT_PUBLIC_IS_PRO/);
  assert.match(s,/POSTER_REVIEW_EXPIRES_AT/);
  const qa=s.split('export async function isPosterInternalQAAccount')[1];
  assert.doesNotMatch(qa,/POSTER_REVIEW_EXPIRES_AT|Date\.now\(\)>=Date\.parse/);
});
test('Only owner QA account sees Poster Test tile, while coming_soon is unchanged for other vendors',()=>{
  const page=read('app/vendor/marketing/page.tsx');
  assert.match(page,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(page,/posterQaAllowed=\{posterQaAllowed\}/);
  const card=read('app/vendor/marketing/components/MarketingAppStore.tsx');
  assert.match(card,/posterQaAllowed&&app\.id==='poster-editor'&&launchStatus==='coming_soon'/);
  assert.match(card,/launched=launchStatus==='live'\|\|review\|\|qa/);
  assert.match(card,/Private QA/);
  assert.match(card,/Pro test grant · release pending/);
  const pro=read('lib/marketing/pro-access-server.ts');
  assert.match(pro,/evaluateMarketingEntitlement\(data\)/);
  assert.doesNotMatch(pro,/isPosterInternalQAAccount|madhulaxsan@gmail\.com/);
});
test('UI-only review exception remains temporary; QA vendor relies on genuine verified Pro row',()=>{
  const layout=read('app/vendor/marketing/design/layout.tsx');
  assert.match(layout,/MarketingProOnly/);
  assert.match(layout,/isPosterReviewAccount/);
  const image=read('app/api/marketing/poster/generate/route.ts');
  assert.match(image,/SLBI_POSTER_IMAGE_AI_ENABLED!=='true'/);
  assert.match(image,/getMarketingAccessForUser/);
  assert.doesNotMatch(image,/isPosterInternalQAAccount/);
  const studio=read('lib/marketing/studio-apps.ts');
  assert.match(studio,/poster-editor/);
});
