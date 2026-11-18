/**
 * SLBI shared audio capture for Poster Studio, Caption Lab and future GrowthOS tools.
 * Browser-only: no audio persistence, no recording/upload until an explicit user click.
 * A 24kbps encoder setting is advisory: measured bytes and time enforce hard bounds.
 */
export const SLBI_VOICE_MAX_BYTES=1_500_000;
export const SLBI_VOICE_SAFE_BYTES=1_400_000;
export const SLBI_VOICE_MAX_SECONDS=180;
export const SLBI_VOICE_AUDIO_BITRATE=24_000;
export type SlbiVoiceStopReason='sent'|'duration'|'size';
export type SlbiVoiceState='recording'|'paused'|'idle';

export const slbiVoiceAudioConstraints:MediaTrackConstraints={
  echoCancellation:true,
  noiseSuppression:true,
  autoGainControl:true,
  channelCount:1,
};

export function slbiVoiceMimeType(){
  if(typeof MediaRecorder==='undefined')return '';
  return ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus']
    .find(type=>MediaRecorder.isTypeSupported(type))||'';
}

export type SlbiVoiceCaptureCallbacks={
  onComplete:(blob:Blob,reason:SlbiVoiceStopReason)=>void;
  onError:(error:Error)=>void;
  onState?:(state:SlbiVoiceState)=>void;
  onSeconds?:(seconds:number)=>void;
  onLevels?:(levels:number[])=>void;
};

export class SlbiVoiceRecorder{
  private recorder:MediaRecorder|null=null;
  private stream:MediaStream|null=null;
  private audio:AudioContext|null=null;
  private frame:number|null=null;
  private timer:ReturnType<typeof setInterval>|null=null;
  private parts:Blob[]=[];
  private totalBytes=0;
  private elapsedMs=0;
  private segmentStarted=0;
  private discarded=false;
  private disposed=false;
  private reason:SlbiVoiceStopReason='sent';
  constructor(private readonly callbacks:SlbiVoiceCaptureCallbacks){}

  async start():Promise<void>{
    if(this.disposed)throw Error('The recording session is closed.');
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||
       typeof MediaRecorder==='undefined')
      throw Error('Voice requires HTTPS and a browser with microphone support.');
    const stream=await navigator.mediaDevices.getUserMedia({
      audio:slbiVoiceAudioConstraints,
    });
    if(this.disposed){stream.getTracks().forEach(track=>track.stop());return;}
    this.stream=stream;
    try{
      const mime=slbiVoiceMimeType();
      const recorder=new MediaRecorder(stream,{
        ...(mime?{mimeType:mime}:{}),
        audioBitsPerSecond:SLBI_VOICE_AUDIO_BITRATE,
      });
      this.recorder=recorder;
      this.parts=[];this.totalBytes=0;this.elapsedMs=0;
      this.discarded=false;this.reason='sent';
      recorder.ondataavailable=event=>{
        if(this.disposed||this.discarded||!event.data.size)return;
        this.parts.push(event.data);
        this.totalBytes+=event.data.size;
        if(this.totalBytes>=SLBI_VOICE_SAFE_BYTES)this.stop('size');
      };
      recorder.onerror=()=>{
        if(this.disposed)return;
        this.discarded=true;
        this.callbacks.onError(Error('Microphone recording was interrupted. Check the device and try again.'));
        this.cancel();
      };
      recorder.onstop=()=>{
        const blob=new Blob(this.parts,{type:recorder.mimeType||mime||'audio/webm'});
        const discard=this.discarded||this.disposed;
        const reason=this.reason;
        this.releaseMedia();
        this.recorder=null;
        this.callbacks.onState?.('idle');
        if(discard)return;
        if(blob.size<800){
          this.callbacks.onError(Error('No usable speech captured. Speak for a few seconds and tap Send.'));
          return;
        }
        if(blob.size>SLBI_VOICE_MAX_BYTES){
          this.callbacks.onError(Error('The browser encoded too much audio. Record a shorter voice message.'));
          return;
        }
        this.callbacks.onComplete(blob,reason);
      };
      this.segmentStarted=Date.now();
      recorder.start(250);
      this.callbacks.onState?.('recording');
      this.callbacks.onSeconds?.(0);
      this.timer=setInterval(()=>{
        if(recorder.state!=='recording')return;
        const seconds=Math.floor((this.elapsedMs+Date.now()-this.segmentStarted)/1000);
        this.callbacks.onSeconds?.(seconds);
        if(seconds>=SLBI_VOICE_MAX_SECONDS)this.stop('duration');
      },250);
      this.startMeter(stream,recorder);
    }catch(error){
      this.releaseMedia();
      this.recorder=null;
      throw error;
    }
  }

  pauseOrResume():SlbiVoiceState{
    const recorder=this.recorder;
    if(!recorder)return 'idle';
    if(recorder.state==='recording'){
      this.elapsedMs+=Date.now()-this.segmentStarted;
      recorder.pause();this.callbacks.onState?.('paused');return 'paused';
    }
    if(recorder.state==='paused'){
      this.segmentStarted=Date.now();
      recorder.resume();this.callbacks.onState?.('recording');return 'recording';
    }
    return 'idle';
  }

  stop(reason:SlbiVoiceStopReason='sent'):void{
    const recorder=this.recorder;
    if(!recorder||recorder.state==='inactive')return;
    if(recorder.state==='recording')this.elapsedMs+=Date.now()-this.segmentStarted;
    this.reason=reason;
    // Keep the stream alive until onstop flushes the final encoded chunk.
    recorder.stop();
  }

  cancel():void{
    this.discarded=true;
    if(this.recorder&&this.recorder.state!=='inactive')this.recorder.stop();
    else this.releaseMedia();
  }

  dispose():void{
    this.disposed=true;this.discarded=true;
    this.cancel();
    this.releaseMedia();
  }

  private startMeter(stream:MediaStream,recorder:MediaRecorder):void{
    try{
      const audio=new AudioContext();
      this.audio=audio;
      const analyser=audio.createAnalyser();
      analyser.fftSize=128;
      const source=audio.createMediaStreamSource(stream);
      source.connect(analyser);
      const samples=new Uint8Array(analyser.frequencyBinCount);
      let lastFrame=0;
      const tick=(now:number)=>{
        if(this.disposed||recorder.state==='inactive')return;
        if(recorder.state==='recording'&&now-lastFrame>=90){
          lastFrame=now;
          analyser.getByteFrequencyData(samples);
          this.callbacks.onLevels?.(Array.from({length:35},(_,i)=>{
            const bin=samples[Math.min(samples.length-1,Math.floor(i*samples.length/35))];
            return Math.max(5,Math.min(37,Math.round(5+bin/255*32)));
          }));
        }
        this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    }catch{/* Audio recording still works if a live volume meter is unavailable. */}
  }

  private releaseMedia():void{
    if(this.timer!==null){clearInterval(this.timer);this.timer=null;}
    if(this.frame!==null){cancelAnimationFrame(this.frame);this.frame=null;}
    if(this.audio){void this.audio.close().catch(()=>{});this.audio=null;}
    this.stream?.getTracks().forEach(track=>track.stop());
    this.stream=null;
  }
}

export type SlbiTranscriptResult={transcript:string;languageHint:string;reviewBeforeGenerating:boolean};
export class SlbiVoiceRequestError extends Error{
  constructor(message:string,readonly code:string,readonly status:number){
    super(message);this.name='SlbiVoiceRequestError';
  }
}

/** All GrowthOS studios submit the same server-authenticated audio contract. */
export async function requestSlbiVoiceTranscript(args:{
  audio:Blob;businessId:string;language?:'ta'|'si'|'en'|'auto';
}):Promise<SlbiTranscriptResult>{
  if(args.audio.size<800||args.audio.size>SLBI_VOICE_MAX_BYTES)
    throw new SlbiVoiceRequestError('Record a shorter, usable voice message.','VOICE_SIZE',413);
  const response=await fetch('/api/marketing/poster/transcribe',{
    method:'POST',credentials:'same-origin',cache:'no-store',body:args.audio,
    headers:{
      'Content-Type':args.audio.type||'audio/webm',
      'x-slbi-business-id':args.businessId,
      'x-slbi-language':args.language||'auto',
    },
  });
  let data:{error?:string;code?:string;transcript?:string;languageHint?:string};
  try{data=await response.json() as typeof data;}
  catch{throw new SlbiVoiceRequestError('Voice service returned an invalid response.','VOICE_RESPONSE',502);}
  if(!response.ok||typeof data.transcript!=='string')
    throw new SlbiVoiceRequestError(data.error||'Voice transcription could not finish.',
      data.code||'VOICE_UNAVAILABLE',response.status);
  return {transcript:data.transcript,languageHint:data.languageHint||'auto',
    reviewBeforeGenerating:true};
}
