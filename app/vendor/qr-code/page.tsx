'use client';
import { neo } from '../components/neumorphic';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';

type Business={id:string;name:string;slug:string|null;category:string;status:string|null};
type Assigned={id:string;serial_id:string;short_link:string;status:string};
type Format='counter'|'window'|'card';
type Size=256|512|1024;
const tones=[
  {name:'SLBI Orange',fg:'#242126',accent:'#FF7900'},
  {name:'Graphite',fg:'#1D1D20',accent:'#39383E'},
  {name:'Royal Blue',fg:'#193A73',accent:'#4274BD'},
  {name:'Burnt Copper',fg:'#56311E',accent:'#CE7134'},
] as const;
const panel = neo.card;
const input = neo.input;
const layouts:{key:Format;title:string;sub:string}[]=[
  {key:'counter',title:'Counter display',sub:'A clear invitation for customers at checkout'},
  {key:'window',title:'Window sticker',sub:'High-contrast label for storefront entrances'},
  {key:'card',title:'Business card',sub:'Compact composition with scan-first layout'},
];
const safeFileName=(text:string)=>text.replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').slice(0,70)||'business';
export default function VendorQRStudioPage(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [assigned,setAssigned]=useState<Assigned|null>(null);
  const [busy,setBusy]=useState(false);
  const [requesting,setRequesting]=useState(false);
  const [loading,setLoading]=useState(true);
  const [signedIn,setSignedIn]=useState(false);
  const [error,setError]=useState('');
  const [format,setFormat]=useState<Format>('counter');
  const [tone,setTone]=useState<(typeof tones)[number]['name']>('SLBI Orange');
  const [size,setSize]=useState<Size>(512);
  const [includeTitle,setIncludeTitle]=useState(true);
  const [includeLink,setIncludeLink]=useState(true);
  const [includeLogo,setIncludeLogo]=useState(true);
  const [caption,setCaption]=useState('SCAN TO VIEW OUR BUSINESS');
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const posterRef=useRef<HTMLDivElement>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const business=businesses.find(b=>b.id===selectedId)||null;
  const chosenTone=tones.find(t=>t.name===tone)||tones[0];
  const directUrl='https://www.slbusinessindex.com/business/'+encodeURIComponent(business?.slug||business?.id||'');
  const qrUrl=assigned?'https://www.slbusinessindex.com/q/'+encodeURIComponent(assigned.serial_id):directUrl;

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setSignedIn(false);return;}
      setSignedIn(true);
      const r=await supabase.from('businesses').select('id,name,slug,category,status').eq('owner_id',user.id).order('name');
      if(r.error)throw r.error;
      const rows=(r.data||[]) as Business[];
      setBusinesses(rows);setSelectedId(old=>rows.some(b=>b.id===old)?old:rows[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load QR Studio.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!selectedId){setAssigned(null);return;}
    let mounted=true;setBusy(true);setAssigned(null);
    void (async()=>{const r=await supabase.from('qr_inventory').select('id,serial_id,short_link,status').eq('business_id',selectedId).eq('status','assigned').order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(!mounted)return;if(r.error)setError('Could not read assigned QR code.');else setAssigned(r.data as Assigned|null);setBusy(false);
    })();
    return()=>{mounted=false};
  },[selectedId]);
  const requestQR=async()=>{
    if(!business||requesting)return;
    setRequesting(true);
    try{
      const r=await fetch('/api/qr/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:business.id})});
      const result=await r.json() as {success?:boolean;error?:string;qr?:Assigned};
      if(!r.ok||!result.success||!result.qr)throw new Error(result.error||'QR assignment failed.');
      setAssigned(result.qr);toast.success('Business QR assigned.');
    }catch(e){toast.error(e instanceof Error?e.message:'Could not generate QR.');}
    finally{setRequesting(false);}
  };
  const copyLink=async()=>{try{await navigator.clipboard.writeText(qrUrl);toast.success('Business QR link copied.');}catch{toast.error('Unable to copy link.')}};
  const share=async()=>{
    if(!business)return;
    try{
      if(navigator.share)await navigator.share({title:business.name,url:qrUrl});
      else await copyLink();
    }catch(e){if(!(e instanceof Error&&e.name==='AbortError'))toast.error('Unable to share link.');}
  };
  const renderPosterCanvas=():HTMLCanvasElement|null=>{
    const source=canvasRef.current;
    if(!source||!assigned||!business)return null;
    // Resolution presets scale the entire exported artwork, not only the QR element.
    const scale=size/256,margin=42;
    const width=760,height=format==='card'?550:940;
    const image=document.createElement('canvas');image.width=width*scale;image.height=height*scale;
    const ctx=image.getContext('2d');if(!ctx)return null;
    ctx.scale(scale,scale);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
    ctx.fillStyle=chosenTone.accent;ctx.fillRect(0,0,width,format==='window'?24:12);
    ctx.fillStyle=chosenTone.fg;ctx.textAlign='center';
    const qrDimension=format==='card'?342:480;
    let top=format==='card'?96:190;
    if(includeTitle){
      ctx.font='700 34px Arial, sans-serif';
      const name=business.name.length>36?business.name.slice(0,33)+'…':business.name;
      ctx.fillText(name,width/2,format==='card'?64:115,width-2*margin);
      if(format!=='card'){ctx.font='16px Arial, sans-serif';ctx.fillStyle='#777780';ctx.fillText('SL BUSINESS INDEX · BUSINESS PROFILE',width/2,151);}
    }
    const destLeft=(width-qrDimension)/2;
    ctx.fillStyle='#fff';ctx.fillRect(destLeft-18,top-18,qrDimension+36,qrDimension+36);
    ctx.drawImage(source,destLeft,top,qrDimension,qrDimension);
    ctx.fillStyle=chosenTone.fg;ctx.font='700 23px Arial, sans-serif';
    ctx.fillText(caption.slice(0,64),width/2,top+qrDimension+66,width-2*margin);
    if(includeLink){ctx.font='16px Arial, sans-serif';ctx.fillStyle='#777780';ctx.fillText(qrUrl,width/2,top+qrDimension+106,width-2*margin);}
    ctx.font='13px Arial, sans-serif';ctx.fillStyle='#939098';ctx.fillText('Powered by SLBusinessIndex.com',width/2,height-30);
    return image;
  };
  const exportPNG=()=>{
    const image=renderPosterCanvas();
    if(!image||!business)return;
    const a=document.createElement('a');
    a.href=image.toDataURL('image/png');
    a.download='slbi-'+safeFileName(business.name)+'-'+format+'-'+size+'.png';
    a.click();
    toast.success('Branded PNG downloaded.');
  };
  const exportSVG=()=>{
    // Export an independent vector QR with no external image dependencies.
    // It remains a scannable, resolution-independent QR for professional print.
    if(!svgRef.current||!assigned||!business)return;
    const svg=svgRef.current.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
    svg.setAttribute('width','1024');
    svg.setAttribute('height','1024');
    const xml=new XMLSerializer().serializeToString(svg);
    const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='slbi-'+safeFileName(business.name)+'-qr.svg';a.click();
    requestAnimationFrame(()=>URL.revokeObjectURL(url));
    toast.success('Vector QR downloaded. Scan-test before printing.');
  };
  const exportPDF=async()=>{
    const image=renderPosterCanvas();
    if(!image||!business)return;
    try{
      const {jsPDF}=await import('jspdf');
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      const margin=12,pageWidth=210,pageHeight=297;
      const maxWidth=pageWidth-2*margin,maxHeight=pageHeight-2*margin;
      const factor=Math.min(maxWidth/image.width,maxHeight/image.height);
      const width=image.width*factor,height=image.height*factor;
      doc.addImage(image.toDataURL('image/png'),'PNG',(pageWidth-width)/2,(pageHeight-height)/2,width,height,undefined,'FAST');
      doc.save('slbi-'+safeFileName(business.name)+'-'+format+'-print.pdf');
      toast.success('A4 print-ready PDF downloaded.');
    }catch{toast.error('PDF export unavailable on this browser. Try PNG instead.');}
  };
  const printCard=()=>{
    if(!assigned)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{window.print()}));
  };
  if(loading)return <div role="status" className={panel+' p-8 text-sm text-[#2C2C31]'}>Loading QR workspace…</div>;
  if(!signedIn)return <div className={panel+' p-8 text-sm'}>Sign in to access your QR Studio. <Link href="/login?redirect=/vendor/qr-code" className="font-bold text-[#2C2C31] underline">Sign in</Link></div>;
  const eligible=business?.status==='approved';
  const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8E4E4] bg-white px-3 text-[11px] font-semibold text-[#343137] transition hover:border-[#FFC48D] hover:bg-[#FFF8F1] focus-visible:outline-2 focus-visible:outline-[#FF7900] disabled:cursor-not-allowed disabled:opacity-40';
  const primary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-[11px] font-semibold text-white transition hover:bg-[#E56F05] focus-visible:outline-2 focus-visible:outline-[#FF7900] disabled:cursor-not-allowed disabled:opacity-40';
  return <div data-testid="vendor-qr-studio-professional" className={neo.page+" mx-auto w-full space-y-5 pb-10 text-[#27262C]"}>
    <header className={neo.heroDark+" relative flex flex-wrap items-end justify-between gap-5 px-6 py-8 sm:px-9"}>
      <div className="relative z-10 max-w-[760px]">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#FFB57A]"><IconsaxIcon name="scan-barcode" size={19} color="#FF9C4F"/> Digital storefront / QR Studio</p>
        <h1 className="mt-3 text-[31px] font-semibold tracking-[-.05em] text-white sm:text-[41px]">Make every scan count.</h1>
        <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/70">Create elegant, scannable QR materials for your real SLBI business listing. Choose a layout, apply a brand palette, preview it, then download print artwork.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-white/85">
          {['Live design preview','PNG / vector SVG / A4 PDF','Print-ready layouts'].map(v=><span key={v} className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5">{v}</span>)}
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap gap-2">
        <Link href="/vendor/analytics" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#FF7900]/50 bg-white/10 px-4 text-[11px] font-semibold text-white transition hover:bg-white/20"><IconsaxIcon name="chart" size={17} color="#FFB47D"/> Analytics Center</Link>
        <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-[11px] font-semibold text-[#252326] disabled:opacity-40"><IconsaxIcon name="refresh" size={17}/> Refresh</button>
      </div>
    </header>
    {error&&<div role="alert" className="rounded-xl border border-[#EABBB5] bg-[#FFF7F5] p-4 text-[12px] text-[#8D5245]">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        {title:'My business listings',value:String(businesses.length),note:'Owned profiles, not public QR scans',icon:'shop'},
        {title:'Selected QR',value:busy?'Checking…':assigned?'Assigned':'Not assigned',note:'Unique link to the selected listing',icon:'scan-barcode'},
        {title:'Available artwork',value:'3 formats',note:'PNG · SVG · PDF plus browser print',icon:'document-download'},
      ].map(item=><div key={item.title} className={panel+' flex items-start justify-between p-5'}>
        <div className="min-w-0"><p className="text-[11px] font-medium text-[#79747A]">{item.title}</p><p className="mt-2 text-[22px] font-semibold tracking-tight text-[#222126]">{item.value}</p><p className="mt-1 text-[10px] leading-5 text-[#87838B]">{item.note}</p></div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#D96A11]"><IconsaxIcon name={item.icon} size={22} variant="bulk"/></span>
      </div>)}
    </div>
    {!businesses.length?<section className={panel+' space-y-3 p-8'}><h2 className="text-lg font-semibold">Your QR Studio starts with a listing</h2><p className="text-[12px] text-[#777780]">Register or claim an owned business. QR assignment requires an approved listing.</p><Link className={primary} href="/register-business">Register a business</Link></section>:
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(250px,310px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(255px,315px)_minmax(0,1fr)_245px]">
      <section aria-label="QR customization controls" className={panel+' min-w-0 p-5 sm:p-6'}>
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E4]"><IconsaxIcon name="setting-2" size={20} color="#D86A12"/></span><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#C36E30]">Design controls</p><h2 className="text-[17px] font-semibold">Customize your QR</h2></div></div>
        <label className="mt-6 block text-[11px] font-semibold text-[#464149]">Business listing
          <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className={input+' mt-2'}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </label>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#EEE9E6] bg-[#FCFAF9] p-3">
          <div className="min-w-0"><p className="truncate text-[12px] font-semibold">{business?.name}</p><p className="mt-1 truncate text-[10px] text-[#89848B]">{business?.category} · {business?.status||'Status unknown'}</p></div>
          <span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold '+(eligible?'bg-[#FFF0E4] text-[#AD560D]':'bg-[#F2EDF0] text-[#8C747F]')}>{eligible?'Approved':'Not approved'}</span>
        </div>
        {!assigned&&!busy&&<button disabled={requesting||!eligible} type="button" onClick={()=>void requestQR()} className={primary+' mt-4 w-full'}><IconsaxIcon name="add-circle" size={18} color="white"/>{requesting?'Assigning your QR…':'Assign a unique QR link'}</button>}
        {!eligible&&<p className="mt-2 text-[10px] leading-5 text-[#AC7238]">QR assignment becomes available after listing approval.</p>}
        <div className="mt-6 border-t border-[#F0ECE9] pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#928990]">01 / Layout</p>
          <div className="mt-3 grid gap-2">{layouts.map(l=><button key={l.key} type="button" onClick={()=>setFormat(l.key)} aria-pressed={format===l.key}
            className={'flex min-h-[64px] items-center gap-3 rounded-xl border p-3 text-left transition '+(format===l.key?'border-[#FFB77A] bg-[#FFF4EA] shadow-[0_4px_13px_#F5E9E0]':'border-[#E9E6E8] bg-white hover:border-[#F7BF94]')}>
            <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] '+(format===l.key?'bg-[#FFE1CA] text-[#C15B0F]':'bg-[#F5F3F4] text-[#858087]')}><IconsaxIcon name={l.key==='counter'?'scan-barcode':l.key==='window'?'shop':'card'} size={22}/></span>
            <span className="min-w-0"><span className="block text-[11px] font-semibold text-[#302E33]">{l.title}</span><span className="mt-1 block text-[10px] leading-4 text-[#8A858C]">{l.sub}</span></span>
          </button>)}</div>
        </div>
        <div className="mt-6 border-t border-[#F0ECE9] pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#928990]">02 / Brand color</p>
          <div className="mt-3 grid grid-cols-2 gap-2">{tones.map(t=><button key={t.name} type="button" aria-pressed={tone===t.name} onClick={()=>setTone(t.name)}
            className={'flex min-h-10 items-center gap-2 rounded-xl border px-2.5 text-left text-[10px] font-semibold '+(tone===t.name?'border-[#F0A269] bg-[#FFF5ED] text-[#342F2E]':'border-[#E8E5E7] text-[#79747A] hover:bg-[#FAF8F7]')}>
            <span className="h-4 w-4 shrink-0 rounded-[5px] shadow-sm" style={{background:t.accent}}/>{t.name}</button>)}</div>
        </div>
        <div className="mt-6 border-t border-[#F0ECE9] pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#928990]">03 / Content & quality</p>
          <label className="mt-4 block text-[11px] font-semibold">Export quality
            <select value={size} onChange={e=>setSize(Number(e.target.value) as Size)} className={input+' mt-2'}>
              <option value={256}>Standard · 1× artwork</option><option value={512}>High · 2× artwork</option><option value={1024}>Ultra · 4× artwork</option>
            </select></label>
          <label className="mt-4 block text-[11px] font-semibold">Call-to-scan message
            <input className={input+' mt-2'} maxLength={64} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Scan to view our business"/>
          </label>
          <div className="mt-4 space-y-3">{[
            ['Show business name',includeTitle,setIncludeTitle],
            ['Show destination link',includeLink,setIncludeLink],
            ['SLBI mark in QR',includeLogo,setIncludeLogo],
          ].map(([title,value,setter])=><label key={String(title)} className="flex min-h-8 items-center justify-between gap-3 text-[11px] font-medium text-[#49454C]">
            <span>{String(title)}</span><input type="checkbox" checked={value as boolean} onChange={e=>(setter as (v:boolean)=>void)(e.target.checked)} className="h-4 w-4 accent-[#FF7900]"/></label>)}</div>
        </div>
      </section>
      <section aria-label="QR Studio live preview" className={panel+' min-w-0 overflow-hidden'}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE8E6] p-5 sm:px-6">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#C36B2C]">Live canvas</p><h2 className="mt-1 text-[17px] font-semibold">Your branded QR material</h2></div>
          <span className={'rounded-full px-3 py-1.5 text-[10px] font-semibold '+(assigned?'bg-[#FFF1E6] text-[#AE5412]':'bg-[#F1EFF0] text-[#7F777D]')}>{busy?'Checking…':assigned?'Unique QR assigned':'Unassigned preview'}</span>
        </div>
        <div className="flex min-h-[560px] flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#FFFFFF_0%,#F8F4F1_62%,#F2EFF0_100%)] p-5 sm:p-9">
          <div ref={posterRef} id="slbi-qr-print-area" className={'relative flex w-full flex-col items-center overflow-hidden rounded-[20px] border border-[#EEE8E3] bg-white px-5 py-10 text-center shadow-[0_25px_75px_rgba(34,24,18,.14)] '+(format==='card'?'max-w-[470px]':'max-w-[385px]')}
            style={{borderTop:'8px solid '+chosenTone.accent}}>
            {includeTitle&&<div className="w-full"><h3 className="break-words text-[20px] font-semibold leading-[1.35]" style={{color:chosenTone.fg}}>{business?.name}</h3><p className="mt-2 text-[9px] font-medium uppercase tracking-[.14em] text-[#89838B]">SL Business Index · Business Profile</p></div>}
            <div className="mt-6 max-w-full rounded-[15px] border border-[#F0ECE8] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,.035)]">
              <QRCodeCanvas ref={canvasRef} value={qrUrl} level="H" size={size} marginSize={2} style={{display:'block',width:'min(285px, 100%)',height:'auto'}}
                fgColor={chosenTone.fg} bgColor="#FFFFFF"
                imageSettings={includeLogo?{src:'/slbi-mark.svg',width:42,height:42,excavate:true}:undefined}/>
            </div>
            <div className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <QRCodeSVG ref={svgRef} value={qrUrl} size={1024} level="H" marginSize={2} fgColor={chosenTone.fg} bgColor="#FFFFFF"/>
            </div>
            <p className="mt-6 break-words text-[12px] font-semibold uppercase tracking-[.07em]" style={{color:chosenTone.fg}}>{caption||'SCAN TO VIEW OUR BUSINESS'}</p>
            {includeLink&&<p className="mt-3 max-w-full break-all text-[10px] leading-5 text-[#85818A]">{qrUrl}</p>}
            <p className="mt-7 text-[9px] font-medium uppercase tracking-[.12em] text-[#98929A]">Powered by SLBusinessIndex.com</p>
          </div>
          <p className="mt-5 max-w-[400px] text-center text-[10px] leading-5 text-[#89838A]">{assigned?'Unique serial: '+assigned.serial_id+' · Scan test with two devices before bulk print.':'This is a preview; assign a QR to enable downloads and printing.'}</p>
        </div>
        <div className="border-t border-[#EEE9E5] bg-white p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#88828A]">Export & distribute</p>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            <button type="button" disabled={!assigned} onClick={exportPNG} className={primary}><IconsaxIcon name="document-download" size={17} color="white"/> Download PNG</button>
            <button type="button" disabled={!assigned} onClick={exportSVG} className={button}><IconsaxIcon name="document-download" size={17}/> Download SVG</button>
            <button type="button" disabled={!assigned} onClick={()=>void exportPDF()} className={button}><IconsaxIcon name="document-download" size={17}/> Download PDF</button>
            <button type="button" disabled={!assigned} onClick={printCard} className={button}><IconsaxIcon name="document" size={17}/> Print layout</button>
            <button type="button" disabled={!business} onClick={()=>void copyLink()} className={button}><IconsaxIcon name="document" size={17}/> Copy profile link</button>
            <button type="button" disabled={!business} onClick={()=>void share()} className={button}><IconsaxIcon name="flash" size={17}/> Share link</button>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-[#979097]">SVG exports the QR pattern alone, suitable for professional vector placement. PNG and PDF include the designed card. The quality preset controls exported PNG/PDF artwork dimensions.</p>
        </div>
      </section>
      <aside aria-label="QR publishing tools and print guidance" className="space-y-4 xl:col-span-2 2xl:col-span-1">
        <div className={panel+' p-5'}>
          <div className="flex items-center gap-2"><span className="rounded-xl bg-[#FFF0E4] p-2 text-[#D66D17]"><IconsaxIcon name="flash" size={20}/></span><h3 className="text-[13px] font-semibold">Quick actions</h3></div>
          <div className="mt-4 grid gap-2">
            <a href={directUrl} target="_blank" rel="noopener noreferrer" className={button+' w-full justify-between'}><span>Open public listing</span><IconsaxIcon name="arrow-right-2" size={16}/></a>
            <button type="button" onClick={()=>void copyLink()} className={button+' w-full justify-between'}><span>Copy destination</span><IconsaxIcon name="document" size={16}/></button>
            <button type="button" onClick={()=>void share()} className={button+' w-full justify-between'}><span>Share listing</span><IconsaxIcon name="flash" size={16}/></button>
          </div>
        </div>
        <div className={panel+' p-5'}>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold"><IconsaxIcon name="tick-circle" size={19} color="#DB711C"/> Print checklist</h3>
          <div className="mt-4 space-y-3">{[
            'Scan with Android and iPhone cameras',
            'Confirm QR resolves to the right listing',
            'Test readability at final print size',
            'Keep high contrast and quiet-zone margins',
            'Place at counter, window or business card',
          ].map((v,i)=><div key={v} className="flex items-start gap-2.5 text-[11px] leading-5 text-[#68636B]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF0E4] text-[10px] font-semibold text-[#B35A18]">{i+1}</span>{v}</div>)}</div>
        </div>
        <div className="rounded-[18px] border border-[#F0DFC9] bg-[#FFF8F0] p-4 text-[11px] leading-6 text-[#855E40]"><strong className="block text-[#8A481A]">About scan analytics</strong>QR assignments are real, but per-scan counts are not claimed until a verified scan tracking pipeline is enabled. The Analytics Center reports recorded listing interactions instead.</div>
      </aside>
    </div>}
    <style jsx global>{`
      @media print {
        body * { visibility:hidden !important; }
        #slbi-qr-print-area, #slbi-qr-print-area * { visibility:visible !important; }
        #slbi-qr-print-area { position:fixed;top:10mm;left:10mm;width:180mm;max-width:none !important;box-shadow:none !important;border:1px solid #eee !important;page-break-inside:avoid; }
        @page { size:A4; margin:10mm; }
      }
    `}</style>
  </div>;
}
