import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const url=p=>new URL('../'+p,import.meta.url);
const read=p=>readFileSync(url(p),'utf8');
const ui=read('app/vendor/marketing/design/puter-lab/page.tsx');
const compose=read('lib/marketing/puter-poster-composer.ts');
const api=read('app/api/marketing/poster/puter-lab/route.ts');
const voiceEngine=read('lib/marketing/voice/slbi-voice-engine.ts');
const config=read('next.config.ts');
const direct=read('lib/marketing/poster-reference-input.ts');
const oldGenerate=read('app/api/marketing/poster/generate/route.ts');
const upload=read('app/api/marketing/poster/references/analyze/route.ts');

test('retired Creative AI page and its obsolete skeleton are physically absent',()=>{
  assert.equal(existsSync(url('app/vendor/marketing/design/page.tsx')),false);
  assert.equal(existsSync(url('app/vendor/marketing/design/loading.tsx')),false);
  assert.match(config,/async redirects\(\)/);
  assert.match(config,/source: '\/vendor\/marketing\/design',/);
  assert.match(config,/destination: '\/vendor\/marketing\/design\/puter-lab',/);
  assert.match(config,/permanent: false/);
  const catalog=read('lib/marketing/studio-apps.ts');
  assert.match(catalog,/href:'\/vendor\/marketing\/design\/puter-lab'/);
  assert.doesNotMatch(catalog,/href:'\/vendor\/marketing\/design'/);
  assert.match(ui,/<Link href="\/vendor\/marketing"/);
  assert.doesNotMatch(ui,/<Link href="\/vendor\/marketing\/design"/);
});

test('current real Poster Studio keeps the reviewed three-column desktop and responsive workflow',()=>{
  const left=ui.indexOf('aria-label="Poster creation controls"');
  const center=ui.indexOf('aria-label="Exact AI poster preview"');
  const right=ui.indexOf('aria-label="Poster size and exact text settings"');
  assert.ok(left>0&&center>left&&right>center);
  assert.match(ui,/xl:grid-cols-\[minmax\(0,0\.91fr\)_minmax\(0,1\.36fr\)_minmax\(0,0\.9fr\)\]/);
  assert.match(ui,/xl:overflow-hidden/);
  assert.match(ui,/lg:order-1/);
  assert.match(ui,/lg:order-2/);
  assert.match(ui,/order-3/);
  assert.match(ui,/h-full w-full max-h-full max-w-full object-contain/);
  assert.match(ui,/PuterCompactFormatSelector/);
  assert.match(ui,/POSTER_FORMATS\[format\]/);
  assert.doesNotMatch(ui,/EditableTextLayer|createSimpleDraft|drawPoster\(/);
});

test('voice record and human-reviewed Gemini blueprint remain available without automatic image request',()=>{
  assert.match(voiceEngine,/navigator\.mediaDevices\.getUserMedia\(\{/);
  assert.match(ui,/new SlbiVoiceRecorder\(/);
  assert.match(voiceEngine,/new MediaRecorder\(stream/);
  assert.match(voiceEngine,/recorder\.start\(250\)/);
  assert.match(ui,/stopVoice\(\)/);
  assert.match(ui,/requestSlbiVoiceTranscript\(/);
  assert.match(voiceEngine,/\/api\/marketing\/poster\/transcribe/);
  assert.match(voiceEngine,/x-slbi-business-id/);
  assert.match(ui,/const prepareWithGemini=async\(\)=>/);
  assert.match(ui,/review the headline|Review the headline/);
  assert.match(ui,/setBlueprint\(data\.blueprint\)/);
  assert.match(ui,/const generate=async\(\)=>/);
  assert.doesNotMatch(ui,/setTimeout\(\(\)=>\{if\(rec\.state==='recording'\)rec\.stop\(\)/);
});

test('export uses exact four PNG sizes, reviewable copy and locally re-rendered bottom panel',()=>{
  const formats=read('lib/marketing/poster-design.ts');
  assert.match(formats,/square:\{width:1080,height:1080/);
  assert.match(formats,/portrait:\{width:1080,height:1350/);
  assert.match(formats,/story:\{width:1080,height:1920/);
  assert.match(formats,/landscape:\{width:1200,height:630/);
  assert.match(ui,/composeExactPoster\(\{backgroundSrc:artworkSrc,format,copy:exactCopy/);
  assert.match(ui,/style:selectedPremiumStyle,design:activeDesign,contentPanelStyle:selectedPanelStyle/);
  assert.match(ui,/id="puter-panel-style"/);
  assert.match(ui,/CONTENT_PANEL_STYLES\.map/);
  assert.match(compose,/canvas\.width=d\.width;canvas\.height=d\.height/);
  assert.match(compose,/canvas\.toBlob/);
  assert.match(ui,/download/);
  assert.match(ui,/No image regeneration/);
});

test('verified owner-only access and explicit Puter user-pays consent remain enforced',()=>{
  const gate=read('app/vendor/marketing/design/puter-lab/layout.tsx');
  assert.match(gate,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(gate,/notFound\(\)/);
  assert.match(api,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(api,/\.eq\('owner_id',userId\)/);
  assert.match(api,/isSameOrigin/);
  assert.match(ui,/realMode&&!consent/);
  assert.match(ui,/test_mode:!realMode/);
  assert.match(ui,/puter\.ai\.txt2img\(creative,options\)/);
  assert.doesNotMatch(ui,/SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|NEXT_PUBLIC_PUTER_TOKEN/);
});

test('reference-only Cloudflare API remains independently verified even though its legacy UI is retired',()=>{
  assert.match(oldGenerate,/decodeExplicitPosterSource/);
  assert.match(oldGenerate,/referenceSummary/);
  assert.match(oldGenerate,/directImageDigest/);
  assert.match(direct,/input\.useDirectly!==true/);
  assert.match(direct,/if\(input\.isExistingEdit\)/);
  assert.match(direct,/resize\(480,480/);
  assert.match(direct,/limitInputPixels/);
  assert.match(direct,/sha256/);
  assert.match(oldGenerate,/getMarketingAccessForUser/);
  assert.match(oldGenerate,/marketing_poster_reserve/);
  assert.match(oldGenerate,/marketing_poster_refund/);
  assert.doesNotMatch(oldGenerate,/NEXT_PUBLIC_CLOUDFLARE_API_TOKEN/);
});
test('old secured reference analysis API retains ownership and cost boundaries',()=>{
  assert.match(upload,/isSameOrigin/);
  assert.match(upload,/getMarketingAccessForUser/);
  assert.match(upload,/\.eq\('owner_id',user\.id\)/);
  assert.match(upload,/maxFileSize=1_500_000/);
  assert.match(upload,/maxFiles=4/);
  assert.match(upload,/validSignature/);
  assert.match(upload,/new TextDecoder\('utf-8',\{fatal:true\}\)/);
  assert.match(upload,/marketing_poster_voice_try_reserve/);
  assert.match(upload,/referenceOnly:true/);
  assert.doesNotMatch(upload,/generatePosterProviderImage|storage\.from\(/);
});
test('microphone policy is scoped to direct current Studio, not removed legacy route',()=>{
  assert.match(config,/source: '\/vendor\/marketing\/design\/puter-lab'/);
  assert.match(config,/value: 'camera=\(\), microphone=\(self\), geolocation=\(self\)'/);
  assert.match(config,/value: 'camera=\(\), microphone=\(\), geolocation=\(self\)'/);
  assert.doesNotMatch(config,/source: '\/vendor\/marketing\/design',\s*headers:/);
});
