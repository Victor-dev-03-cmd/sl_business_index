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
   ['headline','body','poster','button','offers','divider']);
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
   ".eq('status','connected')","marketing_email_optins",
   ".eq('confirmation_status','confirmed')","emailAiAllowed=await isPosterInternalQAAccount",
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
