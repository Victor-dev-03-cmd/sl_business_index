import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  EMAIL_BLOCK_TYPES,LOCAL_EMAIL_CAMPAIGN_LIMIT,initialEmailBlocks,
  newEmailBlock,moveEmailBlock,readLocalEmailDrafts,normalizeLocalCampaign,
  emailLocalStorageKey,briefFromBlocks,
} from '../lib/marketing/email-hub-contract.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hub=read('app/vendor/marketing/engine/components/EmailMarketingHub.tsx');
const canvas=read('app/vendor/marketing/engine/components/EmailCampaignCanvas.tsx');
const page=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
const frame=read('app/vendor/marketing/engine/components/MarketingModuleFrame.tsx');
const owner='11111111-1111-4111-8111-111111111111';
const business='22222222-2222-4222-8222-222222222222';
function draft(){
 const now=new Date('2026-11-27T14:00:00Z').toISOString();
 return {id:crypto.randomUUID(),ownerScope:owner,businessId:business,title:'My promotion',
 subject:'An approved new offer',preheader:'Explore our latest verified products',
 ctaUrl:'https://www.slbusinessindex.com/business/dummy',
 language:'ta',kind:'offer',layout:'hero',blocks:initialEmailBlocks('hero','Verified offer terms'),
 posterId:null,status:'local_draft',createdAt:now,updatedAt:now,
 buttonColor:'#F97316',logoSize:56};
}
test('Email V4 has four top-level business tabs; builder opens only as a focused full-screen view',()=>{
 for(const x of ['Campaigns','Audience & Lists','Templates','Automations','New Campaign']){
  assert.ok(hub.includes(x),x);
 }
 assert.match(hub,/data-testid="email-v4-marketing-hub"/);
 assert.match(hub,/<EmailCampaignCanvas/);
 assert.match(hub,/onClick=\{\(\)=>start\(item.id\)\}/);
 assert.match(canvas,/data-testid="email-v4-focus-builder"/);
 assert.match(canvas,/createPortal\(screen,document\.body\)/);
 assert.match(canvas,/fixed inset-0 z-\[9999\]/);
 assert.match(canvas,/document\.body\.style\.overflow='hidden'/);
 assert.match(frame,/module!=='email'&&<header/);
 assert.match(frame,/module!=='connections'&&module!=='email'&&<nav/);
 assert.match(page,/from '@\/app\/vendor\/marketing\/engine\/components\/EmailMarketingHub'/);
 assert.match(page,/ownerScope=\{user\?\.id\|\|''\}/);
});
test('Inline WYSIWYG edits subject, preheader, body, offers and CTA with plain text paste',()=>{
 assert.match(canvas,/contentEditable role="textbox"/);
 assert.match(canvas,/data-inline-editable=\{label\}/);
 assert.match(canvas,/e\.clipboardData\.getData\('text\/plain'\)/);
 assert.match(canvas,/document\.createTextNode\(plain\)/);
 for(const name of ['Email subject — edit directly','Email preview snippet — edit directly',
   'Headline — edit directly','Email body — edit directly','CTA button label — edit directly',
   'Offer ','Brand logo size','Email button accent color']){
   assert.ok(canvas.includes(name),name);
 }
 assert.match(canvas,/draggable onDragStart/);
 assert.match(canvas,/onDrop=\{e=>/);
 assert.match(canvas,/reorder\(b\.id,-1\)/);
 assert.match(canvas,/reorder\(b\.id,1\)/);
 assert.match(canvas,/newEmailBlock\(type\)/);
 assert.deepEqual(EMAIL_BLOCK_TYPES.map(x=>x.type),
   ['headline','body','poster','button','offers','divider','image','spacer','quote','link','columns']);
 const blocks=initialEmailBlocks('offers','Real service description');
 assert.deepEqual(blocks.map(x=>x.type),['headline','offers','body','button']);
 assert.deepEqual(moveEmailBlock(blocks,blocks[0].id,1).map(x=>x.type),['offers','headline','body','button']);
 assert.equal(moveEmailBlock(blocks,'missing',3),blocks);
 assert.ok(briefFromBlocks(blocks).includes('Real service description'));
 assert.equal(newEmailBlock('poster').type,'poster');
});
test('Owner-scoped local drafts never import contact email lists, provider tokens or invent sent status',()=>{
 const original=draft();
 const loaded=readLocalEmailDrafts(JSON.stringify([original]),owner,[business]);
 assert.equal(loaded.length,1);
 assert.equal(loaded[0].title,'My promotion');
 assert.ok(emailLocalStorageKey(owner).includes(owner));
 assert.equal(readLocalEmailDrafts(JSON.stringify([original]),'33333333-3333-4333-8333-333333333333',[business]).length,0);
 assert.equal(readLocalEmailDrafts(JSON.stringify([original]),owner,['44444444-4444-4444-8444-444444444444']).length,0);
 assert.equal(normalizeLocalCampaign({...original,status:'sent'},owner,[business]),null);
 assert.equal(normalizeLocalCampaign({...original,buttonColor:'red'},owner,[business]),null);
 assert.equal(normalizeLocalCampaign({...original,blocks:[]},owner,[business]),null);
 assert.equal(readLocalEmailDrafts('not-json',owner,[business]).length,0);
 assert.equal(LOCAL_EMAIL_CAMPAIGN_LIMIT,30);
 assert.match(hub,/Browser draft/);
 assert.match(hub,/Sent, opened and clicked figures appear only when verified delivery reporting is available/);
 assert.match(hub,/declared consent records \(not verified\)/);
 assert.match(hub,/No workflow in this tab silently schedules or sends email/);
 assert.doesNotMatch(hub,/1,240|42\.8%|11\.4%|142 Opt-in/);
 assert.doesNotMatch(canvas,/messages\/send|gmail\.send|sendMail\(/);
});
test('Current security-gated Gmail, approved business and optional QA Gemini survive architecture update',()=>{
 for(const s of [".eq('owner_id',user.id)",".eq('provider','google_mail')",
   ".eq('status','connected')","slbi_audience_owner_counts",
   "p_owner:user.id","emailAiAllowed=await isPosterInternalQAAccount",
   'getGoogleConnectorConfig']){
   assert.ok(page.includes(s),s);
 }
 assert.match(hub,/connections\.find\(c=>c\.businessId===business\?\.id&&c\.status==='connected'\)/);
 assert.match(hub,/verifiedCount===undefined\?'—':String\(verifiedCount\)/);
 assert.match(hub,/parseAudienceCsv\(await file\.text\(\)\)/);
 assert.match(hub,/countPastedEmails\(paste\)/);
 assert.match(canvas,/\/api\/marketing\/email\/generate/);
 assert.match(canvas,/emailAiEnabled&&/);
 assert.match(canvas,/\/api\/marketing\/poster\/saved\?businessId=/);
 assert.match(canvas,/sandbox=""/);
 assert.match(canvas,/safeCustomPreviewDocument\(customHtml\)/);
 assert.match(canvas,/No message is scheduled without the approved delivery service/);
 assert.match(canvas,/Connecting Gmail alone cannot activate bulk email sending/);
 assert.doesNotMatch(page,/select\('.*encrypted_refresh_token/);
});

test('V7 workspace overview, real draft controls and three-region designer',()=>{
 assert.match(hub,/data-testid="email-v7-overview"/);
 assert.match(hub,/useState<HubTab>\('overview'\)/);
 assert.match(hub,/businessDrafts=useMemo\(\(\)=>drafts\.filter\(d=>d\.businessId===businessId\)/);
 assert.match(hub,/cloudCount=businessDrafts\.filter/);
 assert.match(hub,/aria-label="Sort campaigns"/);
 assert.match(hub,/duplicateDraft\(d\)/);
 assert.match(hub,/id:crypto\.randomUUID\(\),title:\('Copy of '/);
 assert.match(canvas,/data-email-v7="designer"/);
 const library=canvas.indexOf('aria-label="Content blocks and AI tools"');
 const design=canvas.indexOf('aria-label="Inline email design canvas"');
 const inspector=canvas.indexOf('aria-label="Block properties and campaign setup"');
 assert.ok(library>=0&&library<design&&design<inspector);
 assert.match(canvas,/data-testid="email-v7-properties"/);
 assert.match(canvas,/aria-label="Selected block content"/);
 assert.match(canvas,/duplicateBlock\(selected\.id\)/);
 assert.match(canvas,/campaign\.blocks\.length<=1/);
 assert.match(canvas,/Preview &amp; review/);
});

test('V9 content library supports private uploaded images and advanced block types',()=>{
  const image=newEmailBlock('image');assert.equal(image.imageWidth,100);
  const columns=newEmailBlock('columns');assert.equal(columns.secondText,'Second column');
  const spacer=newEmailBlock('spacer');assert.equal(spacer.spacing,24);
  const d=draft();
  const imageId='44444444-4444-4444-8444-444444444444';
  const styled={...d,blocks:[{...image,imageId,imageWidth:75,imageAlign:'right',text:'Alt text'},columns,spacer,newEmailBlock('quote'),{...newEmailBlock('link'),linkUrl:'https://www.slbusinessindex.com'}]};
  assert.deepEqual(normalizeLocalCampaign(styled,owner,[business])?.blocks,styled.blocks);
  for(const bad of [{imageId:'../../evil'},{imageWidth:999},{imageAlign:'left;display:none'},{linkUrl:'javascript:alert(1)'}]){
    assert.equal(normalizeLocalCampaign({...styled,blocks:[{...styled.blocks[0],...bad}]},owner,[business]),null);
  }
  const api=read('app/api/marketing/email/images/route.ts');
  for(const token of ['auth.getUser()',"eq('owner_id',user.id)","eq('status','approved')",'isSameOrigin','getMarketingAccessForUser','email-assets/','limitInputPixels:16_000_000','resize({width:1200,height:1200','upsert:false','private, no-store','MAX_BYTES=3_000_000','reader.cancel()'])assert.ok(api.includes(token),token);
  assert.doesNotMatch(api,/getPublicUrl|createSignedUrl/);
  for(const token of ['Upload an image','Image alt text','Image width','Image alignment','Spacer height','Text link URL','image/jpeg,image/png,image/webp','/api/marketing/email/images?businessId=','Quote — edit directly'])assert.ok(canvas.includes(token),token);
});

test('Compact editor uses precise input fields and small Bulk icon tools, not sliders',()=>{
 assert.doesNotMatch(canvas,/type="range"/);
 assert.match(canvas,/function CompactNumber/);
 assert.match(canvas,/onBlur=\{commit\}/);
 assert.match(canvas,/e\.key==='Enter'/);
 assert.match(canvas,/data-testid="email-compact-block-library"/);
 assert.match(canvas,/lg:grid-cols-\[232px_minmax\(0,1fr\)_280px\]/);
 assert.match(canvas,/variant="bulk"/);
 assert.match(canvas,/label="Desktop canvas width"/);
 assert.match(canvas,/label="Brand logo size"/);
 assert.match(canvas,/label="Block font size"/);
 assert.match(canvas,/label="Image width"/);
 assert.match(canvas,/title="Duplicate selected block"/);
 assert.match(canvas,/title="Remove selected block"/);
 assert.match(canvas,/initial\.blocks\.find\(b=>b\.type==='headline'\)/);
});

test('Audience plans persist as provider-free source and language, never recipient data',()=>{
 const d=draft();
 const plan={source:'network',language:'ta'};
 assert.deepEqual(normalizeLocalCampaign({...d,audiencePlan:plan},owner,[business])?.audiencePlan,plan);
 assert.ok(normalizeLocalCampaign(d,owner,[business]));
 for(const bad of [{source:'all_registered_users',language:'all'},{source:'network',language:'invalid'},{source:'business',language:'ta'},{source:'network',language:'all',recipients:['test@example.invalid']}])
   assert.equal(normalizeLocalCampaign({...d,audiencePlan:bad},owner,[business]),null);
 const api=read('app/api/audience/route.ts');
 const vendor=read('app/api/marketing/email/audience/route.ts');
 const admin=read('app/api/admin/audience-network/route.ts');
 const sql=read('docs/growth/AUDIENCE_NETWORK_FOUNDATION_REVIEW.sql');
 const profile=read('app/business/[slug]/BusinessDetailsClient.tsx');
 const centre=read('app/components/audience/NetworkEmailPreferences.tsx');
 for(const token of ['auth.getUser()','isSameOrigin','p_user:user.id','slbi_audience_change','PREFERENCE_RATE_LIMIT'])assert.ok(api.includes(token),token);
 for(const token of ['auth.getUser()','getMarketingAccessForUser','p_owner:user.id','slbi_audience_owner_summary'])assert.ok(vendor.includes(token),token);
 for(const token of ['auth.getUser()',"['admin','ceo']", 'p_actor:user.id','isSameOrigin'])assert.ok(admin.includes(token),token);
 assert.match(profile,/BusinessAudienceControls/);assert.match(centre,/network_subscribe/);
 assert.match(hub,/AudienceNetworkSummary/);assert.match(canvas,/AudiencePlanPicker/);
 assert.match(sql,/REVOKE ALL ON SCHEMA slbi_audience_private FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/FOR UPDATE SKIP LOCKED/);
 assert.match(sql,/LIMIT 250 FOR SHARE/);
 assert.match(sql,/requested_count BETWEEN 1 AND 100/);
 assert.match(sql,/slbi_audience_lists/);
 assert.match(sql,/network_grants/);
 assert.match(sql,/q\.owner_id=p_owner AND q\.status='approved'/);
 assert.match(api,/slbi-audience-sharing-v2/);
 assert.match(sql,/deliveryEnabled',false/);
 assert.doesNotMatch(vendor,/\.from\('profiles'\)|\.select\('email'\)|recipients:/);
});
