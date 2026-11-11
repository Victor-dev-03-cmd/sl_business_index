'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {QRCodeSVG} from 'qrcode.react';
import {supabase} from '@/lib/supabaseClient';
import {toast} from 'sonner';
import {
  ArrowUpRight, Check, ChevronRight, ClipboardCopy, Download, ExternalLink,
  FileImage, FileText, LayoutTemplate, Link2, Loader2, Palette, Printer,
  QrCode, RefreshCw, Share2, ShieldCheck, Smartphone, Store,
} from 'lucide-react';

type Business={id:string;name:string;slug:string|null;status:string|null;city:string|null;phone:string|null};
type AssignedQR={id:string;serial_id:string;short_link:string;business_id:string|null;status:string|null;created_at:string|null};
type Tab='design'|'exports'|'distribution';
type PaletteName='classic'|'forest'|'navy'|'ink';
const styles:Record<PaletteName,{label:string;fg:string;bg:string;accent:string}>={
  classic:{label:'Black & white',fg:'#121B18',bg:'#FFFFFF',accent:'#263D2E'},
  forest:{label:'Forest',fg:'#185339',bg:'#FFFFFF',accent:'#1F5D3F'},
  navy:{label:'Indigo',fg:'#1A3260',bg:'#FFFFFF',accent:'#223A6B'},
  ink:{label:'Charcoal',fg:'#2E3133',bg:'#FFFFFF',accent:'#363C3B'},
};
const steps=[
  {name:'Counter card',desc:'Near the checkout'},
  {name:'Store window',desc:'Visible from outside'},
  {name:'Business card',desc:'At networking events'},
  {name:'Flyer',desc:'Alongside your offers'},
] as const;
const panel='border border-[#DCE5DE] bg-white shadow-[0_1px_3px_rgba(18,50,27,0.04)]';
const secondary='inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#C8D8CB] bg-white px-4 text-[12px] font-semibold text-[#375E44] transition hover:bg-[#F1F7F1] disabled:opacity-50';
const primary='inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#275F42] px-4 text-[12px] font-bold text-white transition hover:bg-[#1B4B32] disabled:opacity-50';
const basename=(name:string)=>name.normalize('NFKD').replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/\s+/g,'-').slice(0,42)||'business';

export default function VendorQRCodePage(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [assignedQR,setAssignedQR]=useState<AssignedQR|null>(null);
  const [loading,setLoading]=useState(true);
  const [checkingQR,setCheckingQR]=useState(false);
  const [requestingQR,setRequestingQR]=useState(false);
  const [error,setError]=useState('');
  const [origin,setOrigin]=useState('https://www.slbusinessindex.com');
  const [activeTab,setActiveTab]=useState<Tab>('design');
  const [color,setColor]=useState<PaletteName>('forest');
  const [tagline,setTagline]=useState('Scan to explore our business');
  const [template,setTemplate]=useState<string>('Counter card');
  const [size,setSize]=useState<6|8|10>(8);
  const [showBrand,setShowBrand]=useState(true);
  const [showCode,setShowCode]=useState(true);
  const [exporting,setExporting]=useState(false);
  const qrRef=useRef<HTMLDivElement>(null);

  const selected=businesses.find(b=>b.id===selectedId)||null;
  const palette=styles[color];
  const hasManagedQR=Boolean(assignedQR&&assignedQR.status==='assigned');
  const link=hasManagedQR?origin+'/q/'+encodeURIComponent(assignedQR!.serial_id)
    :selected?origin+'/business/'+encodeURIComponent(selected.slug||selected.id):'';
  const mode=hasManagedQR?'Managed serial QR':'Direct profile QR';
  const valid=Boolean(selected&&link);

  const loadBusinesses=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setBusinesses([]);setSelectedId('');return;}
      const {data,error:readError}=await supabase.from('businesses')
        .select('id,name,slug,status,city,phone').eq('owner_id',user.id).order('name');
      if(readError)throw readError;
      const list=(data||[]) as Business[];
      setBusinesses(list);
      setSelectedId(prev=>list.some(b=>b.id===prev)?prev:list[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Could not load your listings.');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{setOrigin(window.location.origin);void loadBusinesses()},[loadBusinesses]);
  useEffect(()=>{
    if(!selectedId){setAssignedQR(null);setCheckingQR(false);return;}
    let active=true;
    setAssignedQR(null);setCheckingQR(true);
    void (async()=>{
      try{
        const {data,error:readError}=await supabase.from('qr_inventory')
          .select('id,serial_id,short_link,business_id,status,created_at')
          .eq('business_id',selectedId).eq('status','assigned')
          .order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(readError)throw readError;
        if(active)setAssignedQR((data||null) as AssignedQR|null);
      }catch(e){if(active)setError(e instanceof Error?e.message:'Could not load QR assignment.');}
      finally{if(active)setCheckingQR(false);}
    })();
    return()=>{active=false};
  },[selectedId]);

  const requestManaged=async()=>{
    if(!selected||requestingQR)return;
    setRequestingQR(true);
    try{
      const response=await fetch('/api/qr/request',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({business_id:selected.id}),
      });
      const data=await response.json() as {success?:boolean;qr?:AssignedQR;error?:string};
      if(!response.ok||!data.success||!data.qr)throw new Error(data.error||'Unable to assign a QR.');
      setAssignedQR(data.qr);
      toast.success('Managed QR is ready for your business');
    }catch(e){toast.error(e instanceof Error?e.message:'Could not request a managed QR.');}
    finally{setRequestingQR(false);}
  };

  const renderSvg=()=>{
    const svg=qrRef.current?.querySelector('svg');
    if(!svg)throw new Error('QR preview is not available');
    const copy=svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
    copy.setAttribute('width','900');copy.setAttribute('height','900');
    return new XMLSerializer().serializeToString(copy);
  };
  const getCanvas=async()=>{
    const source=renderSvg();
    const blob=new Blob([source],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try{
      const image=new Image();
      await new Promise<void>((resolve,reject)=>{
        image.onload=()=>resolve();image.onerror=()=>reject(new Error('QR rasterization failed'));
        image.src=url;
      });
      const c=document.createElement('canvas');
      c.width=1400;c.height=showBrand?1820:1580;
      const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas export not supported');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle=palette.accent;ctx.fillRect(0,0,c.width,22);
      ctx.drawImage(image,180,140,1040,1040);
      ctx.textAlign='center';
      ctx.fillStyle='#203D2E';ctx.font='bold 50px Arial,sans-serif';
      const title=(selected?.name||'Business').slice(0,38);
      ctx.fillText(title,700,1305,1240);
      ctx.fillStyle='#617769';ctx.font='32px Arial,sans-serif';
      ctx.fillText(tagline.slice(0,65)||'Scan to visit our profile',700,1370,1250);
      if(showBrand){
        ctx.fillStyle='#376D4A';ctx.font='bold 31px Arial,sans-serif';
        ctx.fillText('SL BUSINESS INDEX',700,1470);
      }
      if(showCode&&hasManagedQR){
        ctx.fillStyle='#7C8B7E';ctx.font='26px monospace';
        ctx.fillText(assignedQR!.serial_id,700,showBrand?1540:1450);
      }
      return c;
    }finally{URL.revokeObjectURL(url);}
  };
  const download=(href:string,name:string)=>{
    const a=document.createElement('a');a.href=href;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
  };
  const exportAsset=async(format:'png'|'svg'|'pdf')=>{
    if(!valid||exporting)return;
    setExporting(true);
    try{
      const name=basename(selected!.name)+'-SLBI-QR';
      if(format==='svg'){
        const blob=new Blob([renderSvg()],{type:'image/svg+xml'});
        const url=URL.createObjectURL(blob);
        try{download(url,name+'.svg');}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
      }else{
        const canvas=await getCanvas();
        if(format==='png')download(canvas.toDataURL('image/png'),name+'.png');
        else{
          const {jsPDF}=await import('jspdf');
          const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
          const x=(210-size*10)/2;
          const y=34;
          // All exports use a fixed scan-safe 900px QR embedded into a print card.
          pdf.setFont('helvetica','bold');pdf.setFontSize(17);
          pdf.text(selected!.name.slice(0,70),105,22,{align:'center',maxWidth:180});
          pdf.addImage(canvas.toDataURL('image/png'),'PNG',x,y,size*10,(size*10)*(canvas.height/canvas.width));
          pdf.setFont('helvetica','normal');pdf.setFontSize(9);
          pdf.text('Scan to open this verified directory link',105,170,{align:'center'});
          pdf.setFontSize(8);pdf.text(link.slice(0,150),105,177,{align:'center',maxWidth:170});
          pdf.text('Place the QR at eye level and test with a phone before distributing.',105,195,{align:'center'});
          pdf.save(name+'-print.pdf');
        }
      }
      toast.success(format.toUpperCase()+' export created');
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to export QR.');}
    finally{setExporting(false);}
  };
  const copyLink=async()=>{
    if(!link)return;
    try{await navigator.clipboard.writeText(link);toast.success('QR destination copied');}
    catch{toast.error('Clipboard permission is unavailable');}
  };
  const share=async()=>{
    if(!link)return;
    try{
      if(navigator.share)await navigator.share({title:selected?.name||'Business',url:link});
      else await copyLink();
    }catch(e){if(e instanceof Error&&e.name!=='AbortError')toast.error('Sharing unavailable');}
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-[#1F3B2C]">
      <header className="vendor-premium-header flex flex-col justify-between gap-5 px-6 py-7 lg:flex-row lg:items-end">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#CCE7CE]">Growth OS / Offline-to-online discovery</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.04em] text-white sm:text-[34px]">QR Studio</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#D8ECDC]">Design scan-ready business QR assets, create print materials and share a trustworthy link — all in one professional workspace.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link href="/vendor/insights" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/25 px-4 text-xs font-bold text-white">Growth insights <ArrowUpRight size={14}/></Link>
          <button type="button" onClick={()=>void loadBusinesses()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-xs font-bold text-[#24543B]"><RefreshCw size={14}/> Reload</button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {title:'Connected listing',detail:selected?.name||'No business selected',icon:Store},
          {title:'QR destination',detail:checkingQR?'Checking…':hasManagedQR?'Managed SLBI serial':'Direct public profile',icon:Link2},
          {title:'Export workflow',detail:'PNG · SVG · print PDF',icon:Download},
        ].map(item=><div key={item.title} className={panel+' flex min-w-0 items-center gap-3 p-4'}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ECF4EB] text-[#34744D]"><item.icon size={19}/></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#899D8E]">{item.title}</p><p className="mt-1 truncate text-[12px] font-bold text-[#2A4C38]">{item.detail}</p></div>
        </div>)}
      </div>

      {error&&<div role="alert" className="border border-[#EED8C9] bg-[#FFFAF4] p-4 text-xs text-[#8A5D45]">{error}</div>}
      {!loading&&!businesses.length&&<div className={panel+' p-6 text-sm'}>Create or claim a business listing to build a QR asset. <Link className="font-bold underline" href="/vendor/my-businesses">Manage businesses</Link></div>}

      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="min-w-0 space-y-5">
          <div className={panel+' p-5'}>
            <h2 className="text-[16px] font-bold">01 / Destination</h2>
            <p className="mt-1 text-[12px] text-[#7A907C]">QRs must open a real, publicly reachable business profile.</p>
            <label className="mt-4 block text-[11px] font-bold">Business listing</label>
            <select className="mt-1 w-full min-w-0 rounded-md border border-[#CCD8CC] bg-white px-3 py-3 text-xs font-semibold" value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
              {!businesses.length&&<option value="">No listing available</option>}
              {businesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status||'pending'}</option>)}
            </select>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {checkingQR?<span className="inline-flex items-center gap-2 text-xs text-[#648472]"><Loader2 size={14} className="animate-spin"/> Checking managed QR</span>
                :hasManagedQR?<span className="inline-flex items-center gap-2 text-xs font-semibold text-[#367450]"><Check size={14}/> Managed QR assigned: {assignedQR!.serial_id}</span>
                :<span className="text-[11px] text-[#6E8274]">Using a direct business profile link until a managed serial is assigned.</span>}
            </div>
            {!hasManagedQR&&selected&&<button type="button" onClick={()=>void requestManaged()} disabled={requestingQR||selected.status!=='approved'} className={secondary+' mt-3'}>
              {requestingQR?<Loader2 size={15} className="animate-spin"/>:<QrCode size={16}/>} Request managed QR
            </button>}
            {selected&&selected.status!=='approved'&&<p className="mt-2 text-[11px] text-[#966C42]">Managed codes require an approved listing. A direct profile preview is available for planning.</p>}
            <div className="mt-4 flex items-start gap-2 rounded-md border border-[#DCE8DD] bg-[#F6FAF5] p-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#43855B]"/><p className="min-w-0 break-all text-[11px] leading-6 text-[#47634F]">{link||'Select a business to display a QR destination.'}</p>
            </div>
          </div>

          <div className={panel+' p-5'}>
            <div className="flex flex-wrap gap-1 border-b border-[#E4EAE4] pb-3">
              {([{id:'design',title:'Design'},{id:'exports',title:'Export'},{id:'distribution',title:'Distribution'}] as const).map(t=><button type="button" key={t.id} onClick={()=>setActiveTab(t.id)} aria-pressed={activeTab===t.id}
                className={'min-h-9 rounded-md px-4 text-xs font-bold '+(activeTab===t.id?'bg-[#E7F1E8] text-[#265B3F]':'text-[#748677] hover:bg-[#F5F8F5]')}>{t.title}</button>)}
            </div>
            {activeTab==='design'&&<div className="space-y-5 pt-5">
              <div><p className="text-[11px] font-bold">Scan-safe color palette</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(styles) as PaletteName[]).map(p=><button key={p} type="button" onClick={()=>setColor(p)} aria-pressed={color===p} className={'flex items-center gap-2 rounded-md border p-2.5 text-left text-[11px] font-bold '+(color===p?'border-[#35734B] bg-[#F0F7EF]':'border-[#DFE7DF]')}>
                  <span className="h-6 w-6 shrink-0 rounded-sm border" style={{background:styles[p].fg}}/>{styles[p].label}
                </button>)}</div></div>
              <label className="block text-[11px] font-bold">Scan instruction<input className="mt-1 w-full rounded-md border border-[#CBD9CB] p-3 text-xs" maxLength={65} value={tagline} onChange={e=>setTagline(e.target.value)}/></label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={showBrand} onChange={e=>setShowBrand(e.target.checked)}/> Show SLBI attribution</label>
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={showCode} onChange={e=>setShowCode(e.target.checked)}/> Show serial when managed</label>
              </div>
              <div><p className="text-[11px] font-bold">Placement template</p><div className="mt-2 grid grid-cols-2 gap-2">{steps.map(item=><button type="button" key={item.name} onClick={()=>setTemplate(item.name)} aria-pressed={template===item.name} className={'rounded-md border p-3 text-left '+(template===item.name?'border-[#4F9064] bg-[#F0F7EE]':'border-[#E0E7DF]')}>
                <p className="text-xs font-bold">{item.name}</p><p className="mt-1 text-[10px] text-[#839587]">{item.desc}</p>
              </button>)}</div></div>
            </div>}
            {activeTab==='exports'&&<div className="space-y-4 pt-5">
              <div><label className="block text-[11px] font-bold">QR width for printable PDF</label><div className="mt-2 flex flex-wrap gap-2">{([6,8,10] as const).map(s=><button type="button" key={s} onClick={()=>setSize(s)} className={'rounded-md border px-4 py-2 text-xs font-bold '+(size===s?'border-[#448459] bg-[#E7F2E9]':'border-[#D7E3D9]')}>{s} cm</button>)}</div></div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button className={secondary} disabled={!valid||exporting} onClick={()=>void exportAsset('png')}><FileImage size={16}/> PNG</button>
                <button className={secondary} disabled={!valid||exporting} onClick={()=>void exportAsset('svg')}><FileImage size={16}/> SVG</button>
                <button className={primary} disabled={!valid||exporting} onClick={()=>void exportAsset('pdf')}><Printer size={16}/> Print PDF</button>
              </div>
              <p className="text-[11px] leading-5 text-[#819385]">PNG for digital sharing, SVG for high-resolution printing, PDF for A4 print. Test the downloaded QR on a phone before bulk printing.</p>
            </div>}
            {activeTab==='distribution'&&<div className="space-y-4 pt-5">
              <p className="text-[12px] leading-6 text-[#697E6E]">Use this link on invoices, signage and digital profiles. Managed serials route through SLBI; direct profile QR does not claim scan analytics.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={!valid} onClick={()=>void copyLink()} className={secondary}><ClipboardCopy size={15}/> Copy destination</button>
                <button type="button" disabled={!valid} onClick={()=>void share()} className={secondary}><Share2 size={15}/> Share link</button>
                <a href={link||'#'} target="_blank" rel="noopener noreferrer" className={secondary+' '+(!valid?'pointer-events-none opacity-50':'')}><ExternalLink size={15}/> Open destination</a>
                <Link className={secondary} href="/vendor/insights"><ChevronRight size={16}/> View interactions</Link>
              </div>
              <p className="border border-[#DDE7DF] bg-[#F7FAF7] p-3 text-[11px] leading-5 text-[#6E856F]">SLBI does not infer QR scan counts from link creation. Interaction reporting is separate and may require configured tracking.</p>
            </div>}
          </div>
          <div className={panel+' p-5'}>
            <div className="flex gap-2"><LayoutTemplate size={17} className="text-[#4C865D]"/><h3 className="text-[13px] font-bold">Placement checklist</h3></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {['Keep a white margin around the QR','Avoid glossy or heavily curved surfaces','Use a clear call to action','Scan-test with multiple phone cameras'].map((tip,i)=><div key={tip} className="flex items-start gap-2 text-[11px] leading-5 text-[#6F836F]"><span className="font-bold text-[#3B7E54]">0{i+1}</span>{tip}</div>)}
            </div>
          </div>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-4 lg:h-fit">
          <div className={panel+' overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#E5ECE4] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#719A76]">Live QR preview</p><h2 className="mt-1 text-[15px] font-bold">{template}</h2></div><Palette size={19} className="text-[#688D71]"/></div>
            <div className="bg-[#F0F4EF] p-5 sm:p-8">
              <div className="mx-auto max-w-[355px] border border-[#DFE7DE] bg-white shadow-[0_12px_36px_rgba(26,66,43,.10)]" style={{borderTop:'5px solid '+palette.accent}}>
                <div className="p-5 sm:p-7">
                  <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-widest text-[#8D9F90]">{mode}</p>
                  <div ref={qrRef} className="mx-auto max-w-[258px] bg-white p-2">
                    {valid?<QRCodeSVG value={link} size={900} style={{width:'100%',height:'auto',display:'block'}} marginSize={4} fgColor={palette.fg} bgColor={palette.bg} level="H"/>
                      :<div className="flex aspect-square items-center justify-center border border-dashed border-[#CEDAD0] text-[#A6B8A6]"><QrCode size={80}/></div>}
                  </div>
                  <h3 className="mt-6 break-words text-center text-[17px] font-extrabold text-[#253D2E]">{selected?.name||'Select a business'}</h3>
                  <p className="mt-1 text-center text-[11px] leading-5 text-[#7D8D7D]">{tagline}</p>
                  {showBrand&&<p className="mt-5 text-center text-[10px] font-extrabold tracking-[.12em] text-[#397C55]">SRI LANKA BUSINESS INDEX</p>}
                  {showCode&&hasManagedQR&&<p className="mt-2 text-center font-mono text-[11px] text-[#7A927F]">{assignedQR!.serial_id}</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E9E2] px-5 py-4">
              <p className="text-[11px] text-[#869889]"><Smartphone size={14} className="mr-1 inline"/> Phone-scan compatible</p>
              <button type="button" onClick={()=>{setActiveTab('exports');void exportAsset('png')}} disabled={!valid||exporting} className={primary}>{exporting?<Loader2 className="animate-spin" size={15}/>:<Download size={15}/>} Download PNG</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
