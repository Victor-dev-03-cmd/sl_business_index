'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,ArrowUpRight,Check,Download,FileText,Image as ImageIcon,
  LoaderCircle,Mic,Paperclip,Plus,Share2,Sparkles,Square,Trash2,WandSparkles,X,
} from 'lucide-react';
import {supabase} from '@/lib/supabaseClient';
import {type PosterFormat} from '@/lib/marketing/poster-design';
import {inferPosterArtStyle,type PosterLanguage} from '@/lib/marketing/poster-creative-engine';

type Business={id:string;name:string};
type HistoryItem={id:string;business_id:string;created_at:string};
type Attachment={id:string;file:File;mime:string;preview:string|null};
type Phase='idle'|'references'|'preparing'|'generating'|'downloading'|'ready'|'failed';
const noStore={cache:'no-store' as const,credentials:'same-origin' as const};
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const formats:Record<PosterFormat,{label:string;ratio:string}>={
  square:{label:'1:1 Post',ratio:'1 / 1'},
  portrait:{label:'4:5 Feed',ratio:'4 / 5'},
  story:{label:'9:16 Story',ratio:'9 / 16'},
  landscape:{label:'Wide',ratio:'1200 / 630'},
};
const languageLabels={ta:'தமிழ்',si:'සිංහල',en:'English'} as const;
const maxAttachment=1_500_000;
const allowedMimes=new Set(['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/markdown']);
const mimeFor=(f:File):string=>{
  if(f.type&&allowedMimes.has(f.type.toLowerCase()))return f.type.toLowerCase();
  const ext=f.name.split('.').pop()?.toLowerCase();
  return ext==='md'?'text/markdown':ext==='txt'?'text/plain':'';
};
const isPhoto=(a:Attachment)=>a.mime.startsWith('image/');
const friendlyError=(e:unknown)=>e instanceof Error?e.message:'AI artwork is temporarily unavailable.';

export default function PosterDesignStudio(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [language,setLanguage]=useState<PosterLanguage>('ta');
  const [format,setFormat]=useState<PosterFormat>('square');
  const [idea,setIdea]=useState('');
  const [editIdea,setEditIdea]=useState('');
  const [sourceJobId,setSourceJobId]=useState('');
  const [previewUrl,setPreviewUrl]=useState('');
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [attachments,setAttachments]=useState<Attachment[]>([]);
  const [directReferenceId,setDirectReferenceId]=useState('');
  const [referenceSummary,setReferenceSummary]=useState('');
  const [referenceSignature,setReferenceSignature]=useState('');
  const [price,setPrice]=useState<number|null>(null);
  const [available,setAvailable]=useState(false);
  const [serviceReason,setServiceReason]=useState('');
  const [checking,setChecking]=useState(true);
  const [workspace,setWorkspace]=useState(false);
  const [busy,setBusy]=useState(false);
  const [recording,setRecording]=useState(false);
  const [transcribing,setTranscribing]=useState(false);
  const [voiceTarget,setVoiceTarget]=useState<'create'|'edit'>('create');
  const [phase,setPhase]=useState<Phase>('idle');
  const [percent,setPercent]=useState(0);
  const [message,setMessage]=useState('');
  const [lastCharge,setLastCharge]=useState<number|null>(null);
  const currentBlob=useRef<string|null>(null);
  const filePicker=useRef<HTMLInputElement|null>(null);
  const micStream=useRef<MediaStream|null>(null);
  const recorder=useRef<MediaRecorder|null>(null);
  const recordingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const attachmentsRef=useRef<Attachment[]>([]);
  useEffect(()=>{attachmentsRef.current=attachments;},[attachments]);

  useEffect(()=>{
    if(!busy)return;
    // This is estimated animation progress, not a false provider percentage.
    // Never reaches 100 until verified private artwork bytes are loaded.
    const interval=setInterval(()=>setPercent(p=>Math.min(94,p+(p<35?2:p<70?1:0.4))),680);
    return()=>clearInterval(interval);
  },[busy]);

  const stopMic=()=>{
    if(recordingTimer.current){clearTimeout(recordingTimer.current);recordingTimer.current=null;}
    const r=recorder.current;
    if(r&&r.state!=='inactive')r.stop();
    micStream.current?.getTracks().forEach(track=>track.stop());
    micStream.current=null;
    setRecording(false);
  };
  useEffect(()=>{
    let mounted=true;
    void supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user||!mounted)return;
      const {data}=await supabase.from('businesses').select('id,name')
        .eq('owner_id',user.id).order('name').limit(250);
      if(!mounted)return;
      const owned=(data||[]) as Business[];
      setBusinesses(owned);setBusinessId(owned[0]?.id||'');
      const jobs=await supabase.from('marketing_poster_jobs')
        .select('id,business_id,created_at').eq('user_id',user.id).eq('state','completed')
        .order('created_at',{ascending:false}).limit(24);
      if(mounted&&!jobs.error)setHistory((jobs.data||[]) as HistoryItem[]);
    });
    void checkService();
    return()=>{
      mounted=false;
      if(recordingTimer.current)clearTimeout(recordingTimer.current);
      if(recorder.current?.state!=='inactive')recorder.current?.stop();
      micStream.current?.getTracks().forEach(track=>track.stop());
      if(currentBlob.current)URL.revokeObjectURL(currentBlob.current);
      attachmentsRef.current.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview);});
    };
  },[]);
  const checkService=async()=>{
    setChecking(true);
    try{
      const res=await fetch('/api/marketing/poster/capabilities',noStore);
      const result=await res.json() as {available?:boolean;creditCost?:number;reason?:string};
      const ready=res.ok&&result.available===true&&Number.isInteger(result.creditCost)&&
        Number(result.creditCost)>0&&Number(result.creditCost)<=100;
      setAvailable(ready);setPrice(ready?Number(result.creditCost):null);
      setServiceReason(!ready?result.reason||'AI generation is unavailable.':'');
    }catch{setAvailable(false);setPrice(null);setServiceReason('Cannot verify AI service readiness.');}
    finally{setChecking(false);}
  };
  const loadHistory=async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {data,error}=await supabase.from('marketing_poster_jobs')
      .select('id,business_id,created_at').eq('user_id',user.id).eq('state','completed')
      .order('created_at',{ascending:false}).limit(24);
    if(!error)setHistory((data||[]) as HistoryItem[]);
  };
  const openArtwork=async(jobId:string)=>{
    if(!uuid.test(jobId))throw Error('Invalid private artwork identifier.');
    const res=await fetch('/api/marketing/poster/artwork?jobId='+encodeURIComponent(jobId),noStore);
    if(!res.ok)throw Error('Your private poster could not be loaded.');
    const blob=await res.blob();
    if(blob.type!=='image/png'||blob.size<64||blob.size>12_000_000)
      throw Error('The saved artwork was not a valid PNG.');
    const url=URL.createObjectURL(blob);
    try{
      const bitmap=await createImageBitmap(blob);
      const ratio=bitmap.width/bitmap.height;bitmap.close();
      setFormat(ratio>1.3?'landscape':ratio<0.66?'story':ratio<0.9?'portrait':'square');
    }catch{/* keep chosen aspect ratio */}
    if(currentBlob.current)URL.revokeObjectURL(currentBlob.current);
    currentBlob.current=url;setPreviewUrl(url);setSourceJobId(jobId);
  };
  const clearArtwork=()=>{
    if(currentBlob.current)URL.revokeObjectURL(currentBlob.current);
    currentBlob.current=null;setPreviewUrl('');setSourceJobId('');
  };
  const chooseBusiness=(id:string)=>{
    if(busy)return;
    setBusinessId(id);clearArtwork();setWorkspace(false);setPhase('idle');
    setAttachments(old=>{old.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview);});return [];});
    setIdea('');setEditIdea('');setReferenceSummary('');setReferenceSignature('');
    setDirectReferenceId('');setMessage('');
  };
  const addFiles=(files:FileList|null)=>{
    if(!files||busy)return;
    const newItems:Attachment[]=[];
    for(const file of Array.from(files)){
      const mime=mimeFor(file);
      if(!allowedMimes.has(mime)||file.size<16||file.size>maxAttachment){
        setMessage('Attach PNG, JPG, WebP, PDF, TXT or MD files up to 1.5 MB each.');
        continue;
      }
      newItems.push({
        file,mime,id:crypto.randomUUID(),
        preview:mime.startsWith('image/')?URL.createObjectURL(file):null,
      });
    }
    const all=[...attachments,...newItems];
    if(all.length>4||all.reduce((n,a)=>n+a.file.size,0)>3_500_000){
      newItems.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview);});
      setMessage('You can add up to 4 references, 3.5 MB combined.');
      return;
    }
    setAttachments(all);setReferenceSignature('');setReferenceSummary('');
    setMessage('References attached. Images are reference-only unless you explicitly select direct use.');
    if(filePicker.current)filePicker.current.value='';
  };
  const removeFile=(id:string)=>{
    const match=attachments.find(a=>a.id===id);
    if(match?.preview)URL.revokeObjectURL(match.preview);
    setAttachments(v=>v.filter(a=>a.id!==id));
    if(directReferenceId===id)setDirectReferenceId('');
    setReferenceSummary('');setReferenceSignature('');
  };
  const getReferenceContext=async()=>{
    if(!attachments.length)return '';
    const signature=businessId+'|'+attachments.map(a=>a.id).join('|');
    if(signature===referenceSignature&&referenceSummary)return referenceSummary;
    setPhase('references');
    setMessage('Reading attached references to understand your style and context…');
    const form=new FormData();
    form.set('businessId',businessId);
    for(const a of attachments){
      form.append('files',a.mime===a.file.type?a.file:
        new File([a.file],a.file.name,{type:a.mime}),a.file.name);
    }
    const r=await fetch('/api/marketing/poster/references/analyze',{method:'POST',
      credentials:'same-origin',cache:'no-store',body:form});
    const j=await r.json() as {summary?:string;error?:string};
    if(!r.ok||typeof j.summary!=='string')throw Error(j.error||'Reference could not be understood.');
    setReferenceSummary(j.summary);setReferenceSignature(signature);
    return j.summary;
  };
  const directSource=async(id:string)=>{
    const item=attachments.find(a=>a.id===id);
    if(!item||!isPhoto(item))throw Error('Choose an attached photo for direct use.');
    const image=await createImageBitmap(item.file);
    const scale=Math.min(1,480/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx){image.close();throw Error('Image preparation is unavailable.');}
    ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
    const output=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
      b=>b?resolve(b):reject(Error('Unable to prepare the selected image.')),'image/jpeg',0.84));
    return await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error('Unable to read attached image.'));
      reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
      reader.readAsDataURL(output);
    });
  };
  const submit=async(refine:boolean)=>{
    if(busy)return;
    const text=(refine?editIdea:idea).trim();
    if(!businessId||text.length<5){
      setMessage('Choose your business and describe your idea in at least five characters.');return;
    }
    if(refine&&!sourceJobId){setMessage('Open the existing poster you want to edit.');return;}
    if(!available||price===null){
      setMessage(serviceReason||'AI creation is unavailable or the daily limit is reached.');return;
    }
    if(refine&&directReferenceId){
      setMessage('Direct photo use is for new posters. Deselect it to edit your saved poster.');return;
    }
    if(!window.confirm((refine?'Edit the same saved poster':'Generate one real AI poster')+
      ' for '+price+' Growth Credits? Nothing will be posted automatically.'))return;
    setWorkspace(true);setBusy(true);setPercent(3);setPhase(attachments.length?'references':'preparing');
    setMessage('Preparing your AI creation…');
    try{
      const summary=await getReferenceContext();
      setPhase('preparing');
      const body:Record<string,unknown>={
        businessId,format,style:inferPosterArtStyle(text),mood:'premium',
        layout:'copy-left',objective:'promotion',language,
        subject:refine?(idea.trim()||'Edit the existing poster while preserving its other elements'):text.slice(0,400),
        offer:'',audience:'',notes:'',
        requestKey:crypto.randomUUID(),acceptedCredits:price,
      };
      if(summary)body.referenceSummary=summary;
      if(refine){body.sourceJobId=sourceJobId;body.editInstruction=text.slice(0,400);}
      if(!refine&&directReferenceId){
        body.directImageUse=true;
        body.referenceImageMime='image/jpeg';
        body.referenceImageBase64=await directSource(directReferenceId);
      }
      setPhase('generating');
      setMessage('Creating your poster with the selected business and your prompt…');
      const res=await fetch('/api/marketing/poster/generate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'same-origin',cache:'no-store',body:JSON.stringify(body),
      });
      const result=await res.json() as {jobId?:string;chargedCredits?:number;error?:string};
      if(!res.ok||!result.jobId)throw Error(result.error||'AI provider did not return an image.');
      setPhase('downloading');setPercent(p=>Math.max(p,95));
      await openArtwork(result.jobId);
      setLastCharge(typeof result.chargedCredits==='number'?result.chargedCredits:null);
      setPhase('ready');setPercent(100);setEditIdea('');
      setMessage(refine?'AI completed the edit of your saved image.':'Your real AI poster is ready.');
      await loadHistory();
      await checkService();
    }catch(err){
      setPhase('failed');setMessage(friendlyError(err));setPercent(0);
      await checkService();
    }finally{setBusy(false);}
  };
  const transcribeAudio=async(blob:Blob,target:'create'|'edit')=>{
    setTranscribing(true);
    setMessage('Transcribing your voice — the text will be shown for review.');
    try{
      if(!businessId)throw Error('Choose a business before speaking.');
      if(blob.size<800||blob.size>1_500_000)
        throw Error('Record a short clear message (maximum 1.5 MB).');
      const res=await fetch('/api/marketing/poster/transcribe',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':blob.type||'audio/webm',
          'x-slbi-business-id':businessId,'x-slbi-language':language},
        body:blob,
      });
      const data=await res.json() as {transcript?:string;error?:string};
      if(!res.ok||!data.transcript)throw Error(data.error||'Voice could not be transcribed.');
      const heard=data.transcript.trim();
      if(target==='edit')setEditIdea(v=>[v,heard].filter(Boolean).join(' ').slice(0,400));
      else setIdea(v=>[v,heard].filter(Boolean).join(' ').slice(0,400));
      setMessage('Transcript ready. Please check the words, then press Generate yourself.');
    }catch(err){setMessage(friendlyError(err));}
    finally{setTranscribing(false);}
  };
  const startVoice=async(target:'create'|'edit')=>{
    if(recording){stopMic();return;}
    if(busy||transcribing)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setMessage('This browser cannot record microphone audio. Please use a supported browser or type.');
      return;
    }
    try{
      // Trigger the browser's native microphone Allow permission prompt.
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(
        t=>MediaRecorder.isTypeSupported(t));
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      micStream.current=stream;recorder.current=rec;setVoiceTarget(target);
      const parts:BlobPart[]=[];
      rec.ondataavailable=e=>{if(e.data.size>0)parts.push(e.data);};
      rec.onerror=()=>{setMessage('Microphone recording failed. Please type instead.');stopMic();};
      rec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());micStream.current=null;recorder.current=null;
        if(recordingTimer.current)clearTimeout(recordingTimer.current);
        setRecording(false);
        if(parts.length)void transcribeAudio(new Blob(parts,{type:rec.mimeType}),target);
      };
      rec.start(250);setRecording(true);setMessage('Listening… click the microphone again when you finish.');
      recordingTimer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop();},12000);
    }catch(err){
      setRecording(false);
      setMessage(err instanceof Error&&err.name==='NotAllowedError'
        ?'Microphone access was denied. Allow it in your browser settings or type your idea.'
        :'Unable to access your microphone. Type your prompt instead.');
    }
  };
  const download=async()=>{
    if(!previewUrl)return;
    const blob=await fetch(previewUrl).then(r=>r.blob());
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='slbi-ai-poster-'+format+'.png';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  const share=async()=>{
    if(!previewUrl)return;
    const blob=await fetch(previewUrl).then(r=>r.blob());
    const file=new File([blob],'slbi-ai-poster.png',{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'My business poster'});}
      catch(err){if(err instanceof Error&&err.name!=='AbortError')setMessage('Unable to share. Download the PNG instead.');}
    }else{await download();setMessage('Downloaded PNG. Upload it to your social app manually.');}
  };
  const openFromHistory=async(id:string)=>{
    if(busy)return;
    setWorkspace(true);setPhase('downloading');setBusy(true);setMessage('Opening saved poster…');
    try{await openArtwork(id);setPercent(100);setPhase('ready');setEditIdea('');
      setMessage('Your saved poster is ready for AI editing.');}
    catch(err){setPhase('failed');setMessage(friendlyError(err));}
    finally{setBusy(false);}
  };
  const reset=()=>{
    if(busy)return;
    clearArtwork();setWorkspace(false);setPhase('idle');setPercent(0);
    setAttachments(old=>{old.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview);});return [];});
    setReferenceSummary('');setReferenceSignature('');
    setIdea('');setEditIdea('');setDirectReferenceId('');setMessage('');setLastCharge(null);
  };
  const selectedHistory=history.filter(h=>h.business_id===businessId);
  const progressLabel=phase==='references'?'Reading reference materials'
    :phase==='preparing'?'Understanding your creative brief'
    :phase==='generating'?'AI is creating your poster'
    :phase==='downloading'?'Loading the final artwork'
    :phase==='failed'?'Generation could not be completed':'Ready';
  const serviceLabel=checking?'Checking AI provider…':available
    ?price+' Growth Credits per generation · Private AI image'
    :serviceReason||'AI generation is currently unavailable or the daily limit is reached.';
  const iconButton='inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E6E5] bg-white px-3 py-2.5 text-xs font-semibold text-[#615B5E] transition hover:border-[#EFAC78] hover:bg-[#FFF9F4] disabled:opacity-45';
  const composer=<div className="rounded-[25px] border border-[#E7E4E3] bg-white p-4 shadow-[0_18px_60px_rgba(30,24,20,.06)] sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor="creative-business" className="text-[11px] font-extrabold uppercase tracking-[.13em] text-[#948A86]">Selected business</label>
      <span className="text-[10px] font-semibold text-[#928981]">Private workspace</span>
    </div>
    <div className="relative mt-2">
      <select id="creative-business" value={businessId} disabled={busy||recording}
        onChange={e=>chooseBusiness(e.target.value)}
        className="w-full appearance-none rounded-[14px] border border-[#E9E5E4] bg-[#FBFAF9] px-4 py-3.5 pr-11 text-sm font-semibold text-[#242123] outline-none focus:border-[#F29A50]">
        {!businesses.length&&<option value="">No business available</option>}
        {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#97908B]">⌄</span>
    </div>
    <label htmlFor="creative-prompt" className="mt-5 block text-[11px] font-extrabold uppercase tracking-[.13em] text-[#948A86]">Describe your poster</label>
    <textarea id="creative-prompt" value={idea} onChange={e=>setIdea(e.target.value)}
      maxLength={400} rows={workspace?4:6}
      placeholder="Describe the poster you want… தமிழ், සිංහල, English or Tanglish — anything works."
      onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void submit(false);}}}
      className="mt-2 w-full resize-none rounded-[16px] border border-[#EFECEB] bg-[#FCFBFA] px-4 py-3.5 text-sm leading-7 text-[#252124] outline-none placeholder:text-[#A6A09F] focus:border-[#F5AD76]"/>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Poster size">
      {(Object.entries(formats) as Array<[PosterFormat,{label:string;ratio:string}]>).map(([key,value])=>
        <button type="button" key={key} aria-pressed={format===key} disabled={busy}
          onClick={()=>setFormat(key)}
          className={'rounded-full border px-3 py-2 text-[11px] font-bold transition '+(format===key?
            'border-[#FFC89F] bg-[#FFF0E6] text-[#AA541C]':
            'border-[#EBE7E7] bg-white text-[#81777A] hover:bg-[#FBF8F7]')}>{value.label}</button>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0ECEA] pt-4">
      <input ref={filePicker} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
        className="hidden" onChange={e=>addFiles(e.target.files)} aria-label="Attach reference images and documents"/>
      <button type="button" className={iconButton} disabled={busy}
        onClick={()=>filePicker.current?.click()} title="Images are reference-only unless directly selected">
        <Paperclip size={16}/> Add reference
      </button>
      <button type="button" className={iconButton} disabled={busy||transcribing}
        aria-pressed={recording&&voiceTarget==='create'}
        onClick={()=>void startVoice('create')}>
        {transcribing?<LoaderCircle size={16} className="animate-spin"/>:<Mic size={16} className={recording&&voiceTarget==='create'?'text-red-500 animate-pulse':''}/>}
        {recording&&voiceTarget==='create'?'Stop recording':transcribing?'Transcribing…':'Voice message'}
      </button>
      <button type="button" disabled={busy||checking||!available||!businessId||idea.trim().length<5}
        onClick={()=>void submit(false)}
        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#222024] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#393439] disabled:cursor-not-allowed disabled:opacity-40">
        <Sparkles size={16}/>{busy?'Creating…':'Generate'}<ArrowUpRight size={15}/>
      </button>
    </div>
    {attachments.length>0&&<div className="mt-4 space-y-2 border-t border-[#F0ECEA] pt-4">
      <p className="text-[11px] font-bold text-[#8B7D75]">Attachments <span className="font-normal">· Images are reference-only by default</span></p>
      {attachments.map(a=><div key={a.id} className="flex items-center gap-2 rounded-xl border border-[#F0ECEA] bg-[#FAF9F8] p-2">
        {a.preview?<img src={a.preview} alt="Attached visual reference" className="h-11 w-11 shrink-0 rounded-lg object-cover"/>:
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[#E69A5B]"><FileText size={19}/></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-[#464042]">{a.file.name}</p>
          <p className="text-[10px] text-[#9B938E]">{isPhoto(a)?'Style reference':'Context document'} · {(a.file.size/1024).toFixed(0)} KB</p>
          {isPhoto(a)&&<button type="button" disabled={busy}
            onClick={()=>setDirectReferenceId(id=>id===a.id?'':a.id)}
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#A85C27]">
            <span className={'grid h-3.5 w-3.5 place-items-center rounded border '+(directReferenceId===a.id?'border-[#CE792F] bg-[#CE792F] text-white':'border-[#C8BEB7] bg-white')}>
              {directReferenceId===a.id&&<Check size={11}/>}
            </span>
            {directReferenceId===a.id?'Use this actual image in my poster':'Use actual image (optional)'}
          </button>}
        </div>
        <button type="button" disabled={busy} aria-label={'Remove '+a.file.name}
          className="rounded-lg p-2 text-[#98908A] hover:bg-[#F5EBE5] hover:text-[#B65530]"
          onClick={()=>removeFile(a.id)}><X size={15}/></button>
      </div>)}
      {directReferenceId&&<p className="rounded-lg bg-[#FFF4E8] px-3 py-2 text-[11px] leading-5 text-[#96572B]">Direct use is explicitly selected: AI will receive that photo as its source. Its exact pixels may change during generation.</p>}
    </div>}
    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]">
      <span className="font-semibold text-[#978D89]">Poster language</span>
      {(['ta','si','en'] as PosterLanguage[]).map(lang=><button type="button" key={lang}
        onClick={()=>setLanguage(lang)} disabled={busy} aria-pressed={lang===language}
        className={'rounded-full px-3 py-1.5 font-bold '+(lang===language?'bg-[#FFF0E5] text-[#AB602A]':'text-[#A39B99] hover:bg-[#F7F5F4]')}>
        {languageLabels[lang]}</button>)}
    </div>
    <p className="mt-4 text-[11px] leading-5 text-[#8E8581]">{serviceLabel}</p>
  </div>;

  const historyView=<section className="mt-5 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xs font-extrabold tracking-wide text-[#51494B]">Your recent AI posters</h2>
      <span className="text-[10px] text-[#A49A96]">{selectedHistory.length} saved</span>
    </div>
    {selectedHistory.length===0?<p className="text-xs text-[#9B9290]">Successfully generated posters will appear here.</p>:
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
        {selectedHistory.map(h=><button type="button" key={h.id}
          onClick={()=>void openFromHistory(h.id)} disabled={busy}
          className={'overflow-hidden rounded-xl border p-1 text-left transition hover:border-[#F0A76A] '+(sourceJobId===h.id?'border-[#ED994D]':'border-[#E9E5E3]')}>
          <img src={'/api/marketing/poster/artwork?jobId='+h.id} loading="lazy"
            alt={'Generated poster '+new Date(h.created_at).toLocaleDateString()}
            className="aspect-square w-full rounded-md object-cover"/>
          <span className="block truncate pt-1 text-[9px] text-[#9F9591]">{new Date(h.created_at).toLocaleDateString()}</span>
        </button>)}
      </div>}
  </section>;

  const editControls=previewUrl&&<section className="mt-4 rounded-[23px] border border-[#E9E3DF] bg-white p-4">
    <div className="flex items-center gap-2 text-[#383035]"><WandSparkles size={17} className="text-[#E7873A]"/>
      <h2 className="text-sm font-extrabold">Edit this image with AI</h2></div>
    <p className="mt-1 text-xs leading-5 text-[#958B86]">Tell AI what to change. The saved original image is used as the source.</p>
    <label htmlFor="ai-edit-prompt" className="sr-only">Describe the change to this image</label>
    <textarea id="ai-edit-prompt" value={editIdea} onChange={e=>setEditIdea(e.target.value)}
      rows={3} maxLength={400} placeholder="Make the background gold, keep the same product and contact details…"
      className="mt-3 w-full resize-none rounded-xl border border-[#EEEAE7] bg-[#FCFBFA] p-3 text-sm leading-6 outline-none focus:border-[#E7A56C]"/>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className={iconButton} disabled={busy||transcribing}
        onClick={()=>void startVoice('edit')}>
        <Mic size={15} className={recording&&voiceTarget==='edit'?'animate-pulse text-red-500':''}/>
        {recording&&voiceTarget==='edit'?'Stop voice':'Voice'}
      </button>
      <button type="button" disabled={busy||!available||editIdea.trim().length<5}
        onClick={()=>void submit(true)}
        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#272226] px-4 py-3 text-xs font-bold text-white disabled:opacity-40">
        <WandSparkles size={15}/> Edit with AI
      </button>
    </div>
    {lastCharge!==null&&<p className="mt-2 text-[11px] text-[#9B928F]">Last successful request: {lastCharge} Growth Credits.</p>}
  </section>;

  const output=<section aria-label="AI artwork output" className="flex h-full min-h-[430px] flex-col overflow-hidden rounded-[26px] border border-[#E8E3E0] bg-[radial-gradient(ellipse_at_50%_10%,#FFF4E9_0%,#F8F7F7_52%,#F2F0F0_100%)] p-4 shadow-[0_20px_65px_rgba(42,32,26,.07)] sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#B36B37]">Your AI workspace</p>
        <h2 className="mt-0.5 text-base font-extrabold text-[#2E292C]">{busy?'Creating something beautiful':previewUrl?'Your generated artwork':'Live poster preview'}</h2></div>
      <span className="rounded-full border border-white bg-white/75 px-3 py-2 text-[11px] font-bold text-[#8A7C75]">{formats[format].label}</span>
    </div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center py-5">
      <div style={{aspectRatio:formats[format].ratio}}
        className={'relative flex max-h-full w-auto max-w-full items-center justify-center overflow-hidden rounded-2xl bg-[#E5E2E0] shadow-[0_24px_60px_rgba(37,31,30,.18)] '+
          (format==='landscape'?'min-w-[min(100%,320px)]':'min-h-[min(72%,280px)]')}>
        {previewUrl&&!busy?
          <img src={previewUrl} alt="Your actual AI-generated marketing poster" className="h-full w-full object-contain"/>:
          <div className="relative flex h-full w-full min-h-[280px] flex-col items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#F9EEE5,#E9E1DF_55%,#F6F2EF)] px-5 text-center">
            <div className="absolute inset-0 opacity-50 [background:linear-gradient(100deg,transparent_10%,rgba(255,255,255,.55)_45%,transparent_75%)] [background-size:220%_100%] motion-safe:animate-pulse"/>
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white bg-white/75 shadow-sm">
              {busy?<LoaderCircle size={27} className="animate-spin text-[#DF8D49]"/>:<ImageIcon size={26} className="text-[#CB9673]"/>}
            </div>
            <p className="relative mt-4 text-xs font-bold text-[#77675F]">{busy?progressLabel:'Your new poster will appear here'}</p>
            {busy&&<div className="relative mt-4 w-[min(90%,270px)]">
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div className="h-full rounded-full bg-gradient-to-r from-[#E8AD72] to-[#F58128] transition-[width] duration-700"
                  style={{width:percent+'%'}}/>
              </div>
              <p className="mt-2 text-center text-xs font-extrabold tabular-nums text-[#926746]">{Math.min(percent,94).toFixed(0)}%</p>
              <p className="mt-1 text-center text-[10px] text-[#9D8B82]">Estimated · 100% only when the image is loaded</p>
            </div>}
          </div>}
      </div>
    </div>
    {previewUrl&&!busy&&<div className="flex flex-wrap justify-center gap-2 border-t border-[#E9E4E1] pt-4">
      <button className="inline-flex items-center gap-2 rounded-xl bg-[#262125] px-4 py-3 text-xs font-bold text-white" onClick={()=>void download()}>
        <Download size={15}/> Download PNG
      </button>
      <button className={iconButton} onClick={()=>void share()}><Share2 size={15}/> Share</button>
      <button className={iconButton} onClick={reset}><Plus size={15}/> New poster</button>
    </div>}
    {!previewUrl&&!busy&&<p className="pb-2 text-center text-xs text-[#938781]">
      {phase==='failed'?'Please review the error in the left panel and retry.':
      'Only real AI-generated images will appear here — no fake drafts.'}
    </p>}
  </section>;

  return <main className="mx-auto flex w-full max-w-[1480px] flex-col px-3 pb-6 pt-3 text-[#262225] sm:px-5 lg:pb-3">
    <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#272226] text-[#F8A45A]"><Sparkles size={21}/></span>
        <div><p className="text-sm font-extrabold tracking-tight">SLBI Creative AI</p>
          <p className="text-[11px] font-medium text-[#9C928D]">Poster Design Studio · Pro</p></div>
      </div>
      <Link href="/vendor/marketing" className="inline-flex items-center gap-2 rounded-full border border-[#E8E3E1] px-3 py-2 text-xs font-bold text-[#62585A] hover:bg-white">
        <ArrowLeft size={14}/> Marketing
      </Link>
    </div>
    {message&&<div role={phase==='failed'?'alert':'status'} aria-live="polite"
      className={'mb-4 rounded-2xl border px-4 py-3 text-xs leading-6 '+(phase==='failed'?
        'border-[#F2CAC6] bg-[#FFF5F3] text-[#A24337]':'border-[#F3E1CD] bg-[#FFF9F0] text-[#8B6339]')}>
      {message}<button aria-label="Dismiss message" className="float-right ml-4 p-1" onClick={()=>setMessage('')}><X size={14}/></button>
    </div>}
    {!workspace?<div className="mx-auto flex w-full max-w-[740px] flex-1 flex-col justify-center pb-7 pt-3 lg:min-h-[calc(100dvh-220px)]">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#F0D3BC] bg-[#FFF7EE] px-4 py-2 text-[11px] font-extrabold text-[#A9612B]">
          <Sparkles size={13}/> Your AI creative companion
        </div>
        <h1 className="text-[clamp(28px,4vw,42px)] font-black leading-tight tracking-[-.04em] text-[#272226]">What shall we create today?</h1>
        <p className="mt-3 text-sm leading-6 text-[#8D8380]">Just describe it, speak it, or add a reference. Your business drives the design.</p>
      </div>
      {composer}
      <div className="mt-5">{historyView}</div>
      <p className="mt-5 text-center text-[11px] text-[#A49B98]">Your files stay private. Nothing posts to social media automatically. No manual graphic editor.</p>
    </div>:
    <div className="grid min-h-0 flex-1 gap-4 lg:h-[calc(100dvh-170px)] lg:min-h-[570px] lg:grid-cols-[minmax(345px,.86fr)_minmax(0,1.14fr)] lg:overflow-hidden">
      {/* Desktop: LEFT controls; RIGHT output. Mobile: output above controls. */}
      <aside aria-label="Poster controls" className="order-2 min-h-0 lg:order-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold text-[#8F817A]">CREATE / REFINE</p>
          <button onClick={reset} disabled={busy} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold text-[#A96435] hover:bg-[#FFF2E8]">
            <Plus size={14}/> New poster
          </button>
        </div>
        {composer}
        {editControls}
        {historyView}
      </aside>
      <div className="order-1 min-h-0 lg:order-2">{output}</div>
    </div>}
  </main>;
}
