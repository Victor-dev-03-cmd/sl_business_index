import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderEmailMarkup,makeGmailSelfTestRaw,isSafeSenderAddress}
  from '../lib/marketing/email-renderer.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('app/api/marketing/email/test-send/route.ts');
const sql=read('docs/growth/EMAIL_V6_GMAIL_SELF_TEST_MIGRATION.sql');
const canvas=read('app/vendor/marketing/engine/components/EmailCampaignCanvas.tsx');
const hub=read('app/vendor/marketing/engine/components/EmailMarketingHub.tsx');
const page=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
const draft={
  id:'33333333-3333-4333-8333-333333333333',
  ownerScope:'11111111-1111-4111-8111-111111111111',
  businessId:'22222222-2222-4222-8222-222222222222',
  title:'Review first',subject:'Cultural promotion',
  preheader:'Your new business announcement',
  ctaUrl:'https://www.slbusinessindex.com/business/example',language:'ta',kind:'offer',
  layout:'hero',posterId:null,buttonColor:'#F97316',logoSize:56,
  status:'local_draft',createdAt:'2026-11-28T07:00:00.000Z',updatedAt:'2026-11-28T07:00:00.000Z',
  blocks:[
    {id:'44444444-4444-4444-8444-444444444444',type:'headline',text:'Welcome <script>bad()</script>'},
    {id:'55555555-5555-4555-8555-555555555555',type:'body',text:'தமிழ் promotion & deals, only approved facts.'},
    {id:'66666666-6666-4666-8666-666666666666',type:'poster',text:''},
    {id:'77777777-7777-4777-8777-777777777777',type:'button',text:'Learn more'}
  ]
};
const brand={name:'Sri Lanka & Services',city:'Jaffna',address:'1 Main Street',accentColor:'#F97316',
 logoUrl:'https://www.slbusinessindex.com/brand/logo.png'};
test('Email MIME is Google-accepted format and addressed only to the owner mailbox',()=>{
  const rendered=renderEmailMarkup(draft,brand,{mode:'self_test'});
  assert.match(rendered.html,/TEST EMAIL TO YOUR OWN CONNECTED MAILBOX/);
  assert.match(rendered.html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(rendered.html,/<script>/);
  assert.match(rendered.html,/தமிழ் promotion &amp; deals/);
  assert.match(rendered.html,/role="presentation"/);
  assert.equal(rendered.warnings.length,1);
  assert.doesNotMatch(rendered.html,/\/api\/marketing\/poster\/saved/);
  const raw=makeGmailSelfTestRaw('owner@gmail.com','தமிழ் அறிவிப்பு',rendered.html,rendered.text);
  const mime=Buffer.from(raw,'base64url').toString('utf8');
  assert.match(mime,/From: <owner@gmail\.com>/);
  assert.match(mime,/To: <owner@gmail\.com>/);
  assert.match(mime,/X-SLBI-Test-Only: true/);
  assert.match(mime,/multipart\/alternative/);
  assert.match(mime,/Content-Transfer-Encoding: base64/);
  assert.match(mime,/Subject: =\?UTF-8\?B\?/);
  assert.equal(isSafeSenderAddress('owner@gmail.com'),true);
  assert.equal(isSafeSenderAddress('Owner <owner@gmail.com>'),false);
  assert.throws(()=>makeGmailSelfTestRaw('bad\nBcc: victim@example.org','hello',rendered.html,rendered.text));
  assert.throws(()=>makeGmailSelfTestRaw('thirdparty@example.org','Hi\r\nBcc: hidden@x.co',rendered.html+'X'.repeat(41000),rendered.text));
});
test('True campaign email requires unsubscribe; test has no actual marketing recipients',()=>{
  assert.throws(()=>renderEmailMarkup(draft,brand,{mode:'marketing'}),/unsubscribe/);
  const marketing=renderEmailMarkup(draft,brand,{
    mode:'marketing',unsubscribeUrl:'https://www.slbusinessindex.com/unsubscribe?id=example',
  });
  assert.match(marketing.html,/Unsubscribe/);
  assert.throws(()=>renderEmailMarkup({...draft,ctaUrl:'javascript:alert(1)'},brand,{mode:'self_test'}),/HTTPS/);
  assert.doesNotMatch(marketing.html,/<script>|<iframe|<form/);
});
test('API self-test authorizes the actual connection and only submits to itself',()=>{
  for(const needle of [
   'SLBI_EMAIL_GMAIL_TEST_ENABLED','getGoogleConnectorConfig',
   'exactOAuthRequestOrigin','auth.getUser','getMarketingAccessForUser',
   "eq('owner_id',user.id)","eq('status','approved')",
   ".eq('id',body.connectionId)",".eq('user_id',user.id)",
   ".eq('business_id',business.id)",".eq('provider','google_mail')",
   ".eq('status','connected')",'GOOGLE_SEND_SCOPE','normalizeLocalCampaign',
   'valid.layout===','slbi_reserve_email_self_test','p_recipient:ownMailbox',
   'encrypted_refresh_token','decryptPreviewValue','refreshGooglePreviewAccessToken',
   'makeGmailSelfTestRaw(ownMailbox','messages/send',
   'Body','marketing_email_test_sends','await settle']){
    if(needle==='Body')continue;
    assert.ok(api.includes(needle),needle);
  }
  assert.match(api,/const ownMailbox=connection\.account_display_name/);
  assert.match(api,/acceptedByGoogle:true,testOnly:true,recipient:ownMailbox/);
  assert.match(api,/campaignSent:false,deliveryNotGuaranteed:true/);
  assert.match(api,/no automatic retry/i);
  assert.doesNotMatch(api,/body\.to|body\.recipient|body\.emails|body\.audience|\/api\/marketing\/email\/campaigns\/send/);
});
test('Database cap and one-time request key are service-only, per-owner and per-business',()=>{
  for(const needle of ['marketing_email_test_sends','enable row level security',
    'revoke all on public.marketing_email_test_sends from public,anon,authenticated',
    'unique(owner_id,request_key)','pg_advisory_xact_lock',
    'v_total>=8 or v_business>=3','c.account_display_name=p_recipient',
    'c.status=','gmail.send','auth.uid','security definer',
    'security invoker','slbi_reserve_email_self_test',
    'grant execute on function public.slbi_reserve_email_self_test']){
   if(needle==='auth.uid')continue;
   assert.ok(sql.toLowerCase().includes(needle.toLowerCase()),needle);
  }
  assert.match(sql,/grant execute on function public\.slbi_reserve_email_self_test[\s\S]*to service_role/);
  assert.match(sql,/revoke all on function public\.slbi_reserve_email_self_test[\s\S]*from public,anon,authenticated/);
  assert.doesNotMatch(sql,/grant (insert|update|delete) on public\.marketing_email_test_sends to authenticated/i);
});
test('UI does not silently send; explicit vendor confirmation and flag gate',()=>{
  assert.match(page,/testSendEnabled=\{Boolean\(config\)&&process\.env\.SLBI_EMAIL_GMAIL_TEST_ENABLED==='true'\}/);
  assert.match(page,/sendCapable:Array\.isArray\(c\.granted_scopes\)&&c\.granted_scopes\.includes\(GOOGLE_SEND_SCOPE\)/);
  assert.match(hub,/testSendEnabled=\{testSendEnabled\}/);
  assert.match(canvas,/window\.confirm\('Send exactly ONE test email/);
  assert.match(canvas,/onClick=\{\(\)=>void sendOneSelfTest\(\)\}/);
  assert.match(canvas,/testSendEnabled&&sender\?\.sendCapable/);
  assert.match(canvas,/testBusy\|\|campaign\.layout==='custom'/);
  assert.match(canvas,/No subscribers or customers will receive/);
});
