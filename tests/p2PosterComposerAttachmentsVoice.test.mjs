import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  POSTER_REFERENCE_MAX_FILES,POSTER_REFERENCE_MAX_FILE_BYTES,
  POSTER_REFERENCE_MAX_TOTAL_BYTES,
  classifyPosterReference,validatePosterReferences,isPosterReferenceImage,
  posterReferenceFormData,withPosterReferenceSummary,
} from '../lib/marketing/poster-composer-attachments.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const studio=read('app/vendor/marketing/design/puter-lab/page.tsx');
const reference=read('app/api/marketing/poster/references/analyze/route.ts');
const poster=read('app/api/marketing/poster/puter-lab/route.ts');

function file(name,type,size=400){
  return new File([new Uint8Array(size)],name,{type});
}

test('Composer adds exactly the requested icon-only plus / voice / Gemini tool placement',()=>{
  const composer=studio.indexOf('id="puter-prompt"');
  const chips=studio.indexOf('Attached reference files',composer);
  const plus=studio.indexOf('aria-label="Attach images or documents"',chips);
  const mic=studio.indexOf('aria-label="Record voice message"',plus);
  const gemini=studio.indexOf('aria-label="Prepare poster with Gemini"',mic);
  const ideas=studio.indexOf('Quick campaign ideas',gemini);
  assert.ok(composer>0&&chips>composer&&plus>chips&&mic>plus&&gemini>mic&&ideas>gemini);
  assert.match(studio,/multiple className="sr-only" aria-label="Attach images or documents"/);
  assert.match(studio,/accept="image\/png,image\/jpeg,image\/webp,application\/pdf,text\/plain,text\/markdown/);
  assert.match(studio,/title="Record voice message"/);
  assert.match(studio,/title="Prepare art direction and typography with Gemini"/);
  assert.doesNotMatch(studio,/Use real Puter image generation/);
  assert.match(studio,/Use SLBI Image Generator/);
  assert.match(studio,/Generate with SLBI Image Generator/);
  assert.match(studio,/connected Puter account, which may charge its own AI balance/);
  assert.match(studio,/test_mode:!realMode/);
  assert.match(studio,/realMode&&!consent/);
});

test('Multilingual voice recorder shows real metered waveform, pause/resume, cancel, send and transcription loading',()=>{
  assert.match(studio,/getUserMedia\(\{audio:true\}\)/);
  assert.match(studio,/const audio=new AudioContext\(\)/);
  assert.match(studio,/audio\.createAnalyser\(\)/);
  assert.match(studio,/analyser\.getByteFrequencyData\(bins\)/);
  assert.match(studio,/voiceLevels\.map\(\(level,i\)=>/);
  assert.match(studio,/aria-label="Live microphone waveform"/);
  assert.match(studio,/rec\.pause\(\)/);
  assert.match(studio,/rec\.resume\(\)/);
  assert.match(studio,/const cancelVoice=\(\)=>/);
  assert.match(studio,/aria-label="Discard voice recording"/);
  assert.match(studio,/aria-label="Send recording to transcript"/);
  assert.match(studio,/void transcribe\(blob\)/);
  assert.match(studio,/Transcribing…/);
  assert.match(studio,/discardVoiceRef\.current=true;stopVoice\(\)/);
  assert.match(studio,/if\(discardVoiceRef\.current\)return/);
  assert.match(studio,/cleanVoiceMeter\(\)/);
  assert.match(studio,/Audio limit: 1\.5 MB/);
});

test('Attachment client rejects unsupported, spoofed and excessive files before any upload',()=>{
  assert.equal(POSTER_REFERENCE_MAX_FILES,4);
  assert.equal(POSTER_REFERENCE_MAX_FILE_BYTES,1_500_000);
  assert.equal(POSTER_REFERENCE_MAX_TOTAL_BYTES,3_500_000);
  assert.equal(classifyPosterReference(file('style.png','image/png')),'image/png');
  assert.equal(classifyPosterReference(file('design.webp','image/webp')),'image/webp');
  assert.equal(classifyPosterReference(file('notes.pdf','application/pdf')),'application/pdf');
  assert.equal(classifyPosterReference(file('brief.md','text/markdown')),'text/markdown');
  assert.equal(classifyPosterReference(file('brief.txt','text/plain')),'text/plain');
  assert.equal(classifyPosterReference(file('notes.pdf','image/png')),null);
  assert.equal(classifyPosterReference(file('virus.svg','image/svg+xml')),null);
  assert.equal(classifyPosterReference(file('malware.exe','application/octet-stream')),null);
  assert.equal(classifyPosterReference(file('fake.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),null);
  assert.equal(isPosterReferenceImage(file('mood.jpg','image/jpeg')),true);
  assert.equal(isPosterReferenceImage(file('brief.pdf','application/pdf')),false);
  assert.equal(validatePosterReferences([],Array.from({length:5},(_,i)=>file('a'+i+'.png','image/png'))).ok,false);
  assert.equal(validatePosterReferences([],[file('large.png','image/png',1_500_001)]).ok,false);
  assert.equal(validatePosterReferences([],[
    file('a.png','image/png',1_000_000),file('b.png','image/png',1_000_000),
    file('c.png','image/png',1_000_000),file('d.png','image/png',1_000_000),
  ]).ok,false);
  assert.equal(validatePosterReferences([],[file('notes.pdf','application/pdf')]).ok,true);
});

test('Attachment FormData is real, scoped to selected owner business and used only on explicit Analyze',()=>{
  const first=file('brand.png','image/png');
  const second=file('brief.txt','text/plain');
  const id='11111111-1111-4111-8111-111111111111';
  const data=posterReferenceFormData(id,[first,second]);
  assert.equal(data.get('businessId'),id);
  assert.equal(data.getAll('files').length,2);
  assert.match(studio,/const analyzeReferences=async\(\)=>/);
  assert.match(studio,/onClick=\{\(\)=>void analyzeReferences\(\)\}/);
  assert.match(studio,/posterReferenceFormData\(businessId,referenceFiles\)/);
  assert.match(studio,/\/api\/marketing\/poster\/references\/analyze/);
  assert.match(reference,/isSameOrigin/);
  assert.match(reference,/auth\.getUser\(\)/);
  assert.match(reference,/\.eq\('id',businessId\)\.eq\('owner_id',user\.id\)/);
  assert.match(reference,/validSignature\(bytes,mime\)/);
  assert.match(reference,/marketing_poster_voice_try_reserve/);
  assert.match(reference,/referenceOnly:true/);
  assert.match(studio,/setReferenceFiles\(\[\]\);setReferenceSummary\(''\);setUseAttachedImage\(false\)/);
});

test('Reference analysis text cannot replace vendor instructions; image bytes require opt-in',()=>{
  const original='Create a premium festival poster for a real local florist.';
  const summary='Use natural warm colors and premium editorial layout.';
  assert.equal(withPosterReferenceSummary(original,''),original);
  const combined=withPosterReferenceSummary(original,summary);
  assert.ok(combined.startsWith(original));
  assert.match(combined,/Creative references \(untrusted style\/context only\)/);
  assert.ok(combined.length<=1200);
  assert.ok(withPosterReferenceSummary('a'.repeat(1199),summary).length<=1200);
  assert.match(studio,/request:withPosterReferenceSummary\(prompt,referenceSummary\)/);
  assert.match(studio,/prompt:withPosterReferenceSummary\(prompt,referenceSummary\)/);
  assert.match(studio,/if\(useAttachedImage&&attachedImage\)/);
  assert.match(studio,/preparePosterReferencePng\(attachedImage\)/);
  assert.match(studio,/else if\(sendReferenceImage&&selectedReference\)/);
  assert.match(studio,/Use the first attached image as an artwork reference on Generate/);
  assert.match(studio,/Off by default; documents are never sent to the image model/);
  assert.match(studio,/return blob;/);
  assert.doesNotMatch(studio,/supabase\.storage\.from|localStorage\.setItem/);
  assert.match(poster,/createGeminiPosterDesignBlueprint/);
});

test('Actual generated poster can still be downloaded and privately linked into Caption Lab',()=>{
  assert.match(studio,/composeExactPoster\(\{backgroundSrc:artworkSrc,format,copy:exactCopy/);
  assert.match(studio,/saveLinkedPoster\(\{/);
  assert.match(studio,/window\.location\.assign\('\/vendor\/marketing\/captions\?handoff='/);
  assert.match(studio,/onClick=\{\(\)=>void continueToCaption\(\)\}/);
});
