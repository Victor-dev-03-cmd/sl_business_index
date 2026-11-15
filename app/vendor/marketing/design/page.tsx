'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabaseClient';
import IconsaxIcon from '../../components/IconsaxIcon';
import {type PosterFormat} from '@/lib/marketing/poster-design';
import {inferPosterArtStyle,type PosterLanguage} from '@/lib/marketing/poster-creative-engine';

type Business={id:string;name:string};
type HistoryItem={id:string;business_id:string;created_at:string};
type SpeechRecognitionPort={
  lang:string;continuous:boolean;interimResults:boolean;
  onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;
  onerror:((event:{error?:string})=>void)|null;
  onend:(()=>void)|null;start:()=>void;stop:()=>void;
};
type SpeechWindow=Window & {SpeechRecognition?:new()=>SpeechRecognitionPort;
  webkitSpeechRecognition?:new()=>SpeechRecognitionPort};
const noStore={cache:'no-store' as const,credentials:'same-origin' as const};
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const formatNames:Record<PosterFormat,string>={
  square:'Square post',portrait:'Portrait feed',story:'Story / WhatsApp',landscape:'Landscape',
};
const ideaChips=[
  ['Festival','Design a premium festival greeting poster for my business'],
  ['Special offer','Create an exciting promotion poster highlighting my real special offer'],
  ['Food','Design an irresistible restaurant food promotion with professional photography'],
  ['New arrival','Create a luxury new arrival announcement for my shop'],
];
export default function PosterCreativeChat(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [language,setLanguage]=useState<PosterLanguage>('ta');
  const [format,setFormat]=useState<PosterFormat>('square');
  const [idea,setIdea]=useState('');
  const [editIdea,setEditIdea]=useState('');
  const [sourceJobId,setSourceJobId]=useState('');
  const [previewUrl,setPreviewUrl]=useState('');
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [price,setPrice]=useState<number|null>(null);
  const [available,setAvailable]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [listening,setListening]=useState(false);
  const [message,setMessage]=useState('');
  const [lastCharge,setLastCharge]=useState<number|null>(null);
  const speech=useRef<SpeechRecognitionPort|null>(null);
  const currentBlob=useRef<string|null>(null);
  const [voiceForEdit,setVoiceForEdit]=useState(false);

  const loadHistory=async(ownerId:string)=>{
    const {data,error}=await supabase.from('marketing_poster_jobs')
      .select('id,business_id,created_at').eq('user_id',ownerId)
      .eq('state','completed').order('created_at',{ascending:false}).limit(18);
    if(!error)setHistory((data||[]) as HistoryItem[]);
  };
  const checkService=async()=>{
    try{
      const response=await fetch('/api/marketing/poster/capabilities',noStore);
      if(!response.ok)throw Error('Unavailable');
      const info=await response.json() as {available?:boolean;creditCost?:number};
      const ready=info.available===true&&Number.isInteger(info.creditCost)&&
        Number(info.creditCost)>0&&Number(info.creditCost)<=100;
      setAvailable(ready);setPrice(ready?Number(info.creditCost):null);
    }catch{setAvailable(false);setPrice(null);}
    finally{setChecking(false);}
  };
  useEffect(()=>{
    let mounted=true;
    void supabase.auth.getUser().then(async({data:{user}})=>{
      if(!mounted||!user)return;
      const {data}=await supabase.from('businesses').select('id,name')
        .eq('owner_id',user.id).order('name').limit(250);
      if(!mounted)return;
      const owned=(data||[]) as Business[];
      setBusinesses(owned);setBusinessId(owned[0]?.id||'');
      await loadHistory(user.id);
    });
    void checkService();
    return()=>{mounted=false;speech.current?.stop();
      if(currentBlob.current)URL.revokeObjectURL(currentBlob.current);};
  },[]);

  const openArtwork=async(jobId:string)=>{
    if(!uuid.test(jobId))throw Error('Invalid private artwork ID.');
    const res=await fetch('/api/marketing/poster/artwork?jobId='+encodeURIComponent(jobId),noStore);
    if(!res.ok)throw Error('Unable to open this private image. Please sign in again.');
    const blob=await res.blob();
    if(blob.type!=='image/png'||blob.size<64||blob.size>12_000_000)
      throw Error('Generated artwork was not a valid PNG.');
    const newUrl=URL.createObjectURL(blob);
    // Recover the aspect ratio of previous private jobs before editing.
    try{
      const bitmap=await createImageBitmap(blob);
      const ratio=bitmap.width/bitmap.height;bitmap.close();
      setFormat(ratio>1.3?'landscape':ratio<0.66?'story':ratio<0.9?'portrait':'square');
    }catch{ /* Keep the user's chosen format if decoding metadata is unavailable. */ }
    if(currentBlob.current)URL.revokeObjectURL(currentBlob.current);
    currentBlob.current=newUrl;setPreviewUrl(newUrl);setSourceJobId(jobId);
  };
  const selectedHistory=history.filter(x=>x.business_id===businessId);
  const submit=async(refine:boolean)=>{
    const original=idea.trim();
    const change=editIdea.trim();
    if(!businessId||original.length<5&&!refine){
      setMessage('Choose your business and describe the poster in a few words.');return;
    }
    if(refine&&(!sourceJobId||change.length<5)){
      setMessage('Choose your poster and describe exactly what you want changed.');return;
    }
    if(!available||price===null){
      setMessage('AI generation is currently unavailable. No image or credits will be charged.');return;
    }
    const text=original.length>=5?original:'Enhance this existing business marketing poster';
    if(!window.confirm((refine?'Edit this SAME existing image':'Generate ONE new AI poster')+
      ' using a real AI image model for '+price+' Growth Credits? The result stays private.'))return;
    setBusy(true);setMessage(refine?'Editing your existing image with AI…':
      'Generating a real premium marketing image…');
    try{
      const body:Record<string,unknown>={
        businessId,format,style:inferPosterArtStyle(text),mood:'premium',
        layout:'copy-left',objective:'promotion',language,
        subject:text.slice(0,400),offer:'',audience:'',notes:'',
        requestKey:crypto.randomUUID(),acceptedCredits:price,
      };
      if(refine){body.sourceJobId=sourceJobId;body.editInstruction=change;}
      const response=await fetch('/api/marketing/poster/generate',{
        ...noStore,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      });
      const result=await response.json() as {jobId?:string;chargedCredits?:number;error?:string};
      if(!response.ok||!result.jobId)throw Error(result.error||'AI provider did not create an image.');
      await openArtwork(result.jobId);
      const {data:{user}}=await supabase.auth.getUser();
      if(user)await loadHistory(user.id);
      setLastCharge(typeof result.chargedCredits==='number'?result.chargedCredits:null);
      setEditIdea('');
      setMessage(refine?'Your image was edited by AI. Review the result and request another change if needed.':
        'Your real AI poster is ready. You can download it or edit it using another prompt.');
    }catch(e){setMessage(e instanceof Error?e.message:'Image generation failed. No artwork was saved.');
      // Re-read remaining daily capability: previous attempts may consume the cap,
      // even if internal credits were refunded.
      await checkService();
    }finally{setBusy(false);}
  };
  const startVoice=(forEdit:boolean)=>{
    if(listening){speech.current?.stop();return;}
    const voice=window as SpeechWindow;
    const Speech=voice.SpeechRecognition||voice.webkitSpeechRecognition;
    if(!Speech){setMessage('Microphone typing is not available in this browser. Type your idea instead.');return;}
    try{
      const rec=new Speech();
      rec.lang=language==='ta'?'ta-LK':language==='si'?'si-LK':'en-LK';
      rec.continuous=false;rec.interimResults=false;setVoiceForEdit(forEdit);
      rec.onresult=e=>{
        const heard=Array.from(e.results).map(v=>v[0]?.transcript||'').join(' ').trim();
        if(forEdit)setEditIdea(v=>[v,heard].filter(Boolean).join(' ').slice(0,400));
        else setIdea(v=>[v,heard].filter(Boolean).join(' ').slice(0,400));
      };
      rec.onerror=()=>setMessage('Could not transcribe that voice input. You can type instead.');
      rec.onend=()=>{setListening(false);speech.current=null;};
      speech.current=rec;rec.start();setListening(true);
    }catch{setListening(false);setMessage('Microphone permission unavailable. Please type instead.');}
  };
  const download=async()=>{
    if(!sourceJobId||!previewUrl)return;
    const blob=await fetch(previewUrl).then(r=>r.blob());
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='slbi-ai-poster-'+format+'.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  const share=async()=>{
    if(!previewUrl)return;
    const blob=await fetch(previewUrl).then(r=>r.blob());
    const image=new File([blob],'slbi-ai-poster.png',{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[image]})){
      try{await navigator.share({files:[image],title:'My AI business poster'});}
      catch(e){if(e instanceof Error&&e.name!=='AbortError')setMessage('Sharing failed. Download and post manually.');}
    }else{await download();setMessage('Image downloaded. Upload it manually to your social app.');}
  };
  const chooseOld=async(id:string)=>{
    setBusy(true);setMessage('');
    try{await openArtwork(id);setEditIdea('');setMessage('Saved AI poster opened. Describe any change to edit it.');}
    catch(e){setMessage(e instanceof Error?e.message:'Could not open poster.');}
    finally{setBusy(false);}
  };
  const reset=()=>{setSourceJobId('');setPreviewUrl('');setIdea('');setEditIdea('');
    setLastCharge(null);setMessage('');};
  const serviceLabel=checking?'Checking AI image provider…':available
    ?'Real AI generation available · '+price+' Growth Credits per request'
    :'AI generation currently unavailable. No fake image will be shown.';
  return <main className="mx-auto max-w-[960px] space-y-7 px-3 pb-20 pt-3 text-[#252328] sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B1B1F] text-[#FF9A18]"><IconsaxIcon name="magic-star" size={21}/></div>
        <div><p className="text-sm font-extrabold tracking-tight">SLBI Creative AI</p>
          <p className="text-xs text-[#908994]">AI Poster Studio · Pro</p></div>
      </div>
      <Link href="/vendor/marketing" className="rounded-full border border-[#E8E4EA] px-4 py-2 text-xs font-bold text-[#6E6874]">Back to Marketing</Link>
    </div>
    <div role="status" aria-live="polite">
      {message&&<p className="rounded-2xl border border-[#F2D9B8] bg-[#FFF9F0] p-4 text-sm leading-6 text-[#784B25]">{message}</p>}
    </div>
    {!previewUrl&&<section className="mx-auto max-w-[710px] space-y-5 py-7 sm:py-12">
      <div className="text-center">
        <span className="rounded-full border border-[#F3DCC9] bg-[#FFF8F1] px-4 py-2 text-[11px] font-bold text-[#9A501A]">✦ Your AI creative companion</span>
        <h1 className="mt-6 text-[clamp(28px,5vw,42px)] font-black leading-[1.18] tracking-[-.04em]">What poster shall we create today?</h1>
        <p className="mt-3 text-sm leading-6 text-[#88808C]">தமிழ், සිංහල or English — சொல்லுங்கள். AI design செய்யும்.</p>
      </div>
      <div className="rounded-[27px] border border-[#E6E2E9] bg-white p-4 shadow-[0_18px_54px_rgba(28,26,32,.06)] sm:p-5">
        <label htmlFor="creative-business" className="text-xs font-bold">My business</label>
        <select id="creative-business" value={businessId} onChange={e=>setBusinessId(e.target.value)}
          className="mt-2 w-full appearance-none rounded-xl border border-[#E7E4E8] bg-white px-4 py-3 pr-10 text-sm focus:border-[#FF8300]"
          style={{backgroundImage:"url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27 fill=%27none%27 stroke=%27%2364646b%27 stroke-width=%272%27/%3E%3C/svg%3E')",backgroundPosition:'right 16px center',backgroundSize:'18px 18px',backgroundRepeat:'no-repeat'}}>
          {!businesses.length&&<option value="">No business available</option>}
          {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <label htmlFor="creative-prompt" className="sr-only">Describe your AI poster</label>
        <textarea id="creative-prompt" value={idea} onChange={e=>setIdea(e.target.value)}
          maxLength={400} rows={5} placeholder="என் website development service-க்கு premium தீபாவளி offer poster உருவாக்கு…"
          onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void submit(false);}}}
          className="mt-4 w-full resize-y rounded-xl border-0 px-1 py-3 text-[15px] leading-7 outline-none placeholder:text-[#A5A0AA]"/>
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Poster size">
          {(Object.entries(formatNames) as Array<[PosterFormat,string]>).map(([key,label])=>
            <button key={key} type="button" aria-pressed={format===key}
              onClick={()=>setFormat(key)}
              className={'rounded-full border px-3 py-1.5 text-[11px] font-bold '+(format===key?
                'border-[#F1AC6A] bg-[#FFF4EA] text-[#A45722]':
                'border-[#E9E5EA] text-[#7F7882] hover:bg-[#FAF9FA]')}>{label}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0ECF0] pt-3">
          <button onClick={()=>startVoice(false)} disabled={busy} type="button"
            aria-pressed={listening&&!voiceForEdit} className="rounded-full border border-[#E8E5E8] px-4 py-2.5 text-xs font-bold">
            <IconsaxIcon name="microphone-2" size={16}/> {listening&&!voiceForEdit?'Listening…':'Speak'}
          </button>
          <button onClick={()=>void submit(false)} type="button"
            disabled={busy||checking||!available||!businessId||idea.trim().length<5}
            className="rounded-full bg-[#222125] px-5 py-3 text-xs font-extrabold text-white hover:bg-[#403C42] disabled:cursor-not-allowed disabled:opacity-40">
            <IconsaxIcon name="magic-star" size={15}/> {busy?'Generating…':'Generate AI poster'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label="Try an idea">
        {ideaChips.map(([label,prompt])=><button type="button" key={label} onClick={()=>setIdea(prompt)}
          className="rounded-full border border-[#E6E2E7] px-4 py-2 text-xs font-semibold text-[#665F6B] hover:border-[#FFC18D]">{label}</button>)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs text-[#8C858F]">Voice language</span>
        {([['ta','தமிழ்'],['si','සිංහල'],['en','English']] as const).map(([value,name])=>
          <button key={value} type="button" onClick={()=>setLanguage(value)}
            aria-pressed={language===value}
            className={'rounded-full px-3 py-1.5 text-xs font-bold '+(language===value?'bg-[#FFF0E3] text-[#AE5C21]':'text-[#89828A]')}>{name}</button>)}
      </div>
      <p className="text-center text-xs text-[#7D7680]">{serviceLabel}</p>
      <p className="text-center text-[11px] text-[#A19AA3]">Real image generation only. No manual designer, and nothing is posted automatically.</p>
    </section>}
    {!!previewUrl&&<section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-[#A95B1D]">AI-generated image</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Your poster is ready</h1>
          <p className="mt-1 text-xs text-[#77717B]">Describe a change below — AI will edit this image itself.</p></div>
        <button type="button" onClick={reset} className="rounded-full border border-[#E6E2E7] px-4 py-2 text-xs font-bold">+ New poster</button>
      </div>
      <div className="rounded-[24px] border border-[#E8E4E9] bg-[#FAF9FB] p-4 sm:p-6">
        <img src={previewUrl} alt="Your real AI-generated marketing artwork" className="mx-auto max-h-[620px] w-auto max-w-full rounded-xl object-contain shadow-lg"/>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={()=>void download()} className="rounded-full bg-[#242126] px-5 py-2.5 text-xs font-extrabold text-white">Download PNG</button>
          <button type="button" onClick={()=>void share()} className="rounded-full border border-[#DDD9E0] bg-white px-5 py-2.5 text-xs font-bold">Share manually</button>
        </div>
      </div>
      <div className="rounded-[24px] border border-[#E8E4E9] bg-white p-4 sm:p-5">
        <label htmlFor="ai-edit-prompt" className="text-sm font-extrabold">What should AI change in this image?</label>
        <textarea id="ai-edit-prompt" value={editIdea} onChange={e=>setEditIdea(e.target.value)}
          placeholder="உதாரணம்: Background-ஐ gold ஆக்கி, product-ஐ மட்டும் மாற்றாமல் வை…"
          maxLength={400} rows={3} className="mt-3 w-full resize-y rounded-xl border border-[#E7E3E9] p-3 text-sm leading-6 outline-none focus:border-[#F9A44E]"/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={()=>startVoice(true)} className="rounded-full border border-[#E9E5EA] px-4 py-2 text-xs font-bold">
            <IconsaxIcon name="microphone-2" size={15}/> {listening&&voiceForEdit?'Listening…':'Speak change'}
          </button>
          <button type="button" onClick={()=>void submit(true)}
            disabled={busy||!available||editIdea.trim().length<5}
            className="rounded-full bg-[#212025] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">
            {busy?'Editing image…':'Edit this image with AI'}
          </button>
        </div>
        {lastCharge!==null&&<p className="mt-2 text-[11px] text-[#8B838C]">Last successful generation charged {lastCharge} Growth Credits. AI edits use the same displayed credit price.</p>}
      </div>
    </section>}
    <section className="space-y-3 border-t border-[#F0ECF0] pt-6">
      <h2 className="text-sm font-bold">Your recent AI posters</h2>
      {!selectedHistory.length?<p className="text-xs text-[#89818B]">No saved AI posters yet. Successfully generated images will appear here.</p>:
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {selectedHistory.map(item=><button type="button" key={item.id} onClick={()=>void chooseOld(item.id)}
            className={'overflow-hidden rounded-xl border p-1 '+(item.id===sourceJobId?'border-[#FCA24F]':'border-[#E7E2E8]')}>
            <img src={'/api/marketing/poster/artwork?jobId='+item.id}
              alt={'Generated poster from '+new Date(item.created_at).toLocaleDateString()} loading="lazy"
              className="aspect-square w-full rounded-lg object-cover"/>
            <span className="block px-1 py-1 text-[10px] text-[#716A75]">{new Date(item.created_at).toLocaleDateString()}</span>
          </button>)}
        </div>}
    </section>
  </main>;
}
