'use client';
/* eslint-disable @next/next/no-img-element */
import './typography.css';
import './loading-motion.css';
import PuterReferenceGallery from './PuterReferenceGallery';
import PuterGenerationMotion,{type PosterGenerationStage} from './PuterGenerationMotion';
import PuterCompactFormatSelector from './PuterCompactFormatSelector';
import {resolvePremiumPosterPreset,withVerifiedPosterDesign} from '@/lib/marketing/poster-premium-presets';
import {
  posterSuggestions,shufflePosterDesign,selectLayout,SAFE_ZONE_LAYOUTS,
  CONTENT_PANEL_STYLES,DEFAULT_CONTENT_PANEL_STYLE,
  type ContentPanelStyle,type PosterBlueprint,type VerifiedPosterDesign,type SafeZoneLayout,
} from '@/lib/marketing/poster-design-blueprint';
import {
  getPosterReferenceStyle,originalReferencePng,
  type PosterReferenceStyle,type PosterStyleId,
} from '@/lib/marketing/poster-reference-library';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  ArrowLeft,ArrowRight,CheckCircle2,Download,FlaskConical,
  FileText,Image as ImageIcon,LoaderCircle,Mic,Pause,Play,Plus,
  Send,SquarePen,WandSparkles,Shuffle,X,
} from 'lucide-react';
import {POSTER_FORMATS,type PosterFormat} from '@/lib/marketing/poster-design';
import {
  buildArtOnlyPrompt,composeExactPoster,extractExplicitPercentage,
  type ExactPosterCopy,type PosterCopyLanguage,
} from '@/lib/marketing/puter-poster-composer';
import type {PosterBusinessFacts,PosterIntelligenceBrief} from '@/lib/marketing/poster-gemini-intelligence';
import {saveLinkedPoster} from '@/lib/marketing/caption-poster-handoff';
import {
  isPosterReferenceImage,posterReferenceFormData,preparePosterReferencePng,
  validatePosterReferences,withPosterReferenceSummary,
} from '@/lib/marketing/poster-composer-attachments';
import {
  STARTER_COPY,isPosterCopyInLanguage,isPosterTextInLanguage,isNaturalEnglishOffer,
  starterHeadline,localizedPercentOffer,posterLanguageName,
} from '@/lib/marketing/poster-language-copy';

type PuterClient={
  auth:{signIn:()=>Promise<unknown>;isSignedIn:()=>boolean};
  ai:{txt2img:(prompt:string,options:{model:string;test_mode:boolean;ratio?:{w:number;h:number};input_images?:Blob[]})=>Promise<HTMLImageElement>};
};
declare global {interface Window {puter?:PuterClient;}}
type OwnedBusiness={id:string;name:string;facts:PosterBusinessFacts};
type ApiError={error?:string};
type GeminiQuota={used:number;limit:number;remaining:number;dayUtc:string};
type ContextResponse=ApiError&{businesses?:OwnedBusiness[];quota?:GeminiQuota|null};
type BriefResponse=ApiError&{brief?:PosterIntelligenceBrief;blueprint?:PosterBlueprint};
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
  const [selectedReferenceId,setSelectedReferenceId]=useState<PosterStyleId|null>(null);
  const [sendReferenceImage,setSendReferenceImage]=useState(false);
  const [browseAllStyles,setBrowseAllStyles]=useState(false);
  const [browseReferences,setBrowseReferences]=useState(true);
  const [generationStage,setGenerationStage]=useState<PosterGenerationStage>('idle');
  const [estimatedProgress,setEstimatedProgress]=useState(0);
  const [imageRevision,setImageRevision]=useState(0);
  const [businesses,setBusinesses]=useState<OwnedBusiness[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [geminiQuota,setGeminiQuota]=useState<GeminiQuota|null>(null);
  const [loadingBusiness,setLoadingBusiness]=useState(true);
  const [model,setModel]=useState<ModelId>(models[0].id);
  const [format,setFormat]=useState<PosterFormat>('story');
  const [language,setLanguage]=useState<PosterCopyLanguage>('ta');
  const [prompt,setPrompt]=useState(samplePrompt);
  const [headline,setHeadline]=useState(STARTER_COPY.ta.headline);
  const [offer,setOffer]=useState('');
  const [cta,setCta]=useState(STARTER_COPY.ta.cta);
  const [showPhone,setShowPhone]=useState(true);
  const [showWebsite,setShowWebsite]=useState(true);
  const [showEmail,setShowEmail]=useState(true);
  const [manualHeadline,setManualHeadline]=useState(false);
  const [manualCta,setManualCta]=useState(false);
  const [manualOffer,setManualOffer]=useState(false);
  const [selectedSuggestionId,setSelectedSuggestionId]=useState('');
  const [blueprint,setBlueprint]=useState<PosterBlueprint|null>(null);
  const [blueprintKey,setBlueprintKey]=useState('');
  const [designOverride,setDesignOverride]=useState<VerifiedPosterDesign|null>(null);
  // Independent from Gemini typography and safe-zone geometry: this changes
  // only the existing bottom panel pixels, never the artwork or top headline.
  const [panelStyleOverride,setPanelStyleOverride]=useState<ContentPanelStyle|null>(null);
  const [shuffleIndex,setShuffleIndex]=useState(0);
  const [brief,setBrief]=useState<PosterIntelligenceBrief|null>(null);
  const [briefKey,setBriefKey]=useState('');
  const [geminiBusy,setGeminiBusy]=useState(false);
  const [referenceFiles,setReferenceFiles]=useState<File[]>([]);
  const [referenceSummary,setReferenceSummary]=useState('');
  const [referenceBusy,setReferenceBusy]=useState(false);
  const [useAttachedImage,setUseAttachedImage]=useState(false);
  const [recording,setRecording]=useState(false);
  const [voicePaused,setVoicePaused]=useState(false);
  const [voiceLevels,setVoiceLevels]=useState<number[]>(()=>Array.from({length:35},()=>5));
  const [recordingSeconds,setRecordingSeconds]=useState(0);
  const [transcribing,setTranscribing]=useState(false);
  const [realMode,setRealMode]=useState(false);
  const [consent,setConsent]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [composing,setComposing]=useState(false);
  const [artworkSrc,setArtworkSrc]=useState('');
  const [finalUrl,setFinalUrl]=useState('');
  const [finalBlob,setFinalBlob]=useState<Blob|null>(null);
  const [linkingCaption,setLinkingCaption]=useState(false);
  const [isRealOutput,setIsRealOutput]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const clockRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const attachInputRef=useRef<HTMLInputElement|null>(null);
  const discardVoiceRef=useRef(false);
  const voiceAudioRef=useRef<AudioContext|null>(null);
  const voiceFrameRef=useRef<number|null>(null);
  const finalUrlRef=useRef('');
  const selectedReference=getPosterReferenceStyle(selectedReferenceId);
  const selectedPremiumStyle=selectedReference?.id||'modern';
  const typographyPreset=resolvePremiumPosterPreset(selectedPremiumStyle);
  const business=businesses.find(b=>b.id===businessId);
  const facts=business?.facts;
  const currentKey=businessId+'|'+language+'|'+prompt.trim()+'|'+referenceSummary;
  const attachedImage=referenceFiles.find(isPosterReferenceImage)||null;
  const currentBrief=brief&&briefKey===currentKey?brief:null;
  const currentBlueprint=blueprint&&blueprintKey===currentKey?blueprint:null;
  const activeDesign=useMemo<VerifiedPosterDesign|null>(()=>designOverride||
    (currentBlueprint?{
      styling:currentBlueprint.styling,
      layout:selectLayout(format,currentBlueprint.styling.vibe),
      contentPanelStyle:currentBlueprint.layoutStyling?.contentPanelStyle,
    }:null),[designOverride,currentBlueprint,format]);
  const selectedPanelStyle=panelStyleOverride||
    activeDesign?.contentPanelStyle||DEFAULT_CONTENT_PANEL_STYLE;
  const displayedPreset=withVerifiedPosterDesign(typographyPreset,activeDesign,language);
  const suggestedCampaigns=useMemo(()=>posterSuggestions(new Date(),facts?.category||'',7),
    [facts?.category]);
  const dimensions=POSTER_FORMATS[format];
  const copyLanguageConsistent=isPosterCopyInLanguage(
    {headline,offerText:offer,ctaText:cta},language,
  );

  // Dual execution: once the owner reviews a JSON blueprint, warm the chosen
  // licensed fonts independently of the next image-model request.
  // Never fetch a model or use Puter allowance from this effect.
  useEffect(()=>{
    if(!activeDesign||typeof document==='undefined')return;
    const selected=activeDesign.styling;
    const sample=language==='ta'?'தமிழ் பொங்கல்':language==='si'?'සිංහල අලුත් අවුරුද්ද':'PREMIUM SALE';
    const displayWeight=['Anton','Bebas Neue','Kavivanar'].includes(selected.headlineFont)?400:700;
    void Promise.all([
      document.fonts.load(displayWeight+' 140px "'+selected.headlineFont+'"',sample),
      document.fonts.load('500 40px "'+selected.bodyFont+'"',sample),
    ]).catch(()=>{ /* Canvas export reports any missing font explicitly. */ });
  },[activeDesign,language]);

  // The provider has no progress callbacks. This is deliberately displayed
  // as an ESTIMATE, capped below 100 until a real PNG Blob is composed.
  useEffect(()=>{
    if(generationStage!=='artwork')return;
    const timer=setInterval(()=>setEstimatedProgress(value=>Math.min(89,value+(value<65?3:1))),900);
    return()=>clearInterval(timer);
  },[generationStage]);

  const clearReferenceSummary=()=>{
    setReferenceSummary('');
    setBlueprint(null);setBlueprintKey('');setBrief(null);setBriefKey('');
  };
  const attachReferences=(incoming:FileList|null)=>{
    if(!incoming?.length)return;
    const result=validatePosterReferences(referenceFiles,Array.from(incoming));
    if(!result.ok){setError(result.error);return;}
    setReferenceFiles(result.files);clearReferenceSummary();setError('');
    setStatus(result.files.length+' reference attachment(s) ready. Select Analyze references to include their context in Gemini.');
  };
  const removeReference=(index:number)=>{
    setReferenceFiles(previous=>previous.filter((_,i)=>i!==index));
    setUseAttachedImage(false);clearReferenceSummary();
  };
  const analyzeReferences=async()=>{
    if(referenceBusy||!businessId||!referenceFiles.length)return;
    const validation=validatePosterReferences([],referenceFiles);
    if(!validation.ok){setError(validation.error);return;}
    setReferenceBusy(true);setError('');
    setStatus('Gemini is analyzing attached image and document references…');
    try{
      const res=await fetch('/api/marketing/poster/references/analyze',{
        method:'POST',...reqOptions,
        body:posterReferenceFormData(businessId,referenceFiles),
      });
      const data=await res.json() as ApiError&{summary?:string;referenceOnly?:boolean};
      if(!res.ok||!data.summary||data.referenceOnly!==true)
        throw Error(data.error||'Could not analyze attached references.');
      setReferenceSummary(data.summary.slice(0,850));
      setBrief(null);setBriefKey('');setBlueprint(null);setBlueprintKey('');
      setStatus('Reference summary ready. Your documents and images were not stored in SLBI cloud storage.');
    }catch(e){setError(errorMessage(e));setStatus('Reference analysis was not applied. You can still use your original prompt.');}
    finally{setReferenceBusy(false);void refreshGeminiQuota();}
  };
  const chooseSuggestion=(suggestion:{id:string;label:string;prompt:string})=>{
    // Chips stage the owner's idea only; NEVER invoke Gemini or paid Puter.
    setSelectedSuggestionId(suggestion.id);
    setPrompt(previous=>previous===samplePrompt||!previous.trim()?suggestion.prompt:
      (previous+'\n'+suggestion.prompt).slice(0,1200));
    setBlueprint(null);setBlueprintKey('');setBrief(null);setBriefKey('');
    setDesignOverride(null);setShuffleIndex(0);
    const matching=getPosterReferenceStyle(suggestion.id as PosterStyleId);
    if(matching){
      setSelectedReferenceId(matching.id);setSendReferenceImage(false);
      if(!manualHeadline)setHeadline(starterHeadline(language,matching.id));
    }
    setStatus(suggestion.label+' staged as an editable suggestion. Review before Prepare with Gemini.');
  };
  const chooseReference=(reference:PosterReferenceStyle)=>{
    setSelectedReferenceId(reference.id);
    setSendReferenceImage(false);
    if(prompt===samplePrompt||!prompt.trim()){
      setPrompt('Create a premium '+reference.name+' visual campaign for my selected business. Modern, tasteful, professional quality.');
      setBrief(null);setBriefKey('');
    }
    if(!manualHeadline)
      setHeadline(starterHeadline(language,reference.id));
    setStatus(reference.name+' selected. The look is applied on your NEXT Generate; no paid AI call happened.');
  };

  const cleanVoiceMeter=useCallback(()=>{
    if(voiceFrameRef.current!==null)cancelAnimationFrame(voiceFrameRef.current);
    voiceFrameRef.current=null;
    if(voiceAudioRef.current){
      void voiceAudioRef.current.close().catch(()=>{});
      voiceAudioRef.current=null;
    }
  },[]);
  const stopVoice=useCallback(()=>{
    if(clockRef.current){clearInterval(clockRef.current);clockRef.current=null;}
    const recorder=recorderRef.current;
    if(recorder&&(recorder.state==='recording'||recorder.state==='paused'))recorder.stop();
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;setRecording(false);setVoicePaused(false);
    cleanVoiceMeter();
  },[cleanVoiceMeter]);
  const cancelVoice=()=>{
    discardVoiceRef.current=true;stopVoice();
    setStatus('Voice recording discarded. Your original campaign brief is unchanged.');
  };
  const pauseVoice=()=>{
    const rec=recorderRef.current;
    if(rec?.state==='recording'){
      rec.pause();setVoicePaused(true);
      setStatus('Recording paused. Resume or send to transcribe.');
    }else if(rec?.state==='paused'){
      rec.resume();setVoicePaused(false);
      setStatus('Recording resumed. Tap Send when you are done.');
    }
  };
  const refreshGeminiQuota=useCallback(async()=>{
    try{
      const res=await fetch('/api/marketing/poster/puter-lab?quota=1',reqOptions);
      const data=await res.json() as {quota?:GeminiQuota};
      if(res.ok&&data.quota)setGeminiQuota(data.quota);
    }catch{/* Quota display is advisory; the server's atomic RPC is authoritative. */}
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    void fetch('/api/marketing/poster/puter-lab',{...reqOptions,signal:controller.signal})
      .then(async res=>{
        const value=await res.json() as ContextResponse;
        if(!res.ok)throw Error(value.error||'Could not load owned business details.');
        return value;
      }).then(value=>{
        if(controller.signal.aborted)return;
        const items=value.businesses||[];
        setBusinesses(items);setBusinessId(items[0]?.id||'');
        if(value.quota)setGeminiQuota(value.quota);
      }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));})
      .finally(()=>{if(!controller.signal.aborted)setLoadingBusiness(false);});
    return()=>controller.abort();
  },[]);
  useEffect(()=>()=>{
    discardVoiceRef.current=true;stopVoice();
    if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);
  },[stopVoice]);

  const exactCopy=useMemo<ExactPosterCopy|null>(()=>facts?{
    businessName:facts.name,
    headline:headline.trim(),
    offer:offer.trim(),
    service:facts.category,
    cta:cta.trim(),
    phone:showPhone?facts.phone:'',
    website:showWebsite?facts.website:'',
    email:showEmail?facts.email:'',
    accentColor:facts.primaryColor||'#F7B45C',
    language,
  }:null,[facts,headline,offer,cta,showPhone,showWebsite,showEmail,language]);

  // Recompose typography at the exact selected PNG dimensions. Changing text,
  // format or contact options never triggers a new billable Puter request.
  useEffect(()=>{
    if(!artworkSrc||!exactCopy||!copyLanguageConsistent)return;
    let cancelled=false;
    setComposing(true);setGenerationStage('typography');setEstimatedProgress(94);setError('');
    const timeout=setTimeout(()=>{
      void composeExactPoster({backgroundSrc:artworkSrc,format,copy:exactCopy,
        style:selectedPremiumStyle,design:activeDesign,contentPanelStyle:selectedPanelStyle})
        .then(blob=>{
          if(cancelled)return;
          const url=URL.createObjectURL(blob);
          if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);
          finalUrlRef.current=url;setFinalBlob(blob);setFinalUrl(url);
          setEstimatedProgress(100);setGenerationStage('ready');
          setStatus(isRealOutput?
            'Exact-text poster composed at '+dimensions.width+'×'+dimensions.height+' PNG. Ready to download.':
            'No-credit SAMPLE composed for layout testing. It does not measure model quality.');
        })
        .catch(e=>{if(!cancelled){setFinalBlob(null);setGenerationStage('error');setError(errorMessage(e));}})
        .finally(()=>{if(!cancelled)setComposing(false);});
    },220);
    return()=>{cancelled=true;clearTimeout(timeout);};
  },[artworkSrc,imageRevision,format,exactCopy,copyLanguageConsistent,selectedPremiumStyle,activeDesign,selectedPanelStyle,isRealOutput,dimensions.width,dimensions.height]);
  useEffect(()=>{
    if(copyLanguageConsistent||!finalUrlRef.current)return;
    URL.revokeObjectURL(finalUrlRef.current);finalUrlRef.current='';
    setFinalUrl('');setFinalBlob(null);
  },[copyLanguageConsistent]);

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
      const explicit=extractExplicitPercentage(heard);
      if(explicit&&!manualOffer)setOffer(localizedPercentOffer(explicit,language));
      setBrief(null);setBriefKey('');
      setStatus('Gemini transcript added. Check the words, campaign offer and business details before continuing.');
    }catch(e){setError(errorMessage(e));}
    finally{setTranscribing(false);void refreshGeminiQuota();}
  };
  const startVoice=async()=>{
    if(recording||generating||geminiBusy||transcribing||referenceBusy)return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setError('Voice requires a supported browser and HTTPS. You can type your prompt instead.');return;
    }
    const policy=document as Document&{
      permissionsPolicy?:{allowsFeature:(v:string)=>boolean};
      featurePolicy?:{allowsFeature:(v:string)=>boolean};
    };
    const allowed=policy.permissionsPolicy?.allowsFeature('microphone') ??
      policy.featurePolicy?.allowsFeature('microphone');
    if(allowed===false){
      setError('Microphone is blocked by this page. Reload and enable it in browser site settings.');return;
    }
    try{
      setError('');
      // Browser permission is requested only on a direct user click.
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4']
        .find(v=>MediaRecorder.isTypeSupported(v));
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      streamRef.current=stream;recorderRef.current=rec;discardVoiceRef.current=false;
      const chunks:BlobPart[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        streamRef.current=null;recorderRef.current=null;
        if(clockRef.current){clearInterval(clockRef.current);clockRef.current=null;}
        cleanVoiceMeter();setRecording(false);setVoicePaused(false);
        if(discardVoiceRef.current)return;
        const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});
        if(blob.size<800){setError('No usable audio. Speak for a few seconds and tap Send.');return;}
        void transcribe(blob);
      };
      rec.onerror=()=>{
        discardVoiceRef.current=true;
        setError('Microphone failed. Check your device, then try again.');
        stopVoice();
      };
      rec.start(250);setRecordingSeconds(0);setVoicePaused(false);setRecording(true);
      clockRef.current=setInterval(()=>{
        if(rec.state==='recording')setRecordingSeconds(n=>n+1);
      },1000);
      // Real microphone amplitude, not a misleading synthetic audio animation.
      // Metering stays entirely in the browser and is stopped after recording.
      try{
        const audio=new AudioContext();
        voiceAudioRef.current=audio;
        const analyser=audio.createAnalyser();analyser.fftSize=128;
        const source=audio.createMediaStreamSource(stream);source.connect(analyser);
        const bins=new Uint8Array(analyser.frequencyBinCount);
        let lastUpdate=0;
        const tick=(now:number)=>{
          if(rec.state==='recording'&&now-lastUpdate>=90){
            lastUpdate=now;
            analyser.getByteFrequencyData(bins);
            setVoiceLevels(Array.from({length:35},(_,i)=>{
              const bin=bins[Math.min(bins.length-1,Math.floor(i*bins.length/35))];
              return Math.max(5,Math.min(37,Math.round(5+bin/255*32)));
            }));
          }
          if(rec.state!=='inactive')voiceFrameRef.current=requestAnimationFrame(tick);
        };
        voiceFrameRef.current=requestAnimationFrame(tick);
      }catch{/* Recording stays usable even if live audio metering is unavailable. */}
      setStatus('Recording. Pause or tap Send to transcribe in your original language.');
    }catch(e){
      streamRef.current?.getTracks().forEach(t=>t.stop());
      streamRef.current=null;recorderRef.current=null;cleanVoiceMeter();
      const name=e instanceof Error?e.name:'';
      setError(name==='NotAllowedError'||name==='SecurityError'?
        'Microphone permission denied. Chrome site controls → Microphone → Allow, then retry.':
        name==='NotFoundError'?'No microphone detected. Check your recording device.':
        'Unable to open microphone. Check your recording device or type instead.');
    }
  };
  const prepareWithGemini=async()=>{
    if(!businessId||prompt.trim().length<5){setError('Choose a business and enter a prompt.');return;}
    if(geminiBusy||recording||transcribing||generating||referenceBusy)return;
    setGeminiBusy(true);setError('');setStatus('Gemini is understanding your campaign and verified business facts…');
    const forKey=currentKey;
    try{
      const res=await fetch('/api/marketing/poster/puter-lab',{
        method:'POST',...reqOptions,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          businessId,prompt:withPosterReferenceSummary(prompt,referenceSummary),language,
          format,mode:'blueprint',campaignStyle:selectedSuggestionId,
          approvedOffer:manualOffer?offer.trim():'',
        }),
      });
      const data=await res.json() as BriefResponse;
      if(!res.ok)throw Error(data.error||'Gemini could not prepare this design blueprint.');
      if(forKey!==businessId+'|'+language+'|'+prompt.trim()+'|'+referenceSummary)return;
      if(data.blueprint){
        // Dual-output: creative art direction + reviewed typography JSON.
        // Business contacts always remain from the selected verified listing.
        setBlueprint(data.blueprint);setBlueprintKey(forKey);
        setDesignOverride(null);setPanelStyleOverride(null);setShuffleIndex(0);
        // A previously reviewed English draft must NOT override a fresh Tamil
        // or Sinhala blueprint. Preserve manual copy ONLY if it already matches
        // the newly selected output language.
        if(!manualHeadline||!isPosterTextInLanguage(headline,language)){
          setHeadline(data.blueprint.posterCopy.headline);setManualHeadline(false);
        }
        if(!manualCta||!isPosterTextInLanguage(cta,language)){
          setCta(data.blueprint.posterCopy.ctaText);setManualCta(false);
        }
        if(!manualOffer||!isPosterTextInLanguage(offer,language)||
           (language==='en'&&!isNaturalEnglishOffer(offer))){
          setOffer(data.blueprint.posterCopy.offerText);setManualOffer(false);
        }
        setStatus('Gemini design blueprint ready. Review the headline, exact offer and CTA before any Puter generation.');
      }else if(data.brief){
        // Backward compatibility for an older brief response.
        setBrief(data.brief);setBriefKey(forKey);
        if(!manualHeadline&&data.brief.suggestedHeadline)
          setHeadline(data.brief.suggestedHeadline);
        if(!manualCta&&data.brief.suggestedCallToAction)
          setCta(data.brief.suggestedCallToAction);
        setOffer(prev=>prev||extractExplicitPercentage(prompt));
        setStatus('Gemini brief ready. Review the text before using Puter.');
      }else throw Error('Gemini returned no valid design blueprint.');
    }catch(e){setError(errorMessage(e));}
    finally{setGeminiBusy(false);void refreshGeminiQuota();}
  };
  const generate=async()=>{
    if(!sdkReady||!window.puter){setError('Puter.js is not ready. Reload and retry.');return;}
    if(!facts||!businessId){setError('Choose a verified owned business first.');return;}
    if(recording||transcribing||geminiBusy||generating||referenceBusy)return;
    if(prompt.trim().length<5||!headline.trim()){
      setError('Enter your campaign idea and an exact headline for the poster.');return;
    }
    if(!copyLanguageConsistent){
      setError('Poster headline, offer and CTA must all match '+posterLanguageName(language)+
        '. Edit the exact fields or use Prepare with Gemini before generating.');
      return;
    }
    if(realMode&&!consent){setError('Please explicitly confirm possible Puter charges.');return;}
    setGenerating(true);setComposing(false);setError('');
    setGenerationStage('connecting');setEstimatedProgress(7);
    setStatus('SLBI Image Generator is preparing your poster artwork…');
    try{
      const puter=window.puter;
      // Official Puter browser SDK persists its own session. Do not reopen the
      // auth popup for every generation while the session is still valid.
      if(!puter.auth.isSignedIn())await puter.auth.signIn();
      setGenerationStage('artwork');setEstimatedProgress(18);
      const styleDirection=selectedReference?.artDirection||typographyPreset.artDirective;
      const briefDirection=currentBlueprint?.imagePrompt||currentBrief?.creativeDirectionEnglish;
      const creative=buildArtOnlyPrompt({
        request:withPosterReferenceSummary(prompt,referenceSummary),styleDirection,creativeDirection:briefDirection,
        businessCategory:facts.category,city:facts.city,
        brandColor:facts.primaryColor||'#F7B45C',format,
      });
      const options:{model:string;test_mode:boolean;ratio?:{w:number;h:number};input_images?:Blob[]}={
        model,test_mode:!realMode,
      };
      // The ratio option is documented for Gemini and GPT; the other providers
      // use their default sizes and get safely cropped into exact final ratios.
      if(model.startsWith('openai/')||model.startsWith('google/'))
        options.ratio=ratioFor(format);
      // No reference uploads by default; the user must opt in independently.
      // Puter supports input_images for all image providers (PNG Blob).
      if(useAttachedImage&&attachedImage)
        options.input_images=[await preparePosterReferencePng(attachedImage)];
      else if(sendReferenceImage&&selectedReference)
        options.input_images=[await originalReferencePng(selectedReference.thumbnail)];
      const image=await puter.ai.txt2img(creative,options);
      if(!image?.src||typeof image.src!=='string')
        throw Error('Puter returned no image. No printable poster was prepared.');
      setArtworkSrc(image.src);setImageRevision(n=>n+1);setIsRealOutput(realMode);
      setGenerationStage('typography');setEstimatedProgress(94);setBrowseReferences(false);
      setStatus(realMode?'SLBI artwork ready. Applying your exact approved copy…':
        'Sample artwork ready. Composing a sample poster at exact size…');
    }catch(e){setGenerationStage('error');setError(errorMessage(e));setStatus('Generation failed; previous poster remains available.');}
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
  const continueToCaption=async()=>{
    if(!finalBlob||!facts||!businessId||composing||linkingCaption)return;
    setLinkingCaption(true);setError('');
    try{
      const id=await saveLinkedPoster({
        businessId,businessName:facts.name,category:facts.category,
        city:facts.city,address:facts.address,
        phone:facts.phone,website:facts.website,
        headline:headline.trim(),offer:offer.trim(),cta:cta.trim(),
        vibe:currentBlueprint?.styling.vibe||selectedPremiumStyle,
        language,source:'poster_studio',sample:!isRealOutput,format,
      },finalBlob);
      // This is a user-initiated navigation only. No paid caption
      // model is called without the Caption Lab Generate action.
      window.location.assign('/vendor/marketing/captions?handoff='+encodeURIComponent(id));
    }catch(e){setError(errorMessage(e));setLinkingCaption(false);}
  };
  const locked=generating||geminiBusy||transcribing||recording||referenceBusy;
  return <main className="mx-auto flex w-full max-w-[1620px] flex-col gap-3 px-3 py-3 text-[#292327] sm:px-5 xl:h-[calc(100dvh-9.5rem)] xl:min-h-0 xl:overflow-hidden xl:py-2">
    <Script src="https://js.puter.com/v2/" strategy="afterInteractive"
      onReady={()=>setSdkReady(true)}
      onError={()=>setError('Unable to load Puter.js. Check network restrictions.')}/>
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="rounded-xl bg-[#262125] p-2.5 text-[#F9B16F]"><FlaskConical size={18}/></span>
        <div>
          <h1 className="text-base font-extrabold leading-5 sm:text-lg">SLBI AI Poster Studio</h1>
          <p className="text-[11px] leading-4 text-[#8C7F82]">Voice · Multilingual design · High-resolution posters</p>
        </div>
      </div>
      <Link href="/vendor/marketing"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8DED8] px-3 py-2 text-[11px] font-bold hover:bg-[#FAF7F4]">
        <ArrowLeft size={13}/> Marketing Studio
      </Link>
    </header>
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
                setReferenceFiles([]);setReferenceSummary('');setUseAttachedImage(false);
                setArtworkSrc('');setFinalBlob(null);setFinalUrl('');
                setHeadline(starterHeadline(language,selectedReferenceId));setOffer('');
                setCta(STARTER_COPY[language].cta);
                setManualHeadline(false);setManualOffer(false);setManualCta(false);
                setBlueprint(null);setBlueprintKey('');setDesignOverride(null);setShuffleIndex(0);
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
                onChange={e=>{
                  const next=e.target.value as PosterCopyLanguage;
                  if(next===language)return;
                  setLanguage(next);
                  // Leave explicitly typed copy untouched, but prevent mixed-
                  // language Generate until it is translated/reviewed.
                  if(!manualHeadline)setHeadline(starterHeadline(next,selectedReferenceId));
                  if(!manualCta)setCta(STARTER_COPY[next].cta);
                  if(!manualOffer)setOffer('');
                  setBrief(null);setBriefKey('');
                  setBlueprint(null);setBlueprintKey('');
                  setDesignOverride(null);setShuffleIndex(0);
                  setStatus('Poster language set to '+posterLanguageName(next)+
                    '. Review all copy or click Prepare with Gemini to localize it.');
                }}
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
          {/* Attached media, prompt and dictation share one compact composer. */}
          <div>
            <label htmlFor="puter-prompt" className="mb-1.5 block text-[11px] font-bold">
              Describe your poster / voice transcript
            </label>
            <div className="overflow-hidden rounded-2xl border border-[#E5DDD7] bg-[#FDFBF9] transition-colors focus-within:border-[#F3A56D] focus-within:ring-2 focus-within:ring-[#F97316]/10">
              <textarea id="puter-prompt" value={prompt} disabled={locked} rows={5} maxLength={1200}
                onChange={e=>{setPrompt(e.target.value);setBrief(null);setBriefKey('');
                  setBlueprint(null);setBlueprintKey('');}}
                placeholder="தமிழ் · සිංහල · English · Tanglish — describe your campaign."
                className="max-h-[190px] min-h-[110px] w-full resize-none border-0 bg-transparent px-3.5 pt-3.5 pb-1 text-[12px] leading-5 outline-none disabled:opacity-60"/>
              {referenceFiles.length>0&&<div className="flex flex-wrap gap-1.5 px-3 pb-2"
                aria-label="Attached reference files">
                {referenceFiles.map((file,index)=><div key={file.name+'-'+index}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E8DDD4] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#584A45]">
                  {isPosterReferenceImage(file)?<ImageIcon size={13} className="shrink-0 text-[#AD6B38]"/>:
                    <FileText size={13} className="shrink-0 text-[#AD6B38]"/>}
                  <span className="max-w-[125px] truncate" title={file.name}>{file.name}</span>
                  <button type="button" aria-label={'Remove '+file.name}
                    disabled={locked} onClick={()=>removeReference(index)}
                    className="rounded p-0.5 text-[#897770] hover:bg-[#F4EDE7] disabled:opacity-40">
                    <X size={12}/>
                  </button>
                </div>)}
              </div>}
              {referenceSummary&&<details className="mx-3 mb-2 rounded-lg border border-[#DCEBDD] bg-[#F4FBF4] px-2.5 py-2 text-[10px] text-[#3D6546]">
                <summary className="cursor-pointer font-semibold">References analyzed · View creative context</summary>
                <p className="mt-1.5 whitespace-pre-wrap leading-4">{referenceSummary}</p>
              </details>}
              {recording?<div role="status" aria-label="Recording voice message"
                className="mx-2.5 mb-2.5 flex min-w-0 items-center gap-2 rounded-xl bg-[#242124] px-2.5 py-2.5 text-white">
                <button type="button" onClick={cancelVoice} aria-label="Discard voice recording" title="Discard recording"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
                  <X size={17}/>
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex h-9 items-center justify-between gap-[2px] overflow-hidden"
                    aria-label="Live microphone waveform">
                    {voiceLevels.map((level,i)=><span key={i}
                      className={'w-[3px] min-w-[2px] flex-1 rounded-full transition-[height] duration-75 '+
                        (voicePaused?'bg-white/40':'bg-[#FDBA74]')}
                      style={{height:voicePaused?5:level}}/>)}
                  </div>
                  <p className="text-center text-[9px] tabular-nums text-[#E9D9CE]">
                    {voicePaused?'Paused':'Recording'} · {Math.floor(recordingSeconds/60).toString().padStart(2,'0')}:
                    {(recordingSeconds%60).toString().padStart(2,'0')}
                  </p>
                </div>
                <button type="button" onClick={pauseVoice} title={voicePaused?'Resume recording':'Pause recording'}
                  aria-label={voicePaused?'Resume voice recording':'Pause voice recording'}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20">
                  {voicePaused?<Play size={15}/>:<Pause size={15}/>}
                </button>
                <button type="button" onClick={()=>stopVoice()} aria-label="Send recording to transcript"
                  title="Send to Gemini transcription"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]">
                  <Send size={16}/>
                </button>
              </div>:<div className="flex items-center justify-between gap-2 border-t border-[#EEE5DE] px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <input ref={attachInputRef} type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,.png,.jpg,.jpeg,.webp,.pdf,.txt,.md"
                    multiple className="sr-only" aria-label="Attach images or documents"
                    onChange={e=>{attachReferences(e.currentTarget.files);e.currentTarget.value='';}}/>
                  <button type="button" onClick={()=>attachInputRef.current?.click()}
                    disabled={locked||referenceFiles.length>=4||!businessId}
                    aria-label="Attach images or documents" title="Attach images, PDF or text documents"
                    className="flex size-8 items-center justify-center rounded-full border border-[#E8DDD3] bg-white text-[#594D47] transition-colors hover:border-[#F3A56D] hover:text-[#C65C19] disabled:opacity-40">
                    <Plus size={17}/>
                  </button>
                  {referenceFiles.length>0&&<button type="button" onClick={()=>void analyzeReferences()}
                    disabled={locked||!businessId} title="Analyze image / document references with Gemini (uses shared allowance)"
                    aria-label="Analyze attached references with Gemini"
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E8DDD3] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#A95B28] disabled:opacity-40">
                    {referenceBusy?<LoaderCircle size={13} className="animate-spin"/>:<FileText size={13}/>}
                    Analyze {referenceFiles.length}
                  </button>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {transcribing?<span role="status" aria-live="polite"
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#AC5F2A]">
                    <LoaderCircle size={14} className="animate-spin"/> Transcribing…
                  </span>:<button type="button" onClick={()=>void startVoice()} disabled={locked||!businessId}
                    aria-label="Record voice message" title="Record voice message"
                    className="flex size-8 items-center justify-center rounded-full border border-[#E8DDD3] bg-white text-[#594D47] hover:border-[#F3A56D] hover:text-[#C65C19] disabled:opacity-40">
                    <Mic size={17}/>
                  </button>}
                  <button type="button" onClick={()=>void prepareWithGemini()}
                    disabled={locked||!businessId||prompt.trim().length<5}
                    aria-label="Prepare poster with Gemini" title="Prepare art direction and typography with Gemini"
                    className="flex size-8 items-center justify-center rounded-full bg-[#262126] text-white hover:bg-[#493B3E] disabled:bg-[#E7E1DD] disabled:text-[#AAA19B]">
                    {geminiBusy?<LoaderCircle size={16} className="animate-spin"/>:
                      <WandSparkles size={16}/>}
                  </button>
                </div>
              </div>}
            </div>
            {attachedImage&&<label className="mt-2 flex items-start gap-2 rounded-lg bg-[#F8F4F0] p-2 text-[10px] leading-4 text-[#75655B]">
              <input type="checkbox" checked={useAttachedImage} disabled={locked}
                onChange={e=>setUseAttachedImage(e.target.checked)} className="mt-0.5 accent-[#F97316]"/>
              <span>Use the first attached image as an artwork reference on Generate.
                Off by default; documents are never sent to the image model.</span>
            </label>}
            {referenceFiles.length>0&&!referenceSummary&&<p className="mt-1.5 text-[10px] leading-4 text-[#8C7E75]">
              Files stay on this device until you select Analyze. Analysis uses one Gemini voice/brief request.
            </p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold text-[#6B5E55]">Quick campaign ideas</p>
              <span className="text-[9px] text-[#988A81]">Click to edit · no AI call</span>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Seasonal and category-aware campaign suggestions">
              {suggestedCampaigns.map(suggestion=><button key={suggestion.id} type="button"
                disabled={locked} aria-pressed={selectedSuggestionId===suggestion.id}
                title={suggestion.prompt}
                onClick={()=>chooseSuggestion(suggestion)}
                className={'rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-colors disabled:opacity-50 '+
                  (selectedSuggestionId===suggestion.id?
                    'border-[#F08C42] bg-[#FFF0E1] text-[#9C4C16]':
                    'border-[#E7DEDA] bg-white text-[#75685F] hover:border-[#E0AB83]')}>
                {suggestion.label}
              </button>)}
            </div>
          </div>
          {(currentBrief||currentBlueprint)&&<div className="flex items-start gap-1.5 rounded-xl border border-[#DDE8DC] bg-[#F5FAF5] p-2 text-[11px] leading-4 text-[#4C6951]">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0"/>
            Gemini {currentBlueprint?'art direction + typography blueprint':'brief'} prepared. Review exact headline, offer and CTA in the right panel.
          </div>}
          {geminiQuota&&<div role="status" aria-label="Shared Gemini daily quota"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8DFD8] bg-[#FFF9F3] px-2.5 py-2 text-[10px]">
            <span className="font-semibold text-[#6D5440]">Gemini voice + design briefs</span>
            <span className={'tabular-nums font-bold '+(geminiQuota.remaining?
              'text-[#8A471A]':'text-[#B42318]')}>
              {geminiQuota.remaining} / {geminiQuota.limit} requests left (UTC)
            </span>
            <p className="w-full text-[#827166]">
              Resets at 00:00 UTC. Separate from SLBI Growth Credits and Puter image usage.
            </p>
          </div>}
          <p className="text-[10px] leading-4 text-[#958681]">
            Tap the mic to record, pause/resume, then Send to transcribe. Your transcript stays editable.
            Audio limit: 1.5 MB. Recording never triggers image generation.
          </p>
        </div>
        <div className="shrink-0 space-y-2 border-t border-[#EEE8E5] bg-[#FDFBF9] p-3">
          <label className="flex items-center gap-2 text-[11px] font-bold">
            <input type="checkbox" checked={realMode} disabled={locked}
              onChange={e=>{setRealMode(e.target.checked);setConsent(false);}}/>
            Use SLBI Image Generator
          </label>
          {realMode?<label className="flex items-start gap-2 text-[10px] font-semibold leading-4 text-[#A45C23]">
            <input type="checkbox" checked={consent} disabled={locked}
              onChange={e=>setConsent(e.target.checked)}/>
            I understand SLBI currently renders real images through my connected Puter account, which may charge its own AI balance.
          </label>:<p className="text-[10px] leading-4 text-[#8C7F79]">
            Default is a no-credit sample, not a real AI quality test.
          </p>}
          <button type="button" onClick={()=>void generate()}
            disabled={locked||!sdkReady||!facts||prompt.trim().length<5||!headline.trim()||(realMode&&!consent)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#262126] px-3 py-3 text-[11px] font-bold text-white disabled:opacity-40">
            {generating?<LoaderCircle size={16} className="animate-spin"/>:<FlaskConical size={16}/>}
            {generating?'Generating artwork…':realMode?'Generate with SLBI Image Generator':'Preview poster sample'}
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
          {finalUrl&&!browseReferences?<img src={finalUrl} alt="Exact composed poster with verified business facts"
            className="block h-full w-full max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(24,22,25,.17)]"
            style={{aspectRatio:dimensions.width+'/'+dimensions.height}}/>:
          <PuterReferenceGallery
            chosen={selectedReferenceId}
            onChoose={chooseReference}
            showAll={browseAllStyles}
            onToggleAll={()=>setBrowseAllStyles(value=>!value)}/>}
          {(generating||composing)&&<PuterGenerationMotion
            stage={generationStage}
            percentage={estimatedProgress}
            reference={selectedReference}/>} 
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E7E1DE] pt-2.5">
          <p className="min-w-0 flex-1 text-[10px] leading-4 text-[#81736E]">
            {finalBlob?(isRealOutput?'Real artwork · exact browser text':'No-credit SAMPLE · exact text'):
              'No automatic publishing or SLBI storage'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={download} disabled={!finalBlob||composing||generating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E6DED8] bg-white px-3 py-2.5 text-[11px] font-bold text-[#292327] disabled:opacity-40">
              <Download size={14}/> Download PNG
            </button>
            <button type="button" onClick={()=>void continueToCaption()}
              disabled={!finalBlob||composing||generating||linkingCaption||!businessId}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#262126] px-3 py-2.5 text-[11px] font-bold text-white disabled:opacity-40">
              <WandSparkles size={14} className="text-[#FDBA74]"/>
              {linkingCaption?'Linking poster…':'Write Caption for this Poster'}
              <ArrowRight size={13}/>
            </button>
          </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold">Campaign reference</p>
              <button type="button" onClick={()=>setBrowseReferences(value=>!value)}
                disabled={generating||composing}
                className="rounded-lg border border-[#E5D8CC] px-2 py-1 text-[10px] font-semibold text-[#8D572D] disabled:opacity-50">
                {browseReferences&&finalUrl?'View poster':'Browse styles'}
              </button>
            </div>
            <p className="text-[11px] text-[#756A65]">
              {selectedReference?selectedReference.name+' · applied to the next generation':'Choose an example in the center to guide your next artwork.'}
            </p>
            {selectedReference&&<label className="flex items-start gap-2 rounded-lg bg-[#F7F4F1] px-2.5 py-2 text-[10px] leading-4 text-[#77665D]">
              <input type="checkbox" checked={sendReferenceImage}
                disabled={locked} onChange={e=>setSendReferenceImage(e.target.checked)}/>
              <span>Also send this original preview image to Puter as an image-to-image reference.
                Otherwise use its hidden style directions only.</span>
            </label>}
          </div>
          <div className="space-y-2 rounded-xl border border-[#F0E4DC] bg-[#FBF8F5] px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-[#352B2D]">Premium typography preset</p>
              <span className="text-[10px] font-semibold text-[#98633A]">{typographyPreset.label}</span>
            </div>
            <p className="text-[10px] leading-4 text-[#7F7471]">
              {activeDesign?activeDesign.styling.headlineFont+' display · '+activeDesign.styling.bodyFont+' body':
                language==='en'?'Anton display · Space Grotesk brand · Plus Jakarta offer · Inter text':
                'Noto '+(language==='ta'?'Tamil':'Sinhala')+' display + body · Unicode-safe'}
            </p>
            <div className="flex items-center gap-1.5" aria-label="Selected poster palette">
              {[displayedPreset.palette.obsidian,displayedPreset.palette.ambient,
                displayedPreset.palette.accent,displayedPreset.palette.glow,displayedPreset.palette.violet]
                .map((color,index)=><span key={index} title={color}
                  className="h-4 w-6 rounded-md border border-black/10"
                  style={{backgroundColor:color}}/>)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={()=>{
                const next=shuffleIndex+1;
                setDesignOverride(shufflePosterDesign(activeDesign,language,next,format));
                setShuffleIndex(next);
                setStatus('Font, palette and safe-zone layout changed locally. No Puter credit was used.');
              }} disabled={locked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#292328] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
                <Shuffle size={13}/> Shuffle font & colors
              </button>
              <span className="text-[9px] text-[#8C7E77]">No image regeneration</span>
            </div>
            <div>
              <label htmlFor="puter-panel-style" className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#6C5F58]">
                <span>Bottom content panel style</span>
                <span className="font-medium text-[#A36A42]">PNG styling only</span>
              </label>
              <select id="puter-panel-style" aria-label="Bottom content panel style"
                value={panelStyleOverride||'auto'} disabled={locked}
                onChange={e=>{
                  const value=e.target.value;
                  if(value!=='auto'&&!CONTENT_PANEL_STYLES.includes(value as ContentPanelStyle))return;
                  setPanelStyleOverride(value==='auto'?null:value as ContentPanelStyle);
                  setStatus(value==='auto'?
                    'Bottom panel is using Gemini-selected styling (or the default).':
                    'Bottom panel changed to '+value.replaceAll('_',' ')+'. Existing artwork is re-composed locally without a new Puter request.');
                }}
                className="w-full rounded-lg border border-[#E5D9D0] bg-white px-2 py-2 text-[11px]">
                <option value="auto">Gemini Auto ({selectedPanelStyle.replaceAll('_',' ')})</option>
                {CONTENT_PANEL_STYLES.map(style=>
                  <option key={style} value={style}>
                    {style.split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ')}
                  </option>)}
              </select>
              <p className="mt-1 text-[10px] leading-4 text-[#8C7E77]">
                Current: {selectedPanelStyle.replaceAll('_',' ')}. Changes only the existing offer,
                CTA and contact card. The top headline and image remain unchanged.
              </p>
            </div>
            <div>
              <label htmlFor="puter-safe-layout" className="mb-1 block text-[10px] font-bold text-[#6C5F58]">
                Safe-zone layout
              </label>
              <select id="puter-safe-layout" value={activeDesign?.layout||'top_center_hero'}
                disabled={locked} onChange={e=>{
                  const layout=e.target.value as SafeZoneLayout;
                  if(!SAFE_ZONE_LAYOUTS.includes(layout))return;
                  const starting=activeDesign||shufflePosterDesign(null,language,0,format);
                  setDesignOverride({...starting,layout});
                }} className="w-full rounded-lg border border-[#E5D9D0] bg-white px-2 py-2 text-[11px]">
                <option value="top_center_hero">Top-Center Hero</option>
                <option value="bottom_left_editorial">Bottom-Left Editorial</option>
                <option value="split_card">Split Card</option>
              </select>
            </div>
          </div>
          <div className="space-y-2.5 border-t border-[#EEE8E5] pt-3">
            <div className="flex items-center gap-2">
              <SquarePen size={15} className="text-[#B46730]"/>
              <h3 className="text-[12px] font-extrabold">Exact poster copy</h3>
            </div>
            <p className="text-[10px] leading-4 text-[#907D75]">
              Your approved text is drawn with Unicode fonts, not spelled by the image model.
            </p>
            {!copyLanguageConsistent&&<p role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">
              Selected language: {posterLanguageName(language)}. Headline, offer and CTA must all use
              this language. Edit any unmatched text or use Prepare with Gemini before Generate.
              Your business name, website, phone and email are kept exactly as verified.
            </p>}
            <div>
              <label htmlFor="puter-headline" className="mb-1 block text-[11px] font-semibold">Headline</label>
              <input id="puter-headline" value={headline} maxLength={120} disabled={generating}
                onChange={e=>{setHeadline(e.target.value);setManualHeadline(true);}}
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
            <div>
              <label htmlFor="puter-offer" className="mb-1 block text-[11px] font-semibold">Exact offer</label>
              <input id="puter-offer" value={offer} maxLength={60} disabled={generating}
                onChange={e=>{setOffer(e.target.value);setManualOffer(true);}}
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
              <label className="col-span-2 flex items-center gap-1.5 rounded-lg bg-[#F8F6F4] px-2 py-2">
                <input type="checkbox" checked={showEmail} disabled={generating||!facts?.email}
                  onChange={e=>setShowEmail(e.target.checked)}/> Verified business email
              </label>
            </div>
            {facts?.website&&<p className="break-all text-[10px] leading-4 text-[#91847E]">{facts.website}</p>}
            {facts?.email&&<p className="break-all text-[10px] leading-4 text-[#91847E]">{facts.email}</p>}
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
