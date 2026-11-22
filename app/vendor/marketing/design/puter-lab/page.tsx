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
  Send,SquarePen,WandSparkles,Shuffle,Trash2,X,
} from 'lucide-react';
import {POSTER_FORMATS,type PosterFormat} from '@/lib/marketing/poster-design';
import {
  buildArtOnlyPrompt,composeExactPoster,extractExplicitPercentage,
  type ExactPosterCopy,type PosterCopyLanguage,
} from '@/lib/marketing/puter-poster-composer';
import type {PosterBusinessFacts,PosterIntelligenceBrief} from '@/lib/marketing/poster-gemini-intelligence';
import {saveLinkedPoster} from '@/lib/marketing/caption-poster-handoff';
import {isCurrentPosterOutput} from '@/lib/marketing/workspace-safety';
import {vendorFeedback} from '@/lib/ui/vendor-feedback';
import {
  SlbiVoiceRecorder,requestSlbiVoiceTranscript,SLBI_VOICE_MAX_BYTES,
} from '@/lib/marketing/voice/slbi-voice-engine';
import {deleteSavedPoster,listSavedPosters,privatePosterUrl,uploadSavedPoster,type SavedPosterAsset}
  from '@/lib/marketing/saved-poster-cloud-client';
import {describePuterImageError} from '@/lib/marketing/puter-image-errors';
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
const maxAudio=SLBI_VOICE_MAX_BYTES;
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
  const [serviceFocus,setServiceFocus]=useState('');
  const [serviceEvidence,setServiceEvidence]=useState('');
  const [serviceFocusApproved,setServiceFocusApproved]=useState(false);
  const [manualFocus,setManualFocus]=useState(false);
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
  const [pendingTranscript,setPendingTranscript]=useState('');
  const [voicePaused,setVoicePaused]=useState(false);
  const [voiceLevels,setVoiceLevels]=useState<number[]>(()=>Array.from({length:35},()=>5));
  const [recordingSeconds,setRecordingSeconds]=useState(0);
  const [transcribing,setTranscribing]=useState(false);
  const [realMode,setRealMode]=useState(false);
  const [consent,setConsent]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [composing,setComposing]=useState(false);
  const [artworkSrc,setArtworkSrc]=useState('');
  const [artworkKey,setArtworkKey]=useState('');
  const [completedRenderKey,setCompletedRenderKey]=useState('');
  const [autoSaveFailed,setAutoSaveFailed]=useState(false);
  const autoSavedRevisionRef=useRef(-1);
  const operationRef=useRef(false);
  const [requestingMic,setRequestingMic]=useState(false);
  const [finalUrl,setFinalUrl]=useState('');
  const [finalBlob,setFinalBlob]=useState<Blob|null>(null);
  const [linkingCaption,setLinkingCaption]=useState(false);
  const [savingPoster,setSavingPoster]=useState(false);
  const [autoSaveNotice,setAutoSaveNotice]=useState('');
  const [deletingPosterId,setDeletingPosterId]=useState('');
  const [savedPosterId,setSavedPosterId]=useState('');
  const [savedAssets,setSavedAssets]=useState<SavedPosterAsset[]>([]);
  const [savedPickerOpen,setSavedPickerOpen]=useState(false);
  const [isRealOutput,setIsRealOutput]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  useEffect(()=>{if(error)vendorFeedback.error(error);},[error]);
  useEffect(()=>{
    if(!status||/^(Recording\.|Gemini is |SLBI Image Generator is |Voice recording captured|Recording safely stopped)/.test(status))
      return;
    vendorFeedback.info(status);
  },[status]);
  const [designAdvisory,setDesignAdvisory]=useState('');
  const voiceCaptureRef=useRef<SlbiVoiceRecorder|null>(null);
  const attachInputRef=useRef<HTMLInputElement|null>(null);
  const failedVoiceRef=useRef<Blob|null>(null);
  const voiceMountedRef=useRef(true);
  const finalUrlRef=useRef('');
  const uploadsRef=useRef(new WeakMap<Blob,Promise<string>>());
  const activeBusinessRef=useRef('');
  const activeBlobRef=useRef<Blob|null>(null);
  // Local reference preview is browser-only, never sent to paid image provider.
  const sampleArtworkUrlRef=useRef('');
  const selectedReference=getPosterReferenceStyle(selectedReferenceId);
  const selectedPremiumStyle=selectedReference?.id||'modern';
  const typographyPreset=resolvePremiumPosterPreset(selectedPremiumStyle);
  const business=businesses.find(b=>b.id===businessId);
  const facts=business?.facts;
  const currentKey=JSON.stringify([businessId,language,prompt.trim(),referenceSummary,format,selectedSuggestionId,selectedReferenceId,manualOffer?offer.trim():'']);
  const creativeKey=JSON.stringify([businessId,prompt.trim(),referenceSummary,model,realMode,selectedReferenceId,sendReferenceImage,useAttachedImage,serviceFocus.trim(),referenceFiles.map(file=>[file.name,file.size,file.lastModified])]);
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
  useEffect(()=>{setSavedPosterId('');setAutoSaveNotice('');setAutoSaveFailed(false);},[finalBlob]);
  useEffect(()=>{activeBusinessRef.current=businessId;},[businessId]);
  useEffect(()=>{activeBlobRef.current=finalBlob;},[finalBlob]);
  useEffect(()=>{
    if(!businessId){setSavedAssets([]);return;}
    let active=true;
    void listSavedPosters(businessId).then(assets=>{
      if(active)setSavedAssets(assets);
    }).catch(()=>{if(active)setSavedAssets([]);});
    return()=>{active=false;};
  },[businessId]);
  const copyLanguageConsistent=isPosterCopyInLanguage(
    {headline,offerText:offer,ctaText:cta},language,
  )&&isPosterTextInLanguage(serviceFocus,language);

  // A single in-flight promise per composed PNG prevents duplicate uploads
  // when the vendor immediately continues into Caption Lab.
  const savePosterBlob=useCallback((blob:Blob,ownerBusinessId:string)=>{
    const existing=uploadsRef.current.get(blob);
    if(existing)return existing;
    const promise=uploadSavedPoster(ownerBusinessId,blob);
    uploadsRef.current.set(blob,promise);
    void promise.catch(()=>{uploadsRef.current.delete(blob);});
    return promise;
  },[]);
  // Dual execution: once the owner reviews a JSON blueprint, warm the chosen
  // licensed fonts independently of the next image-model request.
  // Never fetch a model or use Puter allowance from this effect.
  useEffect(()=>{
    if(!activeDesign||typeof document==='undefined')return;
    const selected=activeDesign.styling;
    const sample=language==='ta'?'தமிழ் பொங்கல்':language==='si'?'සිංහල අලුත් අවුරුද්ද':'PREMIUM SALE';
    const heading=language==='ta'?'Pavanam':language==='si'?'Gemunu Libre':selected.headlineFont;
    const body=language==='ta'?'Pavanam':language==='si'?'Maname':selected.bodyFont;
    void Promise.all([
      document.fonts.load((heading==='Pavanam'?400:700)+' 140px "'+heading+'"',sample),
      document.fonts.load((body==='Pavanam'||body==='Maname'?400:500)+' 40px "'+body+'"',sample),
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
    if(locked||operationRef.current||!businessId||!referenceFiles.length)return;
    const validation=validatePosterReferences([],referenceFiles);
    if(!validation.ok){setError(validation.error);return;}
    operationRef.current=true;setReferenceBusy(true);setError('');
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
    finally{operationRef.current=false;setReferenceBusy(false);void refreshGeminiQuota();}
  };
  const chooseSuggestion=(suggestion:{id:string;label:string;prompt:string})=>{
    // Chips stage the owner's idea only; NEVER invoke Gemini or paid Puter.
    const combined=prompt===samplePrompt||!prompt.trim()?suggestion.prompt:
      prompt+'\n'+suggestion.prompt;
    if(combined.length>1200){
      setError('Your prompt is full (1,200 characters). Review it before adding another chip.');
      return;
    }
    setError('');setPrompt(combined);setSelectedSuggestionId(suggestion.id);
    setServiceFocusApproved(false);
    setBlueprint(null);setBlueprintKey('');setBrief(null);setBriefKey('');
    setDesignOverride(null);setShuffleIndex(0);
    const matching=getPosterReferenceStyle(suggestion.id as PosterStyleId);
    if(matching){
      setSelectedReferenceId(matching.id);setSendReferenceImage(false);
      if(!manualHeadline)setHeadline(starterHeadline(language,matching.id));
    }
    setStatus(suggestion.label+' added to your existing voice/text prompt. Tap Prepare with Gemini when ready; selecting a chip does not spend AI quota.');
  };
  const chooseReference=(reference:PosterReferenceStyle)=>{
    setSelectedReferenceId(reference.id);
    setSendReferenceImage(false);
    if(prompt===samplePrompt||!prompt.trim()){
      setPrompt('Create a premium '+reference.name+' visual campaign for my selected business. Modern, tasteful, professional quality.');
      setServiceFocusApproved(false);
      setBrief(null);setBriefKey('');
    }
    if(!manualHeadline)
      setHeadline(starterHeadline(language,reference.id));
    setStatus(reference.name+' selected. The look is applied on your NEXT Generate; no paid AI call happened.');
  };

  const disposeVoice=useCallback(()=>{
    voiceCaptureRef.current?.dispose();
    voiceCaptureRef.current=null;
  },[]);
  const stopVoice=useCallback(()=>{
    voiceCaptureRef.current?.stop('sent');
  },[]);
  const cancelVoice=()=>{
    voiceCaptureRef.current?.cancel();
    voiceCaptureRef.current=null;
    setStatus('Voice recording discarded. Your campaign brief is unchanged.');
  };
  const pauseVoice=()=>{
    const state=voiceCaptureRef.current?.pauseOrResume();
    setStatus(state==='paused'?'Recording paused. Resume or send to transcribe.':
      state==='recording'?'Recording resumed. Tap Send when ready.':'');
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
  useEffect(()=>{
    voiceMountedRef.current=true;
    return()=>{
      voiceMountedRef.current=false;disposeVoice();
      if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);
      if(sampleArtworkUrlRef.current)URL.revokeObjectURL(sampleArtworkUrlRef.current);
    };
  },[disposeVoice]);

  const exactCopy=useMemo<ExactPosterCopy|null>(()=>facts?{
    businessName:facts.name,
    headline:headline.trim(),
    offer:offer.trim(),
    focus:serviceFocus.trim(),
    service:facts.category.trim().toLocaleLowerCase()===serviceFocus.trim().toLocaleLowerCase()?'':facts.category,
    cta:cta.trim(),
    phone:showPhone?facts.phone:'',
    website:showWebsite?facts.website:'',
    email:showEmail?facts.email:'',
    accentColor:facts.primaryColor||'#F7B45C',
    language,
  }:null,[facts,headline,offer,serviceFocus,cta,showPhone,showWebsite,showEmail,language]);

  const renderKey=JSON.stringify([artworkKey,imageRevision,format,exactCopy,selectedPremiumStyle,activeDesign,selectedPanelStyle,serviceFocusApproved]);
  const outputReady=isCurrentPosterOutput({hasBlob:Boolean(finalBlob&&finalUrl),stage:generationStage,generating,composing,artworkKey,creativeKey,completedRenderKey,renderKey,copyLanguageConsistent,serviceFocusApproved});
  const outputReadyRef=useRef(false);
  useEffect(()=>{outputReadyRef.current=outputReady;},[outputReady]);
  // Recompose typography at the exact selected PNG dimensions. Changing text,
  // format or contact options never triggers a new billable Puter request.
  useEffect(()=>{
    if(!artworkSrc||!exactCopy||!copyLanguageConsistent||generating||artworkKey!==creativeKey||!serviceFocusApproved){setComposing(false);return;}
    let cancelled=false;
    setComposing(true);setGenerationStage('typography');setEstimatedProgress(94);setError('');
    const timeout=setTimeout(()=>{
      void composeExactPoster({backgroundSrc:artworkSrc,format,copy:exactCopy,
        style:selectedPremiumStyle,design:activeDesign,contentPanelStyle:selectedPanelStyle})
        .then(blob=>{
          if(cancelled)return;
          const url=URL.createObjectURL(blob);
          if(finalUrlRef.current)URL.revokeObjectURL(finalUrlRef.current);
          finalUrlRef.current=url;setFinalBlob(blob);setFinalUrl(url);setCompletedRenderKey(renderKey);
          setEstimatedProgress(100);setGenerationStage('ready');
          setStatus(isRealOutput?
            'Exact-text poster composed at '+dimensions.width+'×'+dimensions.height+' PNG. Ready to download.':
            'No-credit SAMPLE composed for layout testing. It does not measure model quality.');
        })
        .catch(e=>{if(!cancelled){setFinalBlob(null);setGenerationStage('error');setError(errorMessage(e));}})
        .finally(()=>{if(!cancelled)setComposing(false);});
    },220);
    return()=>{cancelled=true;clearTimeout(timeout);};
  },[artworkSrc,imageRevision,format,exactCopy,copyLanguageConsistent,selectedPremiumStyle,activeDesign,selectedPanelStyle,isRealOutput,dimensions.width,dimensions.height,artworkKey,creativeKey,renderKey,serviceFocusApproved,generating]);
  // Preserve the last successful preview visually during copy/language edits.
  // Export and handoff remain blocked until the updated copy is valid.
  // The next successful compose revokes the old object URL atomically.

  // Save the first complete real artwork once per generation. Further local
  // typography/size edits are explicit saves, not unlimited library versions.
  const saveCurrentPoster=async()=>{
    if(!outputReady||locked||!finalBlob||!businessId||savingPoster||linkingCaption||operationRef.current)return;
    operationRef.current=true;setSavingPoster(true);setError('');
    const blob=finalBlob;
    try{
      const id=await savePosterBlob(blob,businessId);
      if(activeBusinessRef.current===businessId&&activeBlobRef.current===blob){
        setSavedPosterId(id);setAutoSaveFailed(false);setAutoSaveNotice('Saved to your private poster library.');
      }
      const assets=await listSavedPosters(businessId);
      if(activeBusinessRef.current===businessId)setSavedAssets(assets);
    }catch(e){setAutoSaveFailed(true);setError('Poster save failed: '+errorMessage(e));}
    finally{operationRef.current=false;setSavingPoster(false);}
  };
  useEffect(()=>{
    if(!outputReady||!finalBlob||!businessId||!isRealOutput||generationStage!=='ready'||
       autoSavedRevisionRef.current===imageRevision)return;
    const blob=finalBlob;
    const timer=setTimeout(()=>{
      if(!outputReadyRef.current||operationRef.current||activeBusinessRef.current!==businessId||activeBlobRef.current!==blob)return;
      autoSavedRevisionRef.current=imageRevision;
      operationRef.current=true;setSavingPoster(true);setAutoSaveNotice('Saving your generated PNG privately…');
      void savePosterBlob(blob,businessId).then(async id=>{
        if(activeBusinessRef.current!==businessId)return;
        if(activeBlobRef.current===blob){setSavedPosterId(id);setAutoSaveFailed(false);setAutoSaveNotice('Auto-saved to your private poster library.');}
        const assets=await listSavedPosters(businessId).catch(()=>null);
        if(assets&&activeBusinessRef.current===businessId)setSavedAssets(assets);
      }).catch(e=>{
        if(activeBusinessRef.current===businessId&&activeBlobRef.current===blob){
          setAutoSaveFailed(true);setAutoSaveNotice('Automatic save failed. Use Retry save; your PNG is unchanged.');
          setError('Automatic poster save failed: '+errorMessage(e));
        }
      }).finally(()=>{operationRef.current=false;setSavingPoster(false);});
    },900);
    return()=>clearTimeout(timer);
  },[outputReady,finalBlob,businessId,isRealOutput,generationStage,imageRevision,savePosterBlob]);

  const transcribe=async(blob:Blob)=>{
    failedVoiceRef.current=blob;
    setTranscribing(true);setError('');setStatus('Gemini is transcribing your original-language voice. Please review the text.');
    try{
      if(!businessId)throw Error('Choose your owned business before speaking.');
      if(blob.size<800||blob.size>maxAudio)
        throw Error('The voice clip exceeds 1.5 MB. Record a shorter clip or type the remaining details.');
      const data=await requestSlbiVoiceTranscript({
        audio:blob,businessId,language,
      });
      const heard=data.transcript.trim();
      failedVoiceRef.current=null;
      const combined=[prompt===samplePrompt?'':prompt,heard].filter(Boolean).join(' ').trim();
      if(combined.length>1200){
        setPendingTranscript(heard);
        setStatus('Full transcript captured. Review and shorten the text below before applying; no spoken words were discarded.');
        return;
      }
      setPrompt(combined);
      setServiceFocusApproved(false);
      const explicit=extractExplicitPercentage(heard);
      if(explicit&&!manualOffer)setOffer(localizedPercentOffer(explicit,language));
      setBrief(null);setBriefKey('');
      setStatus('Gemini transcript added. Check the words, campaign offer and business details before continuing.');
    }catch(e){
      setError(errorMessage(e));
      setStatus('Your prompt is unchanged. The previous recording is retained in this tab for Retry transcription.');
    }
    finally{setTranscribing(false);void refreshGeminiQuota();}
  };
  const retryVoice=()=>{if(failedVoiceRef.current&&!locked&&!operationRef.current)void transcribe(failedVoiceRef.current);};
  const applyPendingTranscript=()=>{
    const next=[prompt===samplePrompt?'':prompt,pendingTranscript.trim()]
      .filter(Boolean).join(' ').trim();
    if(next.length>1200){
      setError('Shorten your reviewed transcript until the combined prompt fits 1,200 characters.');
      return;
    }
    setPrompt(next);setPendingTranscript('');setError('');
    setBrief(null);setBriefKey('');setBlueprint(null);setBlueprintKey('');
    setServiceFocusApproved(false);
    setStatus('Reviewed transcript added safely. Tap Prepare with Gemini to build the design.');
  };
  const startVoice=async()=>{
    if(locked||operationRef.current)return;
    if(pendingTranscript){
      setError('Apply or discard your reviewed transcript before another recording.');
      return;
    }
    operationRef.current=true;setRequestingMic(true);setError('');
    try{
      const capture=new SlbiVoiceRecorder({
        onState:state=>{
          if(!voiceMountedRef.current)return;
          setRecording(state!=='idle');setVoicePaused(state==='paused');
        },
        onSeconds:seconds=>{if(voiceMountedRef.current)setRecordingSeconds(seconds);},
        onLevels:levels=>{if(voiceMountedRef.current)setVoiceLevels(levels);},
        onError:err=>{if(voiceMountedRef.current){setError(err.message);setRecording(false);}},
        onComplete:(blob,reason)=>{
          voiceCaptureRef.current=null;
          if(!voiceMountedRef.current)return;
          setVoiceLevels(Array.from({length:35},()=>5));
          setStatus(reason==='sent'?'Recording captured. Transcribing…':
            'Recording safely stopped at '+(reason==='duration'?'3 minutes':'1.4 MB')+
            '. Transcribing the captured audio now.');
          void transcribe(blob);
        },
      });
      disposeVoice();
      voiceCaptureRef.current=capture;
      // This is called directly from the microphone button click. Browser
      // permissions stay native; no automatic recording or background uploads.
      await capture.start();
      if(voiceMountedRef.current)
        setStatus('Recording. Pause/resume or Send. Maximum 3 minutes / 1.4 MB.');
    }catch(e){
      disposeVoice();
      const name=e instanceof Error?e.name:'';
      setError(name==='NotAllowedError'||name==='SecurityError'?
        'Microphone permission denied. Browser site controls → Microphone → Allow.':
        name==='NotFoundError'?'No microphone detected. Check your device.':
        name==='NotReadableError'?'Microphone is in use. Close the other app and retry.':
        e instanceof Error?e.message:'Microphone is unavailable in this browser.');
    }finally{operationRef.current=false;setRequestingMic(false);}
  };
  const prepareWithGemini=async()=>{
    if(!businessId||prompt.trim().length<5){setError('Choose a business and enter a prompt.');return;}
    if(locked||operationRef.current)return;
    operationRef.current=true;setGeminiBusy(true);setError('');setDesignAdvisory('');
    setStatus('Gemini is understanding your voice brief and verified business facts…');
    const forKey=currentKey;
    try{
      const res=await fetch('/api/marketing/poster/puter-lab',{
        method:'POST',...reqOptions,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          businessId,prompt:prompt.trim(),referenceContext:referenceSummary,language,
          format,mode:'blueprint',campaignStyle:selectedSuggestionId,
          approvedOffer:manualOffer?offer.trim():'',
        }),
      });
      const data=await res.json() as BriefResponse&{code?:string};
      if(!res.ok){
        if(data.code==='GEMINI_BLUEPRINT_INVALID'||data.code==='GEMINI_BLUEPRINT_UNAVAILABLE'){
          setStatus('');
          setDesignAdvisory('Your voice transcript is ready and editable. Gemini could not prepare the design this time. Review the headline, offer and CTA, or tap Gemini to retry.');
          return;
        }
        throw Error(data.error||'Gemini could not prepare this design blueprint.');
      }
      if(forKey!==currentKey)return;
      if(data.blueprint){
        setDesignAdvisory('');
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
        if(!manualFocus||!isPosterTextInLanguage(serviceFocus,language)){
          setServiceFocus(data.blueprint.posterCopy.serviceFocus||'');
          setServiceEvidence(data.blueprint.posterCopy.focusEvidence||'');
          setManualFocus(false);setServiceFocusApproved(false);
        }
        setStatus('Gemini blueprint ready. Confirm the actual promoted product/service, headline, offer and CTA before generating.');
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
    }catch(e){setError(errorMessage(e));setStatus('');}
    finally{operationRef.current=false;setGeminiBusy(false);void refreshGeminiQuota();}
  };
  // Zero-credit visual continuity when Puter sample mode is unavailable or
  // no separate Puter account is signed in. This is an ORIGINAL local SLBI
  // reference, labeled as such (never presented as generated model artwork).
  const loadLocalPosterSample=async(reason:string)=>{
    const fallback=getPosterReferenceStyle('tech');
    const thumbnail=selectedReference?.thumbnail||fallback?.thumbnail;
    if(!thumbnail)throw Error('The local sample reference is unavailable.');
    const previewPng=await originalReferencePng(thumbnail);
    const url=URL.createObjectURL(previewPng);
    const previous=sampleArtworkUrlRef.current;
    sampleArtworkUrlRef.current=url;
    setArtworkSrc(url);setArtworkKey(creativeKey);
    setImageRevision(n=>n+1);
    setIsRealOutput(false);setGenerationStage('typography');setEstimatedProgress(94);
    setBrowseReferences(false);
    setError('');
    setStatus('SLBI reference SAMPLE ready for exact-copy layout preview. It is not AI-generated artwork.');
    setDesignAdvisory(reason);
    // The last composed poster is held separately as its own PNG blob.
    if(previous)URL.revokeObjectURL(previous);
  };
  const generate=async()=>{
    if(realMode&&(!sdkReady||!window.puter)){
      setError('SLBI Image Generator cannot connect to Puter.js. Check the network and refresh this page.');
      return;
    }
    if(!facts||!businessId){setError('Choose a verified owned business first.');return;}
    if(locked||operationRef.current)return;
    if(prompt.trim().length<5||!headline.trim()){
      setError('Enter your campaign idea and an exact headline for the poster.');return;
    }
    if(!copyLanguageConsistent){
      setError('Poster headline, offer and CTA must all match '+posterLanguageName(language)+
        '. Edit the exact fields or use Prepare with Gemini before generating.');
      return;
    }
    if(!serviceFocus.trim()){
      setError('Enter the specific product or service being promoted. A generic business category or festival greeting is not enough.');return;
    }
    if(!serviceFocusApproved){
      setError('Review and confirm that this product or service is actually offered by the selected business before generating.');return;
    }
    if(realMode&&!consent){setError('Please explicitly confirm possible Puter charges.');return;}
    operationRef.current=true;setGenerating(true);setComposing(false);setError('');setDesignAdvisory('');setArtworkKey('');setCompletedRenderKey('');setAutoSaveNotice('');setAutoSaveFailed(false);
    setGenerationStage('connecting');setEstimatedProgress(7);
    setStatus('SLBI Image Generator is preparing your poster artwork…');
    let phase:'sign_in'|'image_request'='sign_in';
    try{
      const puter=window.puter;
      // The no-credit sample is a reliable local SLBI mock when the SDK has
      // not loaded or would otherwise need a popup just to render a sample.
      if(!realMode&&(!sdkReady||!puter||!puter.auth.isSignedIn())){
        await loadLocalPosterSample('No separate Puter sign-in is needed for this local sample. Enable real generation and approve Puter charges for AI artwork.');
        return;
      }
      if(!puter)throw Error('Puter.js is not connected.');
      // Real Puter sign-in is initiated ONLY from this explicit click.
      if(!puter.auth.isSignedIn())await puter.auth.signIn();
      phase='image_request';
      setGenerationStage('artwork');setEstimatedProgress(18);
      const styleDirection=selectedReference?.artDirection||typographyPreset.artDirective;
      const briefDirection=currentBlueprint?.imagePrompt||currentBrief?.creativeDirectionEnglish;
      const creative=buildArtOnlyPrompt({
        request:withPosterReferenceSummary(prompt,referenceSummary),styleDirection,creativeDirection:briefDirection,
        businessCategory:facts.category,city:facts.city,
        businessDescription:facts.description,serviceFocus:serviceFocusApproved?serviceFocus.trim():'',
        brandColor:facts.primaryColor||'#F7B45C',format,
      });
      const options:{model:string;test_mode:boolean;ratio?:{w:number;h:number};input_images?:Blob[]}={
        model,test_mode:!realMode,
      };
      if(model.startsWith('openai/')||model.startsWith('google/'))
        options.ratio=ratioFor(format);
      // Reference assets are optional and never forwarded automatically.
      if(useAttachedImage&&attachedImage)
        options.input_images=[await preparePosterReferencePng(attachedImage)];
      else if(sendReferenceImage&&selectedReference)
        options.input_images=[await originalReferencePng(selectedReference.thumbnail)];
      // Single explicit user action; never silently retry using another paid model.
      const image=await puter.ai.txt2img(creative,options);
      if(!image?.src||typeof image.src!=='string')
        throw {code:'upstream_failed',message:'Image provider returned no printable image'};
      setArtworkSrc(image.src);setArtworkKey(creativeKey);setImageRevision(n=>n+1);setIsRealOutput(realMode);
      setGenerationStage('typography');setEstimatedProgress(94);setBrowseReferences(false);
      setStatus(realMode?'SLBI artwork ready. Applying your exact approved copy…':
        'Puter SAMPLE returned. Composing exact preview text…');
    }catch(e){
      const detail=describePuterImageError(e,phase);
      if(!realMode){
        try{
          await loadLocalPosterSample('Puter sample unavailable ('+detail.code+
            '). Showing an original SLBI reference for layout testing without AI credits.');
          return;
        }catch(sampleError){
          setGenerationStage('error');
          setError('Sample preview could not be prepared. '+(
            sampleError instanceof Error?sampleError.message:
              'Please refresh and check local reference assets.'));
        }
      }else{
        setGenerationStage('error');setError(detail.message+
          (detail.code!=='unknown_provider_error'?' (Code: '+detail.code+')':''));
        setStatus('No automatic paid retry was made. Your previous poster and campaign brief remain available.');
      }
    }finally{operationRef.current=false;setGenerating(false);}
  };
  const deletePoster=async(asset:SavedPosterAsset)=>{
    if(!businessId||locked||operationRef.current)return;
    if(!window.confirm('Permanently delete this private saved poster? This cannot be undone.'))return;
    operationRef.current=true;setDeletingPosterId(asset.id);setError('');
    try{
      await deleteSavedPoster(businessId,asset.id);
      setSavedAssets(previous=>previous.filter(item=>item.id!==asset.id));
      if(savedPosterId===asset.id){
        setSavedPosterId('');
        if(finalBlob)uploadsRef.current.delete(finalBlob);
        setAutoSaveNotice('Current image was removed from the library.');
      }
      setStatus('Unused private poster deleted. Your remaining images are unchanged.');
    }catch(e){setError(errorMessage(e));}
    finally{operationRef.current=false;setDeletingPosterId('');}
  };
  const download=()=>{
    if(!outputReady||locked||operationRef.current||!finalBlob||!finalUrl||!copyLanguageConsistent||!serviceFocusApproved)return;
    const anchor=document.createElement('a');
    const safeName=(facts?.name||'business').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32);
    anchor.href=finalUrl;
    anchor.download='slbi-'+(safeName||'business')+'-'+format+'-'+dimensions.width+'x'+dimensions.height+
      (isRealOutput?'':'-sample')+'.png';
    document.body.appendChild(anchor);anchor.click();anchor.remove();
  };
  const continueToCaption=async()=>{
    if(!outputReady||locked||!finalBlob||!facts||!businessId||linkingCaption||operationRef.current||!copyLanguageConsistent||!serviceFocusApproved)return;
    operationRef.current=true;setLinkingCaption(true);setError('');
    try{
      // Complete the cloud backup before navigating when possible. A transient
      // storage failure still permits the safe browser-local handoff.
      const backedUpId=await savePosterBlob(finalBlob,businessId)
        .catch(()=> '');
      if(backedUpId)setSavedPosterId(backedUpId);
      const id=await saveLinkedPoster({
        businessId,businessName:facts.name,category:facts.category,
        city:facts.city,address:facts.address,
        phone:facts.phone,website:facts.website,
        headline:headline.trim(),offer:offer.trim(),serviceFocus:serviceFocus.trim(),cta:cta.trim(),
        vibe:currentBlueprint?.styling.vibe||selectedPremiumStyle,
        language,source:'poster_studio',sample:!isRealOutput,format,
        savedPosterAssetId:backedUpId||undefined,
      },finalBlob);
      // This is a user-initiated navigation only. No paid caption
      // model is called without the Caption Lab Generate action.
      window.location.assign('/vendor/marketing/captions?handoff='+encodeURIComponent(id));
    }catch(e){setError(errorMessage(e));setLinkingCaption(false);operationRef.current=false;}
  };
  const locked=generating||geminiBusy||transcribing||recording||referenceBusy||linkingCaption||savingPoster||Boolean(deletingPosterId)||requestingMic;
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
    {savedPickerOpen&&<div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="Close private poster library"
        className="absolute inset-0 bg-[#111827]/60" onClick={()=>setSavedPickerOpen(false)}/>
      <section role="dialog" aria-modal="true" aria-label="Saved private posters"
        className="relative z-10 max-h-[85dvh] w-full max-w-[760px] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><h2 className="text-base font-bold">Private Saved Posters</h2>
            <p className="mt-1 text-[11px] text-[#6B7280]">Owned business only · saved securely across devices · private PNG</p>
          </div>
          <button type="button" onClick={()=>setSavedPickerOpen(false)}
            aria-label="Close saved posters" className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold">
            Close
          </button>
        </div>
        {savedAssets.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {savedAssets.map(asset=><div key={asset.id}
            className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-2">
            <img src={privatePosterUrl(businessId,asset.id)} alt="Your private saved poster"
              loading="lazy" className="h-40 w-full rounded-lg bg-[#F3F4F6] object-contain"/>
            <p className="text-[10px] text-[#6B7280]">
              {asset.createdAt?new Date(asset.createdAt).toLocaleDateString():'Saved image'}
            </p>
            <a href={privatePosterUrl(businessId,asset.id)} download={'slbi-poster-'+asset.id+'.png'}
              className="rounded-lg bg-[#111827] px-2.5 py-2 text-center text-[11px] font-semibold text-white">
              Download PNG
            </a>
            <button type="button" onClick={()=>void deletePoster(asset)}
              disabled={locked}
              aria-label={'Delete private poster '+asset.id}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-2 text-[11px] font-bold text-red-700 disabled:opacity-50">
              {deletingPosterId===asset.id?<LoaderCircle size={13} className="animate-spin"/>:<Trash2 size={13}/>}
              Delete
            </button>
          </div>)}
        </div>:<p className="rounded-lg bg-[#F9FAFB] p-5 text-center text-xs text-[#6B7280]">
          No saved posters yet. Real artwork is auto-saved once; save edited or sample versions explicitly.
        </p>}
      </section>
    </div>}
    {designAdvisory&&<p role="status"
      className="shrink-0 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#92400E]">
      {designAdvisory}
    </p>}
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
                failedVoiceRef.current=null;setPendingTranscript('');disposeVoice();
                setBusinessId(e.target.value);setBrief(null);setBriefKey('');
                setReferenceFiles([]);setReferenceSummary('');setUseAttachedImage(false);
                setArtworkSrc('');setArtworkKey('');setCompletedRenderKey('');setFinalBlob(null);setFinalUrl('');setSavedAssets([]);
                setHeadline(starterHeadline(language,selectedReferenceId));setOffer('');
                setServiceFocus('');setServiceEvidence('');setServiceFocusApproved(false);setManualFocus(false);
                setCta(STARTER_COPY[language].cta);
                setManualHeadline(false);setManualOffer(false);setManualCta(false);
                setBlueprint(null);setBlueprintKey('');setDesignOverride(null);setShuffleIndex(0);
              }} className="slbi-poster-select w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-3 py-2.5 text-[12px] font-semibold">
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
                  setServiceFocus('');setServiceEvidence('');setServiceFocusApproved(false);setManualFocus(false);
                  setBrief(null);setBriefKey('');
                  setBlueprint(null);setBlueprintKey('');
                  setDesignOverride(null);setShuffleIndex(0);
                  setStatus('Poster language set to '+posterLanguageName(next)+
                    '. Review all copy or click Prepare with Gemini to localize it.');
                }}
                className="slbi-poster-select w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-2 py-2.5 text-[11px]">
                {(Object.entries(languageLabels) as Array<[PosterCopyLanguage,string]>)
                  .map(([key,val])=><option key={key} value={key}>{val}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="puter-model" className="mb-1.5 block text-[11px] font-bold">Artwork model</label>
              <select id="puter-model" value={model} disabled={locked} onChange={e=>setModel(e.target.value as ModelId)}
                className="slbi-poster-select w-full rounded-xl border border-[#E4DDDA] bg-[#FDFBF9] px-2 py-2.5 text-[11px]">
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
                  setBlueprint(null);setBlueprintKey('');setServiceFocusApproved(false);}}
                placeholder="தமிழ் · සිංහල · English · Tanglish — describe your campaign."
                className="max-h-[190px] min-h-[110px] w-full resize-none border-0 bg-transparent px-3.5 pt-3.5 pb-1 text-[12px] leading-5 outline-none disabled:opacity-60"/>
              {failedVoiceRef.current&&!transcribing&&!recording&&<button type="button"
                onClick={retryVoice} disabled={locked} aria-label="Retry previous voice transcription"
                className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-lg border border-[#F3A56D] bg-white px-3 py-2 text-[11px] font-bold text-[#A95B28] disabled:opacity-40">
                <WandSparkles size={13}/> Retry transcription · recording retained
              </button>}
              {pendingTranscript&&<div className="mx-3 mb-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <label htmlFor="poster-transcript-review" className="block text-[11px] font-bold text-amber-900">
                  Full voice transcript · review before adding
                </label>
                <textarea id="poster-transcript-review" value={pendingTranscript} rows={3}
                  maxLength={12000} onChange={e=>setPendingTranscript(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-[11px] leading-5"/>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={()=>setPendingTranscript('')}
                    className="rounded-lg border bg-white px-3 py-2 text-[10px] font-semibold">Discard transcript</button>
                  <button type="button" onClick={applyPendingTranscript}
                    className="rounded-lg bg-[#292328] px-3 py-2 text-[10px] font-bold text-white">Apply reviewed transcript</button>
                </div>
              </div>}
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
            Gemini {currentBlueprint?'art direction + typography blueprint':'brief'} prepared. Confirm the promoted service/product and review the exact offer and CTA in the right panel.
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
            disabled={locked||(realMode&&!sdkReady)||!facts||prompt.trim().length<5||!headline.trim()||!copyLanguageConsistent||!serviceFocus.trim()||!serviceFocusApproved||(realMode&&!consent)}
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
            chosen={selectedReferenceId} disabled={locked}
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
            {savingPoster?'Auto-saving image…':autoSaveNotice||
              (outputReady?'Save this version privately or download it':finalBlob?'Previous preview — review or regenerate before export':'No automatic social publishing')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={()=>setSavedPickerOpen(true)}
              disabled={!businessId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6DED8] bg-white px-3 py-2.5 text-[11px] font-bold text-[#292327] disabled:opacity-40">
              <ImageIcon size={14}/> Saved ({savedAssets.length})
            </button>
            <button type="button" onClick={()=>void saveCurrentPoster()} disabled={!outputReady||locked||Boolean(savedPosterId)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#FDBA74] bg-[#FFF7ED] px-3 py-2.5 text-[11px] font-bold text-[#9A3412] disabled:opacity-40">{savingPoster?'Saving…':savedPosterId?'Saved':autoSaveFailed?'Retry save':'Save version'}</button>
            <button type="button" onClick={download} disabled={!outputReady||locked}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E6DED8] bg-white px-3 py-2.5 text-[11px] font-bold text-[#292327] disabled:opacity-40">
              <Download size={14}/> Download PNG
            </button>
            <button type="button" onClick={()=>void continueToCaption()}
              disabled={!outputReady||locked}
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
                disabled={locked||composing}
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
              {activeDesign&&language==='en'?activeDesign.styling.headlineFont+' display · '+activeDesign.styling.bodyFont+' body':
                language==='en'?'Anton display · Space Grotesk brand · Plus Jakarta offer · Inter text':
                language==='ta'?'Pavanam display + body · enhanced heading weight':
                  'Gemunu Libre heading · Maname body'}
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
                className="slbi-poster-select w-full rounded-lg border border-[#E5D9D0] bg-white px-2 py-2 text-[11px]">
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
                }} className="slbi-poster-select w-full rounded-lg border border-[#E5D9D0] bg-white px-2 py-2 text-[11px]">
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
              Review the actual business product/service and offer. Exact approved text is drawn with Unicode fonts, not spelled by the image model.
            </p>
            {!copyLanguageConsistent&&<p role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">
              Selected language: {posterLanguageName(language)}. Headline, product/service, offer and CTA must all use
              this language. Edit any unmatched text or use Prepare with Gemini before Generate.
              Your business name, website, phone and email are kept exactly as verified.
            </p>}
            <div>
              <label htmlFor="puter-headline" className="mb-1 block text-[11px] font-semibold">Headline</label>
              <input id="puter-headline" value={headline} maxLength={120} disabled={locked}
                onChange={e=>{setHeadline(e.target.value);setManualHeadline(true);}}
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
            <div className="space-y-1.5 rounded-xl border border-[#F4D7C0] bg-[#FFF9F3] p-2.5">
              <label htmlFor="puter-service-focus" className="block text-[11px] font-bold text-[#7A411A]">
                Promoted product or service <span className="text-[#C2410C]">*</span>
              </label>
              <input id="puter-service-focus" value={serviceFocus} maxLength={85} disabled={locked}
                onChange={e=>{setServiceFocus(e.target.value);setServiceFocusApproved(false);
                  setManualFocus(true);setServiceEvidence('');}}
                placeholder={language==='ta'?'எ.கா. வலைத்தள மற்றும் செயலி உருவாக்கம்':
                  language==='si'?'උදා. වෙබ් අඩවි සහ යෙදුම් සංවර්ධනය':
                    'e.g. Website & App Development'}
                className="w-full rounded-lg border border-[#E4C9B5] bg-white px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
              {serviceEvidence&&<p className="text-[10px] leading-4 text-[#836D5B]">
                Gemini source excerpt: <span className="font-medium">{serviceEvidence}</span>
              </p>}
              <p className="text-[10px] leading-4 text-[#836D5B]">
                The specific offering appears prominently in the poster. Gemini suggestions need your confirmation; a generic business category is not enough.
              </p>
              <label className="flex items-start gap-2 text-[10px] font-semibold leading-4 text-[#69492F]">
                <input type="checkbox" checked={serviceFocusApproved}
                  disabled={locked||!serviceFocus.trim()||!isPosterTextInLanguage(serviceFocus,language)}
                  onChange={e=>setServiceFocusApproved(e.target.checked)}
                  className="mt-0.5 accent-[#F97316]"/>
                I confirm this is a real product/service offered by the selected business.
              </label>
            </div>
            <div>
              <label htmlFor="puter-offer" className="mb-1 block text-[11px] font-semibold">Exact offer</label>
              <input id="puter-offer" value={offer} maxLength={60} disabled={locked}
                onChange={e=>{setOffer(e.target.value);setManualOffer(true);}}
                placeholder="e.g. 30% OFF"
                className="w-full rounded-lg border border-[#E4DDDA] px-3 py-2.5 text-[12px] focus:border-[#EC9D68] focus:outline-none"/>
            </div>
            <div>
              <label htmlFor="puter-cta" className="mb-1 block text-[11px] font-semibold">Call to action</label>
              <input id="puter-cta" value={cta} maxLength={105} disabled={locked}
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
                <input type="checkbox" checked={showPhone} disabled={locked||!facts?.phone}
                  onChange={e=>setShowPhone(e.target.checked)}/> Phone
              </label>
              <label className="flex items-center gap-1.5 rounded-lg bg-[#F8F6F4] px-2 py-2">
                <input type="checkbox" checked={showWebsite} disabled={locked||!facts?.website}
                  onChange={e=>setShowWebsite(e.target.checked)}/> Website
              </label>
              <label className="col-span-2 flex items-center gap-1.5 rounded-lg bg-[#F8F6F4] px-2 py-2">
                <input type="checkbox" checked={showEmail} disabled={locked||!facts?.email}
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
