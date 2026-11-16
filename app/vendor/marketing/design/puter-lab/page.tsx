'use client';
/* eslint-disable @next/next/no-img-element */
import './typography.css';
import PuterCompactFormatSelector from './PuterCompactFormatSelector';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  ArrowLeft,CheckCircle2,Download,FlaskConical,Image as ImageIcon,
  LoaderCircle,Mic,ShieldCheck,SquarePen,StopCircle,WandSparkles,
} from 'lucide-react';
import {POSTER_FORMATS,type PosterFormat} from '@/lib/marketing/poster-design';
import {
  buildArtOnlyPrompt,composeExactPoster,extractExplicitPercentage,
  type ExactPosterCopy,type PosterCopyLanguage,
} from '@/lib/marketing/puter-poster-composer';
import type {PosterBusinessFacts,PosterIntelligenceBrief} from '@/lib/marketing/poster-gemini-intelligence';

type PuterClient={
  auth:{signIn:()=>Promise<unknown>};
  ai:{txt2img:(prompt:string,options:{model:string;test_mode:boolean;ratio?:{w:number;h:number}})=>Promise<HTMLImageElement>};
};
declare global {interface Window {puter?:PuterClient;}}
type OwnedBusiness={id:string;name:string;facts:PosterBusinessFacts};
type ApiError={error?:string};
type ContextResponse=ApiError&{businesses?:OwnedBusiness[]};
type BriefResponse=ApiError&{brief?:PosterIntelligenceBrief};
const models=[
  {id:'openai/gpt-image-2.6-flare',label:'GPT Image 2.6 Flare'},
  {id:'google/gemini-3-pro-image',label:'Gemini 3 Pro Image'},
  {id:'black-forest-labs/flux-2-pro',label:'FLUX.2 Pro'},
  {id:'qwen/qwen-image',label:'Qwen Image (unspecified version)'},
] as const;
type ModelId=typeof models[number]['id'];
const formats:PosterFormat[]=['story','portrait','square','landscape'];
const samplePrompt='Create a premium Deepavali artwork for a software development business. Navy and gold technology theme, glowing diyas, elegant festive lighting and modern software visuals.';
const languageLabels:Record<PosterCopyLanguage,string>={ta:'தமிழ்',si:'සිංහල',en:'English'};
const maxAudio=1_500_000;
const reqOptions={cache:'no-store' as const,credentials:'same-origin' as const};
function errorMessage(e:unknown):string{return e instanceof Error?e.message:'The requested action failed.';}
function ratioFor(format:PosterFormat):{w:number;h:number}{
  return format==='story'?{w:9,h:16}:format==='portrait'?{w:4,h:5}:
    format==='square'?{w:1,h:1}:{w:1200,h:630};
}

export default function PuterMultilingualPosterLab(){
  const [sdkReady,setSdkReady]=useState(false);
  const [businesses,setBusinesses]=useState<OwnedBusiness[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [loadingBusiness,setLoadingBusiness]=useState(true);
  const [model,setModel]=useState<ModelId>(models[0].id);
  const [format,setFormat]=useState<PosterFormat>('story');
  const [language,setLanguage]=useState<PosterCopyLanguage>('ta');
  const [prompt,setPrompt]=useState(samplePrompt);
  const [headline,setHeadline]=useState('Deepavali Special');
  const [offer,setOffer]=useState('');
  const [cta,setCta]=useState('Contact us for details');
  const [showPhone,setShowPhone]=useState(true);
  const [showWebsite,setShowWebsite]=useState(true);
  const [manualHeadline,setManualHeadline]=useState(false);
  const [manualCta,setManualCta]=useState(false);
  const [brief,setBrief]=useState<PosterIntelligenceBrief|null>(null);
  const [briefKey,setBriefKey]=useState('');
  const [geminiBusy,setGeminiBusy]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recordingSeconds,setRecordingSeconds]=useState(0);
  const [transcribing,setTranscribing]=useState(false);
  const [realMode,setRealMode]=useState(false);
  const [consent,setConsent]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [composing,setComposing]=useState(false);
  const [artworkSrc,setArtworkSrc]=useState('');
  const [finalUrl,setFinalUrl]=useState('');
  const [finalBlob,setFinalBlob]=useState<Blob|null>(null);
  const [isRealOutput,setIsRealOutput]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const clockRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const finalUrlRef=useRef('');
  const business=businesses.find(b=>b.id===businessId);
  const facts=business?.facts;
  const currentKey=businessId+'|'+language+'|'+prompt.trim();
  const currentBrief=brief&&briefKey===currentKey?brief:null;
  const dimensions=POSTER_FORMATS[format];

  const stopVoice=useCallback(()=>{
    if(clockRef.current){clearInterval(clockRef.current);clockRef.current=null;}
    if(recorderRef.current?.state==='recording')recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;setRecording(false);
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    void fetch('/api/marketing/poster/puter-lab',{...reqOptions,signal:controller.signal})
      .then(async res=>{
        const value=await res.json() as ContextResponse;
        if(!res.ok)throw Error(value.error||'Could not load owned business details.');
        return value.businesses||[];
      }).then(items=>{
        if(controller.signal.aborted)return;
        setBusinesses(items);setBusinessId(items[0]?.id||'');
      }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));})
      .finally(()=>{if(!controller.signal.aborted)setLoadingBusiness(false);});
    return()=>controller.abort();
  },[]);
  useEffect(()=>()=>{stopVoice();if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);},[stopVoice]);

  const exactCopy=useMemo<ExactPosterCopy|null>(()=>facts?{
    businessName:facts.name,
    headline:headline.trim(),
    offer:offer.trim(),
    service:facts.category,
    cta:cta.trim(),
    phone:showPhone?facts.phone:'',
    website:showWebsite?facts.website:'',
    accentColor:facts.primaryColor||'#F7B45C',
    language,
  }:null,[facts,headline,offer,cta,showPhone,showWebsite,language]);

  // Recompose typography at the exact selected PNG dimensions. Changing text,
  // format or contact options never triggers a new billable Puter request.
  useEffect(()=>{
    if(!artworkSrc||!exactCopy)return;
    let cancelled=false;
    setComposing(true);setError('');
    const timeout=setTimeout(()=>{
      void composeExactPoster({backgroundSrc:artworkSrc,format,copy:exactCopy})
        .then(blob=>{
          if(cancelled)return;
          const url=URL.createObjectURL(blob);
          if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);
          finalUrlRef.current=url;setFinalBlob(blob);setFinalUrl(url);
          setStatus(isRealOutput?
            'Exact-text poster composed at '+dimensions.width+'×'+dimensions.height+' PNG. Ready to download.':
            'No-credit SAMPLE composed for layout testing. It does not measure model quality.');
        })
        .catch(e=>{if(!cancelled){setFinalBlob(null);setError(errorMessage(e));}})
        .finally(()=>{if(!cancelled)setComposing(false);});
    },220);
    return()=>{cancelled=true;clearTimeout(timeout);};
  },[artworkSrc,format,exactCopy,isRealOutput,dimensions.width,dimensions.height]);

  const transcribe=async(blob:Blob)=>{
    setTranscribing(true);setError('');setStatus('Gemini is transcribing your original-language voice. Please review the text.');
    try{
      if(!businessId)throw Error('Choose your owned business before speaking.');
      if(blob.size<800||blob.size>maxAudio)
        throw Error('The voice clip exceeds 1.5 MB. Record a shorter clip or type the remaining details.');
      const res=await fetch('/api/marketing/poster/transcribe',{
        method:'POST',...reqOptions,
        headers:{
          'Content-Type':blob.type||'audio/webm',
          'x-slbi-business-id':businessId,
          'x-slbi-language':'auto',
        },body:blob,
      });
      const data=await res.json() as ApiError&{transcript?:string};
      if(!res.ok||!data.transcript)throw Error(data.error||'Gemini could not transcribe the recording.');
      const heard=data.transcript.trim();
      setPrompt(prev=>[prev,heard].filter(Boolean).join(' ').slice(0,1200));
      setOffer(prev=>prev||extractExplicitPercentage(heard));
      setBrief(null);setBriefKey('');
      setStatus('Gemini transcript added. Check the words, campaign offer and business details before continuing.');
    }catch(e){setError(errorMessage(e));}
    finally{setTranscribing(false);}
  };
  const startVoice=async()=>{
    if(recording){stopVoice();return;}
    if(generating||geminiBusy||transcribing)return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setError('Voice requires a supported browser and HTTPS. You can type your prompt instead.');return;
    }
    const policy=document as Document&{
      permissionsPolicy?:{allowsFeature:(v:string)=>boolean};
      featurePolicy?:{allowsFeature:(v:string)=>boolean};
    };
    const allowed=policy.permissionsPolicy?.allowsFeature('microphone') ??
      policy.featurePolicy?.allowsFeature('microphone');
    if(allowed===false){setError('Microphone blocked by Permissions-Policy. Reload and retry.');return;}
    try{
      setError('');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4']
        .find(v=>MediaRecorder.isTypeSupported(v));
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      streamRef.current=stream;recorderRef.current=rec;
      const chunks:BlobPart[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        streamRef.current=null;recorderRef.current=null;
        if(clockRef.current)clearInterval(clockRef.current);
        setRecording(false);
        if(chunks.length)void transcribe(new Blob(chunks,{type:rec.mimeType}));
      };
      rec.onerror=()=>{setError('Microphone failed. Please type your message.');stopVoice();};
      rec.start(250);setRecordingSeconds(0);setRecording(true);
      clockRef.current=setInterval(()=>setRecordingSeconds(n=>n+1),1000);
      setStatus('Listening. Stop recording when you finish; the 1.5 MB Gemini audio limit still applies.');
    }catch(e){
      const name=e instanceof Error?e.name:'';
      setError(name==='NotAllowedError'||name==='SecurityError'?
        'Microphone permission denied. Chrome site controls → Microphone → Allow, then retry.':
        'Unable to open microphone. Check your recording device or type instead.');
    }
  };
  const prepareWithGemini=async()=>{
    if(!businessId||prompt.trim().length<5){setError('Choose a business and enter a prompt.');return;}
    if(geminiBusy||recording||transcribing||generating)return;
    setGeminiBusy(true);setError('');setStatus('Gemini is understanding your campaign and verified business facts…');
    const forKey=currentKey;
    try{
      const res=await fetch('/api/marketing/poster/puter-lab',{
        method:'POST',...reqOptions,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId,prompt:prompt.trim(),language}),
      });
      const data=await res.json() as BriefResponse;
      if(!res.ok||!data.brief)throw Error(data.error||'Gemini could not prepare this creative brief.');
      if(forKey!==businessId+'|'+language+'|'+prompt.trim())return;
      setBrief(data.brief);setBriefKey(forKey);
      if(!manualHeadline&&data.brief.suggestedHeadline)
        setHeadline(data.brief.suggestedHeadline);
      if(!manualCta&&data.brief.suggestedCallToAction)
        setCta(data.brief.suggestedCallToAction);
      setOffer(prev=>prev||extractExplicitPercentage(prompt));
      setStatus('Gemini brief ready. Review exact headline, offer and CTA before using Puter.');
    }catch(e){setError(errorMessage(e));}
    finally{setGeminiBusy(false);}
  };
  const generate=async()=>{
    if(!sdkReady||!window.puter){setError('Puter.js is not ready. Reload and retry.');return;}
    if(!facts||!businessId){setError('Choose a verified owned business first.');return;}
    if(recording||transcribing||geminiBusy||generating)return;
    if(prompt.trim().length<5||!headline.trim()){
      setError('Enter your campaign idea and an exact headline for the poster.');return;
    }
    if(realMode&&!consent){setError('Please explicitly confirm possible Puter charges.');return;}
    setGenerating(true);setComposing(false);setError('');setStatus('Signing in to Puter and generating text-free artwork…');
    try{
      const puter=window.puter;
      await puter.auth.signIn();
      const creative=buildArtOnlyPrompt({
        request:prompt.trim(),creativeDirection:currentBrief?.creativeDirectionEnglish,
        businessCategory:facts.category,city:facts.city,
        brandColor:facts.primaryColor||'#F7B45C',format,
      });
      const options:{model:string;test_mode:boolean;ratio?:{w:number;h:number}}={
        model,test_mode:!realMode,
      };
      // The ratio option is documented for Gemini and GPT; the other providers
      // use their default sizes and get safely cropped into exact final ratios.
      if(model.startsWith('openai/')||model.startsWith('google/'))
        options.ratio=ratioFor(format);
      const image=await puter.ai.txt2img(creative,options);
      if(!image?.src||typeof image.src!=='string')
        throw Error('Puter returned no image. No printable poster was prepared.');
      setArtworkSrc(image.src);setIsRealOutput(realMode);
      setStatus(realMode?'Puter artwork returned. Composing exact approved copy…':
        'Puter sample returned. Composing a sample poster at exact size…');
    }catch(e){setError(errorMessage(e));setStatus('Generation failed; previous poster remains available.');}
    finally{setGenerating(false);}
  };
  const download=()=>{
    if(!finalBlob||!finalUrl||composing)return;
    const anchor=document.createElement('a');
    const safeName=(facts?.name||'business').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32);
    anchor.href=finalUrl;
    anchor.download='slbi-'+(safeName||'business')+'-'+format+'-'+dimensions.width+'x'+dimensions.height+
      (isRealOutput?'':'-sample')+'.png';
    document.body.appendChild(anchor);anchor.click();anchor.remove();
  };
  const locked=generating||geminiBusy||transcribing||recording;
  return <main className="mx-auto flex w-full max-w-[1620px] flex-col gap-3 px-3 py-3 text-[#292327] sm:px-5 xl:h-[calc(100dvh-9.5rem)] xl:min-h-0 xl:overflow-hidden xl:py-2">
    <Script src="https://js.puter.com/v2/" strategy="afterInteractive"
      onReady={()=>setSdkReady(true)}
      onError={()=>setError('Unable to load Puter.js. Check network restrictions.')}/>
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="rounded-xl bg-[#262125] p-2.5 text-[#F9B16F]"><FlaskConical size={18}/></span>
        <div>
          <h1 className="text-base font-extrabold leading-5 sm:text-lg">SLBI · Puter AI Poster Composer</h1>
          <p className="text-[11px] leading-4 text-[#8C7F82]">Private owner QA · Voice, artwork & exact typography</p>
        </div>
      </div>
      <Link href="/vendor/marketing/design"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8DED8] px-3 py-2 text-[11px] font-bold hover:bg-[#FAF7F4]">
        <ArrowLeft size={13}/> Creative AI
      </Link>
    </header>
    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#F3D9BB] bg-[#FFF8EF] px-3 py-2 text-[11px] leading-[18px] text-[#94623C]">
      <ShieldCheck size={15} className="shrink-0"/>
      <p><strong>Owner-only sandbox.</strong> Real Puter images use your own User-Pays balance; Gemini voice/brief uses the existing shared daily quota.
        No SLBI Growth Credits, publishing or automatic poster storage.</p>
    </div>
    {(error||status)&&<div role={error?'alert':'status'} aria-live="polite"
      className={'shrink-0 rounded-xl border px-3 py-2 text-[11px] leading-5 '+
      (error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>
      {error||status}
    </div>}
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,0.91fr)_minmax(0,1.36fr)_minmax(0,0.9fr)]">
      {/* LEFT: Prompt and generation, with an independently scrollable panel on desktop. */}
      <section aria-label="Poster creation controls"
        className="order-2 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ECE5E0] bg-white lg:order-1">
        <div className="flex shrink-0 items-center justify-between border-b border-[#F0EAE7] px-4 py-3">
          <h2 className="text-[13px] font-extrabold">Create poster</h2>
          <span className="text-[10px] font-semibold text-[#A97C5D]">01 / Input</span>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-visible px-4 py-3 xl:overflow-y-auto">
          <div>
            <label htmlFor="puter-business" className="mb-1.5 block text-[11px] font-bold">Selected business</label>
            <select id="puter-business" value={businessId} disabled={locked||loadingBusiness}
              onChange={e=>{
                setBusinessId(e.target.value);setBrief(null);setBriefKey('');
                setArtworkSrc('');setFinalBlob(null);setFinalUrl('');
                setHeadline('');setOffer('');setManualHeadline(false);
              }} className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-3 py-2.5 text-[12px] font-semibold">
              {!businesses.length&&<option value="">No owned business available</option>}
              {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {facts&&<p className="mt-1.5 truncate text-[10px] text-[#82756F]" title={facts.name+' · '+facts.category}>
              Verified: {facts.name}{facts.category?' · '+facts.category:''}
            </p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="puter-language" className="mb-1.5 block text-[11px] font-bold">Language</label>
              <select id="puter-language" value={language} disabled={locked}
                onChange={e=>setLanguage(e.target.value as PosterCopyLanguage)}
                className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-2 py-2.5 text-[11px]">
                {(Object.entries(languageLabels) as Array<[PosterCopyLanguage,string]>)
                  .map(([key,val])=><option key={key} value={key}>{val}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="puter-model" className="mb-1.5 block text-[11px] font-bold">Artwork model</label>
              <select id="puter-model" value={model} disabled={locked} onChange={e=>setModel(e.target.value as ModelId)}
                className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-2 py-2.5 text-[11px]">
                {models.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="puter-prompt" className="mb-1.5 block text-[11px] font-bold">Describe your poster / Gemini voice transcript</label>
            <textarea id="puter-prompt" value={prompt} disabled={locked} rows={5} maxLength={1200}
              onChange={e=>{setPrompt(e.target.value);setBrief(null);setBriefKey('');}}
              placeholder="தமிழ் · සිංහල · English · Tanglish — describe your campaign."
              className="max-h-[190px] min-h-[110px] w-full resize-none rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] p-3 text-[12px] leading-5 outline-none focus:border-[#EC9D68]"/>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={generating||geminiBusy||transcribing||!businessId}
              onClick={()=>void startVoice()}
              className={'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold disabled:opacity-40 '+
                (recording?'border-red-300 bg-red-50 text-red-700':'border-[#E6DED9] bg-white')}>
              {recording?<StopCircle size={15}/>:<Mic size={15}/>}
              {recording?'Stop ('+recordingSeconds+'s)':'Voice message'}
            </button>
            <button type="button" disabled={locked||!businessId||prompt.trim().length<5}
              onClick={()=>void prepareWithGemini()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#292328] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">
              {geminiBusy?<LoaderCircle size={15} className="animate-spin"/>:<WandSparkles size={15}/>}
              Prepare with Gemini
            </button>
          </div>
          {currentBrief&&<div className="flex items-start gap-1.5 rounded-xl border border-[#DDE8DC] bg-[#F5FAF5] p-2 text-[11px] leading-4 text-[#4C6951]">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0"/>
            Gemini brief prepared. Review exact headline, offer and CTA in the right panel.
          </div>}
          <p className="text-[10px] leading-4 text-[#958681]">
            Voice stops manually. Gemini transcript stays editable; audio limit 1.5 MB.
            It never automatically triggers a paid image call.
          </p>
        </div>
        <div className="shrink-0 space-y-2 border-t border-[#EEE8E5] bg-[#FDFBF9] p-3">
          <label className="flex items-center gap-2 text-[11px] font-bold">
            <input type="checkbox" checked={realMode} disabled={locked}
              onChange={e=>{setRealMode(e.target.checked);setConsent(false);}}/>
            Use real Puter image generation
          </label>
          {realMode?<label className="flex items-start gap-2 text-[10px] font-semibold leading-4 text-[#A45C23]">
            <input type="checkbox" checked={consent} disabled={locked}
              onChange={e=>setConsent(e.target.checked)}/>
            I understand this uses my Puter AI balance and may create a charge.
          </label>:<p className="text-[10px] leading-4 text-[#8C7F79]">
            Default is a no-credit sample, not a real AI quality test.
          </p>}
          <button type="button" onClick={()=>void generate()}
            disabled={locked||!sdkReady||!facts||prompt.trim().length<5||!headline.trim()||(realMode&&!consent)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#262126] px-3 py-3 text-[11px] font-bold text-white disabled:opacity-40">
            {generating?<LoaderCircle size={16} className="animate-spin"/>:<FlaskConical size={16}/>}
            {generating?'Generating artwork…':realMode?'Generate real poster with Puter':'Generate no-credit poster sample'}
          </button>
        </div>
      </section>

      {/* CENTER: Never take the native image height as layout height. Only fit it. */}
      <section aria-label="Exact AI poster preview"
        className="order-1 flex min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-[#E8E2E0] bg-[#F8F6F4] p-3 lg:order-2 xl:p-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#B46A33]">Live workspace · 02</p>
            <h2 className="text-[13px] font-extrabold">Poster preview</h2>
          </div>
          <span className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#796B66]">
            {dimensions.width} × {dimensions.height}
          </span>
        </div>
        <div className="relative flex h-[min(60dvh,620px)] min-h-[270px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#EAE4DE] p-3 lg:h-[min(70dvh,680px)] xl:h-auto xl:min-h-0">
          {finalUrl?<img src={finalUrl} alt="Exact composed poster with verified business facts"
            className="block h-full w-full max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(24,22,25,.17)]"
            style={{aspectRatio:dimensions.width+'/'+dimensions.height}}/>:
          <div className="flex flex-col items-center gap-3 text-center text-[#897E77]">
            <ImageIcon size={34}/>
            <p className="text-[12px] font-bold">Final high-resolution poster preview</p>
            <p className="max-w-[260px] text-[11px] leading-5">
              Describe your campaign, approve the copy and generate artwork.
              Your PNG always retains the selected export dimensions.
            </p>
          </div>}
          {(generating||composing)&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm">
            <LoaderCircle size={25} className="animate-spin text-orange-500"/>
            <p className="text-[11px] font-bold text-[#6E5C51]">
              {generating?'Generating text-free artwork…':'Rendering exact typography…'}
            </p>
          </div>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E7E1DE] pt-2.5">
          <p className="min-w-0 flex-1 text-[10px] leading-4 text-[#81736E]">
            {finalBlob?(isRealOutput?'Real artwork · exact browser text':'No-credit SAMPLE · exact text'):
              'No automatic publishing or SLBI storage'}
          </p>
          <button type="button" onClick={download} disabled={!finalBlob||composing||generating}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#262126] px-3 py-2.5 text-[11px] font-bold text-white disabled:opacity-40">
            <Download size={14}/> Download PNG
          </button>
        </div>
      </section>

      {/* RIGHT: Compact SVG size selector and exact typography settings. */}
      <section aria-label="Poster size and exact text settings"
        className="order-3 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ECE5E0] bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-[#F0EAE7] px-4 py-3">
          <h2 className="text-[13px] font-extrabold">Format & copy</h2>
          <span className="text-[10px] font-semibold text-[#A97C5D]">03 / Customize</span>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-visible px-4 py-3 xl:overflow-y-auto">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold">Export size</p>
              <span className="text-[10px] tabular-nums text-[#8E837E]">
                {dimensions.width} × {dimensions.height} px
              </span>
            </div>
            <PuterCompactFormatSelector selected={format} disabled={locked} onChange={setFormat}/>
          </div>
          <div className="space-y-2.5 border-t border-[#EEE8E5] pt-3">
            <div className="flex items-center gap-2">
              <SquarePen size={15} className="text-[#B46730]"/>
              <h3 className="text-[12px] font-extrabold">Exact poster copy</h3>
            </div>
            <p className="text-[10px] leading-4 text-[#907D75]">
              Your approved text is drawn with Unicode fonts, not spelled by the image model.
            </p>
            <div>
              <label htmlFor="puter-headline" className="mb-1 block text-[11px] font-semibold">Headline</label>
              <input id="puter-headline" value={headline} maxLength={120} disabled={generating}
                onChange={e=>{setHeadline(e.target.value);setManualHeadline(true);}}
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
            <div>
              <label htmlFor="puter-offer" className="mb-1 block text-[11px] font-semibold">Exact offer</label>
              <input id="puter-offer" value={offer} maxLength={60} disabled={generating}
                onChange={e=>setOffer(e.target.value)}
                placeholder="e.g. 30% OFF"
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
            <div>
              <label htmlFor="puter-cta" className="mb-1 block text-[11px] font-semibold">Call to action</label>
              <input id="puter-cta" value={cta} maxLength={105} disabled={generating}
                onChange={e=>{setCta(e.target.value);setManualCta(true);}}
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
          </div>
          <div className="space-y-2 border-t border-[#EEE8E5] pt-3">
            <p className="text-[11px] font-bold">Published business details</p>
            <p className="truncate text-[11px] font-semibold text-[#6B5D54]" title={facts?.name||''}>
              {facts?.name||'Choose your business'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label className="flex items-center gap-1.5 rounded-lg bg-[#F8F6F4] px-2 py-2">
                <input type="checkbox" checked={showPhone} disabled={generating||!facts?.phone}
                  onChange={e=>setShowPhone(e.target.checked)}/> Phone
              </label>
              <label className="flex items-center gap-1.5 rounded-lg bg-[#F8F6F4] px-2 py-2">
                <input type="checkbox" checked={showWebsite} disabled={generating||!facts?.website}
                  onChange={e=>setShowWebsite(e.target.checked)}/> Website
              </label>
            </div>
            {facts?.website&&<p className="break-all text-[10px] leading-4 text-[#91847E]">{facts.website}</p>}
          </div>
          <p className="text-[10px] leading-4 text-[#958781]">
            Editing headline, offer, CTA, contact visibility or size rebuilds the PNG locally without another Puter image call.
            Tamil/Sinhala fonts need network access; Qwen 2.1 is not verified through Puter.
          </p>
        </div>
      </section>
    </div>
  </main>;
}
