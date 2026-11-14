import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const access=read('lib/marketing/poster-review-access-server.ts');
const layout=read('app/vendor/marketing/design/layout.tsx');
const overview=read('app/vendor/marketing/page.tsx');
const tiles=read('app/vendor/marketing/components/MarketingAppStore.tsx');
const preview=read('app/api/marketing/poster/prompt/route.ts');
const image=read('app/api/marketing/poster/generate/route.ts');

test('Temporary access is only for trusted, server-verified site staff with an owned business and hard expiration',()=>{
  assert.match(access,/import 'server-only'/);
  assert.match(access,/POSTER_REVIEW_EXPIRES_AT='2026-11-21T18:30:00.000Z'/);
  assert.match(access,/Date\.now\(\)>=Date\.parse\(POSTER_REVIEW_EXPIRES_AT\)/);
  assert.match(access,/client\.from\('profiles'\)\.select\('role'\)/);
  assert.match(access,/\.eq\('id',userId\)\.maybeSingle\(\)/);
  assert.match(access,/\['admin','ceo'\]\.includes\(profile\.role\)/);
  assert.match(access,/client\.from\('businesses'\)/);
  assert.match(access,/\.eq\('owner_id',userId\)/);
  assert.doesNotMatch(access,/NEXT_PUBLIC_|localStorage|user_metadata/);
});
test('Only Poster page can use reviewer access: all other premium routes retain their original Pro gate',()=>{
  assert.match(layout,/isPosterReviewAccount\(user\.id,client\)/);
  assert.match(layout,/getUser\(\)/);
  assert.match(layout,/if\(reviewer\)/);
  assert.match(layout,/MarketingProOnly/);
  assert.match(layout,/automatically expires/);
  assert.match(overview,/isPosterReviewAccount\(user\.id,client\)/);
  assert.match(tiles,/app\.id==='poster-editor'&&launchStatus==='coming_soon'/);
  assert.match(tiles,/Staff review/);
  assert.doesNotMatch(read('lib/marketing/pro-access-server.ts'),/poster-review-access-server/);
});
test('Reviewer can preview only zero-cost creative prompt; model/provider remain Pro-only and OFF',()=>{
  assert.match(preview,/isPosterReviewAccount\(user\.id,client\)/);
  assert.match(preview,/!access\.allowed&&!reviewer/);
  assert.match(preview,/!brand&&!reviewer/);
  assert.doesNotMatch(preview,/OPENAI_API_KEY|GROQ_API_KEY|marketing_poster_reserve/);
  assert.match(image,/SLBI_POSTER_IMAGE_AI_ENABLED!=='true'/);
  assert.match(image,/getMarketingAccessForUser/);
  assert.match(image,/rejectMarketingAccess/);
  assert.doesNotMatch(image,/isPosterReviewAccount/);
  assert.match(read('app/api/marketing/poster/artwork/route.ts'),/getMarketingAccessForUser/);
  assert.doesNotMatch(read('app/api/marketing/poster/artwork/route.ts'),/isPosterReviewAccount/);
});
