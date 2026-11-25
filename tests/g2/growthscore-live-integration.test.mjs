import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

const api=read('app/api/vendor/g2-growthscore/route.ts');
const domain=read('lib/growth/g2/growth-score.ts');
const contact=read('lib/growth/g2/contact-evidence.ts');
const panel=read('app/vendor/components/G2GrowthScorePanel.tsx');
const knowledge=read('app/vendor/components/G1BusinessKnowledgePanel.tsx');
const dashboard=read('app/vendor/dashboard/page.tsx');
const brand=read('app/vendor/marketing/brand/page.tsx');

test('G2 route authorizes on SSR user and owner+approved RLS before projecting source evidence',()=>{
  assert.match(api,/export async function GET/);
  assert.match(api,/await createClient\(\)/);
  assert.match(api,/resolveG1ReadOnlyKnowledge\(businessId,reader\)/);
  assert.match(api,/auth\.getUser\(\)/);
  assert.match(api,/\.select\(CONTACT_PROJECTION\)/);
  assert.match(api,/\.eq\('id',businessId\)/);
  assert.match(api,/\.eq\('owner_id',user\.id\)/);
  assert.match(api,/\.eq\('status','approved'\)/);
  assert.match(api,/ownerContactEvidence\(data as G2OwnerContactRow\|null,user\.id,businessId\)/);
  assert.match(api,/buildG2GrowthScore\(knowledge\.context,evidence\)/);
  assert.match(api,/private, no-store/);
  assert.match(api,/Vary:'Cookie'/);
  assert.match(api,/reply\(404,/);
  assert.match(api,/reply\(503,/);
  assert.doesNotMatch(api,/createAdminClient|service_role|SUPABASE_SERVICE_ROLE|auth\.getSession/);
  assert.doesNotMatch(api,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(api,/export async function (?:POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(api,/select\('\*'\)/);
});

test('G2 total is 100 weighted content/contact/identity with unknown gate and no paid badge bias',()=>{
  assert.match(domain,/G2_GROWTH_SCORE_VERSION='g2-growth-readiness-v1'/);
  assert.match(domain,/observedWeight>=75\?Math\.round\(100\*earnedWeight\/observedWeight\):null/);
  assert.match(domain,/state!=='unavailable'/);
  assert.match(domain,/state==='missing'/);
  assert.match(domain,/totalWeight!==100/);
  assert.doesNotMatch(domain,/verification\.value|plan_name\b|\.from\(['"]subscriptions['"]\)|views\s*\+/);
  assert.match(contact,/row\.owner_id!==requesterUserId/);
  assert.match(contact,/row\.status!=='approved'/);
  assert.match(contact,/mapAvailable\(row\.latitude,row\.longitude\)/);
  assert.match(contact,/https:/);
});

test('Three existing vendor G1 screens and main dashboard expose same G2 live score with business selector',()=>{
  assert.match(knowledge,/import G2GrowthScorePanel/);
  assert.match(knowledge,/<G2GrowthScorePanel businessId=\{id\}\/>/);
  assert.match(knowledge,/businesses\.filter\(b=>b\.status==='approved'\)/);
  assert.match(dashboard,/import G2GrowthScorePanel/);
  assert.match(dashboard,/approvedForGrowth=useMemo\(\(\)=>businesses\.filter\(b=>b\.status==='approved'\)/);
  assert.match(dashboard,/aria-label="Select business for GrowthScore"/);
  assert.match(dashboard,/<G2GrowthScorePanel businessId=\{growthBusiness\.id\} variant="compact"\/>/);
  assert.match(dashboard,/G3 Growth Command Center/);
  assert.match(panel,/variant==='compact'/);
  assert.match(panel,/api\/vendor\/g2-growthscore\?businessId=/);
  assert.match(panel,/credentials:'same-origin'/);
  assert.match(panel,/cache:'no-store'/);
  assert.match(panel,/result\.businessId!==businessId/);
  assert.match(panel,/Evidence coverage:/);
  assert.match(panel,/Insufficient data for a reliable score/);
  assert.match(panel,/data\.recommendations\.slice\(0,4\)/);
  assert.match(panel,/<Link href=\{action\.href\}/);
  assert.match(panel,/No paid-plan or verification-badge boost/);
  assert.match(brand,/fromUrl=new URLSearchParams\(window\.location\.search\)\.get\('business'\)/);
  assert.match(brand,/owned\.some\(b=>b\.id===fromUrl\)/);
});

test('G2 endpoint keeps contact data private and only returns approved business score, not customer rows',()=>{
  assert.match(api,/reply\(200,\{growthScore\}\)/);
  assert.doesNotMatch(api,/reply\(200,\{(?:data|row|contact|user)/);
  assert.doesNotMatch(contact,/phone:row\.phone|address:row\.address|website:row\.website_url/);
  assert.match(panel,/No private customer data, analytics traffic/);
});
