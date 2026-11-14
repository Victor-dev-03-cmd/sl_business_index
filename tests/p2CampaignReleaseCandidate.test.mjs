import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const src=readFileSync(new URL('../docs/growth/p2/P2_05_CAMPAIGN_SECURITY_PRODUCTION_CANDIDATE.sql',import.meta.url),'utf8')
const planner=readFileSync(new URL('../app/vendor/marketing/campaigns/page.tsx',import.meta.url),'utf8')

test('campaign migration is atomic and fail-closed on unexpected live policies',()=>{
  assert.match(src,/BEGIN;/)
  assert.match(src,/COMMIT;/)
  assert.match(src,/DO \$preflight\$/)
  assert.match(src,/policy_count<>1/)
  assert.match(src,/policyname='Vendors manage own campaigns'/)
  assert.match(src,/DO \$postflight\$/)
  assert.match(src,/unsafe direct browser privileges remain/)
})
test('legacy Basic manual draft insert stays supported with owner isolation',()=>{
  assert.match(src,/FOR INSERT TO authenticated WITH CHECK/)
  assert.match(src,/status IN \('drafted','scheduled'\)/)
  assert.match(src,/b.owner_id=\(SELECT auth.uid\(\)\)/)
  assert.match(planner,/status:schedule\?'scheduled':'drafted'/)
  assert.match(src,/GRANT INSERT \(business_id,banner_text,banner_color,platforms,scheduled_at,status\)/)
})
test('forged publication and cross-owner deletion are removed',()=>{
  assert.match(src,/DROP POLICY IF EXISTS "Vendors manage own campaigns"/)
  assert.match(src,/REVOKE ALL ON public.marketing_campaigns FROM PUBLIC,anon,authenticated/)
  assert.doesNotMatch(src,/GRANT DELETE ON public.marketing_campaigns TO authenticated/)
  assert.match(src,/GRANT UPDATE \(banner_text,banner_color,platforms,scheduled_at,status\)/)
  assert.match(src,/has_column_privilege\('authenticated','public.marketing_campaigns','business_id','UPDATE'\)/)
})
test('trusted revisions are only system-written and user-readable under owner RLS',()=>{
  assert.match(src,/CREATE TABLE IF NOT EXISTS public.marketing_campaign_revisions/)
  assert.match(src,/ENABLE ROW LEVEL SECURITY/)
  assert.match(src,/CREATE TRIGGER slbi_marketing_campaign_history/)
  assert.match(src,/SECURITY DEFINER SET search_path=''/)
  assert.match(src,/REVOKE ALL ON FUNCTION public.slbi_capture_marketing_campaign_revision/)
})
