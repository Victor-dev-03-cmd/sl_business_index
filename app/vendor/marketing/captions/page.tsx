'use client';
/* eslint-disable @next/next/no-img-element */
import './caption-fonts.css';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,ArrowRight,Check,CheckCircle2,ChevronDown,Copy,
  Download,Facebook,Instagram,Image as ImageIcon,Info,LoaderCircle,Mic,
  Pause,Play,Plus,RefreshCcw,Send,SlidersHorizontal,Sparkles,
  Volume2,WandSparkles,X,
} from 'lucide-react';
import {supabase} from '@/lib/supabaseClient';
import {plannerBriefFromCaption} from '@/lib/marketing/caption-planner-brief';
import {listSavedPosters,privatePosterUrl,readSavedPoster,uploadSavedPoster,type SavedPosterAsset} from '@/lib/marketing/saved-poster-cloud-client';
import type {CaptionLanguage} from '@/lib/marketing/caption-contract';
import {
  ANGLES,GOALS,LANGUAGES,PLATFORMS,angleLabels,emptyCaptions,goalLabel,
  goalObjective,hashtagsFrom,extractSavedCaptionHashtags,languageBundle,labels,normalizedTag,
  parseThreeAngles,previewFold,promptChips,removeHashtags,safeLocalPolish,
  toneLabels,withHashtags,
  type CaptionAngle,type CaptionSet,type CampaignGoal,
  type SocialPlatform,type TonePosition,
} from '@/lib/marketing/caption-workspace';
import {
  listLinkedPosters,loadLinkedPoster,saveLinkedPoster,validHandoffId,
  type LinkedPosterContext,type LinkedPosterRecord,
} from '@/lib/marketing/caption-poster-handoff';

type Business={id:string;name:string;city:string|null;category:string;phone:string|null;website_url:string|null;address:string|null};
type StoredDraft={id:string;business_id?:string;caption:string;language:CaptionLanguage;review_status:string;created_at?:string};
type ApiBody={error?:string;draft?:StoredDraft;drafts?:StoredDraft[];chargedCredits?:number};
type GeminiQuota={used:number;limit:number;remaining:number;dayUtc:string};
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const field='w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 text-[12px] text-[#1F2937] outline-none transition focus:border-[#FB923C] focus:ring-2 focus:ring-[#F97316]/10';
const panel='min-w-0 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_7px_24px_rgba(17,24,39,.035)]';
const tab='rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors';
const textFont=(lang:CaptionLanguage)=>lang==='ta'?'slbi-caption-tamil':
  lang==='si'?'slbi-caption-sinhala':'slbi-caption-english';
const short=(value:string,max=600)=>value.trim().slice(0,max);
const decode=async(response:Response):Promise<ApiBody>=>{
  try{return await response.json() as ApiBody;}catch{return {error:'Caption service returned no valid response.'};}
};
const labelsByPlatform:Record<SocialPlatform,string>={
  facebook:'Facebook Post',instagram:'Instagram Feed',whatsapp:'WhatsApp Broadcast',
};
const newDraftLanguage=(list:StoredDraft[],lang:CaptionLanguage)=>list.find(x=>x.language===lang);
const DRAFT_TARGETS:Record<SocialPlatform,number>={facebook:2200,instagram:2200,whatsapp:1000};
const countCharacters=(value:string)=>Array.from(value).length;

/** Browser-local attachment: accepts standard raster images, never HTML/SVG,
 * normalizes JPEG/WebP to PNG so existing private handoff remains consistent. */
async function imageFileToPng(file:File):Promise<Blob>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||
      file.size>12_000_000)
    throw Error('Choose a PNG, JPG or WebP image smaller than 12 MB.');
  if(file.type==='image/png')return file;
  const src=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise<void>((resolve,reject)=>{
      img.onload=()=>resolve();
      img.onerror=()=>reject(Error('Could not read the image. Choose another file.'));
      img.src=src;
    });
    if(!img.naturalWidth||!img.naturalHeight||
      img.naturalWidth*img.naturalHeight>16_000_000)
      throw Error('Choose an image up to 16 megapixels.');
    const canvas=document.createElement('canvas');
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('This browser cannot prepare the poster image.');
    ctx.drawImage(img,0,0);
    const png=await new Promise<Blob>((resolve,reject)=>
      canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not prepare the PNG.')),'image/png'));
    if(png.size>15_000_000)throw Error('The PNG is too large. Choose a smaller image.');
    return png;
  }finally{URL.revokeObjectURL(src);}
}

export default function ConnectedCaptionLab(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [loading,setLoading]=useState(true);
  const [linked,setLinked]=useState<LinkedPosterRecord|null>(null);
  const [posterUrl,setPosterUrl]=useState('');
  const [posterKey,setPosterKey]=useState('');
  const [posterPickerOpen,setPosterPickerOpen]=useState(false);
  const [posterChoices,setPosterChoices]=useState<LinkedPosterRecord[]>([]);
  const [posterThumbnails,setPosterThumbnails]=useState<Record<string,string>>({});
  const [posterBusy,setPosterBusy]=useState(false);
  const [cloudAssetId,setCloudAssetId]=useState('');
  const [cloudChoices,setCloudChoices]=useState<SavedPosterAsset[]>([]);
  const [cloudError,setCloudError]=useState('');
  const [cloudSaving,setCloudSaving]=useState(false);
  const [goal,setGoal]=useState<CampaignGoal>('flash_sale');
  const [languageSelections,setLanguageSelections]=useState<CaptionLanguage[]>(['ta','si','en']);
  const [previewLanguage,setPreviewLanguage]=useState<CaptionLanguage|'all'>('all');
  const [angle,setAngle]=useState<CaptionAngle>('hook');
  const [platform,setPlatform]=useState<SocialPlatform>('facebook');
  const [tone,setTone]=useState<TonePosition>(1);
  const [message,setMessage]=useState('');
  const [conditions,setConditions]=useState('');
  const [cta,setCta]=useState('');
  const [captions,setCaptions]=useState<CaptionSet>(()=>emptyCaptions());
  const [drafts,setDrafts]=useState<StoredDraft[]>([]);
  const [generatedTags,setGeneratedTags]=useState<Record<CaptionLanguage,string[]>>({ta:[],si:[],en:[]});
  const [customTags,setCustomTags]=useState<Record<string,string[]>>({});
  const [removedTags,setRemovedTags]=useState<Record<string,string[]>>({});
  const [tagInput,setTagInput]=useState('');
  const [includeTags,setIncludeTags]=useState(true);
  const [expanded,setExpanded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [recording,setRecording]=useState(false);
  const [requestingMic,setRequestingMic]=useState(false);
  const [voicePermissionHelp,setVoicePermissionHelp]=useState(false);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voicePaused,setVoicePaused]=useState(false);
  const [voiceSeconds,setVoiceSeconds]=useState(0);
  const [voiceLevels,setVoiceLevels]=useState<number[]>(()=>Array.from({length:35},()=>5));
  const [voiceReviewDraft,setVoiceReviewDraft]=useState('');
  const [voiceQuota,setVoiceQuota]=useState<GeminiQuota|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [generatedLanguages,setGeneratedLanguages]=useState<CaptionLanguage[]>([]);
  const [savedCampaignId,setSavedCampaignId]=useState('');
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const voiceClockRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const voiceFrameRef=useRef<number|null>(null);
  const voiceAudioRef=useRef<AudioContext|null>(null);
  const discardVoiceRef=useRef(false);
  const voiceMountedRef=useRef(true);
  const importingRef=useRef('');
  const posterUrlRef=useRef('');
  const posterInputRef=useRef<HTMLInputElement|null>(null);
  const posterDialogRef=useRef<HTMLDivElement|null>(null);
  const releaseVoiceMedia=useCallback(()=>{
    if(voiceClockRef.current!==null){clearInterval(voiceClockRef.current);voiceClockRef.current=null;}
    if(voiceFrameRef.current!==null){cancelAnimationFrame(voiceFrameRef.current);voiceFrameRef.current=null;}
    if(voiceAudioRef.current){
      void voiceAudioRef.current.close().catch(()=>{});
      voiceAudioRef.current=null;
    }
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
  },[]);
  useEffect(()=>{
    const urls:Record<string,string>={};
    for(const record of posterChoices)urls[record.id]=URL.createObjectURL(record.image);
    setPosterThumbnails(urls);
    return()=>{for(const url of Object.values(urls))URL.revokeObjectURL(url);};
  },[posterChoices]);
  useEffect(()=>{
    if(!posterPickerOpen)return;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    posterDialogRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setPosterPickerOpen(false);return;}
      if(event.key!=='Tab'||!posterDialogRef.current)return;
      const tabbable=Array.from(posterDialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled])'));
      const first=tabbable[0],last=tabbable[tabbable.length-1];
      if(!first||!last)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);previousFocus?.focus();};
  },[posterPickerOpen]);
  const selected=useMemo(()=>businesses.find(b=>b.id===businessId),[businesses,businessId]);
  const hasLinked=Boolean(linked&&linked.context.businessId===businessId);
  const chosenLanguages:CaptionLanguage[]=languageSelections.length?languageSelections:['ta'];
  const activePreviewLanguage:CaptionLanguage=previewLanguage==='all'?chosenLanguages[0]:previewLanguage;
  useEffect(()=>{
    if(previewLanguage!=='all'&&!chosenLanguages.includes(previewLanguage))
      setPreviewLanguage(chosenLanguages[0]);
  },[languageSelections,previewLanguage,chosenLanguages]);
  const hasAI=chosenLanguages.some(lang=>Boolean(captions[lang][angle]?.trim()));
  const activeText=captions[activePreviewLanguage]?.[angle]?.trim()||'';
  const suggestedTags=useMemo(()=>{
    const langs=previewLanguage==='all'?chosenLanguages:[activePreviewLanguage];
    const generated=langs.flatMap(lang=>generatedTags[lang]);
    const fromCopy=hashtagsFrom(languageBundle(captions,angle,langs));
    return Array.from(new Set([...generated,...fromCopy])).slice(0,12);
  },[generatedTags,captions,angle,chosenLanguages,previewLanguage,activePreviewLanguage]);
  const visibleTags=useMemo(()=>Array.from(new Set([
    ...suggestedTags,...(customTags[businessId]||[]),
  ])).filter(tag=>!(removedTags[businessId]||[]).includes(tag)).slice(0,12),
  [suggestedTags,customTags,removedTags,businessId]);
  const currentCaption=useMemo(()=>{
    const value=previewLanguage==='all'?
      languageBundle(captions,angle,chosenLanguages):captions[previewLanguage][angle];
    return value.trim();
  },[captions,angle,chosenLanguages,previewLanguage]);
  const previewText=useMemo(()=>{
    const source=currentCaption||(!hasAI?message:'');
    return includeTags?withHashtags(source,visibleTags):removeHashtags(source);
  },[currentCaption,hasAI,message,includeTags,visibleTags]);
  const fold=previewFold(previewText,expanded);
  const characterCount=countCharacters(previewText);
  const draftTarget=DRAFT_TARGETS[platform];
  const hookCount=countCharacters(captions[activePreviewLanguage].hook.trim()||(!hasAI?message.trim():''));
  const hookStatus=!hookCount?'Add a hook':hookCount<=125?'Hook on target':'Try a shorter hook';

  const refreshVoiceQuota=useCallback(async()=>{
    // This is GET metadata, never a provider call or credit reservation.
    // Only owner-QA accounts receive this shared Poster/Caption Gemini budget.
    try{
      const response=await fetch('/api/marketing/poster/puter-lab?quota=1',{
        credentials:'same-origin',cache:'no-store',
      });
      if(!response.ok)return;
      const data=await response.json() as {quota?:GeminiQuota};
      if(data.quota)setVoiceQuota(data.quota);
    }catch{/* Quota is display-only: the authenticated server RPC is authoritative. */}
  },[]);
  useEffect(()=>{void refreshVoiceQuota();},[refreshVoiceQuota]);
  const loadBusinesses=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw Error('Sign in to access your Marketing Studio.');
      const {data,error:dbError}=await supabase.from('businesses')
        .select('id,name,city,category,phone,website_url,address')
        .eq('owner_id',user.id).order('name').limit(250);
      if(dbError)throw Error('Could not load your owned business profiles.');
      const list=(data||[]) as Business[];
      setBusinesses(list);
      setBusinessId(previous=>list.some(x=>x.id===previous)?previous:list[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Business profiles unavailable.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadBusinesses();},[loadBusinesses]);

  // Resolve only a UUID-based local asset AFTER checking this user owns the
  // linked business. Never let URL text select a third-party image or claim.
  useEffect(()=>{
    if(loading||!businesses.length||typeof window==='undefined')return;
    const key=new URLSearchParams(window.location.search).get('handoff')||'';
    if(!validHandoffId(key)||importingRef.current===key)return;
    importingRef.current=key;
    let cancelled=false;
    void loadLinkedPoster(key).then(record=>{
      if(cancelled)return;
      if(!record||!businesses.some(b=>b.id===record.context.businessId)){
        setNotice('Linked poster expired or does not belong to this account. Start a new caption brief.');
        return;
      }
      if(posterUrlRef.current)URL.revokeObjectURL(posterUrlRef.current);
      const src=URL.createObjectURL(record.image);
      posterUrlRef.current=src;setPosterUrl(src);
      setPosterKey(key);setLinked(record);setBusinessId(record.context.businessId);setCloudAssetId('');
      setMessage([record.context.headline,record.context.serviceFocus,record.context.offer].filter(Boolean).join('. ').slice(0,600));
      setCta(record.context.cta.slice(0,180));
      setGoal(record.context.offer?'flash_sale':'festival');
      setTone(record.context.vibe.includes('bold')?2:record.context.vibe.includes('luxury')?1:0);
      setGeneratedLanguages([]);
      setNotice('Poster linked from Studio. Your campaign is ready to refine.');
    }).catch(()=>{if(!cancelled)setNotice('This browser could not open the linked PNG. Continue without a poster.');});
    return()=>{cancelled=true;};
  },[loading,businesses]);
  useEffect(()=>{
    voiceMountedRef.current=true;
    return()=>{
    // Unmounting must never submit a recording or spend one Gemini quota unit.
    voiceMountedRef.current=false;
    discardVoiceRef.current=true;
    const recorder=recorderRef.current;
    if(recorder&&recorder.state!=='inactive')recorder.stop();
    releaseVoiceMedia();
    if(posterUrlRef.current)URL.revokeObjectURL(posterUrlRef.current);
    };
  },[releaseVoiceMedia]);

  const loadDrafts=useCallback(async(signal?:AbortSignal)=>{
    if(!businessId){
      setDrafts([]);setCaptions(emptyCaptions());
      setGeneratedTags({ta:[],si:[],en:[]});return;
    }
    try{
      const res=await fetch('/api/marketing/caption?businessId='+encodeURIComponent(businessId),{
        credentials:'same-origin',cache:'no-store',signal,
      });
      const data=await decode(res);
      if(!res.ok)throw Error(data.error||'Unable to read saved captions.');
      if(signal?.aborted)return;
      const list=Array.isArray(data.drafts)?data.drafts:[];
      setDrafts(list);
      const next=emptyCaptions();
      const nextTags:Record<CaptionLanguage,string[]>={ta:[],si:[],en:[]};
      for(const lang of LANGUAGES){
        const draft=newDraftLanguage(list,lang);
        if(draft){
          next[lang]=parseThreeAngles(draft.caption);
          nextTags[lang]=extractSavedCaptionHashtags(draft.caption);
        }
      }
      setCaptions(next);setGeneratedTags(nextTags);
      setGeneratedLanguages(LANGUAGES.filter(lang=>Boolean(newDraftLanguage(list,lang))));
    }catch(e){if(!signal?.aborted)setNotice(e instanceof Error?e.message:'Existing drafts unavailable.');}
  },[businessId]);
  useEffect(()=>{
    const controller=new AbortController();
    void loadDrafts(controller.signal);
    return()=>controller.abort();
  },[loadDrafts]);

  const toggleLanguage=(lang:CaptionLanguage)=>{
    setLanguageSelections(current=>current.includes(lang)?
      (current.length===1?current:current.filter(x=>x!==lang)):
      LANGUAGES.filter(x=>x===lang||current.includes(x)));
  };
  const updateAngle=(lang:CaptionLanguage,value:string)=>{
    setCaptions(previous=>({...previous,[lang]:{...previous[lang],[angle]:value.slice(0,1100)}}));
  };
  // Same browser-initiated record → pause/resume → Send → Gemini transcript
  // workflow as Poster Studio. Only the explicit Send action uses voice quota.
  const transcribe=async(blob:Blob)=>{
    if(!businessId||blob.size<800||blob.size>1_500_000){
      setError('Choose a business and record a shorter voice message (1.5 MB maximum).');return;
    }
    setVoiceBusy(true);setError('');setNotice('Gemini is transcribing your recording in its original language…');
    try{
      const response=await fetch('/api/marketing/poster/transcribe',{
        method:'POST',credentials:'same-origin',cache:'no-store',body:blob,
        headers:{
          'Content-Type':blob.type||'audio/webm',
          'x-slbi-business-id':businessId,
          'x-slbi-language':'auto',
        },
      });
      const data=await response.json() as {error?:string;transcript?:string};
      if(!response.ok||!data.transcript)throw Error(data.error||'Unable to transcribe audio.');
      const transcript=data.transcript.trim();
      const combined=[message.trim(),transcript].filter(Boolean).join(' ');
      if(combined.length>600){
        // Preserve EVERY word; no silent slicing of promotional terms or
        // percentage scopes. The owner can shorten the draft before applying.
        setVoiceReviewDraft(transcript);
        setNotice('Transcript ready. Your existing brief plus transcript exceeds 600 characters; review the complete transcript below before adding it. No words were discarded.');
      }else{
        setMessage(combined);
        setVoiceReviewDraft('');
        setNotice('Voice transcript added. Review your service, offer, dates and contact facts before generating.');
      }
    }catch(e){
      setError(e instanceof Error?e.message:'Voice transcription is unavailable.');
      setNotice('Your typed campaign message is unchanged. You can retry Voice or continue typing.');
    }finally{setVoiceBusy(false);void refreshVoiceQuota();}
  };
  const startVoice=async()=>{
    if(voiceBusy||recording||requestingMic||saving||busy)return;
    if(voiceReviewDraft){
      setError('Apply or discard the full reviewed transcript before starting a new voice recording.');return;
    }
    setError('');setVoicePermissionHelp(false);
    if(typeof window==='undefined'||!window.isSecureContext||
      !navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setError('Voice recording requires HTTPS and a browser with microphone support.');
      setVoicePermissionHelp(true);return;
    }
    const policy=document as Document&{
      permissionsPolicy?:{allowsFeature:(name:string)=>boolean};
      featurePolicy?:{allowsFeature:(name:string)=>boolean};
    };
    const allowed=policy.permissionsPolicy?.allowsFeature('microphone') ??
      policy.featurePolicy?.allowsFeature('microphone');
    if(allowed===false){
      setError('Microphone is blocked by the site permission policy. Open the production Caption Lab directly and retry.');
      setVoicePermissionHelp(true);return;
    }
    setRequestingMic(true);
    setNotice('Allow microphone access in your browser to record your brief.');
    try{
      // A real user click triggers the native browser permission prompt.
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      // The user may navigate away while the browser's native Allow popup is
      // still open. Never resurrect a recorder after leaving Caption Lab.
      if(!voiceMountedRef.current){
        stream.getTracks().forEach(track=>track.stop());return;
      }
      streamRef.current=stream;
      const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
      const mime=preferred.find(t=>MediaRecorder.isTypeSupported(t));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      recorderRef.current=recorder;discardVoiceRef.current=false;
      const chunks:Blob[]=[];
      let failed=false;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{
        failed=true;discardVoiceRef.current=true;
        setError('Microphone recording interrupted. Check your device and try again.');
        if(recorder.state!=='inactive')recorder.stop();
      };
      recorder.onstop=()=>{
        const discarded=discardVoiceRef.current;
        releaseVoiceMedia();
        recorderRef.current=null;
        if(!voiceMountedRef.current)return;
        setRecording(false);setVoicePaused(false);
        setVoiceLevels(Array.from({length:35},()=>5));
        if(failed||discarded)return;
        const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
        if(blob.size<800){
          setError('No audio captured. Speak for a few seconds, then tap Send.');return;
        }
        void transcribe(blob);
      };
      recorder.start(250);
      setRecording(true);setVoicePaused(false);setVoiceSeconds(0);
      voiceClockRef.current=setInterval(()=>{
        if(recorder.state==='recording')setVoiceSeconds(n=>n+1);
      },1000);
      // Meter actual microphone audio (not a decorative synthetic waveform).
      // Only the browser has these samples; audio is never persisted.
      try{
        const audio=new AudioContext();
        voiceAudioRef.current=audio;
        const analyser=audio.createAnalyser();analyser.fftSize=128;
        const source=audio.createMediaStreamSource(stream);
        source.connect(analyser);
        const bins=new Uint8Array(analyser.frequencyBinCount);
        let lastFrame=0;
        const tick=(now:number)=>{
          if(recorder.state==='recording'&&now-lastFrame>=90){
            lastFrame=now;
            analyser.getByteFrequencyData(bins);
            setVoiceLevels(Array.from({length:35},(_,i)=>{
              const bin=bins[Math.min(bins.length-1,Math.floor(i*bins.length/35))];
              return Math.max(5,Math.min(37,Math.round(5+bin/255*32)));
            }));
          }
          if(recorder.state!=='inactive')voiceFrameRef.current=requestAnimationFrame(tick);
        };
        voiceFrameRef.current=requestAnimationFrame(tick);
      }catch{/* Recording works without a WebAudio amplitude meter. */}
      setNotice('Recording. Pause, resume, cancel or tap Send to transcribe.');
    }catch(e){
      releaseVoiceMedia();recorderRef.current=null;
      const name=e instanceof Error?e.name:'';
      if(name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError'){
        setError('Microphone blocked. Allow access in your browser site settings, then retry.');
        setVoicePermissionHelp(true);
      }else if(name==='NotFoundError'||name==='DevicesNotFoundError'){
        setError('No microphone detected. Connect a recording device and try again.');
      }else if(name==='NotReadableError'||name==='TrackStartError'){
        setError('Your microphone is in use by another application. Close it and retry.');
      }else{
        setError('Unable to open the microphone. Check browser permissions and audio input.');
        setVoicePermissionHelp(true);
      }
      setNotice('');
    }finally{setRequestingMic(false);}
  };
  const sendVoice=()=>{
    const recorder=recorderRef.current;
    if(recorder&&(recorder.state==='recording'||recorder.state==='paused'))recorder.stop();
  };
  const pauseVoice=()=>{
    const recorder=recorderRef.current;
    if(recorder?.state==='recording'){
      recorder.pause();setVoicePaused(true);
      setNotice('Recording paused. Resume or Send to transcribe.');
    }else if(recorder?.state==='paused'){
      recorder.resume();setVoicePaused(false);
      setNotice('Recording resumed. Tap Send when you finish.');
    }
  };
  const cancelVoice=()=>{
    discardVoiceRef.current=true;sendVoice();
    setNotice('Voice recording discarded. Your typed campaign brief is unchanged.');
  };
  const applyReviewedTranscript=()=>{
    const combined=[message.trim(),voiceReviewDraft.trim()].filter(Boolean).join(' ').trim();
    if(!voiceReviewDraft.trim()){setError('Review the transcript before adding it.');return;}
    if(combined.length>600){
      setError('Campaign brief supports 600 characters. Shorten your voice transcript before applying it; nothing has been discarded.');
      return;
    }
    setMessage(combined);setVoiceReviewDraft('');setError('');
    setNotice('Reviewed transcript added. Verify your service, discount and campaign facts before Generate.');
  };

  const generate=async()=>{
    if(busy||!selected||message.trim().length<5)return;
    setBusy(true);setError('');setNotice('');
    let succeeded=0;
    try{
      // Existing credit-reserved provider route bills per language, never
      // before the explicit Generate click. Hard-off flag remains respected.
      for(const language of chosenLanguages){
        // Goal is supplied as a separate validated field. Never silently cut
        // off the last words of a reviewed voice brief to append UI metadata.
        const prompt=message.trim();
        const response=await fetch('/api/marketing/caption',{
          method:'POST',credentials:'same-origin',cache:'no-store',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            businessId:businessId,requestKey:crypto.randomUUID(),
            objective:goalObjective[goal],language,
            campaignGoal:goal,
            posterHeadline:hasLinked?(linked?.context.headline||''):'',
            posterOffer:hasLinked?(linked?.context.offer||''):'',
            mode:'three_angles',
            tone:(['friendly','professional','urgent'] as const)[tone],
            message:prompt,conditions:conditions.trim().slice(0,300),
            cta:cta.trim().slice(0,180),
          }),
        });
        const data=await decode(response);
        if(!response.ok||!data.draft?.caption)
          throw Error(data.error||'AI Caption generation is unavailable.');
        const parsed=parseThreeAngles(data.draft.caption);
        const hashtags=extractSavedCaptionHashtags(data.draft.caption);
        setCaptions(previous=>({...previous,[language]:parsed}));
        setGeneratedTags(previous=>({...previous,[language]:hashtags}));
        setGeneratedLanguages(previous=>Array.from(new Set([...previous,language])));
        succeeded++;
      }
      setNotice('AI drafts saved for '+succeeded+' language(s). Review every fact and offer before copying or planning.');
      await loadDrafts();
    }catch(e){setError((e instanceof Error?e.message:'Caption generation failed.')+
      (succeeded?' '+succeeded+' language(s) completed and saved.':' No credits were requested for languages not processed.'));
    }finally{setBusy(false);}
  };
  const editTags=(tag:string,action:'add'|'remove')=>{
    const normalized=normalizedTag(tag);
    if(!normalized)return;
    if(action==='add'){
      setCustomTags(p=>({...p,[businessId]:Array.from(new Set([...(p[businessId]||[]),normalized])).slice(0,12)}));
      setRemovedTags(p=>({...p,[businessId]:(p[businessId]||[]).filter(x=>x!==normalized)}));
    }else{
      setRemovedTags(p=>({...p,[businessId]:Array.from(new Set([...(p[businessId]||[]),normalized]))}));
      setCustomTags(p=>({...p,[businessId]:(p[businessId]||[]).filter(x=>x!==normalized)}));
    }
  };
  const copyCaption=async(withTags:boolean)=>{
    const value=currentCaption.trim();
    if(!value){setError('No caption drafted yet. Generate or type a caption first.');return;}
    const final=withTags?withHashtags(value,visibleTags):removeHashtags(value);
    try{await navigator.clipboard.writeText(final);setNotice('Copied caption '+(withTags?'with':'without')+' hashtags. Review before publishing.');}
    catch{setError('Clipboard access is blocked. Copy the caption text from the editor.');}
  };
  const polish=(kind:'shorten'|'urgency'|'emojis'|'contact')=>{
    if(previewLanguage==='all'){
      setError('Select a single language before applying a local quick polish.');return;
    }
    updateAngle(previewLanguage,safeLocalPolish(
      captions[previewLanguage][angle],kind,previewLanguage,
      {phone:selected?.phone||'',city:selected?.city||'',website:selected?.website_url||''},
    ));
    setNotice('Quick polish applied locally. No AI credits used. Review the exact words.');
  };
  const savePlanner=async()=>{
    if(saving||!selected||!currentCaption.trim())return;
    setSaving(true);setError('');setNotice('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw Error('Sign in before saving a campaign.');
      // Re-check ownership at write time, not trusting only the imported UUID.
      const ownership=await supabase.from('businesses').select('id')
        .eq('id',businessId).eq('owner_id',user.id).maybeSingle();
      if(ownership.error||!ownership.data)throw Error('Business ownership could not be verified.');
      const combined=(includeTags?withHashtags(currentCaption.trim(),visibleTags):
        removeHashtags(currentCaption.trim())).slice(0,3000);
      const first=previewLanguage==='all'?chosenLanguages[0]:previewLanguage;
      // marketing_campaign_brief_shape_v2 permits exactly seven fields.
      // The complete selected copy stays in banner_text, while other angles
      // persist separately in the user's marketing_ai_drafts records.
      const brief=plannerBriefFromCaption({
        caption:combined,cta,terms:conditions,language:first,
        objective:goalObjective[goal],
      });
      // Store the linked poster first, never claim it was saved when the
      // original is still just a two-hour browser-local handoff.
      let posterAssetId=cloudAssetId;
      if(hasLinked&&linked?.image&&!posterAssetId){
        posterAssetId=await uploadSavedPoster(businessId,linked.image);
        setCloudAssetId(posterAssetId);
      }
      const patch={
        business_id:businessId,
        banner_text:combined,
        banner_color:'caption-lab-connected-v1',
        platforms:[platform],
        scheduled_at:null,
        status:'drafted',
        brief,
        poster_asset_id:posterAssetId||null,
      };
      const saved=await supabase.from('marketing_campaigns').insert(patch)
        .select('id').maybeSingle();
      if(saved.error||!saved.data)throw Error(saved.error?.message||'Campaign Planner could not save this draft.');
      setSavedCampaignId(saved.data.id);
      setNotice('Campaign Planner draft saved'+(posterAssetId?' with a durable PRIVATE poster image.':'.')+' No social publishing was triggered.');
    }catch(e){setError(e instanceof Error?e.message:'Save to Campaign Planner failed.');}
    finally{setSaving(false);}
  };
  const pickPoster=async()=>{
    if(!businessId||!selected){setError('Select your business before attaching a poster.');return;}
    setPosterPickerOpen(true);setError('');
    const [local,cloud]=await Promise.allSettled([
      listLinkedPosters(businessId),listSavedPosters(businessId),
    ]);
    setPosterChoices(local.status==='fulfilled'?local.value:[]);
    setCloudChoices(cloud.status==='fulfilled'?cloud.value:[]);
    setCloudError(cloud.status==='rejected'?
      (cloud.reason instanceof Error?cloud.reason.message:'Private library unavailable.'):'');
    if(local.status==='rejected'&&cloud.status==='rejected')
      setNotice('Poster libraries unavailable. You can still upload an image from your device.');
  };
  const selectRecentPoster=(record:LinkedPosterRecord)=>{
    if(!businesses.some(b=>b.id===record.context.businessId)||record.context.businessId!==businessId){
      setError('This poster is not available for your selected business.');return;
    }
    if(posterUrlRef.current)URL.revokeObjectURL(posterUrlRef.current);
    const url=URL.createObjectURL(record.image);
    posterUrlRef.current=url;setPosterUrl(url);
    setLinked(record);setPosterKey(record.id);setPosterPickerOpen(false);setCloudAssetId('');
    setMessage(previous=>previous.trim()?previous:
      [record.context.headline,record.context.serviceFocus,record.context.offer]
        .filter(Boolean).join('. ').slice(0,600));
    setCta(previous=>previous.trim()?previous:record.context.cta.slice(0,180));
    setNotice('Poster attached. Review your campaign brief, then generate captions.');
  };
  const saveCaptionImage=async()=>{
    if(!businessId||!hasLinked||!linked?.image||cloudSaving)return;
    setCloudSaving(true);setError('');
    try{
      const id=cloudAssetId||await uploadSavedPoster(businessId,linked.image);
      setCloudAssetId(id);
      setNotice('Image saved privately to SLBI. It is available across your signed-in devices.');
      setCloudChoices(await listSavedPosters(businessId));
    }catch(e){setError(e instanceof Error?e.message:'Unable to save the PNG privately.');}
    finally{setCloudSaving(false);}
  };
  const selectCloudPoster=async(asset:SavedPosterAsset)=>{
    if(!selected||!businessId||posterBusy)return;
    setPosterBusy(true);setError('');
    try{
      const image=await readSavedPoster(businessId,asset.id);
      const context:LinkedPosterContext={
        businessId:selected.id,businessName:selected.name,category:selected.category||'',
        city:selected.city||'',address:selected.address||'',phone:selected.phone||'',
        website:selected.website_url||'',headline:'',offer:'',cta:'',
        vibe:'',language:activePreviewLanguage,sample:false,
        source:'device_upload',format:'uploaded',
      };
      const id=await saveLinkedPoster(context,image);
      selectRecentPoster({id,createdAt:Date.now(),context,image});
      setCloudAssetId(asset.id);
      setNotice('Private saved PNG attached. It will stay linked when you Save to Planner.');
    }catch(e){setError(e instanceof Error?e.message:'Saved image could not be loaded.');}
    finally{setPosterBusy(false);}
  };
  const uploadDevicePoster=async(file?:File)=>{
    if(!file)return;
    if(!selected||!businessId){setError('Select your business first.');return;}
    setPosterBusy(true);setError('');
    try{
      const image=await imageFileToPng(file);
      const context:LinkedPosterContext={
        businessId:selected.id,businessName:selected.name,category:selected.category||'',
        city:selected.city||'',address:selected.address||'',phone:selected.phone||'',
        website:selected.website_url||'',headline:'',offer:'',
        cta:'',vibe:'',language:activePreviewLanguage,
        sample:false,source:'device_upload',format:'uploaded',
      };
      const id=await saveLinkedPoster(context,image);
      selectRecentPoster({id,createdAt:Date.now(),context,image});
      setNotice('Image attached from your device. It stays private in this browser.');
    }catch(e){setError(e instanceof Error?e.message:'Could not attach this image.');}
    finally{setPosterBusy(false);}
  };
  const onBusinessChange=(id:string)=>{
    if(id===businessId)return;
    setBusinessId(id);setLinked(null);setPosterKey('');setCloudAssetId('');setCloudChoices([]);
    setPosterPickerOpen(false);setPosterChoices([]);
    if(posterUrlRef.current)URL.revokeObjectURL(posterUrlRef.current);
    posterUrlRef.current='';setPosterUrl('');
    setMessage('');setConditions('');setCta('');setVoiceReviewDraft('');setError('');setNotice('');
    setCustomTags({});setRemovedTags({});setSavedCampaignId('');
  };
  const downloadPoster=()=>{
    if(!posterUrl||!linked)return;
    const a=document.createElement('a');a.href=posterUrl;
    a.download='slbi-linked-poster-'+linked.context.format+'.png';a.click();
  };
  const isBusy=busy||voiceBusy||requestingMic||recording||saving||posterBusy||cloudSaving;
  const previewAccount=selected?.name||'Your Business';

  return <main className="mx-auto w-full max-w-[1640px] space-y-4 px-2 pb-12 text-[#111827] sm:px-4">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-2 py-4 sm:px-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-[#F97316]"><Sparkles size={22}/></span>
        <div>
          <p className="slbi-overline text-[#EA580C]">SLBI GrowthOS · Creative Suite</p>
          <h1 className="slbi-display-title text-[22px] sm:text-[26px]">AI Caption Lab</h1>
          <p className="text-[11px] text-[#6B7280]">Connected to AI Poster Studio · Tri-lingual social copy</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/vendor/marketing/design/puter-lab"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs font-bold hover:bg-[#FFF7ED]">
          <ImageIcon size={15}/> AI Poster Studio <ArrowRight size={13}/>
        </Link>
        <Link href="/vendor/marketing"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs font-bold hover:bg-[#F9FAFB]">
          <ArrowLeft size={14}/> Marketing Studio
        </Link>
      </div>
    </header>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div>}
    {notice&&<div role="status" className="flex items-center gap-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[11px] font-medium text-[#92400E]"><CheckCircle2 size={14} className="shrink-0"/>{notice}</div>}
    <input ref={posterInputRef} type="file" accept="image/png,image/jpeg,image/webp"
      tabIndex={-1} className="sr-only" aria-label="Upload a local poster image"
      onChange={e=>{void uploadDevicePoster(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
    {posterPickerOpen&&<div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="Close poster picker"
        className="absolute inset-0 bg-[#111827]/55" onClick={()=>setPosterPickerOpen(false)}/>
      <div ref={posterDialogRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-labelledby="caption-poster-dialog-title"
        className="relative z-10 w-full max-w-[530px] space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl outline-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="caption-poster-dialog-title" className="text-base font-bold text-[#111827]">Attach a poster</h2>
            <p className="mt-1 text-[11px] text-[#6B7280]">Recent Studio designs or an image from your device</p>
          </div>
          <button type="button" onClick={()=>setPosterPickerOpen(false)}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[11px] font-semibold text-[#374151] hover:bg-[#F9FAFB]">Close</button>
        </div>
        {posterChoices.length>0&&<div>
          <p className="mb-2 text-[11px] font-semibold text-[#374151]">Recent Poster Studio designs</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {posterChoices.map(item=><button key={item.id} type="button"
              onClick={()=>selectRecentPoster(item)} title={item.context.headline||'Recent Studio poster'}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#E5E7EB] p-1.5 hover:border-[#F97316] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F97316]">
              <span className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-[#F9FAFB]">
                {posterThumbnails[item.id]?
                  <img src={posterThumbnails[item.id]} alt="" className="h-full w-full object-cover"/>:
                  <ImageIcon size={18}/>}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium text-[#374151]">{item.context.headline||'Studio design'}</span>
            </button>)}
          </div>
        </div>}
        {cloudChoices.length>0&&<div>
          <p className="mb-2 text-[11px] font-bold text-[#374151]">
            Private saved posters · available on your signed-in devices
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {cloudChoices.map(asset=><button key={asset.id} type="button"
              onClick={()=>void selectCloudPoster(asset)}
              disabled={posterBusy||cloudSaving}
              title="Attach saved private poster"
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#E5E7EB] p-1.5 hover:border-[#F97316] disabled:opacity-50">
              <span className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-[#F9FAFB]">
                <img src={privatePosterUrl(businessId,asset.id)} alt="Private saved poster"
                  className="h-full w-full object-cover" loading="lazy"/>
              </span>
              <span className="max-w-full truncate text-[10px] text-[#374151]">
                {asset.createdAt?new Date(asset.createdAt).toLocaleDateString():'Saved PNG'}
              </span>
            </button>)}
          </div>
        </div>}
        {cloudError&&<p role="status" className="text-[10px] text-[#92400E]">
          Private saved posters unavailable: {cloudError}
        </p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>posterInputRef.current?.click()} disabled={posterBusy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#111827] bg-[#111827] px-3 py-3 text-[12px] font-semibold text-white hover:bg-[#293241] disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
            <Plus size={15}/> Upload image
          </button>
          <Link href="/vendor/marketing/design/puter-lab"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-3 py-3 text-[12px] font-semibold text-[#C2410C] hover:bg-[#FFEDD5]">
            Open Poster Studio <ArrowRight size={13}/>
          </Link>
        </div>
        <p className="text-[10px] leading-4 text-[#6B7280]">PNG, JPG or WebP · Up to 12 MB · Recent Studio designs stay on this browser for 2 hours. Saved private posters persist in your authenticated SLBI library.</p>
      </div>
    </div>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,30fr)_minmax(0,42fr)_minmax(0,28fr)]">
      {/* 01 / Campaign Brief — same mental model as Poster Studio */}
      <section aria-label="Campaign Brief" className={panel+' space-y-3 p-3 sm:p-3.5'}>
        <div className="flex items-center gap-2 border-b border-[#F0F0F2] pb-2">
          <span className="rounded-lg bg-[#FFF1E6] px-2 py-1 text-[11px] font-black text-[#EA580C]">01</span>
          <h2 className="slbi-section-title text-[15px]">Campaign Brief</h2>
          <span className="ml-auto text-[10px] text-[#9CA3AF]">Input</span>
        </div>
        <label className="block text-[11px] font-bold text-[#374151]">Selected Business
          <select value={businessId} aria-label="Selected business" onChange={e=>onBusinessChange(e.target.value)}
            disabled={loading||isBusy} className={field+' slbi-caption-select mt-1.5'}>
            {!businesses.length&&<option value="">No owned businesses</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        {selected&&<p className="text-[10px] text-[#6B7280]">{selected.category} · {selected.city||'Sri Lanka'}</p>}
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {hasLinked&&posterUrl?
              <img src={posterUrl} alt="Attached poster" className="h-9 w-8 shrink-0 rounded border border-[#E5E7EB] object-cover"/>:
              <ImageIcon size={17} className="shrink-0 text-[#6B7280]"/>}
            <span className="truncate text-[11px] font-semibold text-[#374151]">
              {hasLinked?(linked?.context.source==='device_upload'?'Image attached':'Studio poster linked'):'Poster (optional)'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasLinked&&<button type="button" onClick={downloadPoster}
              title="Download attached PNG" aria-label="Download attached PNG"
              className="rounded-lg p-1.5 text-[#6B7280] hover:bg-white hover:text-[#111827]"><Download size={14}/></button>}
            {hasLinked&&<button type="button" disabled={cloudSaving||isBusy}
              title="Save attached image privately across devices"
              aria-label="Save attached image to private library"
              onClick={()=>void saveCaptionImage()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#14532D] hover:bg-[#DCFCE7] disabled:opacity-40">
              {cloudSaving?<LoaderCircle size={13} className="animate-spin"/>:
                <CheckCircle2 size={13}/>}
              {cloudAssetId?'Saved':'Save image'}
            </button>}
            <button type="button" disabled={posterBusy||!businessId} onClick={()=>void pickPoster()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#C2410C] hover:bg-[#FFEDD5] disabled:opacity-45">
              <Plus size={13}/>{hasLinked?'Change':'Attach'}
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#374151]">Campaign Goal / Angle</p>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map(g=><button key={g} type="button" disabled={isBusy}
              onClick={()=>setGoal(g)} aria-pressed={goal===g}
              className={tab+' '+(goal===g?'border-[#FB923C] bg-[#FFF7ED] text-[#C2410C]':'border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]')}>
              {goalLabel[g]}</button>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#374151]">Target Languages <span className="font-normal text-[#9CA3AF]">(choose up to 3)</span></p>
          <div className="grid grid-cols-3 gap-1.5">
            {LANGUAGES.map(l=><button key={l} type="button"
              disabled={isBusy} onClick={()=>toggleLanguage(l)}
              aria-pressed={chosenLanguages.includes(l)}
              className={'rounded-xl border px-1 py-2.5 text-center text-[11px] font-extrabold '+
                (chosenLanguages.includes(l)?'border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C]':'border-[#E5E7EB] bg-white text-[#6B7280]')}>
              {chosenLanguages.includes(l)?'✓ ':''}{labels[l]}
            </button>)}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="caption-tone" className="text-[11px] font-bold text-[#374151]">Brand Voice</label>
            <span className="text-[10px] font-semibold text-[#EA580C]">{toneLabels[tone]}</span>
          </div>
          <input id="caption-tone" aria-label="Caption brand voice" type="range" min={0} max={2} step={1}
            value={tone} onChange={e=>setTone(Number(e.target.value) as TonePosition)}
            className="w-full accent-[#F97316]"/>
          <div className="flex justify-between gap-1 text-[9px] text-[#9CA3AF]"><span>Friendly</span><span>Professional</span><span>Energetic</span></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="caption-brief" className="text-[11px] font-bold text-[#374151]">Campaign Message</label>
            <div className="flex items-center gap-2">
              {requestingMic&&<span role="status" className="text-[10px] font-semibold text-[#9A3412]">
                Allow microphone…
              </span>}
              {!recording&&<button type="button"
                disabled={isBusy||!businessId}
                onClick={()=>void startVoice()}
                aria-label="Record voice campaign brief" title="Record voice message"
                className="inline-flex size-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F97316] disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
                {requestingMic?<LoaderCircle size={16} className="animate-spin"/>:<Mic size={17}/>}
              </button>}
              {voiceBusy&&<span role="status" aria-live="polite"
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#9A3412]">
                <LoaderCircle size={14} className="animate-spin"/> Transcribing…
              </span>}
            </div>
          </div>
          <textarea id="caption-brief" rows={3} maxLength={600} value={message}
            disabled={recording||voiceBusy}
            onChange={e=>setMessage(e.target.value)}
            className={field+' resize-y leading-6 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]'}
            placeholder="Tell us your real offer, product or campaign in தமிழ், සිංහල, English or Tanglish."/>
          <p className="mt-1 text-[10px] text-[#6B7280]">Add your offer, key details or record a voice brief.</p>
          {recording&&<div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-[#3C3540] bg-[#18181B] px-2.5 py-2 text-white shadow-[0_8px_20px_rgba(17,24,39,.17)]"
            role="group" aria-label="Active voice recording">
            <button type="button" onClick={cancelVoice} title="Discard voice recording"
              aria-label="Cancel and discard voice recording"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/15">
              <X size={16}/>
            </button>
            <div className="min-w-0 flex-1 space-y-1" role="status" aria-live="off">
              <div className="flex h-9 items-center gap-[2px]" aria-hidden="true">
                {voiceLevels.map((level,index)=><span key={index}
                  className={'w-[3px] min-w-[2px] flex-1 rounded-full transition-[height] duration-75 '+
                    (voicePaused?'bg-white/40':'bg-[#FDBA74]')}
                  style={{height:voicePaused?5:level}}/>)}
              </div>
              <p className="text-center text-[10px] tabular-nums text-[#E9D9CE]">
                {voicePaused?'Paused':'Recording'} · {Math.floor(voiceSeconds/60).toString().padStart(2,'0')}:
                {(voiceSeconds%60).toString().padStart(2,'0')}
              </p>
            </div>
            <button type="button" onClick={pauseVoice} title={voicePaused?'Resume recording':'Pause recording'}
              aria-label={voicePaused?'Resume voice recording':'Pause voice recording'}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20">
              {voicePaused?<Play size={16}/>:<Pause size={16}/>}
            </button>
            <button type="button" onClick={sendVoice} title="Send recording to Gemini transcript"
              aria-label="Send voice recording to transcript"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]">
              <Send size={16}/>
            </button>
          </div>}
          {voiceQuota&&<div role="status" aria-label="Shared Gemini daily voice quota"
            className="mt-2 flex flex-wrap items-center justify-between gap-1 rounded-lg border border-[#F3E3D5] bg-[#FFF9F3] px-2.5 py-2 text-[10px] text-[#7C4B28]">
            <span className="font-semibold">Gemini voice + Poster Studio briefs</span>
            <span className="font-bold tabular-nums">{voiceQuota.remaining} / {voiceQuota.limit} left (UTC)</span>
            <span className="w-full text-[#8C7662]">Shared across both tools · resets at 00:00 UTC · recording alone does not use Gemini</span>
          </div>}
          {voiceReviewDraft&&<div className="mt-2 space-y-2 rounded-xl border border-[#FED7AA] bg-[#FFFBF5] p-2.5"
            aria-label="Voice transcript review">
            <label htmlFor="caption-voice-review" className="block text-[11px] font-bold text-[#92400E]">
              Full transcript · review before adding
            </label>
            <textarea id="caption-voice-review" value={voiceReviewDraft} rows={4} maxLength={1200}
              onChange={e=>setVoiceReviewDraft(e.target.value)}
              className={field+' resize-y leading-6'}
              aria-describedby="caption-voice-review-help"/>
            <p id="caption-voice-review-help" className="text-[10px] leading-4 text-[#854D0E]">
              The Campaign Message allows 600 characters including existing text.
              Shorten this complete transcript yourself; no promotional wording or terms were automatically removed.
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] tabular-nums text-[#854D0E]">
                {[message.trim(),voiceReviewDraft.trim()].filter(Boolean).join(' ').length} / 600 characters
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setVoiceReviewDraft('')}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[10px] font-semibold text-[#374151]">
                  Discard transcript
                </button>
                <button type="button" onClick={applyReviewedTranscript}
                  disabled={!voiceReviewDraft.trim()||[message.trim(),voiceReviewDraft.trim()].filter(Boolean).join(' ').length>600}
                  className="rounded-lg bg-[#111827] px-3 py-2 text-[10px] font-semibold text-white disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
                  Apply reviewed transcript
                </button>
              </div>
            </div>
          </div>}
          {voicePermissionHelp&&<div role="status" className="mt-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2.5 text-[11px] leading-5 text-[#7C2D12]">
            <p className="font-semibold">Enable microphone for Caption Lab</p>
            <p>In Chrome, click the site controls icon beside the address bar, open Site settings, set Microphone to Allow, and reload this page. Then tap Voice again.</p>
            <p className="mt-1">If no microphone prompt appears, check your operating system's microphone privacy settings.</p>
          </div>}
        <button type="button" onClick={()=>void generate()}
          aria-label="Generate Caption Variations with Gemini AI"
          disabled={!businessId||message.trim().length<5||isBusy||Boolean(voiceReviewDraft)}
          className="group mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#111827] bg-[#111827] px-3 py-3 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#292F3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:shadow-none">
          {busy?<LoaderCircle size={17} className="animate-spin"/>:<WandSparkles size={17} className="text-[#FDBA74] group-disabled:text-[#9CA3AF]"/>}
          {busy?'Generating drafts…':'Generate Caption Variations'} <ArrowRight size={14}/>
        </button>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2.5 text-[10px] leading-4 text-[#6B7280]"
          aria-label="Gemini generation and credit information">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} className="shrink-0 text-[#F97316]"/>
            Gemini AI · {chosenLanguages.length} {chosenLanguages.length===1?'language':'languages'} · 3 variations each · Credits on Generate
          </span>
          <details className="slbi-caption-disclosure group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-[#C2410C]"><Info size={13}/> Info <ChevronDown size={13} className="slbi-caption-chevron ml-0.5"/></summary>
            <div className="absolute right-0 top-6 z-30 w-64 rounded-xl border border-[#E5E7EB] bg-white p-3 text-[11px] leading-5 text-[#374151] shadow-xl">
              <p>Real Gemini generates three original caption angles per selected language. One provider request and applicable credit reservation per selected language; never auto-charged on page open. A verified Pro/internal QA account, Brand Profile language, remaining credits and provider quota are required.</p>
              <p className="mt-2">Gemini voice transcription uses its separate shared daily voice/brief allowance only after you tap Send.</p>
              <p className="mt-2">Linked PNG remains on this device for up to two hours; saving to Campaign Planner stores captions, not a cloud copy of your image.</p>
              <p className="mt-2">Social previews are visual estimates. Character goals are editorial targets, not social platform limits. Nothing is automatically published.</p>
            </div>
          </details>
        </div>

          <details className="slbi-caption-disclosure mt-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold text-[#6B7280]">Quick brief suggestions <ChevronDown size={14} className="slbi-caption-chevron"/></summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
            {promptChips.map(chip=><button key={chip.label} type="button"
              onClick={()=>setMessage(previous=>[previous,chip.text].filter(Boolean).join(' ').slice(0,600))}
              disabled={isBusy}
              className="rounded-full border border-[#E5E7EB] px-2.5 py-1.5 text-[10px] font-semibold text-[#6B7280] hover:bg-[#FFF7ED]">
              + {chip.label}</button>)}
            </div>
          </details>
        </div>
        <details className="slbi-caption-disclosure rounded-xl border border-[#E5E7EB] p-3">
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-bold">
            <span>Offer terms & CTA <span className="font-normal text-[#9CA3AF]">(optional)</span></span>
            <ChevronDown size={14} className="slbi-caption-chevron"/>
          </summary>
          <textarea rows={2} maxLength={300} value={conditions} onChange={e=>setConditions(e.target.value)}
            placeholder="Only genuine terms or valid dates" className={field+' mt-3'}/>
          <input maxLength={180} value={cta} onChange={e=>setCta(e.target.value)}
            placeholder="Contact us for more details" className={field+' mt-2'}/>
        </details>
      </section>

      {/* 02 / Live Social Preview */}
      <section aria-label="Live Social Preview" className={panel+' space-y-3 p-3.5 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto'}>
        <div className="flex items-center gap-2 border-b border-[#F0F0F2] pb-3">
          <span className="rounded-lg bg-[#FFF1E6] px-2 py-1 text-[11px] font-black text-[#EA580C]">02</span>
          <h2 className="slbi-section-title text-[15px]">Live Social Preview</h2>
          <span className="ml-auto text-[10px] font-medium text-[#6B7280]">Live preview</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-1">
          {PLATFORMS.map(p=><button key={p} type="button" onClick={()=>{setPlatform(p);setExpanded(false);}}
            aria-pressed={platform===p}
            className={'rounded-lg px-1.5 py-2 text-[10px] font-bold transition '+
              (platform===p?'bg-white text-[#111827] shadow-sm':'text-[#6B7280]')}>
            {p==='facebook'?'Facebook':p==='instagram'?'Instagram':'WhatsApp'}
          </button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {chosenLanguages.map(l=><button key={l} type="button" onClick={()=>{setPreviewLanguage(l);setExpanded(false);}}
            className={'rounded-full border px-3 py-1.5 text-[10px] font-bold '+
              (previewLanguage===l?'border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C]':'border-[#E5E7EB] text-[#6B7280]')}>
            {labels[l]}</button>)}
          {chosenLanguages.length>1&&<button type="button" onClick={()=>{setPreviewLanguage('all');setExpanded(false);}}
            className={'rounded-full border px-3 py-1.5 text-[10px] font-bold '+
              (previewLanguage==='all'?'border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C]':'border-[#E5E7EB] text-[#6B7280]')}>All 3 Combined</button>}
        </div>
        <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_14px_38px_rgba(17,24,39,.08)]">
          <div className="flex items-center gap-2.5 border-b border-[#F3F4F6] p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#111827] text-sm font-black text-white">
              {previewAccount.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold">{previewAccount}</p>
              <p className="text-[10px] text-[#6B7280]">Live social preview · Not published</p>
            </div>
            {platform==='facebook'?<Facebook size={17} className="text-[#2563EB]"/>:
              platform==='instagram'?<Instagram size={17} className="text-[#D946EF]"/>:
              <Volume2 size={17} className="text-[#16A34A]"/>}
          </div>
          <div className="p-3.5">
            <p className={'whitespace-pre-line break-words text-[14px] leading-[1.6] text-[#1F2937] '+textFont(activePreviewLanguage)}>
              {fold.visible||'Your social copy appears here as you write.'}
            </p>
            {fold.folded&&<button type="button" onClick={()=>setExpanded(true)}
              className="mt-1 text-[11px] font-bold text-[#6B7280] hover:text-[#EA580C]">…See more</button>}
            {expanded&&previewText.length>180&&<button type="button" onClick={()=>setExpanded(false)}
              className="mt-1 text-[11px] font-bold text-[#6B7280]">Show less</button>}
          </div>
          {posterUrl&&hasLinked?
            <div className="relative border-y border-[#E5E7EB] bg-[#F9FAFB]">
              <img src={posterUrl} alt="Attached poster preview"
                className="max-h-[430px] w-full object-contain"/>
              <button type="button" onClick={()=>void pickPoster()}
                className="absolute bottom-3 right-3 rounded-lg border border-[#E5E7EB] bg-white/95 px-3 py-2 text-[11px] font-semibold text-[#111827] shadow-sm hover:bg-white">
                Change poster
              </button>
            </div>:
            <button type="button" disabled={!businessId||posterBusy}
              onClick={()=>void pickPoster()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();void uploadDevicePoster(e.dataTransfer.files?.[0]);}}
              aria-label="Attach a poster from Studio or upload a device image"
              className="group flex min-h-32 w-full flex-col items-center justify-center gap-2 border-y border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-4 text-center transition-colors hover:border-[#F97316] hover:bg-[#FFF7ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F97316] disabled:cursor-not-allowed">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#F97316] shadow-sm">
                <ImageIcon size={19}/>
              </span>
              <span className="text-[12px] font-semibold text-[#374151]">Attach your creative</span>
              <span className="text-[10px] leading-4 text-[#6B7280]">Choose from Poster Studio, upload, or drop an image</span>
            </button>}
          <div className="flex items-center justify-between gap-3 border-t border-[#F3F4F6] px-4 py-3 text-[11px] text-[#6B7280]">
            <span>{labelsByPlatform[platform]} · Draft</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-[#F97316]"/> Not published</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={!currentCaption.trim()} onClick={()=>void copyCaption(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#111827] bg-[#111827] px-3 py-3 text-[11px] font-bold text-white hover:bg-[#293241] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
            <Copy size={14}/> Copy + Hashtags</button>
          <button type="button" disabled={!currentCaption.trim()} onClick={()=>void copyCaption(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-[11px] font-semibold text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
            <Copy size={14}/> Copy Caption</button>
          <button type="button" disabled={!currentCaption.trim()||saving} onClick={()=>void savePlanner()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-3 py-3 text-[11px] font-semibold text-[#9A3412] hover:bg-[#FFEDD5] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
            {saving?<LoaderCircle size={14} className="animate-spin"/>:<Send size={14}/>}
            Save to Planner</button>
        </div>
        <div className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] px-3 py-2.5"
          aria-label="Character and hook meter">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="font-semibold text-[#374151]">{labelsByPlatform[platform]} · Draft length</span>
            <span className="font-bold tabular-nums text-[#111827]">{characterCount.toLocaleString()} / {draftTarget.toLocaleString()} target</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]" role="progressbar"
            aria-label="Suggested draft length" aria-valuenow={Math.min(characterCount,draftTarget)}
            aria-valuemin={0} aria-valuemax={draftTarget}>
            <div className="h-full rounded-full bg-[#F97316] transition-[width] duration-200"
              style={{width:Math.min(100,(characterCount/draftTarget)*100)+'%'}}/>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#6B7280]">
            <span>Hook: {hookCount} characters · {hookStatus}</span>
            <span>Suggested hook ≤ 125</span>
          </div>
        </div>
        {savedCampaignId&&<Link href="/vendor/marketing/campaigns?source=caption-lab"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-3 py-2.5 text-[11px] font-bold text-[#9A3412]">
          <CheckCircle2 size={15}/> Open saved Campaign Planner draft <ArrowRight size={13}/>
        </Link>}
        <p className="text-center text-[10px] font-medium text-[#6B7280]">Live social preview · Ready to copy or save when your draft is complete</p>
      </section>

      {/* 03 / Refine and copy */}
      <section aria-label="Variations and Optimization" className={panel+' space-y-3 p-3.5'}>
        <div className="flex items-center gap-2 border-b border-[#F0F0F2] pb-3">
          <span className="rounded-lg bg-[#FFF1E6] px-2 py-1 text-[11px] font-black text-[#EA580C]">03</span>
          <h2 className="slbi-section-title text-[15px]">Refine & Copy</h2>
          <span className="ml-auto text-[10px] text-[#9CA3AF]">Optimize</span>
        </div>
        <div className="space-y-1.5">
          {ANGLES.map((a,i)=><button key={a} type="button" onClick={()=>{setAngle(a);setExpanded(false);}}
            aria-pressed={angle===a}
            className={'w-full rounded-xl border px-2.5 py-2 text-left transition '+
              (angle===a?'border-[#FDBA74] bg-[#FFF7ED] shadow-sm':'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]')}>
            <div className="flex items-center gap-2">
              <span className={'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold '+(angle===a?'bg-[#F97316] text-white':'bg-[#F3F4F6] text-[#6B7280]')}>
                {i+1}</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold leading-4">{angleLabels[a].title}</p>
                <p className="text-[10px] leading-4 text-[#6B7280]">{angleLabels[a].subtitle}</p>
              </div>
              {angle===a&&<Check size={14} className="text-[#EA580C]"/>}
            </div>
            <p className="mt-1 line-clamp-1 pl-8 text-[10px] leading-4 text-[#6B7280]">
              {captions[activePreviewLanguage][a]||'Generate AI copy to populate this angle.'}
            </p>
          </button>)}
        </div>
        <div>
          <label htmlFor="caption-edit" className="mb-1.5 block text-[11px] font-bold">
            Edit {angleLabels[angle].title} · {labels[activePreviewLanguage]}
          </label>
          <textarea id="caption-edit" rows={5} maxLength={1100}
            value={captions[activePreviewLanguage][angle]}
            onChange={e=>updateAngle(activePreviewLanguage,e.target.value)}
            className={field+' resize-y leading-6 '+textFont(activePreviewLanguage)}
            placeholder="Generate AI variations or write your own fully editable copy here."/>
          <p className="mt-1 text-[10px] text-[#9CA3AF]">Edits update the live preview immediately; no regeneration cost.</p>
        </div>
        <div className="border-t border-[#F3F4F6] pt-3">
          <div className="mb-2 flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-[#EA580C]"/>
            <h3 className="slbi-section-title text-[12px]">Smart Hashtag Manager</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map(tag=><button key={tag} type="button"
              onClick={()=>editTags(tag,'remove')}
              aria-label={'Remove '+tag}
              className="inline-flex items-center gap-1 rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-2 py-1.5 text-[10px] font-semibold text-[#C2410C]">
              {tag} <span aria-hidden>×</span></button>)}
            {!visibleTags.length&&<p className="text-[10px] text-[#9CA3AF]">AI hashtags appear here. Add only accurate local tags.</p>}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={tagInput} maxLength={40}
              onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();editTags(tagInput,'add');setTagInput('');}}}
              aria-label="Add a hashtag" placeholder="#SriLanka" className={field+' min-w-0 flex-1 py-2'}/>
            <button type="button" onClick={()=>{editTags(tagInput,'add');setTagInput('');}}
              disabled={!normalizedTag(tagInput)} className="rounded-lg bg-[#111827] px-3 text-white disabled:opacity-40">
              <Plus size={15}/></button>
          </div>
          <label className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold text-[#6B7280]">
            <input type="checkbox" checked={includeTags} onChange={e=>setIncludeTags(e.target.checked)}
              className="accent-[#F97316]"/> Include hashtags in live preview
          </label>
        </div>
        <div className="border-t border-[#F3F4F6] pt-3">
          <h3 className="slbi-section-title mb-2 text-[12px]">Quick Polish <span className="font-normal text-[#9CA3AF]">· No new AI credits</span></h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>polish('shorten')} disabled={!activeText}
              className="rounded-lg border border-[#E5E7EB] px-2 py-2.5 text-[10px] font-bold disabled:opacity-40">✨ Make it shorter</button>
            <button type="button" onClick={()=>polish('urgency')} disabled={!activeText}
              className="rounded-lg border border-[#E5E7EB] px-2 py-2.5 text-[10px] font-bold disabled:opacity-40">🔥 Add urgency</button>
            <button type="button" onClick={()=>polish('emojis')} disabled={!activeText}
              className="rounded-lg border border-[#E5E7EB] px-2 py-2.5 text-[10px] font-bold disabled:opacity-40">😊 Add emojis</button>
            <button type="button" onClick={()=>polish('contact')} disabled={!activeText}
              className="rounded-lg border border-[#E5E7EB] px-2 py-2.5 text-[10px] font-bold disabled:opacity-40">📞 Include contacts</button>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold">Saved AI Drafts</p>
            <button type="button" onClick={()=>void loadDrafts()} disabled={isBusy}
              className="text-[#6B7280] disabled:opacity-40" aria-label="Refresh drafts"><RefreshCcw size={15}/></button>
          </div>
          <p className="mt-1 text-[10px] text-[#9CA3AF]">{drafts.length} saved records · {generatedLanguages.length} language(s) available for review</p>
          <div className="mt-2 space-y-1.5">
            {LANGUAGES.map(l=>{
              const draft=newDraftLanguage(drafts,l);
              return <div key={l} className="flex items-center justify-between gap-2 text-[10px]">
                <span>{labels[l]}</span>
                <span className={draft?'font-bold text-[#374151]':'text-[#9CA3AF]'}>
                  {draft?draft.review_status.replaceAll('_',' '):'No saved draft'}
                </span>
              </div>;
            })}
          </div>
        </div>
        <p className="text-[10px] leading-5 text-[#6B7280]">Every edit updates your preview instantly.</p>
      </section>
    </div>
  </main>;
}
