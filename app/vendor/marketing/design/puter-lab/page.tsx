'use client';
/* eslint-disable @next/next/no-img-element */
import './typography.css';
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
  return <main className="mx-auto max-w-[1320px] space-y-4 px-3 py-4 text-[#292327] sm:px-5">
    <Script src="https://js.puter.com/v2/" strategy="afterInteractive"
      onReady={()=>setSdkReady(true)}
      onError={()=>setError('Unable to load Puter.js. Check network restrictions.')}/>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-[#262125] p-3 text-[#F9B16F]"><FlaskConical size={20}/></span>
        <div><h1 className="text-lg font-extrabold">SLBI · Puter AI Poster Composer</h1>
          <p className="text-xs text-[#8C7F82]">Private owner QA · Gemini voice + verified business + exact typography</p></div>
      </div>
      <Link href="/vendor/marketing/design" className="inline-flex items-center gap-2 rounded-full border border-[#E8DED8] px-4 py-2 text-xs font-bold">
        <ArrowLeft size={14}/> Creative AI
      </Link>
    </div>
    <div className="rounded-2xl border border-[#F3D9BB] bg-[#FFF8EF] p-3 text-xs leading-5 text-[#94623C]">
      <ShieldCheck size={16} className="mr-2 inline-block align-text-bottom"/>
      Owner-only experiment. Puter real generation uses <strong>your Puter account allowance</strong> and may incur a charge.
      SLBI Growth Credits are not used here. No publishing or server-side image storage.
      Gemini transcript and creative brief use the existing shared daily voice/brief quota.
    </div>
    {(error||status)&&<div role={error?'alert':'status'} className={'rounded-xl border px-4 py-3 text-xs leading-5 '+
      (error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>
      {error||status}
    </div>}
    <div className="grid gap-4 lg:grid-cols-[minmax(350px,0.84fr)_minmax(0,1.16fr)]">
      <section aria-label="Poster creation controls" className="order-2 space-y-4 rounded-3xl border border-[#ECE5E0] bg-white p-4 lg:order-1 sm:p-5">
        <div>
          <label htmlFor="puter-business" className="mb-2 block text-xs font-bold">Verified selected business</label>
          <select id="puter-business" value={businessId} disabled={locked||loadingBusiness}
            onChange={e=>{
              setBusinessId(e.target.value);setBrief(null);setBriefKey('');
              setArtworkSrc('');setFinalBlob(null);setFinalUrl('');
              setHeadline('');setOffer('');setManualHeadline(false);
            }} className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-3 py-3 text-sm font-semibold">
            {!businesses.length&&<option value="">No owned business available</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {facts&&<div className="mt-2 rounded-xl bg-[#F9F7F5] p-3 text-xs leading-5 text-[#766C69]">
            <p><strong>Verified:</strong> {facts.name} · {facts.category||'Category not set'} {facts.city?'· '+facts.city:''}</p>
            {facts.website&&<p className="break-all">Website: {facts.website}</p>}
            {facts.phone&&<p>Business phone: {facts.phone}</p>}
          </div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="puter-language" className="mb-2 block text-xs font-bold">Poster language</label>
            <select id="puter-language" value={language} disabled={locked} onChange={e=>setLanguage(e.target.value as PosterCopyLanguage)}
              className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-3 py-3 text-xs">
              {(Object.entries(languageLabels) as Array<[PosterCopyLanguage,string]>)
                .map(([key,val])=><option key={key} value={key}>{val}</option>)}
            </select>
          </div>
          <div><label htmlFor="puter-model" className="mb-2 block text-xs font-bold">Artwork model</label>
            <select id="puter-model" value={model} disabled={locked}
              onChange={e=>setModel(e.target.value as ModelId)}
              className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-3 py-3 text-xs">
              {models.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="puter-prompt" className="mb-2 block text-xs font-bold">Describe your poster / Gemini voice transcript</label>
          <textarea id="puter-prompt" value={prompt} disabled={locked} rows={5} maxLength={1200}
            onChange={e=>{setPrompt(e.target.value);setBrief(null);setBriefKey('');}}
            placeholder="தமிழ் · සිංහල · English · Tanglish — describe your campaign."
            className="w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] p-3 text-sm leading-6 outline-none focus:border-[#EC9D68]"/>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={generating||geminiBusy||transcribing||!businessId}
              onClick={()=>void startVoice()}
              className={'inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold disabled:opacity-40 '+
                (recording?'border-red-300 bg-red-50 text-red-700':'border-[#E6DED9] bg-white')}>
              {recording?<StopCircle size={16}/>:<Mic size={16}/>}
              {recording?'Stop recording ('+recordingSeconds+'s)':'Voice message'}
            </button>
            <button type="button" disabled={locked||!businessId||prompt.trim().length<5}
              onClick={()=>void prepareWithGemini()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#292328] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">
              {geminiBusy?<LoaderCircle size={16} className="animate-spin"/>:<WandSparkles size={16}/>}
              Prepare with Gemini
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#9B8986]">
            You manually stop voice; Gemini adds an editable transcript, never auto-generates.
            Voice clips are limited to 1.5 MB. Gemini briefing uses another shared daily quota slot.
          </p>
          {currentBrief&&<p className="mt-2 rounded-xl border border-[#DDE8DC] bg-[#F5FAF5] p-3 text-xs leading-5 text-[#4C6951]">
            <CheckCircle2 size={14} className="mr-1 inline-block"/> Gemini creative brief prepared.
            Review the suggested copy below. Only non-textual art direction is sent to Puter.
          </p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold">Export format — exact download dimensions</p>
          <div className="grid grid-cols-2 gap-2">
            {formats.map(key=><button key={key} type="button" disabled={locked} aria-pressed={format===key}
              onClick={()=>setFormat(key)}
              className={'rounded-xl border px-3 py-2.5 text-left text-xs font-semibold '+
                (format===key?'border-orange-300 bg-orange-50 text-[#A35118]':'border-[#E8E1DE] bg-white text-[#746B6B]')}>
              {POSTER_FORMATS[key].label}
              <span className="block text-[10px] font-normal opacity-70">
                {POSTER_FORMATS[key].width}×{POSTER_FORMATS[key].height}
              </span>
            </button>)}
          </div>
        </div>
        <div className="space-y-3 border-t border-[#EEE8E5] pt-4">
          <div className="flex items-center gap-2"><SquarePen size={16} className="text-[#B46730]"/>
            <p className="text-sm font-extrabold">Exact poster copy</p></div>
          <p className="text-[11px] leading-5 text-[#907D75]">These words are drawn by Unicode fonts, not by the image model. Check spelling, percentage and terms before download.</p>
          <label htmlFor="puter-headline" className="block text-xs font-semibold">Headline</label>
          <input id="puter-headline" value={headline} maxLength={120} disabled={generating}
            onChange={e=>{setHeadline(e.target.value);setManualHeadline(true);}}
            className="w-full rounded-xl border border-[#E4DDDA] p-3 text-sm"/>
          <label htmlFor="puter-offer" className="block text-xs font-semibold">Exact offer (only if you approve it)</label>
          <input id="puter-offer" value={offer} maxLength={60} disabled={generating}
            onChange={e=>setOffer(e.target.value)}
            placeholder="Example: 30% OFF — no offer will be invented"
            className="w-full rounded-xl border border-[#E4DDDA] p-3 text-sm"/>
          <label htmlFor="puter-cta" className="block text-xs font-semibold">Call to action</label>
          <input id="puter-cta" value={cta} maxLength={105} disabled={generating}
            onChange={e=>{setCta(e.target.value);setManualCta(true);}}
            className="w-full rounded-xl border border-[#E4DDDA] p-3 text-sm"/>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showPhone} disabled={generating||!facts?.phone}
                onChange={e=>setShowPhone(e.target.checked)}/> Verified phone
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showWebsite} disabled={generating||!facts?.website}
                onChange={e=>setShowWebsite(e.target.checked)}/> Verified website
            </label>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl bg-[#F8F6F5] p-4">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={realMode} disabled={locked}
              onChange={e=>{setRealMode(e.target.checked);setConsent(false);}}/>
            Use real Puter image generation
          </label>
          <p className="text-[11px] leading-5 text-[#7C7471]">
            {realMode?'Real AI inference may use your Puter allowance or incur charges.':
              'Safe SDK test mode produces a sample, NOT a genuine image quality comparison.'}
          </p>
          {realMode&&<label className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-[#A45C23]">
            <input type="checkbox" checked={consent} disabled={locked} onChange={e=>setConsent(e.target.checked)}/>
            I understand this uses my Puter AI balance and may create a charge.
          </label>}
        </div>
        <button type="button" onClick={()=>void generate()}
          disabled={locked||!sdkReady||!facts||prompt.trim().length<5||!headline.trim()||(realMode&&!consent)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#262126] p-3.5 text-xs font-bold text-white disabled:opacity-40">
          {generating?<LoaderCircle size={17} className="animate-spin"/>:<FlaskConical size={17}/>}
          {generating?'Generating artwork…':realMode?'Generate real poster with Puter':'Generate no-credit poster sample'}
        </button>
      </section>
      <section aria-label="Exact AI poster preview" className="order-1 flex min-h-[450px] flex-col gap-3 rounded-3xl border border-[#E8E2E0] bg-[#F8F6F4] p-4 lg:order-2 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#B46A33]">Exact typography workspace</p>
            <h2 className="text-base font-extrabold">Your printable poster</h2></div>
          <span className="rounded-full bg-white px-3 py-2 text-[11px] font-bold text-[#796B66]">
            {dimensions.width} × {dimensions.height} PNG
          </span>
        </div>
        <div className="relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#EAE4DE] p-3 sm:p-5">
          {finalUrl?<img src={finalUrl} alt="Exact composed poster with verified business facts"
            className="block max-h-[72vh] max-w-full rounded-lg object-contain shadow-xl"
            style={{aspectRatio:dimensions.width+'/'+dimensions.height}}/>:
          <div className="flex flex-col items-center gap-3 text-center text-[#897E77]">
            <ImageIcon size={38}/>
            <p className="text-sm font-bold">Final high-resolution poster preview</p>
            <p className="max-w-[280px] text-xs leading-6">
              Choose your business, use voice or text, approve the copy and generate artwork.
              Your final PNG uses exactly the selected social-media dimensions.
            </p>
          </div>}
          {(generating||composing)&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm">
            <LoaderCircle size={28} className="animate-spin text-orange-500"/>
            <p className="text-xs font-bold text-[#6E5C51]">
              {generating?'Generating text-free artwork…':'Rendering exact typography…'}
            </p>
          </div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E1DE] pt-3">
          <p className="text-xs text-[#81736E]">
            {finalBlob?(isRealOutput?'Real Puter artwork + exact browser text':'SAMPLE image + exact browser text'):
              'Nothing is published or saved to SLBI automatically'}
          </p>
          <button type="button" onClick={download}
            disabled={!finalBlob||composing||generating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#262126] px-4 py-3 text-xs font-bold text-white disabled:opacity-40">
            <Download size={16}/> Download {dimensions.width}×{dimensions.height} PNG
          </button>
        </div>
        <p className="text-[11px] leading-5 text-[#9B8B84]">
          Editing headline, offer, CTA, contact visibility or size rebuilds the PNG locally without another Puter image call.
          Tamil/Sinhala fonts require network access; export will stop if they cannot load.
          Qwen version 2.1 is NOT verified through Puter.
        </p>
      </section>
    </div>
  </main>;
}
