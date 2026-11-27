import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  EMAIL_CAMPAIGNS,EMAIL_LANGUAGES,EMAIL_MERGE_TAGS,
  defaultEmailDraft,emailContentChecks,escapeEmailHtml,hexColor,httpsLink,
  parseAudienceCsv,countPastedEmails,subjectSuggestions,
} from '../lib/marketing/email-studio.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('app/vendor/marketing/engine/components/EmailMarketingWorkbench.tsx');
const page=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
const frame=read('app/vendor/marketing/engine/components/MarketingModuleFrame.tsx');
const brand={name:'கடல் Food',slogan:'',primaryColor:'#242424',
  accentColor:'#ff7900',logoUrl:null,address:'Main Road',city:'Jaffna',
  profileUrl:'https://www.slbusinessindex.com/business/sample'};

test('Email Studio renders responsive three-column Pro workspace with real brand and sender data',()=>{
  assert.match(ui,/xl:grid-cols-\[minmax\(0,30fr\)_minmax\(0,42fr\)_minmax\(0,28fr\)\]/);
  assert.match(ui,/01 \/ SETUP/);
  assert.match(ui,/02 \/ LIVE PREVIEW/);
  assert.match(ui,/03 \/ INTELLIGENCE/);
  assert.match(ui,/connections\.filter\(c=>c\.businessId===businessId&&c\.status==='connected'\)/);
  assert.match(ui,/currentSender\?'Connected: '/);
  assert.match(page,/auth\.getUser\(\)/);
  assert.match(page,/\.eq\('owner_id',user\.id\)/);
  assert.match(page,/\.eq\('user_id',user\.id\)/);
  assert.match(page,/\.eq\('provider','google_mail'\)/);
  assert.match(page,/\.eq\('status','connected'\)/);
  assert.match(page,/from\('social_brand_profiles'\)/);
  assert.match(ui,/\/api\/marketing\/poster\/saved\?businessId=/);
  assert.match(ui,/Poster Studio/);
  assert.match(frame,/module!=='email'/);
  assert.doesNotMatch(ui,/Integration planned|Draft only · No send|Marketing safety: Preview/);
});
test('Device & dark mode preview and clickable HTTPS CTA are honest and local',()=>{
  for(const x of ['Desktop Gmail','Mobile Inbox','Dark check','Inbox preview','Unsubscribe — not active in preview'])assert.ok(ui.includes(x),x);
  assert.match(ui,/emailContentChecks\(draft\)/);
  assert.match(ui,/subjectSuggestions\(draft,brand\)/);
  assert.match(ui,/httpsLink\(draft\.ctaUrl\)/);
  assert.match(ui,/rel="noopener noreferrer"/);
  assert.equal(httpsLink('https://www.slbusinessindex.com/contact'),'https://www.slbusinessindex.com/contact');
  for(const value of ['javascript:alert(1)','http://test.com','https://u:p@test.com','/relative'])assert.equal(httpsLink(value),null);
  assert.equal(hexColor('#ff7900'),'#FF7900');
  assert.equal(hexColor('red'),'#FF7900');
  assert.equal(escapeEmailHtml('<a onclick="x">'), '&lt;a onclick=&quot;x&quot;&gt;');
});
test('English/Tamil/Sinhala draft composer preserves scripts and campaign categories',()=>{
  assert.deepEqual(EMAIL_LANGUAGES.map(x=>x.value),['en','ta','si']);
  assert.deepEqual(EMAIL_CAMPAIGNS.map(x=>x.value),['offer','launch','followup','newsletter']);
  for(const lang of ['en','ta','si']){
    const draft=defaultEmailDraft(lang,'offer',brand,'Approved opening on 30 November');
    assert.match(draft.body,/Approved opening on 30 November/);
    assert.ok(draft.subject.includes(brand.name));
    assert.ok(draft.ctaUrl.startsWith('https://'));
    assert.ok(subjectSuggestions(draft,brand).length>=2);
    assert.equal(emailContentChecks(draft).length,4);
  }
  assert.ok(defaultEmailDraft('ta','offer',brand).subject.startsWith('சலுகை'));
  assert.ok(defaultEmailDraft('si','newsletter',brand).subject.startsWith('අලුත්'));
  assert.deepEqual(EMAIL_MERGE_TAGS,['{{Customer_Name}}','{{Business_Name}}','{{City}}','{{SLBI_Profile_Link}}']);
});
test('CSV and paste are 100% local preview; never assume import equals marketing opt-in',()=>{
  const csv=['email,marketing_opt_in,consented_at,name',
    'a@example.com,yes,2026-11-20,"A, Customer"',
    'b@example.com,no,2026-11-20, B',
    'a@example.com,yes,2026-11-20,Duplicate',
    'not_an_email,yes,2026-11-20,Invalid'].join('\r\n');
  assert.deepEqual(parseAudienceCsv(csv),{valid:2,invalid:2,declaredOptIn:1,truncated:false});
  assert.deepEqual(countPastedEmails('a@example.com\nb@example.com,a@example.com BAD'),
    {valid:2,invalid:1});
  assert.throws(()=>parseAudienceCsv('name,value\nx,y'),/email column/);
  assert.throws(()=>parseAudienceCsv('a'.repeat(1_000_001)),/smaller than 1 MB/);
  assert.match(ui,/0 verified for sending/);
  assert.match(ui,/No addresses uploaded/);
  assert.match(ui,/An enquiry or QR scan alone does not count/);
  assert.doesNotMatch(ui,/from\('leads'\)|new FormData\(.*email|\/api\/leads\/submit/);
  assert.doesNotMatch(page,/from\('leads'\)/);
});
test('Unsafe outbound operations are visibly gated, not misrepresented as live',()=>{
  for(const item of ['Connect Gmail to Send','Review Campaign for Sending','No recipient message is silently sent',
    'No verified email delivery telemetry','Unsubscribe — not active in preview','plan proposals']){ 
    // The UI copy should not quietly become an autonomous sender.
    if(item==='plan proposals')assert.match(ui,/Plan proposals only/);
    else assert.ok(ui.includes(item),item);
  }
  assert.match(ui,/Generate Multilingual Email with Gemini/);
  assert.match(ui,/disabled=\{!emailAiEnabled\|\|aiBusy\|\|!businessId\}/);
  assert.match(ui,/Copy reviewed draft/);
  assert.match(ui,/Export basic HTML preview/);
  assert.match(ui,/UNSUBSCRIBE NOT CONFIGURED — DO NOT SEND/);
  assert.doesNotMatch(ui,/gmail\.send|messages\/send|fetch\('https:\/\/gmail|sendMail\(|api\/marketing\/email\/send/);
  assert.match(page,/getGoogleConnectorConfig\(\)/);
  assert.match(page,/GoogleMailInboxPreview/);
  assert.match(ui,/No verified email delivery telemetry/);
});

test('Email Studio stays white/light even when the dashboard uses a dark root theme',()=>{
  assert.match(ui,/data-studio-theme="light"/);
  assert.match(ui,/colorScheme:'light'/);
  assert.match(ui,/const panel='[^']*bg-white text-\[#242126\]/);
  assert.match(ui,/const field='[^']*bg-white/);
  assert.doesNotMatch(ui,/dark:(?:bg|text|border|ring)-/);
  assert.match(ui,/grid w-full min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-\[minmax\(0,30fr\)_minmax\(0,42fr\)_minmax\(0,28fr\)\]/);
  assert.match(ui,/min-h-\[680px\]/);
  assert.match(frame,/module==='email'\?'max-w-\[1680px\]'/);
  assert.match(frame,/module!=='email'/);
});

test('Live Gmail-style branded preview uses a left circular logo and right aligned name',()=>{
  const marker=ui.indexOf('data-testid="email-preview-brand-identity"');
  const headerEnd=ui.indexOf('{selectedPosterSrc&&',marker);
  assert.ok(marker>0&&headerEnd>marker);
  const block=ui.slice(marker,headerEnd);
  assert.match(block,/className="flex min-w-0 items-center gap-3/);
  assert.match(block,/bg-white/);
  assert.match(block,/borderLeftColor:brand.accentColor/);
  assert.match(block,/rounded-full/);
  assert.match(block,/h-14 w-14 shrink-0/);
  assert.match(block,/className="min-w-0 flex-1 text-left"/);
  assert.match(block,/\{brand.name\}/);
  assert.ok(block.indexOf('aria-label="Business brand avatar"')<block.indexOf('className="min-w-0 flex-1 text-left"'));
  assert.doesNotMatch(block,/text-center|color:'#FFFFFF'|background:brand.primaryColor/);
  const exportHeader=ui.slice(ui.indexOf('function htmlExport'),ui.indexOf('export default function EmailMarketingWorkbench'));
  assert.match(exportHeader,/border-radius:50%/);
  assert.match(exportHeader,/vertical-align:middle/);
  assert.match(exportHeader,/border-left:4px solid/);
  assert.doesNotMatch(exportHeader,/background:'\+\s*hexColor\(brand.primaryColor/);
});
