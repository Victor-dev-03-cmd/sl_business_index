import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MARKETING_CONNECTORS,ENGINE_MODULES,isMarketingProPlan,evaluateMarketingEntitlement,
} from '../lib/marketing/engine-registry.ts';
import {triageMarketingEnquiry} from '../lib/marketing/agent-rules.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-11-13T12:00:00.000Z');
const valid={
  plan_name:'Professional',payment_reference:'verified-payment-123',
  verified_at:'2026-11-12T12:00:00.000Z',
  expires_at:'2026-12-13T12:00:00.000Z',
};
test('Pro plan policy is exactly verified Professional or Enterprise with expiry',()=>{
  assert.equal(isMarketingProPlan('Professional'),true);
  assert.equal(isMarketingProPlan('Enterprise'),true);
  for(const p of ['Basic','Pro','professional','Trial',undefined,null])
    assert.equal(isMarketingProPlan(p),false);
  assert.equal(evaluateMarketingEntitlement(valid,now),true);
  assert.equal(evaluateMarketingEntitlement({...valid,plan_name:'Enterprise'},now),true);
  for(const bad of [
    null,{...valid,plan_name:'Basic'}, {...valid,expires_at:'2026-11-13T12:00:00.000Z'},
    {...valid,verified_at:'2026-11-14T00:00:00.000Z'},
    {...valid,payment_reference:''},{...valid,verified_at:'not-a-date'},
    {...valid,expires_at:null},{...valid,verified_at:undefined},
    {...valid,user_metadata:{plan_name:'Professional'},plan_name:'Basic'},
  ])assert.equal(evaluateMarketingEntitlement(bad,now),false);
});
test('Marketing Studio is overview-only, separate Campaign Workspace preserves full creative functionality',()=>{
  const overview=read('app/vendor/marketing/page.tsx');
  const campaigns=read('app/vendor/marketing/campaigns/page.tsx');
  assert.match(overview,/Marketing Studio/);
  assert.match(overview,/select\('id',\{count:'exact',head:true\}\)/);
  assert.match(overview,/href="\/vendor\/marketing\/engine"/);
  assert.match(overview,/href="\/vendor\/marketing\/campaigns"/);
  assert.match(overview,/Planning records — not queued publishing jobs/);
  assert.doesNotMatch(overview,/section==='social'|const exportBrandedCreative|canvas\.toDataURL|save=async\(schedule/);
  assert.match(campaigns,/const exportBrandedCreative=/);
  assert.match(campaigns,/DRAFT — REVIEW BEFORE PUBLISHING/);
  assert.match(campaigns,/status:schedule\?'scheduled':'drafted'/);
});
test('Marketing Engine is its own page with all requested Pro modules and truthful provider catalogue',()=>{
  const landing=read('app/vendor/marketing/engine/page.tsx');
  assert.match(landing,/Marketing Engine/);
  assert.match(landing,/ENGINE_MODULES\.map/);
  assert.match(landing,/getMarketingAccess\(\)/);
  assert.equal(ENGINE_MODULES.length,5);
  for(const module of ['social','email','agent','connections','automation']){
    assert.ok(ENGINE_MODULES.some(x=>x.slug===module));
    const content=read('app/vendor/marketing/engine/(pro)/'+module+'/page.tsx');
    assert.match(content,/MarketingModuleFrame/);
  }
  assert.equal(MARKETING_CONNECTORS.length,12);
  assert.ok(MARKETING_CONNECTORS.every(x=>x.status==='planned'||x.status==='research'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='facebook_pages'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='whatsapp_business'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='instagram'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='gmail'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='outlook'));
  assert.ok(MARKETING_CONNECTORS.some(x=>x.id==='voice'));
  assert.match(read('app/vendor/marketing/engine/(pro)/connections/page.tsx'),
    /disabled aria-disabled="true"/);
});
test('Pro server access protects all premium routes and authenticated APIs, not just UI buttons',()=>{
  const server=read('lib/marketing/pro-access-server.ts');
  assert.match(server,/auth\.getUser\(\)/);
  assert.match(server,/from\('growth_entitlements'\)/);
  assert.match(server,/\.eq\('user_id',userId\)/);
  assert.match(server,/evaluateMarketingEntitlement\(data\)/);
  assert.match(server,/reason:'upgrade_required'/);
  assert.match(server,/rejectMarketingAccess/);
  const layout=read('app/vendor/marketing/engine/(pro)/layout.tsx');
  assert.match(layout,/MarketingProOnly/);
  for(const mod of ['brand','captions','design','campaigns']){
    assert.match(read('app/vendor/marketing/'+mod+'/layout.tsx'),/MarketingProOnly/);
  }
  for(const api of ['brand-profile','caption']){
    assert.match(read('app/api/marketing/'+api+'/route.ts'),/getMarketingAccessForUser/);
    assert.match(read('app/api/marketing/'+api+'/route.ts'),/rejectMarketingAccess/);
  }
  assert.doesNotMatch(server,/NEXT_PUBLIC_IS_PRO|user_metadata|localStorage/);
});
test('Trilingual deterministic enquiry routing escalates pricing, refunds and uncertainty',()=>{
  const cases=[
    ['Where is your shop located?', 'location','faq_lookup'],
    ['உங்கள் கடை எத்தனை மணிக்கு திறந்திருக்கும்?', 'opening_hours','faq_lookup'],
    ['මේකේ මිල කීයද?', 'pricing','human_review'],
    ['I need a refund for a problem','complaint','human_review'],
    ['Can I book an appointment?', 'booking','create_lead'],
    ['எனக்கு புகார் உள்ளது, கடை எங்கே?', 'complaint','human_review'],
    ['What are your opening hours and contact number?', 'opening_hours','human_review'],
    ['Hello how are you?', 'general','human_review'],
  ];
  for(const [text,intent,action] of cases){
    const r=triageMarketingEnquiry(text);
    assert.equal(r.intent,intent,text);
    assert.equal(r.action,action,text);
  }
  assert.match(read('app/vendor/marketing/engine/(pro)/agent/page.tsx'),/Classify locally/);
  assert.match(read('app/vendor/marketing/engine/(pro)/agent/page.tsx'),/No direct inbound call number/);
  assert.match(read('app/vendor/marketing/engine/(pro)/agent/page.tsx'),/Automatic replies disabled/);
});
test('Vendor top navigation contains two distinct Marketing links without false active parent',()=>{
  const s=read('app/vendor/layout.tsx');
  assert.match(s,/name:'Marketing Studio',href:'\/vendor\/marketing'/);
  assert.match(s,/name:'Marketing Engine',href:'\/vendor\/marketing\/engine'/);
  assert.match(s,/href==='\/vendor\/marketing'\?pathname===href/);
});
