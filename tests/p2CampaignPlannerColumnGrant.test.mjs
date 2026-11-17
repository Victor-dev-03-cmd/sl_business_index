import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261118003000_p2_campaign_asset_insert_column_grant.sql');
const sqlTest=read('tests/p2-campaign/poster-asset-grants-verify.sql');
const app=read('app/vendor/marketing/captions/page.tsx');
const planner=read('app/vendor/marketing/campaigns/page.tsx');
const history=read('app/vendor/marketing/campaigns/LinkedCaptionPoster.tsx');
const studio=read('app/vendor/marketing/design/puter-lab/page.tsx');
const privateRoute=read('app/api/marketing/poster/saved/route.ts');
const workflow=read('.github/workflows/p2-marketing-brand-foundation.yml');

test('P2-30 repairs only owner-authenticated poster asset INSERT, not all-table write grants',()=>{
  assert.match(sql,/BEGIN;/);
  assert.match(sql,/COMMIT;/);
  assert.match(sql,/GRANT INSERT \(poster_asset_id\) ON TABLE public\.marketing_campaigns TO authenticated/);
  assert.match(sql,/has_column_privilege\('authenticated','public\.marketing_campaigns','poster_asset_id','INSERT'\)/);
  assert.match(sql,/has_column_privilege\('authenticated','public\.marketing_campaigns','poster_asset_id','UPDATE'\)/);
  assert.match(sql,/has_table_privilege\('authenticated','public\.marketing_campaigns','INSERT'\)/);
  assert.match(sql,/relrowsecurity/);
  assert.match(sql,/marketing_campaign_owner_insert/);
  assert.doesNotMatch(sql,/GRANT ALL|GRANT INSERT ON TABLE|GRANT UPDATE ON TABLE|TO anon;|DROP POLICY|DISABLE ROW LEVEL SECURITY|SECURITY DEFINER/);
});

test('Caption Lab Save to Planner specifies only permitted insert fields and exact seven-key brief',()=>{
  assert.match(app,/const brief=plannerBriefFromCaption\(/);
  assert.match(app,/poster_asset_id:posterAssetId\|\|null/);
  assert.match(app,/supabase\.from\('marketing_campaigns'\)\.insert\(patch\)/);
  assert.match(app,/\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(app,/uploadSavedPoster\(businessId,linked\.image\)/);
  assert.match(sqlTest,/Save \+ Planner edit\/schedule\/archive\/restore/);
  assert.match(sqlTest,/INSERT INTO public\.marketing_campaigns/);
  assert.match(sqlTest,/poster_asset_id/);
  assert.match(sqlTest,/captionBundle/);
});

test('Planner and saved PNG controls stay owner-scoped and do not grant client DELETE',()=>{
  assert.match(planner,/status:schedule\?'scheduled':'drafted'/);
  assert.match(sqlTest,/SET is_archived=true/);
  assert.match(planner,/\.update\(patch\)/);
  assert.match(planner,/\.update\(\{is_archived:!c\.is_archived\}\)/);
  assert.match(planner,/\.eq\('id',editingId\)\.eq\('business_id',selectedId\)/);
  assert.match(planner,/\.eq\('id',c\.id\)\.eq\('business_id',c\.business_id\)/);
  assert.match(planner,/poster_asset_id/);
  assert.match(history,/privatePosterUrl\(businessId,assetId\)/);
  assert.match(studio,/Save Poster/);
  assert.match(privateRoute,/\.eq\('id',businessId\)\.eq\('owner_id',user\.id\)/);
  assert.match(privateRoute,/const BUCKET='slbi-poster-ai-private'/);
  assert.doesNotMatch(privateRoute,/getPublicUrl/);
});

test('CI tests real positive/negative RLS and the original unauthorized columns in disposable PostgreSQL',()=>{
  assert.match(workflow,/tests\/p2-campaign\/poster-asset-grants-verify\.sql/);
  assert.match(workflow,/supabase\/migrations\/20261118003000_p2_campaign_asset_insert_column_grant\.sql/);
  assert.match(sqlTest,/SET ROLE authenticated/);
  assert.match(sqlTest,/SET "request\.jwt\.claim\.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'/);
  assert.match(sqlTest,/SET "request\.jwt\.claim\.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'/);
  assert.match(sqlTest,/Owner B can read owner A private asset association/);
  assert.match(sqlTest,/Owner B can archive owner A campaign/);
  assert.match(sqlTest,/Owner B can save campaigns into owner A business/);
  assert.match(sqlTest,/Owner browser can rewrite protected poster asset association/);
  assert.match(sqlTest,/Missing audit on caption campaign creation/);
});
