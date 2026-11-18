import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  SlbiVoiceRecorder,slbiVoiceAudioConstraints,SLBI_VOICE_MAX_BYTES,
  SLBI_VOICE_SAFE_BYTES,SLBI_VOICE_MAX_SECONDS,SLBI_VOICE_AUDIO_BITRATE,
} from '../lib/marketing/voice/slbi-voice-engine.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const client=read('lib/marketing/voice/slbi-voice-engine.ts');
const server=read('lib/marketing/voice/slbi-gemini-transcription.ts');
const route=read('app/api/marketing/poster/transcribe/route.ts');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const caption=read('app/vendor/marketing/captions/page.tsx');

test('Both studios depend on ONE recorder and ONE transcription request adapter',()=>{
  for(const page of [poster,caption]){
    assert.match(page,/new SlbiVoiceRecorder\(/);
    assert.match(page,/requestSlbiVoiceTranscript\(/);
    assert.doesNotMatch(page,/new MediaRecorder\(|getUserMedia\(|new AudioContext\(/);
    assert.match(page,/failedVoiceRef\.current=blob/);
    assert.match(page,/onClick=\{retryVoice\}/);
  }
  assert.match(client,/export class SlbiVoiceRecorder/);
  assert.match(client,/export async function requestSlbiVoiceTranscript/);
  assert.match(client,/method:'POST',credentials:'same-origin'/);
  assert.match(client,/x-slbi-business-id/);
});

test('Sri Lankan audio capture enforces 24kbps hint, mono, noise cleanup and dual safety cutoffs',()=>{
  assert.equal(SLBI_VOICE_MAX_BYTES,1_500_000);
  assert.equal(SLBI_VOICE_SAFE_BYTES,1_400_000);
  assert.equal(SLBI_VOICE_MAX_SECONDS,180);
  assert.equal(SLBI_VOICE_AUDIO_BITRATE,24_000);
  assert.deepEqual(slbiVoiceAudioConstraints,{
    echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1,
  });
  assert.match(client,/audioBitsPerSecond:SLBI_VOICE_AUDIO_BITRATE/);
  assert.match(client,/if\(this\.totalBytes>=SLBI_VOICE_SAFE_BYTES\)this\.stop\('size'\)/);
  assert.match(client,/if\(seconds>=SLBI_VOICE_MAX_SECONDS\)this\.stop\('duration'\)/);
  assert.match(client,/\['audio\/webm;codecs=opus','audio\/mp4'/);
  assert.match(client,/this\.stream\?\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
});

test('Shared Gemini prompt is contextual, multilingual, non-hallucinating, and one retry per quota reserve',()=>{
  for(const token of ['Sri Lankan','Tamil','Sinhala','Tanglish','Singlish',
    'WhatsApp','discount percentage','phone number','empty string','Output ONLY']){
    assert.ok(server.toLowerCase().includes(token.toLowerCase()),token);
  }
  assert.match(server,/SLBI_GEMINI_VOICE_MODEL='gemini-2.5-flash'/);
  assert.match(server,/maxOutputTokens:4096/);
  assert.match(server,/inlineData:\{mimeType:input\.mime/);
  assert.match(server,/AbortSignal.timeout\(TRY_TIMEOUT_MS\)/);
  assert.match(server,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
  assert.match(server,/\[500,502,503,504\]\.includes\(provider.status\)/);
  assert.match(route,/marketing_poster_voice_try_reserve/);
  assert.equal((route.match(/marketing_poster_voice_try_reserve/g)||[]).length,1);
  assert.match(route,/transcribeSlbiVendorAudio\(/);
  assert.doesNotMatch(server,/marketing_poster_voice_try_reserve|createAdminClient/);
  assert.doesNotMatch(server,/console\.log\(|storage\.from\(/);
});

test('Shared capture sends a retained well-formed blob and cancels without sending it',async()=>{
  const descriptors=['window','navigator','MediaRecorder'];
  const originals=descriptors.map(key=>Object.getOwnPropertyDescriptor(globalThis,key));
  let stopped=0;
  const fakeStream={getTracks:()=>[{stop:()=>{stopped++;}}]};
  class FakeRecorder{
    static isTypeSupported(type){return type==='audio/webm;codecs=opus';}
    state='inactive';mimeType='audio/webm;codecs=opus';
    ondataavailable=null;onstop=null;onerror=null;
    constructor(stream,opts){
      assert.equal(stream,fakeStream);
      assert.equal(opts.audioBitsPerSecond,24_000);
      assert.equal(opts.mimeType,'audio/webm;codecs=opus');
    }
    start(){this.state='recording';}
    stop(){
      this.state='inactive';
      this.ondataavailable?.({data:new Blob([new Uint8Array(900)],{type:this.mimeType})});
      this.onstop?.();
    }
    pause(){this.state='paused';}
    resume(){this.state='recording';}
  }
  try{
    Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{
      mediaDevices:{getUserMedia:async request=>{
        assert.deepEqual(request.audio,slbiVoiceAudioConstraints);
        return fakeStream;
      }},
    }});
    Object.defineProperty(globalThis,'MediaRecorder',{configurable:true,value:FakeRecorder});
    let complete=0;
    let result;
    const cap=new SlbiVoiceRecorder({
      onComplete:(blob,reason)=>{complete++;result={blob,reason};},
      onError:e=>{throw e;},
    });
    await cap.start();
    assert.equal(cap.pauseOrResume(),'paused');
    assert.equal(cap.pauseOrResume(),'recording');
    cap.stop();
    assert.equal(complete,1);
    assert.equal(result.reason,'sent');
    assert.equal(result.blob.size,900);
    cap.dispose();
    const cancelled=new SlbiVoiceRecorder({
      onComplete:()=>{complete++;},onError:e=>{throw e;},
    });
    await cancelled.start();
    cancelled.cancel();cancelled.dispose();
    assert.equal(complete,1);
    assert.ok(stopped>=2);
  }finally{
    descriptors.forEach((key,i)=>{
      if(originals[i])Object.defineProperty(globalThis,key,originals[i]);
      else delete globalThis[key];
    });
  }
});
