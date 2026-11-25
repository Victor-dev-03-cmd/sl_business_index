import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WA01_TOOLS, WA01_VERSION, prepareWA01Manifest, issueSyntheticWA01Approval,
  evaluateWA01DryRunQueue, describeWA01Preview,
} from '../../lib/growth/agent/wa01-orchestrator.mjs';

const NOW=Date.parse('2026-11-25T15:30:00.000Z');
const USER='11111111-1111-4111-8111-111111111111';
const BUSINESS='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PLAN='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const H='a'.repeat(64),COPY='b'.repeat(64),CONSENT='c'.repeat(64);
const SERVER_SECRET='synthetic-server-only-dev-secret-12345678901234567890';
const context=()=>({
  ownerId:USER,ownedApprovedBusinessIds:[BUSINESS],channelBindingId:'link:wa-owner',
  providerAccounts:[
    {ref:'acct:fb-page',provider:'facebook_pages',status:'connected',permittedTools:['publish_facebook']},
    {ref:'acct:ig-pro',provider:'instagram',status:'connected',permittedTools:['publish_instagram']},
    {ref:'acct:email',provider:'verified_email',status:'connected',permittedTools:['send_email']},
  ],
  consentedAudienceSegments:[{
    ref:'segment:optin',count:35,consentSnapshotSha256:CONSENT,
    optInVerifiedByServer:true,unsubscribeReady:true,status:'active',
  }],
});
const action=(id,tool,extra={})=>({
  id,tool,contentSha256:H,previewSha256:COPY,providerAccountRef:null,
  audienceSegmentRef:null,audienceCount:null,recipientConsentSnapshotSha256:null,
  scheduledAt:null,estimatedCostMinor:0,...extra,
});
const draft=(id='poster_1')=>action(id,'prepare_poster');
const social=(id='facebook_1')=>action(id,'publish_facebook',{providerAccountRef:'acct:fb-page'});
const email=(id='email_1')=>action(id,'send_email',{
  providerAccountRef:'acct:email',audienceSegmentRef:'segment:optin',
  audienceCount:35,recipientConsentSnapshotSha256:CONSENT,
});
const plan=(actions=[draft(),social(),email()],extra={})=>({
  planId:PLAN,revision:1,businessId:BUSINESS,
  expiresAt:new Date(NOW+10*60000).toISOString(),maxTotalCostMinor:0,
  actions,...extra,
});
const build=(a=plan(),ctx=context())=>prepareWA01Manifest(a,ctx,NOW);
let INTERACTION=0;
const grant=(m,kind,actionId,ctx=context(),t=NOW)=>{
  INTERACTION++;
  return issueSyntheticWA01Approval(m,ctx,{
    kind,actionId,ownerId:USER,channelBindingId:ctx.channelBindingId,
    interactionId:'tap:'+INTERACTION,verifiedByServer:true,
  },SERVER_SECRET,t);
};
const claimStore=()=>{
  const seen=new Set();
  return async claim=>{
    const key=[claim.ownerId,claim.businessId,claim.manifestDigest,claim.planId,
      claim.revision,claim.actionId,claim.itemNonce].join(':');
    const stable=[claim.ownerId,claim.businessId,claim.planId,claim.revision,claim.actionId].join(':');
    if(seen.has(stable)||seen.has(key))return false;
    seen.add(key);seen.add(stable);return true;
  };
};
async function attempt(m,actionId,item,final,ctx=context(),claim=claimStore(),secret=SERVER_SECRET,t=NOW){
  return evaluateWA01DryRunQueue({
    manifest:m,actionId,itemApproval:item,finalApproval:final,serverContext:ctx,
    serverSecret:secret,nowMs:t,atomicClaimOnce:claim,
  });
}

test('WA-01 exposes full vendor toolkit and blocks sensitive operations',()=>{
  assert.equal(WA01_VERSION,'neurogrowth-wa01-v1');
  for(const cap of ['read_business_profile','read_safe_settings','read_crm_summary',
    'read_review_summary','read_business_analytics','read_marketing_studio',
    'read_campaign_calendar','prepare_poster','prepare_caption','prepare_email',
    'publish_facebook','publish_instagram','send_email'])assert.ok(WA01_TOOLS[cap]);
  for(const cap of ['delete_business_or_account','modify_billing','change_security_settings',
    'approve_verified_badge','arbitrary_database_access','send_customer_whatsapp']){
    assert.equal(WA01_TOOLS[cap].kind,'blocked');
    assert.equal(build(plan([action('x_1',cap)])).ok,false);
  }
});
test('one-request Christmas campaign prepares immutable preview, never sends',()=>{
  const response=build();
  assert.equal(response.ok,true);
  const {manifest}=response;
  assert.equal(manifest.ownerId,USER);assert.equal(manifest.businessId,BUSINESS);
  assert.match(manifest.digest,/^[a-f0-9]{64}$/);
  assert.equal(manifest.actions.length,3);
  assert.deepEqual(describeWA01Preview(manifest).map(x=>x.requiresFinalApproval),
    [false,true,true]);
  assert.ok(Object.isFrozen(manifest));assert.ok(Object.isFrozen(manifest.actions[0]));
  assert.ok(describeWA01Preview(manifest).every(x=>x.status==='prepared_preview_only'));
  assert.equal(build().manifest.digest,manifest.digest);
});
test('vendor owner scope and verified linked conversation are required',()=>{
  assert.equal(build(plan(),{...context(),ownerId:null}).reason,'owner_or_business_not_verified');
  assert.equal(build(plan(),{...context(),ownedApprovedBusinessIds:[OTHER]}).ok,false);
  assert.equal(build(plan(),{...context(),channelBindingId:''}).ok,false);
  assert.equal(build(plan([], {businessId:OTHER})).ok,false);
  assert.equal(build(plan(),null).ok,false);
});
test('unknown plan/action fields, PII injection, duplicate and arbitrary tools fail closed',()=>{
  assert.equal(build({...plan(),phone:'077'}).reason,'malformed_plan');
  assert.equal(build(plan([{...draft(),customerEmail:'private@example.com'}])).ok,false);
  assert.equal(build(plan([action('bad_1','execute_sql')])).ok,false);
  assert.equal(build(plan([draft('same_1'),social('same_1')])).reason,'duplicate_action_id');
  assert.equal(build(plan([])).reason,'action_count_out_of_range');
  assert.equal(build(plan(Array(13).fill(draft()))).ok,false);
});
test('drafts cannot inherit paid sending or provider permission',()=>{
  assert.equal(build(plan([draft('poster_1'),action('fake_1','prepare_email',{providerAccountRef:'acct:email'})])).reason,
    'draft_has_delivery_side_effects');
  assert.equal(build(plan([action('fake_1','prepare_campaign',{estimatedCostMinor:20})])).ok,false);
  assert.equal(build(plan([action('draft_1','propose_settings_change')])).ok,true);
});
test('no account, revoked provider, or wrong provider cannot be used',()=>{
  assert.equal(build(plan([social()]),{...context(),providerAccounts:[]}).reason,
    'provider_or_consent_not_verified');
  assert.equal(build(plan([social()]),{...context(),providerAccounts:[
    {ref:'acct:fb-page',provider:'facebook_pages',status:'revoked',permittedTools:['publish_facebook']}
  ]}).ok,false);
  assert.equal(build(plan([social()]),{...context(),providerAccounts:[
    {ref:'acct:fb-page',provider:'instagram',status:'connected',permittedTools:['publish_facebook']}
  ]}).ok,false);
});
test('email sending needs current consented recipient segment and unsubscribe setup',()=>{
  assert.equal(build(plan([email()])).ok,true);
  assert.equal(build(plan([email()]),{...context(),consentedAudienceSegments:[]}).ok,false);
  assert.equal(build(plan([email()]),{...context(),consentedAudienceSegments:[
    {...context().consentedAudienceSegments[0],unsubscribeReady:false}
  ]}).ok,false);
  assert.equal(build(plan([email()]),{...context(),consentedAudienceSegments:[
    {...context().consentedAudienceSegments[0],count:50}
  ]}).ok,false);
  assert.equal(build(plan([action('email_1','send_email',{
    providerAccountRef:'acct:email',audienceSegmentRef:'segment:optin',
    audienceCount:35,recipientConsentSnapshotSha256:'e'.repeat(64),
  })])).ok,false);
  assert.equal(build(plan([social('fb_1'),action('fb_2','publish_facebook',{
    providerAccountRef:'acct:fb-page',audienceSegmentRef:'segment:optin',
  })])).ok,false);
});
test('plan cost ceiling, expiry, schedule, version and unknown hashes are blocked',()=>{
  assert.equal(build(plan([action('fb_1','publish_facebook',{
    providerAccountRef:'acct:fb-page',estimatedCostMinor:100,
  })])).reason,'total_budget_exceeded');
  assert.equal(build(plan([draft()],{expiresAt:new Date(NOW-1000).toISOString()})).reason,
    'plan_expiry_invalid');
  assert.equal(build(plan([draft()],{expiresAt:new Date(NOW+3600000).toISOString()})).ok,false);
  assert.equal(build(plan([social('fb_1')],{revision:-1})).ok,false);
  assert.equal(build(plan([action('fb_1','publish_facebook',{
    providerAccountRef:'acct:fb-page',scheduledAt:new Date(NOW-1000).toISOString()
  })])).ok,false);
  assert.equal(build(plan([action('fb_1','publish_facebook',{
    providerAccountRef:'acct:fb-page',contentSha256:'not-a-real-hash'
  })])).ok,false);
});
test('approval must come from distinct explicit simulated vendor interactions',async()=>{
  const m=build().manifest;
  const item=grant(m,'item','facebook_1'),final=grant(m,'final',null);
  assert.equal(item.ok,true);assert.equal(final.ok,true);
  assert.equal((await attempt(m,'facebook_1',item.receipt,final.receipt)).status,
    'synthetic_dry_run_queue_candidate');
  assert.equal((await attempt(m,'facebook_1',null,final.receipt)).ok,false);
  assert.equal((await attempt(m,'email_1',item.receipt,final.receipt)).ok,false);
  assert.equal(grant(m,'item','not_in_plan').ok,false);
  assert.equal(grant(m,'final','facebook_1').ok,false);
  assert.equal(issueSyntheticWA01Approval(m,context(),{
    kind:'item',actionId:'facebook_1',ownerId:USER,
    channelBindingId:'link:wa-owner',interactionId:'tap:bad',
    verifiedByServer:false,
  },SERVER_SECRET,NOW).ok,false);
});
test('approval binds vendor, business, plan revision, manifest and exact media/copy hashes',async()=>{
  const m=build().manifest;
  const item=grant(m,'item','facebook_1').receipt,final=grant(m,'final',null).receipt;
  assert.equal((await attempt(m,'facebook_1',{...item,signature:'a'.repeat(43)},final)).ok,false);
  assert.equal((await attempt(m,'facebook_1',item,final,{...context(),ownerId:OTHER})).ok,false);
  assert.equal((await attempt(m,'facebook_1',item,final,{...context(),channelBindingId:'link:other'})).ok,false);
  const changed=build(plan([draft(),social(),email()],{revision:2})).manifest;
  assert.equal((await attempt(changed,'facebook_1',item,final)).ok,false);
  const replaced=build(plan([draft(),{...social(),contentSha256:'d'.repeat(64)},email()])).manifest;
  assert.equal((await attempt(replaced,'facebook_1',item,final)).ok,false);
  const mediaChanged=build(plan([draft(),{...social(),previewSha256:'e'.repeat(64)},email()])).manifest;
  assert.equal((await attempt(mediaChanged,'facebook_1',item,final)).ok,false);
});
test('approval expiry, missing atomic claim, and denied claim fail closed',async()=>{
  const m=build().manifest,item=grant(m,'item','facebook_1').receipt,final=grant(m,'final',null).receipt;
  assert.equal((await attempt(m,'facebook_1',item,final,context(),null)).reason,
    'atomic_replay_store_required');
  assert.equal((await attempt(m,'facebook_1',item,final,context(),async()=>false)).reason,
    'replayed_or_unavailable');
  assert.equal((await attempt(m,'facebook_1',item,final,context(),async()=>{throw Error('db down')})).reason,
    'replay_store_unavailable');
  assert.equal((await attempt(m,'facebook_1',item,final,context(),claimStore(),
    SERVER_SECRET,NOW+6*60000)).ok,false);
  assert.equal((await attempt(m,'facebook_1',item,final,context(),claimStore(),
    'wrong-secret-which-is-at-least-32-bytes-',NOW)).ok,false);
});
test('two simultaneous same-action requests cannot both claim synthetic nonce',async()=>{
  const m=build().manifest,item=grant(m,'item','facebook_1').receipt,final=grant(m,'final',null).receipt;
  const claim=claimStore();
  const outcomes=await Promise.all(Array.from({length:8},()=>attempt(m,'facebook_1',item,final,
    context(),claim)));
  assert.equal(outcomes.filter(o=>o.ok).length,1);
  assert.equal(outcomes.filter(o=>!o.ok&&o.reason==='replayed_or_unavailable').length,7);
});
test('final manifest approval can cover separately item-approved social/email, not an unapproved one',async()=>{
  const m=build().manifest;
  const final=grant(m,'final',null).receipt;
  const facebook=grant(m,'item','facebook_1').receipt;
  const emailApproval=grant(m,'item','email_1').receipt;
  const claim=claimStore();
  assert.equal((await attempt(m,'facebook_1',facebook,final,context(),claim)).ok,true);
  assert.equal((await attempt(m,'email_1',emailApproval,final,context(),claim)).ok,true);
  assert.equal((await attempt(m,'email_1',facebook,final,context(),claim)).ok,false);
  assert.equal((await attempt(m,'poster_1',facebook,final,context(),claim)).ok,false);
});
test('server revocation after preview blocks dry-run despite previously signed approval',async()=>{
  const m=build().manifest,item=grant(m,'item','email_1').receipt,final=grant(m,'final',null).receipt;
  const revoked={...context(),consentedAudienceSegments:[
    {...context().consentedAudienceSegments[0],status:'revoked'}
  ]};
  assert.equal((await attempt(m,'email_1',item,final,revoked)).ok,false);
  const disconnected={...context(),providerAccounts:[]};
  assert.equal((await attempt(m,'email_1',item,final,disconnected)).ok,false);
});
