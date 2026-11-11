'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';

type Business = {
  id:string;name:string;slug:string|null;status:string|null;
  website_url:string|null;phone:string|null;city:string|null;
};
type Assignment = {serial_id:string};
type Destination = 'directory'|'website'|'phone';
type ErrorLevel = 'L'|'M'|'Q'|'H';
const themes=[
  {name:'Forest',fg:'#174B36',bg:'#FFFFFF'},
  {name:'Ink',fg:'#172437',bg:'#FFFFFF'},
  {name:'Ocean',fg:'#145D73',bg:'#FFFFFF'},
  {name:'Monochrome',fg:'#000000',bg:'#FFFFFF'},
  {name:'Night',fg:'#F4F9EE',bg:'#17372A'},
] as const;
const input='w-full min-w-0 rounded-[6px] border border-[#DBE6DE] bg-white px-3 py-2.5 text-[12px] font-medium text-[#36513E] outline-none focus-visible:border-[#6B9F7A]';
const panel='rounded-[9px] border border-[#E0E9E0] bg-white shadow-[0_3px_15px_rgba(22,59,35,.035)]';
const uuidName=(s:string)=>s.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'business';
const websiteUrl=(s:string|null)=>{
  if(!s)return null;
  try{const url=new URL(/^https?:\/\//i.test(s)?s:'https://'+s);return ['https:','http:'].includes(url.protocol)?url.toString():null}
  catch{return null;}
};
export default function QRStudioPage(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [assignment,setAssignment]=useState<Assignment|null>(null);
  const [loading,setLoading]=useState(true);
  const [checking,setChecking]=useState(false);
  const [requesting,setRequesting]=useState(false);
  const [error,setError]=useState('');
  const [destination,setDestination]=useState<Destination>('directory');
  const [theme,setTheme]=useState(0);
  const [size,setSize]=useState(300);
  const [margin,setMargin]=useState(2);
  const [level,setLevel]=useState<ErrorLevel>('H');
  const [labelText,setLabelText]=useState('SCAN TO EXPLORE');
  const [showCaption,setShowCaption]=useState(true);
  const [brandCard,setBrandCard]=useState(true);
  const svgRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLDivElement>(null);
  const selected=businesses.find(b=>b.id===selectedId)||null;

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setError('Sign in to manage your QR Studio.');setBusinesses([]);return;}
      const {data,error:businessError}=await supabase.from('businesses')
        .select('id,name,slug,status,website_url,phone,city')
        .eq('owner_id',user.id).order('name');
      if(businessError)throw businessError;
      const items=(data||[]) as Business[];
      setBusinesses(items);
      setSelectedId(id=>items.some(b=>b.id===id)?id:items[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load your businesses.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!selectedId){setAssignment(null);return;}
    let active=true;setChecking(true);setAssignment(null);
    void (async()=>{
      const {data,error:qrError}=await supabase.from('qr_inventory')
        .select('serial_id').eq('business_id',selectedId).maybeSingle();
      if(!active)return;
      if(qrError){setError('Assigned QR could not be loaded. Profile QR is still available.');}
      else setAssignment((data||null) as Assignment|null);
      setChecking(false);
    })();
    return()=>{active=false};
  },[selectedId]);

  const url=useMemo(()=>{
    if(!selected)return '';
    if(destination==='website')return websiteUrl(selected.website_url)||'';
    if(destination==='phone')return selected.phone?'tel:'+selected.phone.replace(/[^+\d]/g,''):'';
    if(assignment?.serial_id)return 'https://www.slbusinessindex.com/q/'+encodeURIComponent(assignment.serial_id);
    return 'https://www.slbusinessindex.com/business/'+encodeURIComponent(selected.slug||selected.id);
  },[selected,destination,assignment]);
  const canExport=Boolean(selected&&url);
  const colors=themes[theme];
  const filename='SLBI-QR-'+uuidName(selected?.name||'Business');
  const reset=()=>{setTheme(0);setSize(300);setMargin(2);setLevel('H');setLabelText('SCAN TO EXPLORE');setBrandCard(true);setShowCaption(true);setDestination('directory')};
  const download=(name:string,data:string)=>{
    const a=document.createElement('a');a.href=data;a.download=name;a.click();
  };
  const downloadPNG=()=>{
    if(!canExport)return;
    const node=canvasRef.current?.querySelector('canvas');
    if(!node){toast.error('QR canvas is not ready.');return;}
    try{
      const backing=document.createElement('canvas');
      const padding=brandCard?64:0;
      backing.width=node.width+padding*2;
      backing.height=node.height+padding*2+(brandCard?142:0);
      const ctx=backing.getContext('2d');
      if(!ctx)throw new Error('Canvas rendering unavailable');
      ctx.fillStyle=colors.bg;ctx.fillRect(0,0,backing.width,backing.height);
      ctx.drawImage(node,padding,padding,node.width,node.height);
      if(brandCard){
        ctx.fillStyle=colors.fg;
        ctx.textAlign='center';
        ctx.font='bold 32px system-ui,sans-serif';
        const n=selected?.name||'Business';
        ctx.fillText(n.length>28?n.slice(0,25)+'…':n,backing.width/2,node.height+padding+59,backing.width-30);
        ctx.font='600 18px system-ui,sans-serif';
        ctx.fillText(labelText||'SCAN TO EXPLORE',backing.width/2,node.height+padding+93,backing.width-30);
      }
      download(filename+'.png',backing.toDataURL('image/png'));
      toast.success('High-resolution PNG exported');
    }catch(e){toast.error(e instanceof Error?e.message:'PNG export failed.');}
  };
  const downloadSVG=()=>{
    if(!canExport)return;
    const node=svgRef.current?.querySelector('svg');
    if(!node){toast.error('QR vector is not ready.');return;}
    const copy=node.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'});
    const blobURL=URL.createObjectURL(blob);
    download(filename+'.svg',blobURL);
    window.setTimeout(()=>URL.revokeObjectURL(blobURL),1000);
    toast.success('Scalable SVG exported');
  };
  const copyLink=async()=>{
    if(!url)return;
    try{await navigator.clipboard.writeText(url);toast.success('QR destination link copied');}
    catch{toast.error('Clipboard access unavailable.');}
  };
  const share=async()=>{
    if(!url)return;
    if(navigator.share){
      try{await navigator.share({title:selected?.name||'Business',url});}
      catch(e){if((e as Error).name!=='AbortError')toast.error('Sharing unavailable.');}
    }else await copyLink();
  };
  const requestAssignment=async()=>{
    if(!selected||requesting)return;
    setRequesting(true);
    try{
      const response=await fetch('/api/qr/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:selected.id})});
      const json=await response.json() as {success?:boolean;qr?:Assignment;error?:string};
      if(!response.ok||!json.success||!json.qr)throw new Error(json.error||'QR assignment unavailable');
      setAssignment(json.qr);toast.success('Directory QR assignment is ready');
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to assign QR');}
    finally{setRequesting(false);}
  };

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
    <header className="vendor-premium-header flex flex-wrap items-end justify-between gap-4 px-6 py-7 sm:px-8">
      <div className="relative z-10 max-w-[760px]"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#B8DEC2]">SLBI / Business QR Studio</p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-[-.045em] text-white sm:text-[35px]">A smarter way to connect.</h1>
        <p className="mt-2 max-w-[640px] text-[12px] leading-6 text-[#D1E6D6]">Design real, print-ready QR codes for shopfronts, receipts, social profiles and business cards. No design canvas required.</p>
      </div>
      <div className="relative z-10 flex flex-wrap gap-2">
        <Link href="/vendor/my-businesses" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-white/25 px-4 text-xs font-bold text-white hover:bg-white/10"><IconsaxIcon name="shop" size={15}/> Businesses</Link>
        <button type="button" onClick={()=>void load()} className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-white px-4 text-xs font-bold text-[#28583C]"><IconsaxIcon name="refresh" size={15}/> Refresh</button>
      </div>
    </header>
    {error&&<p role="alert" className="rounded-[6px] border border-[#E5C9BB] bg-[#FFF7EF] p-3 text-xs text-[#9B6245]">{error} {!businesses.length&&<Link href="/login?redirect=/vendor/qr-code" className="underline">Sign in</Link>}</p>}
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(250px,.92fr)_minmax(300px,1.05fr)_minmax(270px,.8fr)]">
      <section className={panel+' min-w-0 space-y-5 p-5'} aria-label="QR settings">
        <div><p className="vendor-kicker">01 / QR configuration</p><h2 className="mt-1 text-[19px] font-extrabold text-[#254B36]">Configure</h2></div>
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53705B]">Your business</span><select className={input} disabled={loading||!businesses.length} value={selectedId} onChange={e=>{setSelectedId(e.target.value);setDestination('directory')}}><option value="" disabled>Select business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        {!businesses.length&&!loading&&<p className="text-xs text-[#829783]">Register a business to begin. <Link className="font-bold underline" href="/register-business">Create listing</Link></p>}
        <div><span className="mb-2 block text-xs font-bold text-[#53705B]">QR destination</span><div className="grid grid-cols-3 gap-1.5">{([
          {id:'directory',name:'Profile'},
          {id:'website',name:'Website'},
          {id:'phone',name:'Call'},
        ] as const).map(x=><button key={x.id} type="button" aria-pressed={destination===x.id} disabled={!selected||(x.id==='website'&&!websiteUrl(selected.website_url))||(x.id==='phone'&&!selected.phone)}
          onClick={()=>setDestination(x.id)}
          className={'min-h-10 rounded-[6px] border px-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-35 '+(destination===x.id?'border-[#6FA982] bg-[#EAF5EA] text-[#276746]':'border-[#E1EAE1] bg-white text-[#677D6D]')}>{x.name}</button>)}</div>
          <p className="mt-2 text-[10px] leading-5 text-[#839486]">{destination==='directory'?'Directory QR uses your issued /q/ route when available. Other QR types are direct links and are not scan-tracked.':destination==='phone'?'Scans open a dialler on supported devices. A scan does not prove a call.':'Website QR sends scanners to the URL provided in your business profile.'}</p>
        </div>
        <div><span className="mb-2 block text-xs font-bold text-[#53705B]">Colour presets</span><div className="flex flex-wrap gap-2">{themes.map((t,i)=><button key={t.name} type="button" title={t.name} aria-label={'Use '+t.name+' QR theme'} aria-pressed={theme===i} onClick={()=>setTheme(i)}
          className={'flex h-10 w-10 items-center justify-center rounded-[6px] border-2 '+(theme===i?'border-[#358053]':'border-[#E2E9E2]')}><span className="h-6 w-6 border border-[#D8E0D8]" style={{background:t.fg}}/></button>)}</div><p className="mt-2 text-[10px] text-[#8DA08F]">{colors.name} · Check printed contrast before distribution.</p></div>
        <label className="block"><span className="mb-1.5 flex justify-between text-xs font-bold text-[#53705B]"><span>Preview size</span><span>{size} px</span></span><input type="range" min="180" max="400" step="20" value={size} onChange={e=>setSize(Number(e.target.value))} className="w-full accent-[#337B50]"/></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-bold text-[#53705B]">Quiet zone</span><select className={input} value={margin} onChange={e=>setMargin(Number(e.target.value))}><option value={1}>Compact</option><option value={2}>Standard</option><option value={4}>Print generous</option></select></label><label><span className="mb-1.5 block text-xs font-bold text-[#53705B]">Error correction</span><select className={input} value={level} onChange={e=>setLevel(e.target.value as ErrorLevel)}><option value="L">Low</option><option value="M">Medium</option><option value="Q">Quartile</option><option value="H">High</option></select></label></div>
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53705B]">Printed caption</span><input className={input} maxLength={42} value={labelText} onChange={e=>setLabelText(e.target.value)}/></label>
        <div className="flex flex-col gap-3 border-t border-[#E5EDE5] pt-4"><label className="flex items-center justify-between text-xs font-semibold text-[#526E59]">Show caption <input type="checkbox" checked={showCaption} onChange={e=>setShowCaption(e.target.checked)} className="accent-[#31774D]"/></label><label className="flex items-center justify-between text-xs font-semibold text-[#526E59]">Brand card for PNG <input type="checkbox" checked={brandCard} onChange={e=>setBrandCard(e.target.checked)} className="accent-[#31774D]"/></label></div>
        <button type="button" onClick={reset} className="vendor-outline-button w-full"><IconsaxIcon name="refresh" size={15}/> Reset appearance</button>
      </section>

      <section className={panel+' min-w-0 overflow-hidden'} aria-label="QR preview and exports">
        <div className="flex items-center justify-between border-b border-[#E4EDE5] bg-[#F7FAF7] px-5 py-4"><div><p className="vendor-kicker">02 / Live preview</p><h2 className="mt-1 text-[18px] font-extrabold">Your scannable card</h2></div><span className="rounded-[5px] bg-[#E8F2EA] px-2 py-1 text-[10px] font-semibold text-[#4F8260]">Live preview</span></div>
        <div className="flex min-h-[450px] flex-col items-center justify-center gap-5 bg-[linear-gradient(45deg,#F3F6F2_25%,transparent_25%),linear-gradient(-45deg,#F3F6F2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#F3F6F2_75%),linear-gradient(-45deg,transparent_75%,#F3F6F2_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5 sm:p-8">
          <div id="slbi-print-qr" className="flex max-w-full flex-col items-center border border-[#D9E7D9] bg-white p-6 shadow-[0_18px_45px_rgba(28,72,44,.12)] sm:p-8">
            {canExport?<div ref={svgRef} className="max-w-full" style={{width:size}}>
              <QRCodeSVG value={url} size={size} marginSize={margin} bgColor={colors.bg} fgColor={colors.fg} level={level} title={'QR for '+selected?.name} style={{maxWidth:'100%',height:'auto'}}/>
            </div>:<div className="flex h-[260px] w-[260px] items-center justify-center border border-dashed border-[#C6D8C8] bg-[#F8FAF6] text-center text-xs text-[#859887]">Select a valid business destination to preview a QR code</div>}
            {canExport&&<div className="mt-5 max-w-[310px] text-center"><p className="break-words text-[16px] font-black text-[#284B35]">{selected?.name}</p>{showCaption&&<p className="mt-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#73977A]">{labelText||'SCAN TO EXPLORE'}</p>}</div>}
          </div>
          <div className="w-full max-w-[390px] text-center"><p className="text-[11px] font-semibold text-[#688674]">{selected?.name||'Your business'} {checking?'· Loading assigned QR…':''}</p><p className="mt-2 break-all text-[10px] leading-5 text-[#84988A]">{url||'No destination available'}</p></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[#E7EEE7] p-4 sm:p-5">
          <button type="button" disabled={!canExport} onClick={downloadPNG} className="vendor-primary-button flex-1"><IconsaxIcon name="document-download" size={16} color="white"/> Download PNG</button>
          <button type="button" disabled={!canExport} onClick={downloadSVG} className="vendor-outline-button flex-1">Export SVG</button>
          <button type="button" disabled={!canExport} onClick={()=>window.print()} className="vendor-outline-button flex-1">Print</button>
        </div>
        <div ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0">{canExport&&<QRCodeCanvas value={url} size={960} marginSize={margin} fgColor={colors.fg} bgColor={colors.bg} level={level}/>}</div>
      </section>

      <aside className="min-w-0 space-y-5">
        <section className={panel+' p-5'}><p className="vendor-kicker">03 / Distribute</p><h2 className="mt-1 text-[18px] font-extrabold text-[#244C36]">Put it to work</h2><p className="mt-2 text-xs leading-6 text-[#819585]">Save your QR and attach it to a storefront, menu, receipt, poster or social profile.</p>
          <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={()=>void copyLink()} disabled={!canExport} className="vendor-outline-button"><IconsaxIcon name="document-download" size={14}/> Copy URL</button><button type="button" onClick={()=>void share()} disabled={!canExport} className="vendor-outline-button"><IconsaxIcon name="global" size={14}/> Share</button></div>
          {url&&/^https?:/.test(url)&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 text-xs font-bold text-[#337753] underline underline-offset-2">Open destination <IconsaxIcon name="arrow-right-2" size={14}/></a>}
        </section>
        <section className={panel+' p-5'}><p className="vendor-kicker">Directory assignment</p><h3 className="mt-1 text-[16px] font-extrabold">Managed SLBI QR</h3><div className="mt-3 rounded-[6px] border border-[#E4EDE4] bg-[#F8FAF7] p-3 text-[11px] text-[#687E6B]">{assignment?.serial_id?<><p className="font-bold text-[#32724B]">Assigned</p><p className="mt-1 break-all">{assignment.serial_id}</p></>:checking?'Checking assignment…':'No directory QR assignment found for this business.'}</div>
          {!assignment&&<button type="button" onClick={()=>void requestAssignment()} disabled={!selected||requesting||checking} className="vendor-primary-button mt-4 w-full">{requesting?'Requesting…':'Request directory QR'}</button>}
          <p className="mt-3 text-[10px] leading-5 text-[#899B8A]">Managed /q/ links depend on SLBI QR inventory. Direct website and phone codes work independently. Scanner counts are not claimed without verified telemetry.</p>
        </section>
        <section className={panel+' p-5'}><h3 className="text-[15px] font-bold text-[#28553D]">Distribution checklist</h3><div className="mt-4 space-y-3">{['Keep sufficient white/quiet space','Test with an actual phone camera','Check printed foreground contrast','Review your public destination page','Use original SVG for large-format print'].map((x,i)=><div key={x} className="flex gap-2 text-[11px] text-[#6D8473]"><span className="font-bold text-[#5F986A]">{String(i+1).padStart(2,'0')}</span><span>{x}</span></div>)}</div></section>
      </aside>
    </div>
    <style jsx global>{`@media print{
      body * {visibility:hidden!important;}
      #slbi-print-qr,#slbi-print-qr * {visibility:visible!important;}
      #slbi-print-qr {position:absolute!important;top:10mm!important;left:10mm!important;max-width:90vw!important;box-shadow:none!important;border:none!important;}
      @page {margin:10mm;}
    }`}</style>
  </div>;
}
