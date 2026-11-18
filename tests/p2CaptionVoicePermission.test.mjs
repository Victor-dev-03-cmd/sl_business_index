import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=read('next.config.ts');
const captions=read('app/vendor/marketing/captions/page.tsx');
const transcription=read('app/api/marketing/poster/transcribe/route.ts');
const engine=read('lib/marketing/voice/slbi-voice-engine.ts');
const voiceProvider=read('lib/marketing/voice/slbi-gemini-transcription.ts');

test('Caption Lab may prompt for microphone only on its own HTTPS same-origin page',()=>{
  assert.match(config,/source: '\/\(\.\*\)'[\s\S]*?microphone=\(\)/);
  const poster=config.indexOf("source: '/vendor/marketing/design/puter-lab'");
  const caption=config.indexOf("source: '/vendor/marketing/captions'");
  assert.ok(poster>0&&caption>poster);
  const scope=config.slice(caption,caption+260);
  assert.match(scope,/camera=\(\), microphone=\(self\), geolocation=\(self\)/);
  assert.equal((config.match(/microphone=\(self\)/g)||[]).length,2);
});

test('Explicit mic icon click invokes native getUserMedia and shows actionable permission help',()=>{
  assert.match(captions,/onClick=\{\(\)=>void startVoice\(\)\}/);
  assert.match(captions,/aria-label="Record voice campaign brief"/);
  assert.match(engine,/navigator\.mediaDevices\.getUserMedia\(\{/);
  assert.match(captions,/new SlbiVoiceRecorder\(/);
  assert.match(engine,/window\.isSecureContext/);
  assert.match(engine,/slbiVoiceAudioConstraints/);
  assert.match(captions,/name==='NotAllowedError'/);
  assert.match(captions,/setVoicePermissionHelp\(true\)/);
  assert.match(captions,/role="status"[\s\S]*?Enable microphone for Caption Lab/);
  assert.match(captions,/set Microphone to Allow, and reload/);
});

test('Poster-matched voice bar offers real measured waveform, pause/resume, Send and cancel',()=>{
  assert.match(captions,/role="group" aria-label="Active voice recording"/);
  assert.match(engine,/new AudioContext\(\)/);
  assert.match(engine,/audio\.createAnalyser\(\)/);
  assert.match(engine,/analyser\.getByteFrequencyData\(samples\)/);
  assert.match(captions,/voiceLevels\.map\(\(level,index\)=>/);
  assert.match(engine,/recorder\.pause\(\)/);
  assert.match(engine,/recorder\.resume\(\)/);
  assert.match(engine,/pauseOrResume\(\):SlbiVoiceState/);
  assert.match(captions,/aria-label="Send voice recording to transcript"/);
  assert.match(captions,/aria-label="Cancel and discard voice recording"/);
  assert.match(captions,/voiceCaptureRef\.current\?\.cancel\(\)/);
  assert.match(engine,/if\(discard\)return/);
  assert.match(engine,/recorder\.start\(250\)/);
  assert.match(engine,/this\.callbacks\.onSeconds\?\.\(seconds\)/);
  assert.match(captions,/releaseVoiceMedia\(\)/);
  assert.match(engine,/this\.audio\.close\(\)\.catch/);
  assert.match(engine,/this\.stream\?\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
});

test('Transcript status is explicit, full overlong text is reviewable, no silent clipping',()=>{
  assert.match(captions,/Transcribing…/);
  assert.match(captions,/role="status" aria-live="polite"/);
  assert.match(captions,/if\(combined\.length>600\)\{/);
  assert.match(captions,/setVoiceReviewDraft\(transcript\)/);
  assert.match(captions,/Full transcript · review before adding/);
  assert.match(captions,/id="caption-voice-review"/);
  assert.match(captions,/onClick=\{applyReviewedTranscript\}/);
  assert.match(captions,/Campaign brief supports 600 characters/);
  assert.match(captions,/setMessage\(combined\)/);
  assert.doesNotMatch(captions,/setMessage\(previous=>\[previous,data\.transcript\][\s\S]*?slice\(0,600\)/);
  assert.match(captions,/const prompt=message\.trim\(\)/);
  assert.match(captions,/if\(voiceReviewDraft\)\{/);
  assert.match(engine,/if\(blob\.size<800\)/);
  assert.match(engine,/No usable speech captured/);
});

test('Transcription route retains Pro auth, owner isolation, quota and server-only Gemini',()=>{
  assert.match(transcription,/isSameOrigin/);
  assert.match(transcription,/auth\.getUser\(\)/);
  assert.match(transcription,/rejectMarketingAccess/);
  assert.match(transcription,/\.eq\('owner_id',user\.id\)/);
  assert.match(transcription,/marketing_poster_voice_try_reserve/);
  assert.match(transcription,/process\.env\.GEMINI_API_KEY/);
  assert.match(transcription,/MAX_AUDIO_BYTES=1_500_000/);
  assert.match(voiceProvider,/Output ONLY the transcript text/);
  assert.doesNotMatch(captions,/await\s+generate\(\)|void\s+generate\(\)[\s\S]*?transcribe/);
});
