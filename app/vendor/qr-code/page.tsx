'use client';

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
  {name:'Forest',fg:'#174A32',accent:'#316E4B'},
  {name:'Midnight',fg:'#17283A',accent:'#2D5276'},
  {name:'Black',fg:'#111827',accent:'#222222'},
] as const;
const panel='rounded-[10px] border border-[#E9E9EC] bg-white shadow-[0_3px_16px_rgba(25,25,31,.028)]';
const input='min-h-11 w-full rounded-[6px] border border-[#DBDBDF] bg-white px-3 text-[12px] text-[#2C2C31] outline-none focus:border-[#FF7900]';
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
  const [tone,setTone]=useState<(typeof tones)[number]['name']>('Forest');
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
    const scale=2,margin=42;
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
      if(format!=='card'){ctx.font='16px Arial, sans-serif';ctx.fillStyle='#5D7565';ctx.fillText('SL BUSINESS INDEX · VERIFIED DIRECTORY LINK',width/2,151);}
    }
    const destLeft=(width-qrDimension)/2;
    ctx.fillStyle='#fff';ctx.fillRect(destLeft-18,top-18,qrDimension+36,qrDimension+36);
    ctx.drawImage(source,destLeft,top,qrDimension,qrDimension);
    ctx.fillStyle=chosenTone.fg;ctx.font='700 23px Arial, sans-serif';
    ctx.fillText(caption.slice(0,64),width/2,top+qrDimension+66,width-2*margin);
    if(includeLink){ctx.font='16px Arial, sans-serif';ctx.fillStyle='#647768';ctx.fillText(qrUrl,width/2,top+qrDimension+106,width-2*margin);}
    ctx.font='13px Arial, sans-serif';ctx.fillStyle='#8A9E90';ctx.fillText('Powered by SLBusinessIndex.com',width/2,height-30);
    return image;
  };
  const exportPNG=()=>{
    const image=renderPosterCanvas();
    if(!image||!business)return;
    const a=document.createElement('a');
    a.href=image.toDataURL('image/png');
    a.download='slbi-'+safeFileName(business.name)+'-'+format+'-'+size+'.png';
    a.click();
    toast.success('Print-ready PNG downloaded.');
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
    toast.success('Vector QR downloaded — scan test before bulk printing.');
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
  return <div className="vendor-page-v7 vendor-page-v9 mx-auto w-full max-w-[1600px] space-y-5 pb-8 text-[#28282D]">
    <header className="vendor-owner-heading grid gap-3 border border-[#E9E9EC] bg-white p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#B3611E]">Digital storefront / QR Studio</p>
        <h1 className="mt-2 text-[30px] font-bold tracking-[-.04em]">QR Studio</h1><p className="mt-1 max-w-[690px] text-[12px] leading-6 text-[#777780]">Create a professionally branded scan experience for your real directory listing. Configure, preview, export and print without leaving your workspace.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/vendor/insights" className="flex h-10 items-center gap-2 border border-[#DEDEE2] px-4 text-[11px] font-bold text-[#505058]"><IconsaxIcon name="status-up" size={16}/> Growth insights</Link>
        <button type="button" onClick={()=>void load()} className="flex h-10 items-center gap-2 border border-[#DEDEE2] px-4 text-[11px] font-bold text-[#505058]"><IconsaxIcon name="refresh" size={16}/> Refresh</button></div>
    </header>
    {error&&<div role="alert" className="border border-[#EABBB5] bg-[#FFF7F5] p-4 text-[12px] text-[#8D5245]">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">{[
      ['Linked listings',String(businesses.length),'Your owned directory profiles','shop'],
      ['QR status',busy?'Checking…':assigned?'Assigned':'Not assigned','Assigned to selected business','scan-barcode'],
      ['Export','PNG · SVG · PDF','Print and vector export options','document-download'],
    ].map(item=><div key={item[0]} className={panel+' flex items-start justify-between p-5'}><div><p className="text-[10px] font-bold text-[#6D6D76]">{item[0]}</p><p className="mt-2 text-[22px] font-bold text-[#28282D]">{item[1]}</p><p className="mt-1 text-[10px] text-[#9898A0]">{item[2]}</p></div><span className="bg-[#FFF1E6] p-2.5 text-[#C56210]"><IconsaxIcon name={item[3]} size={19}/></span></div>)}</div>
    {!businesses.length?<section className={panel+' space-y-3 p-8'}><h2 className="text-lg font-bold">Start with a business listing</h2><p className="text-[12px] text-[#777780]">Register or claim an owned business before assigning a QR code.</p><Link className="inline-flex bg-[#242428] px-4 py-3 text-xs font-bold text-white" href="/register-business">Register business</Link></section>:
    <div className="grid items-start gap-5 xl:grid-cols-[330px_minmax(0,1fr)_250px]">
      <section className={panel+' min-w-0 p-5'}>
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#777780]">01 · Business</p>
        <h2 className="mt-1 text-[17px] font-bold">Configure your QR</h2>
        <label className="mt-5 block text-[11px] font-semibold text-[#2C2C31]">Linked listing
          <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className={input+' mt-1.5'}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <div className="mt-4 border border-[#E7E7EC] bg-[#F7FAF7] p-3 text-[11px]"><p className="font-bold text-[#2C2C31]">{business?.name}</p><p className="mt-1 text-[#777780]">{business?.category} · {business?.status||'Unknown status'}</p></div>
        {!assigned&&!busy&&<button disabled={requesting||!business} type="button" onClick={()=>void requestQR()} className="mt-4 w-full bg-[#242428] px-4 py-3 text-[12px] font-bold text-white disabled:opacity-50">{requesting?'Requesting…':'Assign professional QR'}</button>}
        <div className="mt-6 border-t border-[#E7E7EC] pt-5"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#777780]">02 · Layout presets</p>
          <div className="mt-3 grid gap-2">{layouts.map(l=><button key={l.key} type="button" onClick={()=>setFormat(l.key)} aria-pressed={format===l.key}
            className={'border-l-[3px] p-3 text-left '+(format===l.key?'border-[#E7E7EC] bg-[#F8F8FA]':'border-[#E7E7EC] hover:bg-[#F8FAF7]')}>
            <strong className="text-[12px]">{l.title}</strong><span className="mt-1 block text-[10px] leading-4 text-[#777780]">{l.sub}</span>
          </button>)}</div>
        </div>
        <div className="mt-6 border-t border-[#E7E7EC] pt-5"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#777780]">03 · Visual options</p>
          <div className="mt-4 flex flex-wrap gap-2">{tones.map(t=><button key={t.name} type="button" aria-pressed={tone===t.name} onClick={()=>setTone(t.name)} className={'flex items-center gap-2 border px-3 py-2 text-[11px] '+(tone===t.name?'border-[#E7E7EC] bg-[#F8F8FA]':'border-[#E7E7EC]')}>
            <span className="h-3 w-3" style={{background:t.fg}}/>{t.name}</button>)}</div>
          <label className="mt-4 block text-[11px] font-semibold text-[#2C2C31]">Export resolution
            <select value={size} onChange={e=>setSize(Number(e.target.value) as Size)} className={input+' mt-1.5'}>
              <option value={256}>256 px — small</option><option value={512}>512 px — standard</option><option value={1024}>1024 px — high detail</option>
            </select></label>
          <label className="mt-4 block text-[11px] font-semibold text-[#2C2C31]">Call-to-scan label
            <input className={input+' mt-1.5'} maxLength={64} value={caption} onChange={e=>setCaption(e.target.value)}/></label>
          <div className="mt-4 space-y-2">{[
            ['Business name',includeTitle,setIncludeTitle],
            ['Link below code',includeLink,setIncludeLink],
            ['Directory mark',includeLogo,setIncludeLogo],
          ].map(([title,value,setter])=><label key={String(title)} className="flex items-center justify-between gap-3 text-[11px] font-medium text-[#2C2C31]">
            <span>{String(title)}</span><input type="checkbox" checked={value as boolean} onChange={e=>(setter as (v:boolean)=>void)(e.target.checked)} className="accent-[#FF7900]"/></label>)}</div>
        </div>
      </section>
      <section className={panel+' min-w-0 overflow-hidden'}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E7EC] bg-[#F9FBF8] p-5">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#777780]">Live preview</p><h2 className="mt-1 text-[16px] font-bold">Production-ready scan card</h2></div>
          <span className={'border px-2.5 py-1 text-[10px] font-bold '+(assigned?'border-[#E7E7EC] bg-[#F8F8FA] text-[#2C2C31]':'border-[#E3DEBF] bg-[#FAF6E9] text-[#967C3A]')}>{assigned?'Assigned':'Preview only'}</span>
        </div>
        <div className="flex min-h-[650px] flex-col items-center justify-center bg-[#EFF4F0] p-5 sm:p-9">
          <div ref={posterRef} id="slbi-qr-print-area" className={'flex w-full flex-col items-center border border-[#E7E7EC] bg-white px-5 py-10 text-center shadow-[0_15px_40px_rgba(24,54,36,.10)] '+(format==='card'?'max-w-[460px]':'max-w-[385px]')} style={{borderTop:'7px solid '+chosenTone.accent}}>
            {includeTitle&&<div className="w-full"><h3 className="break-words text-[20px] font-extrabold leading-[1.3]" style={{color:chosenTone.fg}}>{business?.name}</h3><p className="mt-2 text-[9px] font-semibold uppercase tracking-[.17em] text-[#777780]">SL Business Index · Business Profile</p></div>}
            <div className="mt-7 border border-[#EBEFE9] bg-white p-3">
              <QRCodeCanvas ref={canvasRef} value={qrUrl} level="H" size={size} marginSize={2} style={{display:"block",width:"min(320px, 100%)",height:"auto"}}
                fgColor={chosenTone.fg} bgColor="#FFFFFF"
                imageSettings={includeLogo?{src:'/slbi-mark.svg',width:42,height:42,excavate:true}:undefined}/>
            </div>
            {/* Dedicated QR-only SVG for crisp vector export, without external logo assets. */}
            <div className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <QRCodeSVG ref={svgRef} value={qrUrl} size={1024} level="H" marginSize={2} fgColor={chosenTone.fg} bgColor="#FFFFFF"/>
            </div>
            <p className="mt-6 break-words text-[13px] font-bold tracking-[.06em]" style={{color:chosenTone.fg}}>{caption}</p>
            {includeLink&&<p className="mt-3 max-w-full break-all text-[10px] leading-5 text-[#777780]">{qrUrl}</p>}
            <p className="mt-7 text-[9px] font-medium uppercase tracking-[.12em] text-[#777780]">Powered by SLBusinessIndex.com</p>
          </div>
          {assigned&&<p className="mt-5 text-[10px] font-medium text-[#777780]">Serial {assigned.serial_id} · Scan test required before printing in bulk</p>}
        </div>
        <div className="grid gap-2 border-t border-[#E7E7EC] p-4 sm:grid-cols-2 xl:grid-cols-5">
          <button type="button" disabled={!assigned} onClick={exportPNG} className="flex min-h-11 items-center justify-center gap-2 bg-[#242428] px-3 text-[12px] font-bold text-white disabled:opacity-40"><IconsaxIcon name="document-download" size={16} color="white"/> Download PNG</button>
          <button type="button" disabled={!assigned} onClick={exportSVG} className="flex min-h-11 items-center justify-center gap-2 border border-[#E7E7EC] text-[12px] font-bold text-[#2C2C31] disabled:opacity-40"><IconsaxIcon name="document-download" size={16}/> Download SVG</button>
          <button type="button" disabled={!assigned} onClick={()=>void exportPDF()} className="flex min-h-11 items-center justify-center gap-2 border border-[#E7E7EC] text-[12px] font-bold text-[#2C2C31] disabled:opacity-40"><IconsaxIcon name="document-download" size={16}/> Download PDF</button>
          <button type="button" disabled={!assigned} onClick={printCard} className="flex min-h-11 items-center justify-center gap-2 border border-[#E7E7EC] text-[12px] font-bold text-[#2C2C31] disabled:opacity-40"><IconsaxIcon name="document-download" size={16}/> Print layout</button>
          <button type="button" onClick={()=>void copyLink()} className="flex min-h-11 items-center justify-center gap-2 border border-[#E7E7EC] text-[12px] font-bold text-[#2C2C31]"><IconsaxIcon name="document-download" size={16}/> Copy link</button>
        </div>
      </section>
      <aside className="space-y-4">
        <div className={panel+' p-5'}><p className="text-[10px] font-bold uppercase tracking-wider text-[#2C2C31]">Quick actions</p>
          <div className="mt-4 grid gap-2">{[
            ['Open listing',()=>{if(business)window.open(directUrl,'_blank','noopener,noreferrer')},'home'],
            ['Copy destination',()=>void copyLink(),'document-download'],
            ['Share QR link',()=>void share(),'flash'],
            ['Print material',printCard,'document-download'],
          ].map(([name,fn,icon])=><button key={String(name)} type="button" disabled={!business||(name==='Print material'&&!assigned)}
            onClick={fn as ()=>void} className="flex min-h-11 items-center justify-between border border-[#E7E7EC] px-3 text-left text-[11px] font-semibold text-[#2C2C31] transition hover:bg-[#F3F8F4] disabled:opacity-40"><span>{String(name)}</span><IconsaxIcon name={String(icon)} size={16}/></button>)}</div>
        </div>
        <div className={panel+' p-5'}><h3 className="text-[13px] font-bold">Deployment checklist</h3>
          <div className="mt-4 space-y-3">{[
            'Scan with two phone cameras',
            'Verify the correct business page',
            'Test readability at printed size',
            'Place at counters and entrances',
            'Use approved business details only',
          ].map((item,i)=><div key={item} className="flex items-start gap-2 text-[11px] text-[#2C2C31]"><span className="text-[#2C2C31]">{i+1}.</span>{item}</div>)}</div>
        </div>
        <div className="border-l-[3px] border-[#CBAD65] bg-[#FBF7EA] px-4 py-3 text-[11px] leading-5 text-[#907747]">Scan analytics are not recorded unless an independently verified tracking pipeline exists. This screen does not claim scan counts.</div>
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
