import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  normalizeLocalCampaign,initialEmailBlocks,readLocalEmailDrafts,isSafeEmailCta,
} from '../lib/marketing/email-hub-contract.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('docs/growth/EMAIL_V5_CAMPAIGN_PERSISTENCE_MIGRATION.sql');
const api=read('app/api/marketing/email/campaigns/route.ts');
const item=read('app/api/marketing/email/campaigns/[id]/route.ts');
const page=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
const hub=read('app/vendor/marketing/engine/components/EmailMarketingHub.tsx');
const canvas=read('app/vendor/marketing/engine/components/EmailCampaignCanvas.tsx');
const owner='11111111-1111-4111-8111-111111111111';
const business='22222222-2222-4222-8222-222222222222';
const campaign='33333333-3333-4333-8333-333333333333';
const draft=()=>({
  id:campaign,ownerScope:owner,businessId:business,title:'Test campaign',
  subject:'Business offer',preheader:'Upcoming offer',
  ctaUrl:'https://www.slbusinessindex.com/business/demo',language:'ta',kind:'offer',
  layout:'minimal',blocks:initialEmailBlocks('minimal','A genuine message'),
  posterId:null,createdAt:'2026-11-28T07:00:00.000Z',updatedAt:'2026-11-28T07:00:00.000Z',
  status:'local_draft',buttonColor:'#F97316',logoSize:56,
});
test('Draft contract: strict owner, approved-business and HTTPS CTA only',()=>{
  assert.ok(normalizeLocalCampaign(draft(),owner,[business]));
  assert.equal(normalizeLocalCampaign({...draft(),ctaUrl:'javascript:alert(1)'},owner,[business]),null);
  assert.equal(normalizeLocalCampaign({...draft(),ctaUrl:'http://localhost'},owner,[business]),null);
  assert.equal(normalizeLocalCampaign({...draft(),ctaUrl:'https://user:pass@ex.org'},owner,[business]),null);
  assert.equal(normalizeLocalCampaign({...draft(),ownerScope:'44444444-4444-4444-8444-444444444444'},owner,[business]),null);
  assert.equal(normalizeLocalCampaign({...draft(),businessId:'55555555-5555-4555-8555-555555555555'},owner,[business]),null);
  assert.equal(normalizeLocalCampaign({...draft(),status:'sent'},owner,[business]),null);
  assert.equal(isSafeEmailCta('https://www.slbusinessindex.com'),true);
  assert.equal(readLocalEmailDrafts(JSON.stringify([draft()]),owner,[business]).length,1);
});
test('SQL strictly separates Email Campaigns from social campaigns, uses owner RLS and revision lock',()=>{
  assert.match(migration,/marketing_email_campaign_drafts/);
  assert.match(migration,/owner_id uuid not null references auth\.users/);
  assert.match(migration,/business_id uuid not null references public\.businesses/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration,/for select to authenticated using \(owner_id=\(select auth\.uid\(\)\)\)/i);
  assert.match(migration,/for insert to authenticated with check[\s\S]*b\.status='approved'/i);
  assert.match(migration,/for update to authenticated using[\s\S]*with check/i);
  assert.match(migration,/SECURITY INVOKER/i);
  assert.match(migration,/p_expected_revision/);
  assert.match(migration,/c\.revision=p_expected_revision/);
  assert.match(migration,/on conflict\(id\) do nothing/i);
  assert.match(migration,/marketing_email_campaign_draft_history/);
  assert.match(migration,/create schema if not exists slbi_internal/);
  assert.match(migration,/revoke all on function slbi_internal\.email_draft_audit/);
  assert.doesNotMatch(migration,/delete from public\.marketing_campaigns|alter table public\.marketing_campaigns/);
});
test('Campaign API never grants access based on client-supplied user ID or sends email',()=>{
  for(const x of ["auth.getUser()","rejectMarketingAccess","getMarketingAccessForUser",
    ".eq('owner_id',user.id)",".eq('status','approved')","isSameOrigin",
    'slbi_email_save_draft','expectedRevision','normalizeLocalCampaign','httpsLink',
    'cache-control'])assert.ok(api.includes(x),x);
  assert.match(api,/Buffer\.byteLength\(text,'utf8'\)>48000/);
  assert.match(api,/client\.rpc\('slbi_email_save_draft'/);
  assert.match(api,/REVISION_CONFLICT/);
  assert.match(item,/method:'DELETE'|export async function DELETE/);
  assert.match(item,/\.eq\('owner_id',user\.id\)/);
  assert.match(item,/marketing_email_campaign_draft_history/);
  assert.doesNotMatch(api+item,/gmail\.send|messages\/send|fetch\('https:\/\/api\.resend\.com|service.role.*key/i);
});
test('Hub server drafts have owner-scoped sync, explicit browser backup, version restore and editor autosave',()=>{
  assert.match(page,/serverDrafts=\{serverDrafts\}/);
  assert.match(page,/serverStorageReady=\{serverStorageReady\}/);
  assert.match(page,/\.from\('marketing_email_campaign_drafts'\)/);
  assert.match(page,/\.eq\('owner_id',user\.id\)/);
  assert.match(hub,/serverVersions/);
  assert.match(hub,/expectedRevision:serverVersions\[campaign\.id\]\|\|0/);
  assert.match(hub,/Sync/);
  assert.match(hub,/Cloud draft/);
  assert.match(hub,/openHistory/);
  assert.match(hub,/Restore in editor/);
  assert.match(hub,/Your browser backup is preserved/);
  assert.match(canvas,/const handle=setTimeout\(\(\)=>\{void save\(\);\},2500\)/);
  assert.match(canvas,/e\.key\.toLowerCase\(\)==='s'/);
  assert.match(canvas,/Saved to your SLBI account/);
  assert.match(canvas,/onSave:\(campaign:LocalEmailCampaign\)=>Promise/);
  assert.doesNotMatch(canvas,/messages\/send|gmail\.send/);
});
