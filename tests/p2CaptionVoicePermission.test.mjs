import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=read('next.config.ts');
const captions=read('app/vendor/marketing/captions/page.tsx');
const transcription=read('app/api/marketing/poster/transcribe/route.ts');

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
  assert.match(captions,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(captions,/window\.isSecureContext/);
  assert.match(captions,/permissionsPolicy\?\.allowsFeature\('microphone'\)/);
  assert.match(captions,/name==='NotAllowedError'/);
  assert.match(captions,/setVoicePermissionHelp\(true\)/);
  assert.match(captions,/role="status"[\s\S]*?Enable microphone for Caption Lab/);
  assert.match(captions,/set Microphone to Allow, and reload/);
});

test('Poster-matched voice bar offers real measured waveform, pause/resume, Send and cancel',()=>{
  assert.match(captions,/role="group" aria-label="Active voice recording"/);
  assert.match(captions,/new AudioContext\(\)/);
  assert.match(captions,/audio\.createAnalyser\(\)/);
  assert.match(captions,/analyser\.getByteFrequencyData\(bins\)/);
  assert.match(captions,/voiceLevels\.map\(\(level,index\)=>/);
  assert.match(captions,/recorder\.pause\(\);setVoicePaused\(true\)/);
  assert.match(captions,/recorder\.resume\(\);setVoicePaused\(false\)/);
  assert.match(captions,/recorder\.state==='recording'\|\|recorder\.state==='paused'/);
  assert.match(captions,/aria-label="Send voice recording to transcript"/);
  assert.match(captions,/aria-label="Cancel and discard voice recording"/);
  assert.match(captions,/discardVoiceRef\.current=true;sendVoice\(\)/);
  assert.match(captions,/if\(failed\|\|discarded\)return/);
  assert.match(captions,/recorder\.start\(250\)/);
  assert.match(captions,/if\(recorder\.state==='recording'\)setVoiceSeconds/);
  assert.match(captions,/releaseVoiceMedia\(\)/);
  assert.match(captions,/voiceAudioRef\.current\.close\(\)\.catch/);
  assert.match(captions,/streamRef\.current\?\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
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
  assert.match(transcription,/Output only the transcript/);
  assert.doesNotMatch(captions,/await\s+generate\(\)|void\s+generate\(\)[\s\S]*?transcribe/);
});
