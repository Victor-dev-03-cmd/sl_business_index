import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=read('next.config.ts');
const captions=read('app/vendor/marketing/captions/page.tsx');
const transcription=read('app/api/marketing/poster/transcribe/route.ts');

test('Caption Lab is allowed to prompt for same-origin microphone and camera remains disabled',()=>{
  assert.match(config,/source: '\/\(\.\*\)'[\s\S]*?microphone=\(\)/);
  const poster=config.indexOf("source: '/vendor/marketing/design/puter-lab'");
  const caption=config.indexOf("source: '/vendor/marketing/captions'");
  assert.ok(poster>0&&caption>poster);
  const scope=config.slice(caption,caption+260);
  assert.match(scope,/camera=\(\), microphone=\(self\), geolocation=\(self\)/);
  // No blanket microphone access at '/' or every vendor dashboard page.
  assert.equal((config.match(/microphone=\(self\)/g)||[]).length,2);
});

test('Browser requests permission on direct Voice click with recoverable denied/blocked states',()=>{
  assert.match(captions,/onClick=\{\(\)=>recording\?stopVoice\(\):void startVoice\(\)\}/);
  assert.match(captions,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(captions,/window\.isSecureContext/);
  assert.match(captions,/permissionsPolicy\?\.allowsFeature\('microphone'\)/);
  assert.match(captions,/name==='NotAllowedError'/);
  assert.match(captions,/setVoicePermissionHelp\(true\)/);
  assert.match(captions,/role="status"[\s\S]*?Enable microphone for Caption Lab/);
  assert.match(captions,/set Microphone to Allow, and reload/);
});

test('Stop control stays enabled throughout recording, and the audio stream is cleaned up',()=>{
  assert.match(captions,/disabled=\{\(!recording&&isBusy\)\|\|!businessId\}/);
  assert.match(captions,/aria-label=\{recording\?'Stop voice recording':'Record voice campaign brief'\}/);
  assert.match(captions,/recorder\.start\(250\)/);
  assert.match(captions,/if\(recorderRef\.current\?\.state==='recording'\)recorderRef\.current\.stop\(\)/);
  assert.match(captions,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
  assert.match(captions,/if\(blob\.size<800\)/);
  assert.match(captions,/void transcribe\(blob\)/);
});

test('Voice transcription still requires authentication, business ownership, quotas and private Gemini API',()=>{
  assert.match(transcription,/isSameOrigin/);
  assert.match(transcription,/auth\.getUser\(\)/);
  assert.match(transcription,/rejectMarketingAccess/);
  assert.match(transcription,/\.eq\('owner_id',user\.id\)/);
  assert.match(transcription,/marketing_poster_voice_try_reserve/);
  assert.match(transcription,/process\.env\.GEMINI_API_KEY/);
  assert.match(transcription,/MAX_AUDIO_BYTES=1_500_000/);
  assert.match(transcription,/Output only the transcript/);
});
