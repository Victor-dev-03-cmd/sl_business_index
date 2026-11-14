'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabaseClient';
import IconsaxIcon from '../../components/IconsaxIcon';
import {
  DESIGN_STYLES,POSTER_FORMATS,LAYER_LABELS,
  newPosterBlueprint,parsePosterBlueprint,scalePosterBlueprint,
  type PosterBlueprint,type PosterFormat,type EditableTextLayer,
} from '@/lib/marketing/poster-design';
import {type CaptionLanguage,type CaptionObjective} from '@/lib/marketing/caption-contract';
type Business={id:string;name:string;logo_url:string|null};
const panel='rounded-[20px] border border-[#E7E7EC] bg-white p-5 shadow-[0_6px_24px_rgba(23,23,30,.045)] sm:p-6';
const input='mt-1.5 w-full rounded-lg border border-[#E4E4E8] bg-white px-3.5 py-2.5 text-xs text-[#27272C] outline-none focus:border-[#FF7900]';
const selectInput=input+' appearance-none pr-12';
const selectStyle={backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'none\'%3E%3Cpath d=\'m5 7.5 5 5 5-5\' stroke=\'%23615A60\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',backgroundSize:'16px 16px'} as const;
const defaultPoster=newPosterBlueprint('Business name');
const safeColor=(s:string)=>/^#[0-9A-Fa-f]{6}$/.test(s)?s:'#FFFFFF';
const fileDownload=(name:string,blob:Blob)=>{
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=name;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
};
function wrapPosterText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number):string[]|null{
  const lines:string[]=[];
  const clusters=(word:string)=>typeof Intl.Segmenter==='undefined'?Array.from(word):
    [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word)].map(x=>x.segment);
  for(const paragraph of text.replace(/\r/g,'').split('\n')){
    if(!paragraph.trim()){lines.push('');continue;}
    let current='';
    for(const token of paragraph.split(/(\s+)/u).filter(Boolean)){
      if(ctx.measureText(current+token).width<=maxWidth){current+=token;continue;}
      if(current.trim()){lines.push(current.trimEnd());current='';}
      if(ctx.measureText(token).width<=maxWidth){current=token.trimStart();continue;}
      for(const letter of clusters(token.trim())){
        if(current&&ctx.measureText(current+letter).width>maxWidth){lines.push(current);current='';}
        if(ctx.measureText(letter).width>maxWidth)return null;
        current+=letter;
      }
    }
    lines.push(current.trimEnd());
  }
  return lines;
}
function drawPoster(canvas:HTMLCanvasElement,project:PosterBlueprint,backdrop:HTMLImageElement|null){
  const dimensions=POSTER_FORMATS[project.format];
  canvas.width=dimensions.width;canvas.height=dimensions.height;
  const c=canvas.getContext('2d');
  if(!c)return;
  const w=dimensions.width,h=dimensions.height;
  c.fillStyle=project.background;c.fillRect(0,0,w,h);
  if(backdrop){
    const scale=Math.max(w/backdrop.naturalWidth,h/backdrop.naturalHeight);
    const wd=backdrop.naturalWidth*scale,hd=backdrop.naturalHeight*scale;
    c.drawImage(backdrop,(w-wd)/2,(h-hd)/2,wd,hd);
    c.fillStyle='rgba(0,0,0,.48)';c.fillRect(0,0,w,h);
  }
  const accent=project.accent;
  if(project.style==='editorial'){
    c.fillStyle=accent;c.fillRect(0,0,16,h);
    c.fillRect(w-230,0,230,18);
    c.strokeStyle=accent;c.lineWidth=5;c.strokeRect(57,72,w-114,h-144);
  }else if(project.style==='spotlight'){
    c.fillStyle=accent;c.beginPath();c.arc(w*0.9,h*0.12,Math.min(w,h)*0.47,0,Math.PI*2);c.fill();
    c.fillStyle=project.background;c.beginPath();c.arc(w*0.9,h*0.12,Math.min(w,h)*0.34,0,Math.PI*2);c.fill();
  }else if(project.style==='offset'){
    c.fillStyle=accent;c.fillRect(w*0.63,0,w*0.37,h);
    c.fillStyle=project.background;c.fillRect(w*0.66,36,w*.29,h-72);
    c.fillStyle=accent;c.fillRect(50,h-160,Math.max(0,w-100),7);
  }else{
    c.strokeStyle=accent;c.lineWidth=7;c.beginPath();c.moveTo(78,65);c.lineTo(w-78,65);c.stroke();
    c.beginPath();c.moveTo(78,h-80);c.lineTo(w-78,h-80);c.stroke();
  }
  // All text stays independently editable. Full export refuses overflow rather than cropping Tamil/Sinhala.
  c.textBaseline='top';
  const nonEmpty=[...project.layers].filter(layer=>layer.value.trim()).sort((a,b)=>a.y-b.y);
  const layouts:Array<{layer:EditableTextLayer;size:number;lines:string[];lineHeight:number}>=[];
  for(let i=0;i<nonEmpty.length;i++){
    const layer=nonEmpty[i];
    const maxWidth=w-layer.x-40;
    const bottom=(nonEmpty[i+1]?.y??h-26)-16;
    const maxHeight=bottom-layer.y;
    let chosen:null|{size:number;lines:string[];lineHeight:number}=null;
    if(maxWidth>40&&maxHeight>19){
      for(let size=layer.fontSize;size>=16;size-=2){
        c.font=(layer.bold?'800 ':'500 ')+size+'px "Noto Sans Tamil","Noto Sans Sinhala",system-ui,sans-serif';
        const lines=wrapPosterText(c,layer.value,maxWidth);
        const lineHeight=Math.ceil(size*1.25);
        if(lines&&lines.length*lineHeight<=maxHeight&&
            lines.every(line=>c.measureText(line).width<=maxWidth)){
          chosen={size,lines,lineHeight};break;
        }
      }
    }
    if(!chosen){
      c.fillStyle='rgba(32,20,20,.90)';c.fillRect(0,h-92,w,92);
      c.fillStyle='#FFFFFF';c.font='600 22px system-ui,sans-serif';
      c.fillText('Text does not fit. Edit or reposition layers before export.',32,h-62);
      return false;
    }
    layouts.push({layer,...chosen});
  }
  for(const block of layouts){
    c.font=(block.layer.bold?'800 ':'500 ')+block.size+'px "Noto Sans Tamil","Noto Sans Sinhala",system-ui,sans-serif';
    c.fillStyle=safeColor(block.layer.color);
    block.lines.forEach((line,i)=>c.fillText(line,block.layer.x,block.layer.y+i*block.lineHeight));
  }
  return true;
}
export default function MarketingDesignEditor(){
  const canvas=useRef<HTMLCanvasElement|null>(null);
  const drag=useRef<{id:EditableTextLayer['id'];offsetX:number;offsetY:number}|null>(null);
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [poster,setPoster]=useState<PosterBlueprint>(()=>defaultPoster);
  const [active,setActive]=useState<EditableTextLayer['id']>('headline');
  const [imageData,setImageData]=useState<string|null>(null);
  const [backdrop,setBackdrop]=useState<HTMLImageElement|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [textOverflow,setTextOverflow]=useState(false);
  const [aiLanguage,setAiLanguage]=useState<CaptionLanguage>('ta');
  const [aiObjective,setAiObjective]=useState<CaptionObjective>('promotion');
  const [aiBrief,setAiBrief]=useState('');
  const [aiConditions,setAiConditions]=useState('');
  const [aiCta,setAiCta]=useState('');
  const [aiDraft,setAiDraft]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user||!active)return;
      const {data}=await supabase.from('businesses').select('id,name,logo_url')
        .eq('owner_id',user.id).order('name').limit(250);
      if(!active)return;
      const list=(data??[]) as Business[];setBusinesses(list);
      setBusinessId(list[0]?.id||'');
      if(list[0])setPoster(newPosterBlueprint(list[0].name));
    });
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!imageData){setBackdrop(null);return;}
    let alive=true;const img=new window.Image();
    img.onload=()=>{if(alive)setBackdrop(img)};
    img.onerror=()=>{if(alive)setMessage('This image could not be decoded.')};
    img.src=imageData;
    return()=>{alive=false};
  },[imageData]);
  useEffect(()=>{
    const c=canvas.current;if(!c)return;
    let mounted=true;
    const render=()=>setTextOverflow(!drawPoster(c,poster,backdrop));
    void document.fonts.ready.then(()=>{if(mounted)render();});
    render();
    return()=>{mounted=false};
  },[poster,backdrop]);
  useEffect(()=>{
    if(!businessId)return;
    let current=true;
    const business=businesses.find(b=>b.id===businessId);
    if(business)setPoster(p=>{
      const layers=p.layers.map(l=>l.id==='business'?{...l,value:business.name}:l);
      return {...p,layers};
    });
    const ctrl=new AbortController();
    void fetch('/api/marketing/brand-profile?businessId='+encodeURIComponent(businessId),{
      cache:'no-store',credentials:'same-origin',signal:ctrl.signal,
    }).then(r=>r.ok?r.json():null).then(v=>{
      if(!current||!v?.profile)return;
      setPoster(p=>({...p,
        background:safeColor(v.profile.primary_color),
        accent:safeColor(v.profile.accent_color),
        foreground:safeColor(v.profile.secondary_color),
        layers:p.layers.map(l=>l.id==='business'
          ?{...l,value:v.profile.brand_name||business?.name||l.value}:l),
      }));
    }).catch(()=>{});
    return()=>{current=false;ctrl.abort()};
  },[businessId,businesses]);
  const layer=poster.layers.find(l=>l.id===active);
  const updateLayer=(key:keyof EditableTextLayer,value:string|number|boolean)=>{
    setPoster(p=>({...p,layers:p.layers.map(l=>l.id===active?{...l,[key]:value}:l)}));
  };
  const getCoords=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const el=canvas.current!,rect=el.getBoundingClientRect();
    return {x:(e.clientX-rect.left)*el.width/rect.width,
      y:(e.clientY-rect.top)*el.height/rect.height};
  };
  const onDown=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const point=getCoords(e);
    const found=[...poster.layers].reverse().find(l=>l.value.trim()
      && point.x>=l.x-15 && point.x<=l.x+Math.max(240,Math.min(800,l.value.length*l.fontSize*.45))
      && point.y>=l.y-20 && point.y<=l.y+l.fontSize*3.7);
    if(!found)return;
    setActive(found.id);
    drag.current={id:found.id,offsetX:point.x-found.x,offsetY:point.y-found.y};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(!drag.current)return;
    const point=getCoords(e),dragged=drag.current;
    const {width,height}=POSTER_FORMATS[poster.format];
    setPoster(p=>({...p,layers:p.layers.map(l=>l.id===dragged.id
      ?{...l,x:Math.max(0,Math.min(width-40,Math.round(point.x-dragged.offsetX))),
        y:Math.max(0,Math.min(height-40,Math.round(point.y-dragged.offsetY)))}
      :l)}));
  };
  const onUp=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    drag.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onImage=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){
      setMessage('Upload a PNG, JPEG or WebP image under 3 MB.');return;
    }
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==='string'){setImageData(reader.result);setMessage('Local artwork imported. The text remains independently editable.')}};
    reader.onerror=()=>setMessage('Could not read uploaded artwork.');
    reader.readAsDataURL(file);
  };
  const generateAiCopy=async()=>{
    if(aiBusy||!businessId||aiBrief.trim().length<5){
      setMessage('Choose an owned business and enter at least 5 characters about the offer.');return;
    }
    setAiBusy(true);setMessage('');setAiDraft('');
    try{
      // The existing caption endpoint rechecks verified Pro, RLS owner, Brand Kit,
      // server enable flag and atomic credit reservation. Do not call a model from the browser.
      const response=await fetch('/api/marketing/caption',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          businessId,requestKey:crypto.randomUUID(),objective:aiObjective,
          language:aiLanguage,message:aiBrief.trim(),
          conditions:aiConditions.trim(),cta:aiCta.trim(),
        }),
      });
      const result=await response.json() as {draft?:{caption?:unknown};error?:string};
      if(!response.ok)throw new Error(result.error||'AI assistant unavailable.');
      if(typeof result.draft?.caption!=='string'||!result.draft.caption.trim())
        throw new Error('AI service returned no usable draft.');
      setAiDraft(result.draft.caption);
      setMessage('AI copy draft received. Verify facts and edit before applying it to the poster.');
    }catch(error){setMessage(error instanceof Error?error.message:'AI assistant unavailable.');}
    finally{setAiBusy(false);}
  };
  const applyAiHeadline=()=>{
    const proposed=aiDraft.trim();
    if(!proposed||proposed.length>250){
      setMessage('Select or edit a short headline of 1–250 characters before applying it.');
      return;
    }
    setPoster(current=>({...current,layers:current.layers.map(layer=>
      layer.id==='headline'?{...layer,value:proposed}:layer)}));
    setMessage('Applied to the editable headline layer. Review layout, claims and spelling before export.');
  };
  const exportPng=async()=>{
    const c=canvas.current;if(!c)return;
    setBusy(true);setMessage('');
    try{
      await document.fonts.ready;
      if(!drawPoster(c,poster,backdrop))
        throw Error('Text overflow: shorten or reposition the highlighted layers before PNG export.');
      const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Canvas export failed.');
      fileDownload('slbi-original-'+poster.format+'-'+poster.style+'.png',blob);
      setMessage('Full-size PNG exported. Verify the business facts, prices and text spelling before posting.');
    }catch(error){setMessage(error instanceof Error?error.message:'Could not export PNG. Try another supported browser.');}
    finally{setBusy(false);}
  };
  const exportJson=()=>{
    fileDownload('slbi-editable-poster.json',new Blob([JSON.stringify(poster,null,2)],{type:'application/json'}));
    setMessage('Editable layout JSON exported. Local image upload is not embedded; keep the source artwork separately.');
  };
  const importJson=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.size>40000){setMessage('Project JSON is too large.');return;}
    try{
      const input=JSON.parse(await f.text()) as unknown;
      const validated=parsePosterBlueprint(input);
      if(!validated)throw Error('Invalid design project.');
      setPoster(validated);setMessage('Editable typography project restored. Reattach any separate background image.');
    }catch{setMessage('Invalid or unsupported poster project JSON.');}
  };
  const setFormat=(format:PosterFormat)=>setPoster(p=>scalePosterBlueprint(p,format));
  const dimensions=POSTER_FORMATS[poster.format];
  return <div className="mx-auto max-w-[1490px] space-y-5 pb-12 text-[#27272D]">
    <header className="relative flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-[24px] bg-[#1E1D22] px-6 py-8 text-white sm:px-9 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-[#FF7900]/25 blur-3xl"/>
      <div className="relative"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#F4AE7B]">Marketing Studio · P2-04</p>
        <h1 className="mt-2 text-[29px] font-extrabold tracking-[-.045em] sm:text-[39px]">Poster Design Studio <span className="text-[#FF9747]">· Pro</span></h1>
        <p className="mt-2 max-w-[680px] text-xs leading-6 text-white/70">
          Create original social posters with movable text, localized AI copy assistance, adjustable layouts and full-size image exports.
          AI image backgrounds and direct social publishing are not connected.
        </p></div>
      <div className="relative flex flex-wrap gap-2">
        <Link href="/vendor/marketing" className="rounded-xl border border-white/25 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/10">Marketing Studio</Link>
        <Link href="/vendor/marketing/brand" className="rounded-xl border border-[#FF7900] bg-[#FF7900] px-4 py-3 text-xs font-semibold text-[#211A17] transition hover:bg-[#FFA252]">Brand Profile</Link>
      </div>
    </header>
    {message&&<div role="status" className="rounded-lg border border-[#F1D7BC] bg-[#FFF9F3] p-3 text-xs text-[#79532D]">{message}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
      <section className={panel+' space-y-4'}>
        <h2 className="text-sm font-extrabold">Creative controls</h2>
        <label className="block text-xs font-bold">Business
          <select className={selectInput} style={selectStyle} value={businessId} onChange={e=>setBusinessId(e.target.value)}>
            {!businesses.length&&<option value="">Choose your business</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold">Canvas format
            <select className={selectInput} style={selectStyle} value={poster.format} onChange={e=>setFormat(e.target.value as PosterFormat)}>
              {Object.entries(POSTER_FORMATS).map(([key,v])=><option key={key} value={key}>{v.label} · {v.width} × {v.height}</option>)}
            </select></label>
          <label className="block text-xs font-bold">Original layout
            <select className={selectInput} style={selectStyle} value={poster.style} onChange={e=>setPoster(p=>({...p,style:e.target.value as typeof p.style}))}>
              {DESIGN_STYLES.map(s=><option value={s} key={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}
            </select></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['background','accent','foreground'] as const).map(field=><label key={field} className="block text-[10px] font-bold capitalize">
            {field}
            <input type="color" value={safeColor(poster[field])} onChange={e=>setPoster(p=>({...p,[field]:e.target.value.toUpperCase()}))}
              className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-[#E7E7EA] bg-white p-1"/>
          </label>)}
        </div>
        <div className="rounded-lg border border-[#ECECF0] bg-[#FBFBFC] p-4">
          <label htmlFor="editor-artwork-upload" className="text-xs font-bold">Background artwork (local upload)</label>
          <input id="editor-artwork-upload" type="file" accept="image/png,image/jpeg,image/webp"
            className="mt-2 block w-full text-xs" onChange={onImage}/>
          <p className="mt-2 text-[10px] leading-5 text-[#82828A]">Max 3 MB · PNG/JPEG/WebP. Source artwork stays in this browser; no cloud upload, no AI image generation.</p>
          {imageData&&<button type="button" onClick={()=>{setImageData(null);setBackdrop(null)}} className="mt-2 text-xs font-semibold text-[#B55616]">Remove background artwork</button>}
        </div>
        <section aria-label="AI poster copy assistant" className="rounded-xl border border-[#F2D8BE] bg-[#FFF8F1] p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#B85C12]">AI Creative Assistant · Pro</p>
              <h3 className="mt-1 text-[15px] font-extrabold">Generate editable poster copy</h3></div>
            <span className="rounded-full bg-[#242326] px-2.5 py-1 text-[10px] font-bold text-white">Review first</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#806A58]">Uses the existing protected AI Caption service and credit reservation. Disabled until a verified plan, owner Brand Kit and approved provider budget are available. No image-model calls, charges or auto-publishing are initiated by opening this studio.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-[11px] font-bold">Language
              <select className={selectInput} style={selectStyle} value={aiLanguage} onChange={e=>setAiLanguage(e.target.value as CaptionLanguage)}>
                <option value="en">English</option><option value="ta">தமிழ்</option><option value="si">සිංහල</option>
              </select></label>
            <label className="text-[11px] font-bold">Objective
              <select className={selectInput} style={selectStyle} value={aiObjective} onChange={e=>setAiObjective(e.target.value as CaptionObjective)}>
                <option value="promotion">Promotion</option><option value="awareness">Awareness</option>
                <option value="enquiries">Enquiries</option><option value="announcement">Announcement</option>
              </select></label>
          </div>
          <label className="mt-3 block text-[11px] font-bold">Offer / business facts
            <textarea className={input+' min-h-24 resize-y'} value={aiBrief} maxLength={600}
              placeholder="Describe only confirmed products, offers and factual details" onChange={e=>setAiBrief(e.target.value)}/></label>
          <label className="mt-3 block text-[11px] font-bold">Conditions (optional)
            <input className={input} maxLength={300} value={aiConditions} onChange={e=>setAiConditions(e.target.value)}/></label>
          <label className="mt-3 block text-[11px] font-bold">Call to action (optional)
            <input className={input} maxLength={180} value={aiCta} onChange={e=>setAiCta(e.target.value)}/></label>
          <button type="button" onClick={()=>void generateAiCopy()} disabled={aiBusy||!businessId||aiBrief.trim().length<5}
            className="mt-4 w-full rounded-lg bg-[#252326] px-4 py-3 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {aiBusy?'Generating secured draft…':'Generate AI copy (credits may apply)'}
          </button>
          {aiDraft&&<div className="mt-4 space-y-2">
            <label className="block text-[11px] font-bold">Review the AI draft · choose a short headline
              <textarea className={input+' min-h-28 resize-y'} value={aiDraft} onChange={e=>setAiDraft(e.target.value)}
                maxLength={3000}/></label>
            <p className="text-[10px] text-[#806A58]">The headline layer accepts up to 250 characters. Long captions remain editable here; they will never be silently truncated.</p>
            <button type="button" onClick={applyAiHeadline} className="rounded-lg border border-[#E5B98E] bg-white px-4 py-2 text-[11px] font-bold text-[#95501E]">Apply reviewed headline to poster</button>
          </div>}
        </section>
        <div className="border-t border-[#EEEEF0] pt-4">
          <h3 className="text-sm font-bold">Editable text layers</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#85858A]">Choose a layer to change the text, color, size and position. Drag directly on the poster to move it.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {poster.layers.map(l=><button key={l.id} type="button" onClick={()=>setActive(l.id)}
              className={'rounded-lg border px-3 py-2 text-left text-[11px] font-bold '+(active===l.id?'border-[#F3AE72] bg-[#FFF2E5] text-[#A8520C]':'border-[#E3E3E8] bg-white text-[#60606A]')}>
              {LAYER_LABELS[l.id]}
            </button>)}
          </div>
          {layer&&<div className="mt-4 space-y-3 rounded-lg border border-[#F1E0CE] bg-[#FFFCF8] p-4">
            <label className="block text-xs font-bold">{layer.label}
              <textarea className={input+' min-h-16 resize-y'} value={layer.value} maxLength={250}
                onChange={e=>updateLayer('value',e.target.value)}/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold">Font size
                <input type="number" min={16} max={125} className={input}
                  value={layer.fontSize} onChange={e=>updateLayer('fontSize',Math.min(125,Math.max(16,Number(e.target.value)||16)))}/></label>
              <label className="block text-xs font-bold">Text color
                <input type="color" className="mt-1.5 h-10 w-full rounded-lg border bg-white p-1"
                  value={layer.color} onChange={e=>updateLayer('color',e.target.value.toUpperCase())}/></label>
              <label className="block text-xs font-bold">X position
                <input type="number" min={0} max={dimensions.width} className={input}
                  value={layer.x} onChange={e=>updateLayer('x',Math.min(dimensions.width,Math.max(0,Number(e.target.value)||0)))}/></label>
              <label className="block text-xs font-bold">Y position
                <input type="number" min={0} max={dimensions.height} className={input}
                  value={layer.y} onChange={e=>updateLayer('y',Math.min(dimensions.height,Math.max(0,Number(e.target.value)||0)))}/></label>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={layer.bold}
              onChange={e=>updateLayer('bold',e.target.checked)} className="accent-[#FF7900]"/> Bold typography</label>
          </div>}
        </div>
      </section>
      <section className={panel+' min-w-0'}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-extrabold">Full-resolution live preview</h2>
            <p className="mt-1 text-xs text-[#8A8A91]">{dimensions.width} × {dimensions.height} · drag a text layer to reposition</p></div>
          <button type="button" onClick={()=>setPoster(newPosterBlueprint(businesses.find(b=>b.id===businessId)?.name||'Business name',poster.format))}
            className="rounded-lg border border-[#E8E8EC] px-3 py-2 text-xs font-semibold">Reset design</button>
        </div>
        <div className="mx-auto w-full max-w-[590px] rounded-lg border border-[#E8E8EA] bg-[#F0F0F3] p-3">
          <canvas ref={canvas} aria-label="Editable poster artwork preview" role="img"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            className="mx-auto block h-auto max-w-full cursor-move rounded-md shadow-lg"
            style={{width:'100%',touchAction:'none'}}/>
        </div>
        {textOverflow&&<p role="alert" className="mt-4 rounded-lg border border-[#EDBE91] bg-[#FFF2E7] p-3 text-[11px] font-semibold text-[#9B521D]">Some poster text does not fit the current layout. Shorten or reposition layers; PNG export is blocked rather than clipping multilingual text.</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={()=>void exportPng()} disabled={busy}
            className="h-11 rounded-lg bg-[#222226] px-4 text-xs font-extrabold text-white disabled:opacity-40">
            Export full-size PNG
          </button>
          <button type="button" onClick={exportJson}
            className="h-11 rounded-lg border border-[#E7E7EC] px-4 text-xs font-bold text-[#34343C]">
            Export editable JSON
          </button>
        </div>
        <label className="mt-4 block text-xs font-bold">Import saved typography design JSON
          <input type="file" accept=".json,application/json" className="mt-2 block w-full text-xs" onChange={e=>void importJson(e)}/>
        </label>
        <div className="mt-5 rounded-lg border border-[#F1D7B8] bg-[#FFFAF4] p-4 text-[11px] leading-6 text-[#6E5130]">
          Names, prices, dates and phone numbers remain editable layers. AI-written copy requires human review and never initiates publishing.
          AI image generation and cloud project persistence require a separately reviewed provider/storage release.
        </div>
      </section>
    </div>
  </div>;
}
