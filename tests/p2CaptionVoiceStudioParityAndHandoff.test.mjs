import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lab=read('app/vendor/marketing/captions/page.tsx');
const css=read('app/vendor/marketing/captions/caption-fonts.css');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const store=read('lib/marketing/caption-poster-handoff.ts');
const api=read('app/api/marketing/caption/route.ts');
const voiceApi=read('app/api/marketing/poster/transcribe/route.ts');
const engine=read('lib/marketing/voice/slbi-voice-engine.ts');

test('Caption business dropdown has same inset native arrow geometry as Poster Studio',()=>{
  assert.match(lab,/select value=\{businessId\} aria-label="Selected business"/);
  assert.match(lab,/className=\{field\+' slbi-caption-select mt-1\.5'\}/);
  assert.equal((lab.match(/<select\b/g)||[]).length,1);
  assert.match(css,/\.slbi-caption-select \{/);
  assert.match(css,/-webkit-appearance: none/);
  assert.match(css,/appearance: none/);
  assert.match(css,/padding-right: 2\.65rem/);
  assert.match(css,/background-position: right 14px center/);
  assert.match(css,/background-size: 15px 15px/);
  assert.match(css,/background-repeat: no-repeat/);
  const posterCss=read('app/vendor/marketing/design/puter-lab/typography.css');
  assert.match(posterCss,/background-position:right 14px center/);
});

test('Disclosure arrows are consistent, explicit, inset, and show expansion state',()=>{
  for(const name of ['Quick brief suggestions','Offer terms & CTA','Info'])
    assert.ok(lab.includes(name),'missing disclosure '+name);
  assert.equal((lab.match(/slbi-caption-disclosure/g)||[]).length,3);
  assert.match(lab,/ChevronDown size=\{14\} className="slbi-caption-chevron"/);
  assert.match(lab,/ChevronDown size=\{13\} className="slbi-caption-chevron/);
  assert.match(css,/summary::-webkit-details-marker \{ display:none/);
  assert.match(css,/\[open\] \.slbi-caption-chevron/);
  assert.match(css,/transform: rotate\(180deg\)/);
});

test('Voice transcript and poster handoff keep product/service/offer in ONE editable brief',()=>{
  assert.match(lab,/setMessage\(\[record\.context\.headline,record\.context\.serviceFocus,record\.context\.offer\]/);
  assert.match(lab,/\[record\.context\.headline,record\.context\.serviceFocus,record\.context\.offer\]/);
  assert.match(poster,/serviceFocus:serviceFocus\.trim\(\)/);
  assert.match(store,/serviceFocus:clean\(context\.serviceFocus,85\)/);
  assert.match(lab,/record\.context\.businessId/);
  assert.match(lab,/businesses\.some\(b=>b\.id===record\.context\.businessId\)/);
  assert.match(lab,/setMessage\(combined\)/);
  assert.match(lab,/setVoiceReviewDraft\(transcript\)/);
  assert.match(lab,/setVoiceReviewDraft\(''\);setError\(''\)/);
  assert.match(lab,/setMessage\(''\);setConditions\(''\);setCta\(''\);setVoiceReviewDraft\(''\)/);
});

test('No transcribe or caption charging happens on record, pause, login or poster handoff',()=>{
  const recording=lab.slice(lab.indexOf('  const startVoice=async()=>{'),lab.indexOf('  const generate=async('));
  assert.match(engine,/navigator\.mediaDevices\.getUserMedia\(\{/);
  assert.match(recording,/new SlbiVoiceRecorder\(/);
  assert.match(recording,/void transcribe\(blob\)/);
  assert.doesNotMatch(recording,/marketing_reserve_ai_draft|\/api\/marketing\/caption|puter\.ai\.txt2img/);
  const transcribe=lab.slice(lab.indexOf('  const transcribe=async(blob:Blob)=>{'),lab.indexOf('  const startVoice=async()=>{'));
  assert.match(transcribe,/requestSlbiVoiceTranscript\(/);
  assert.match(engine,/\/api\/marketing\/poster\/transcribe/);
  assert.doesNotMatch(transcribe,/\/api\/marketing\/caption/);
  const generate=lab.slice(lab.indexOf('  const generate=async('),lab.indexOf('  const editTags='));
  assert.match(generate,/\/api\/marketing\/caption/);
  assert.match(generate,/requestKey:crypto\.randomUUID\(\)/);
  assert.match(generate,/message:message\.trim\(\)/);
  assert.match(api,/process\.env\.SLBI_MARKETING_AI_ENABLED!=='true'/);
  assert.match(api,/marketing_reserve_ai_draft/);
  assert.match(voiceApi,/marketing_poster_voice_try_reserve/);
  assert.match(lab,/One provider request and applicable credit reservation per selected language/);
});

test('Voice and saved local image never auto-publish; file exposure and tenant boundaries stay intact',()=>{
  assert.match(lab,/Nothing is automatically published/);
  assert.match(lab,/No automatic publishing|Not published/);
  assert.match(lab,/listLinkedPosters\(businessId\)/);
  assert.match(store,/MAX_AGE=2\*60\*60\*1000/);
  assert.match(store,/indexedDB\.open\(DB_NAME,1\)/);
  assert.doesNotMatch(store,/localStorage\.setItem|toDataURL\(/);
  assert.match(lab,/\.eq\('id',businessId\)\.eq\('owner_id',user\.id\)/);
  assert.match(lab,/status:'drafted'/);
});
