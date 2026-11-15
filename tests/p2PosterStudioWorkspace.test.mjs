import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('app/vendor/marketing/design/page.tsx');
const upload=read('app/api/marketing/poster/references/analyze/route.ts');
const direct=read('lib/marketing/poster-reference-input.ts');
const generate=read('app/api/marketing/poster/generate/route.ts');
const gemini=read('lib/marketing/poster-gemini-intelligence.ts');

test('poster studio starts with centered LLM composer then splits LEFT controls and RIGHT output on desktop',()=>{
  assert.match(ui,/!workspace\?/);
  assert.match(ui,/setWorkspace\(true\)/);
  assert.match(ui,/What shall we create today/);
  assert.match(ui,/lg:grid-cols-\[minmax\(345px,\.86fr\)_minmax\(0,1\.14fr\)\]/);
  assert.match(ui,/aria-label="Poster controls"/);
  assert.match(ui,/lg:order-1/);
  assert.match(ui,/aria-label="AI artwork output"/);
  assert.match(ui,/lg:order-2/);
  assert.match(ui,/order-2 min-h-0 lg:order-1/);
  assert.match(ui,/order-1 min-h-0 lg:order-2/);
  assert.match(ui,/lg:overflow-hidden/);
  assert.match(ui,/lg:overflow-y-auto/);
  assert.match(ui,/formats/);
  assert.doesNotMatch(ui,/Try an idea|ideaChips|createSimpleDraft|drawPoster|EditableTextLayer/);
});

test('progress is transparent, estimated, and never 100 before private image loads',()=>{
  assert.match(ui,/setPercent\(3\)/);
  assert.match(ui,/Math\.min\(94,/);
  assert.match(ui,/Estimated · 100% only when the image is loaded/);
  assert.match(ui,/setPhase\('downloading'\)/);
  assert.match(ui,/await openArtwork\(result\.jobId\)/);
  const verified=ui.indexOf('await openArtwork(result.jobId)');
  const complete=ui.indexOf('setPhase(\'ready\');setPercent(100)');
  assert.ok(complete>verified);
  assert.match(ui,/phase==='failed'/);
  assert.doesNotMatch(ui,/setPercent\(100\).*fetch\('\/api\/marketing\/poster\/generate'/s);
});

test('mic click requests native browser permission then Gemini returns a visible editable transcript, never auto-sends poster',()=>{
  assert.match(ui,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(ui,/new MediaRecorder\(stream/);
  assert.match(ui,/rec\.ondataavailable/);
  assert.match(ui,/rec\.onstop/);
  assert.match(ui,/\/api\/marketing\/poster\/transcribe/);
  assert.match(ui,/x-slbi-business-id/);
  assert.match(ui,/x-slbi-language':'auto'/);
  assert.match(ui,/Voice language is detected automatically/);
  assert.match(ui,/setEditIdea\(v=>/);
  assert.match(ui,/setIdea\(v=>/);
  assert.match(ui,/Transcript ready\. Please check the words/);
  const mic=ui.slice(ui.indexOf('const startVoice='),ui.indexOf('const download='));
  assert.doesNotMatch(mic,/submit\(true\)|submit\(false\)|\/api\/marketing\/poster\/generate/);
});

test('reference-only is the default; direct image use needs explicit selection and validated binary',()=>{
  assert.match(ui,/Images are reference-only by default/);
  assert.match(ui,/Use actual image \(optional\)/);
  assert.match(ui,/setDirectReferenceId/);
  assert.match(ui,/body\.directImageUse=true/);
  assert.match(ui,/body\.referenceImageBase64=await directSource/);
  assert.match(ui,/getReferenceContext/);
  assert.match(ui,/\/api\/marketing\/poster\/references\/analyze/);
  assert.match(generate,/decodeExplicitPosterSource/);
  assert.match(generate,/referenceSummary/);
  assert.match(generate,/directImageDigest/);
  assert.match(direct,/input\.useDirectly!==true/);
  assert.match(direct,/if\(input\.isExistingEdit\)/);
  assert.match(direct,/source pixels|source image|image model/i);
  assert.match(direct,/resize\(480,480/);
  assert.match(direct,/limitInputPixels/);
  assert.match(direct,/sha256/);
  assert.doesNotMatch(generate,/NEXT_PUBLIC_CLOUDFLARE_API_TOKEN/);
});

test('private reference analyzer only accepts small, verified images, PDFs or text and never sends image bytes to Cloudflare',()=>{
  assert.match(upload,/isSameOrigin/);
  assert.match(upload,/getMarketingAccessForUser/);
  assert.match(upload,/\.eq\('owner_id',user\.id\)/);
  assert.match(upload,/MAX|maxTotal/);
  assert.match(upload,/maxFileSize=1_500_000/);
  assert.match(upload,/maxFiles=4/);
  assert.match(upload,/validSignature/);
  assert.match(upload,/new TextDecoder\('utf-8',\{fatal:true\}\)/);
  assert.match(upload,/application\/pdf/);
  assert.match(upload,/image\/jpeg/);
  assert.match(upload,/marketing_poster_voice_try_reserve/);
  assert.match(upload,/untrusted context/i);
  assert.match(upload,/referenceOnly:true/);
  assert.doesNotMatch(upload,/generatePosterProviderImage|storage\.from\(/);
});

test('Gemini can ground style context without replacing authoritative business facts',()=>{
  assert.match(gemini,/referenceContext\?:string/);
  assert.match(gemini,/untrustedReferenceSummary/);
  assert.match(gemini,/OWNER-VERIFIED SELECTED BUSINESS/);
  assert.match(gemini,/input\.facts\.phone/);
  assert.match(gemini,/input\.facts\.email/);
  assert.match(gemini,/input\.facts\.website/);
  assert.match(generate,/referenceContext:referenceSummary/);
  assert.match(generate,/getMarketingAccessForUser/);
  assert.match(generate,/marketing_poster_reserve/);
  assert.match(generate,/marketing_poster_refund/);
});

test('desktop workflow preserves existing owner-scoped image edit, download, and manual social sharing',()=>{
  assert.match(ui,/Edit this image with AI/);
  assert.match(ui,/sourceJobId/);
  assert.match(ui,/editInstruction/);
  assert.match(ui,/Your recent AI posters/);
  assert.match(ui,/Download PNG/);
  assert.match(ui,/Nothing posts to social media automatically/);
  assert.doesNotMatch(ui,/auto-post|facebookPublish|schedulePost\(/);
});


test('Cloudflare prompt keeps user request, true business and chosen references ahead of 2048-character cap',()=>{
  const compact=read('lib/marketing/poster-cloudflare-prompt.ts');
  assert.match(compact,/slice\(0,2048\)/);
  assert.match(compact,/Selected business:/);
  assert.match(compact,/Actual category:/);
  assert.match(compact,/EXACT vendor request \(highest priority\):/);
  assert.match(compact,/Style\/context inspiration only/);
  assert.match(compact,/Verified phone/);
  assert.match(compact,/useUploadedPixels/);
  assert.match(generate,/buildCompactCloudflarePosterPrompt/);
  assert.match(generate,/provider\.provider==='cloudflare'/);
  const chunks=compact.slice(compact.indexOf('const chunks='));
  const requestAt=chunks.indexOf('EXACT vendor request');
  const notesAt=chunks.indexOf('    notes,');
  assert.ok(requestAt>=0&&notesAt>requestAt,'user request must precede generic art notes');
  assert.match(ui,/Attachments are sent to Gemini for temporary AI analysis/);
  assert.match(ui,/100% complete/);
});


test('microphone policy allows browser permission only on Poster Studio, not across the whole site',()=>{
  const config=read('next.config.ts');
  const deny="value: 'camera=(), microphone=(), geolocation=(self)'";
  const allow="value: 'camera=(), microphone=(self), geolocation=(self)'";
  assert.ok(config.includes(deny));
  assert.ok(config.includes("source: '/vendor/marketing/design'"));
  assert.ok(config.includes(allow));
  assert.ok(config.indexOf(deny)<config.indexOf(allow),
    'Next.js last matching header overrides global microphone denial');
  assert.doesNotMatch(config,/camera=\(self\)/);
});

test('microphone handles origin policy blocks and persistent browser denial with actionable recovery',()=>{
  assert.match(ui,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(ui,/window\.isSecureContext/);
  assert.match(ui,/permissionsPolicy\?:\{allowsFeature/);
  assert.match(ui,/featurePolicy\?:\{allowsFeature/);
  assert.match(ui,/allowedByPolicy===false/);
  assert.match(ui,/NotAllowedError/);
  assert.match(ui,/SecurityError/);
  assert.match(ui,/NotFoundError/);
  assert.match(ui,/NotReadableError/);
  assert.match(ui,/role="alert" aria-label="Restore microphone permission"/);
  assert.match(ui,/Site settings → Microphone → Allow/);
  assert.match(ui,/Try microphone again/);
  assert.match(ui,/startVoice\(micRetryTarget\)/);
  const mic=ui.slice(ui.indexOf('const startVoice='),ui.indexOf('const download='));
  assert.doesNotMatch(mic,/submit\(true\)|submit\(false\)/);
});

test('QA image allowance remains a database-enforced gate, not a disabled-button hack',()=>{
  const cap=read('app/api/marketing/poster/capabilities/route.ts');
  assert.match(cap,/marketing_poster_daily_limits/);
  assert.match(cap,/max_attempts/);
  assert.match(cap,/Number\(limits\.data\.max_attempts\)<=Number\(limits\.data\.attempts\)/);
  assert.match(ui,/disabled=\{busy\|\|checking\|\|!available\|\|!businessId/);
  assert.match(ui,/serviceReason/);
});
