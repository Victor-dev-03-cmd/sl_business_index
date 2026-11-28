'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import type {EmailStudioBusiness,EmailStudioConnection} from './EmailMarketingWorkbench';
import {EMAIL_LANGUAGES,EMAIL_CAMPAIGNS,httpsLink} from '@/lib/marketing/email-studio';
import {EMAIL_TEMPLATE_LAYOUTS,safeCustomPreviewDocument,type EmailTemplateLayout}
  from '@/lib/marketing/email-template-contract';
import {
  EMAIL_BLOCK_TYPES,newEmailBlock,moveEmailBlock,briefFromBlocks,
  type EmailVisualBlock,type EmailBlockType,type LocalEmailCampaign,
} from '@/lib/marketing/email-hub-contract';

type Props={
  campaign:LocalEmailCampaign;business:EmailStudioBusiness;
  sender:EmailStudioConnection|null;verifiedCount:number|undefined;
  emailAiEnabled:boolean;testSendEnabled:boolean;
  onSave:(campaign:LocalEmailCampaign)=>Promise<'server'|'browser'|'failed'>;onClose:()=>void;
};
const input='min-h-10 w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/10';
const label='mb-1 block text-[11px] font-bold text-[#374151]';
const muted='text-[11px] leading-5 text-[#6B7280]';
const icon=(name:string,size=16)=><IconsaxIcon name={name} size={size}/>;
type InlineProps={
  value:string;onChange:(next:string)=>void;label:string;max:number;
  className:string;multiline?:boolean;
};
/** Plain-text contentEditable: the React state stays canonical, and paste
 * inserts text nodes only, never pasted HTML/scripts or external images. */
function InlineText({value,onChange,label,max,className,multiline=false}:InlineProps){
  const ref=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(ref.current&&document.activeElement!==ref.current&&ref.current.innerText!==value)
      ref.current.innerText=value;
  },[value]);
  return <div ref={ref} contentEditable role="textbox" aria-label={label}
    aria-multiline={multiline} tabIndex={0} spellCheck
    data-inline-editable={label}
    className={className+' cursor-text outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2'}
    onInput={e=>onChange(e.currentTarget.innerText.slice(0,max))}
    onKeyDown={e=>{if(!multiline&&e.key==='Enter')e.preventDefault();}}
    onPaste={e=>{
      e.preventDefault();
      const plain=e.clipboardData.getData('text/plain').replace(/\r/g,'').slice(0,max);
      const selection=window.getSelection();
      if(!selection?.rangeCount||!ref.current)return;
      const range=selection.getRangeAt(0);
      if(!ref.current.contains(range.commonAncestorContainer))return;
      range.deleteContents();
      const node=document.createTextNode(plain);
      range.insertNode(node);
      range.setStartAfter(node);range.collapse(true);
      selection.removeAllRanges();selection.addRange(range);
      onChange(ref.current.innerText.slice(0,max));
    }}/>;
}
const selectionBorder='border-2 border-transparent transition hover:border-[#FDBA74] focus-within:border-[#F97316]';

export default function EmailCampaignCanvas({
  campaign:initial,business,sender,verifiedCount,emailAiEnabled,testSendEnabled,onSave,onClose,
}:Props){
  const [campaign,setCampaign]=useState<LocalEmailCampaign>(initial);
  const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
  const [darkCheck,setDarkCheck]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const campaignRef=useRef(campaign);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const [posterPanel,setPosterPanel]=useState(false);
  const [posters,setPosters]=useState<Array<{id:string;createdAt?:string}>>([]);
  const [posterBusy,setPosterBusy]=useState(false);
  const [posterError,setPosterError]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  const [testBusy,setTestBusy]=useState(false);
  const [testMessage,setTestMessage]=useState('');
  const [reviewOpen,setReviewOpen]=useState(false);
  const [deliveryChoice,setDeliveryChoice]=useState<'now'|'later'>('now');
  const [plannedAt,setPlannedAt]=useState('');
  const [customHtml,setCustomHtml]=useState('<h2>Your business update</h2><p>Write your email layout here.</p>');
  const [customName,setCustomName]=useState('My Brand Template');
  useEffect(()=>{campaignRef.current=campaign;},[campaign]);
  const selected=campaign.blocks.find(b=>b.id===selectedId)||null;
  const brandName=business.brandName||business.name;
  const profileUrl='https://www.slbusinessindex.com/business/'+
    (business.slug&&/^[a-z0-9-]+$/i.test(business.slug)?business.slug:business.id);
  const buttonColor=campaign.buttonColor||business.accentColor||'#F97316';
  const logoSize=campaign.logoSize||56;
  const posterUrl=campaign.posterId?'/api/marketing/poster/saved?businessId='+
    encodeURIComponent(business.id)+'&assetId='+encodeURIComponent(campaign.posterId):null;

  useEffect(()=>{
    setMounted(true);
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=oldOverflow;};
  },[]);
  useEffect(()=>{
    try{
      const item=localStorage.getItem('slbi.email.brand-template.'+business.id);
      if(!item)return;
      const parsed:unknown=JSON.parse(item);
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
        const data=parsed as Record<string,unknown>;
        if(typeof data.html==='string')setCustomHtml(data.html.slice(0,12000));
        if(typeof data.name==='string')setCustomName(data.name.slice(0,70));
      }
    }catch{/* Local custom template is optional. */}
  },[business.id]);

  const updateCampaign=(patch:Partial<LocalEmailCampaign>)=>{
    setCampaign(old=>({...old,...patch}));setDirty(true);setNotice('');setError('');
  };
  const updateBlock=(id:string,patch:Partial<EmailVisualBlock>)=>{
    setCampaign(old=>({...old,blocks:old.blocks.map(block=>block.id===id?{...block,...patch}:block)}));
    setDirty(true);setNotice('');setError('');
  };
  const insertBlock=(type:EmailBlockType)=>{
    const block=newEmailBlock(type);
    setCampaign(old=>({...old,blocks:[...old.blocks,block].slice(0,20)}));
    setSelectedId(block.id);setDirty(true);setNotice('');
  };
  const deleteBlock=(id:string)=>{
    setCampaign(old=>({...old,blocks:old.blocks.filter(b=>b.id!==id)}));
    setSelectedId(null);setDirty(true);
  };
  const reorder=(id:string,delta:number)=>{
    setCampaign(old=>({...old,blocks:moveEmailBlock(old.blocks,id,delta)}));setDirty(true);
  };
  const switchLayout=(layout:EmailTemplateLayout)=>{
    setCampaign(old=>{
      const current=old.blocks.filter(b=>!['poster','offers'].includes(b.type));
      if(layout==='hero')current.splice(1,0,old.blocks.find(b=>b.type==='poster')||newEmailBlock('poster'));
      if(layout==='offers')current.splice(1,0,old.blocks.find(b=>b.type==='offers')||newEmailBlock('offers'));
      return {...old,layout,blocks:current};
    });
    setSelectedId(null);setDirty(true);
  };
  const save=async()=>{
    if(saving)return;
    const snapshot=campaign;
    const version={...campaign,title:campaign.title.trim().slice(0,100)||'Untitled campaign',
      updatedAt:new Date().toISOString(),status:'local_draft' as const};
    setSaving(true);setError('');
    try{
      const outcome=await onSave(version);
      if(outcome==='failed'){
        setError('Could not save this campaign. Your current editor remains open.');
        return;
      }
      if(JSON.stringify(campaignRef.current)===JSON.stringify(snapshot)){
        setCampaign(version);setDirty(false);
      }
      setNotice(outcome==='server'?'Saved to your SLBI account.':'Saved in this browser; cloud sync unavailable.');
    }catch{
      setError('Campaign could not be saved. Check your connection and retry.');
    }finally{setSaving(false);}
  };
  useEffect(()=>{
    if(!dirty||saving)return;
    const handle=setTimeout(()=>{void save();},2500);
    return()=>clearTimeout(handle);
  },[campaign,dirty,saving]);
  const close=()=>{
    if(dirty&&!window.confirm('Discard unsaved changes to this campaign?'))return;
    onClose();
  };
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
        e.preventDefault();void save();return;
      }
      if(e.key==='Escape'&&!reviewOpen)close();
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
    // Closing is always explicit; updated state is captured on each render.
  });
  const loadPosters=async()=>{
    setPosterPanel(true);setPosterBusy(true);setPosterError('');
    try{
      const res=await fetch('/api/marketing/poster/saved?businessId='+encodeURIComponent(business.id),{
        method:'GET',credentials:'same-origin',cache:'no-store',
      });
      const payload:unknown=await res.json();
      if(!res.ok||!payload||typeof payload!=='object'||Array.isArray(payload))
        throw new Error('Saved posters are unavailable.');
      const data=payload as {assets?:unknown};
      if(!Array.isArray(data.assets))throw new Error('No poster library found.');
      setPosters(data.assets.filter(x=>x&&typeof x==='object'&&
        typeof (x as {id?:unknown}).id==='string'&&
        /^[0-9a-f-]{36}$/i.test((x as {id:string}).id)).slice(0,40)
        .map(x=>({id:(x as {id:string}).id})));
    }catch(e){setPosterError(e instanceof Error?e.message:'Poster library unavailable.');setPosters([]);}
    finally{setPosterBusy(false);}
  };
  const generateWithGemini=async()=>{
    if(!emailAiEnabled||aiBusy)return;
    const brief=briefFromBlocks(campaign.blocks);
    if(brief.length<15){setError('Write your campaign details before using AI.');return;}
    setAiBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/marketing/email/generate',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId:business.id,requestKey:crypto.randomUUID(),
          language:campaign.language,kind:campaign.kind,brief,ctaUrl:campaign.ctaUrl}),
      });
      const parsed:unknown=await response.json();
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('AI response unavailable.');
      const result=parsed as {error?:unknown;draft?:unknown};
      if(!response.ok)throw Error(typeof result.error==='string'?result.error:'Gemini could not generate your draft.');
      const d=result.draft as {subject?:unknown;preheader?:unknown;body?:unknown;ctaLabel?:unknown}|undefined;
      if(!d||typeof d.subject!=='string'||typeof d.preheader!=='string'||
        typeof d.body!=='string'||typeof d.ctaLabel!=='string')throw Error('Incomplete AI draft.');
      setCampaign(old=>({...old,subject:String(d.subject).slice(0,140),
        preheader:String(d.preheader).slice(0,180),
        blocks:old.blocks.map(b=>b.type==='body'?{...b,text:String(d.body).slice(0,3000)}:
          b.type==='button'?{...b,text:String(d.ctaLabel).slice(0,80)}:b)}));
      setDirty(true);
      setNotice('AI draft created. Review every claim before using it.');
    }catch(e){setError(e instanceof Error?e.message:'Could not generate AI copy.');}
    finally{setAiBusy(false);}
  };
  const sendOneSelfTest=async()=>{
    if(!sender?.sendCapable||!testSendEnabled||testBusy)return;
    if(!window.confirm('Send exactly ONE test email to your connected Gmail account: '+
      sender.accountDisplayName+'? No subscribers or customers will receive this message.'))return;
    setTestBusy(true);setTestMessage('');setError('');
    try{
      const response=await fetch('/api/marketing/email/test-send',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          businessId:business.id,connectionId:sender.id,requestKey:crypto.randomUUID(),draft:campaign,
        }),
      });
      const value:unknown=await response.json();
      if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid Gmail response');
      const data=value as {acceptedByGoogle?:unknown;recipient?:unknown;error?:unknown};
      if(!response.ok||data.acceptedByGoogle!==true)
        throw Error(typeof data.error==='string'?data.error:'Gmail did not confirm the test email.');
      setTestMessage('Google accepted one test addressed to '+
        String(data.recipient||sender.accountDisplayName)+'. Check Gmail Inbox/Spam.');
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Gmail self-test unavailable.');}
    finally{setTestBusy(false);}
  };
  const saveCustom=()=>{
    try{
      localStorage.setItem('slbi.email.brand-template.'+business.id,JSON.stringify({
        name:customName.trim().slice(0,70),html:customHtml.slice(0,12000),
      }));
      setNotice('Template saved on this browser.');
    }catch{setError('Browser storage is unavailable.');}
  };
  if(!mounted)return null;
  const previewBlock=(b:EmailVisualBlock,index:number)=><div key={b.id}
    role="group" aria-label={'Email block '+(index+1)+': '+b.type}
    draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',b.id);setDragId(b.id);}}
    onDragOver={e=>e.preventDefault()}
    onDrop={e=>{
      e.preventDefault();
      if(!dragId||dragId===b.id)return;
      const from=campaign.blocks.findIndex(x=>x.id===dragId);
      const to=campaign.blocks.findIndex(x=>x.id===b.id);
      if(from>=0&&to>=0)reorder(dragId,to-from);
      setDragId(null);
    }}
    onDragEnd={()=>setDragId(null)}
    onClick={()=>setSelectedId(b.id)}
    className={'group relative min-w-0 rounded-lg p-2 '+selectionBorder+
      (selectedId===b.id?' !border-[#F97316]':'')+
      (dragId===b.id?' opacity-50':'')}>
    <span className="pointer-events-none absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded bg-[#111827] px-1.5 py-1 text-[9px] font-bold text-white group-hover:block" aria-hidden="true">⋮⋮</span>
    {b.type==='headline'&&<InlineText value={b.text} label="Headline — edit directly"
      max={200} onChange={next=>updateBlock(b.id,{text:next})}
      className="min-h-9 break-words rounded p-1 text-[23px] font-bold leading-tight text-[#111827]"/>}
    {b.type==='body'&&<InlineText value={b.text} label="Email body — edit directly"
      max={3000} multiline onChange={next=>updateBlock(b.id,{text:next})}
      className="min-h-[80px] whitespace-pre-wrap break-words rounded p-1 text-[13px] leading-7 text-[#374151]"/>}
    {b.type==='button'&&<div className="py-3 text-center">
      <div style={{backgroundColor:buttonColor}} className="mx-auto inline-block max-w-full rounded-xl">
        <InlineText value={b.text} label="CTA button label — edit directly" max={90}
          onChange={next=>updateBlock(b.id,{text:next})}
          className="inline-block min-h-11 max-w-full rounded-xl px-6 py-3 text-center text-[12px] font-bold text-white"/>
      </div>
      <span className="sr-only">Button color can be changed in the Blocks and Brand panel.</span>
    </div>}
    {b.type==='divider'&&<hr className="my-4 border-[#E5E7EB]"/>}
    {b.type==='poster'&&<button type="button" onClick={e=>{e.stopPropagation();void loadPosters();}}
      className="block w-full overflow-hidden rounded-xl border border-dashed border-[#FED7AA] bg-[#FFF7ED]">
      {posterUrl?<img src={posterUrl} alt="Private Poster Studio preview"
        className="max-h-[420px] w-full object-contain"/>:
        <span className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-[12px] font-semibold text-[#9A541D]">
          {icon('image',24)} Click to choose a Poster Studio image
        </span>}
    </button>}
    {b.type==='offers'&&<div className="grid grid-cols-2 gap-2">
      {[b.text,b.secondText||''].map((offer,i)=><div key={i}
        className="rounded-xl border border-[#F1DAC9] bg-[#FFF7ED] p-3">
        <span className="text-[10px] font-bold uppercase text-[#C16C2A]">Offer {i+1}</span>
        <InlineText value={offer} label={'Offer '+(i+1)+' — edit directly'} max={400} multiline
          onChange={next=>updateBlock(b.id,i===0?{text:next}:{secondText:next})}
          className="mt-2 min-h-16 whitespace-pre-wrap break-words rounded p-1 text-[12px] leading-5 text-[#292524]"/>
      </div>)}
    </div>}
    <div className="absolute right-1 top-1 hidden items-center gap-1 rounded-lg border bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex">
      <button type="button" aria-label={'Move '+b.type+' up'} disabled={index===0}
        onClick={e=>{e.stopPropagation();reorder(b.id,-1);}}
        className="rounded p-1 text-[#4B5563] hover:bg-orange-50 disabled:opacity-25">{icon('arrow-up-2',15)}</button>
      <button type="button" aria-label={'Move '+b.type+' down'} disabled={index===campaign.blocks.length-1}
        onClick={e=>{e.stopPropagation();reorder(b.id,1);}}
        className="rounded p-1 text-[#4B5563] hover:bg-orange-50 disabled:opacity-25">{icon('arrow-down-2',15)}</button>
      <button type="button" aria-label={'Remove '+b.type}
        onClick={e=>{e.stopPropagation();deleteBlock(b.id);}}
        className="rounded p-1 font-bold text-red-600 hover:bg-red-50">×</button>
    </div>
  </div>;
  const screen=<div role="dialog" aria-modal="true" aria-label="Email campaign visual editor"
    data-testid="email-v4-focus-builder" className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#111827]"
    style={{colorScheme:'light'}}>
    <header className="flex min-h-[70px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-3 py-3 shadow-[0_1px_5px_rgba(17,24,39,.03)] sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button type="button" onClick={close}
          aria-label="Back to campaign hub"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB]">{icon('arrow-left-2',20)}</button>
        <div className="min-w-0">
          <input value={campaign.title} maxLength={100} aria-label="Campaign name"
            onChange={e=>updateCampaign({title:e.target.value})}
            className="w-full min-w-0 max-w-[310px] border-0 bg-transparent text-[16px] font-extrabold tracking-tight outline-none focus:underline sm:text-[19px]"/>
          <p className="text-[10px] text-[#6B7280]">{brandName} · Auto-save enabled{dirty?' · Editing…':''}{saving?' · Syncing…':''}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F3F4F6] p-1">
        <button type="button" onClick={()=>setDevice('desktop')} aria-pressed={device==='desktop'}
          className={'rounded-lg px-3 py-2 text-[11px] font-bold '+(device==='desktop'?'bg-white shadow-sm':'text-[#6B7280]')}>Desktop</button>
        <button type="button" onClick={()=>setDevice('mobile')} aria-pressed={device==='mobile'}
          className={'rounded-lg px-3 py-2 text-[11px] font-bold '+(device==='mobile'?'bg-white shadow-sm':'text-[#6B7280]')}>Mobile</button>
        <button type="button" onClick={()=>setDarkCheck(x=>!x)} aria-pressed={darkCheck}
          className={'rounded-lg px-3 py-2 text-[11px] font-bold '+(darkCheck?'bg-[#111827] text-white':'text-[#6B7280]')}>Dark</button>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={()=>void save()} disabled={saving}
          className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-4 text-[12px] font-bold text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50">{saving?'Saving…':'Save draft'}</button>
        <button type="button" onClick={()=>setReviewOpen(true)}
          className="min-h-10 rounded-xl bg-[#F97316] px-4 text-[12px] font-bold text-white hover:bg-[#EA580C]">
          {sender?'Review to send':'Connect to send'}
        </button>
      </div>
    </header>

    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(230px,25fr)_minmax(0,50fr)_minmax(235px,25fr)] xl:overflow-hidden">
      <aside aria-label="Sender and audience" className="order-2 min-w-0 space-y-6 border-r border-[#E5E7EB] bg-white p-4 sm:p-5 xl:order-1 xl:overflow-y-auto">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#EA580C]">01 · Campaign Setup</p>
          <h2 className="mt-1 text-[17px] font-extrabold">Sender & Audience</h2>
        </div>
        <div>
          <label className={label}>Connected sender</label>
          {sender?<div className="flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] p-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#16A34A]"/>
            <span className="min-w-0 truncate text-[11px] font-bold text-[#166534]">{sender.accountDisplayName}</span>
          </div>:<Link href="/vendor/marketing-engine/connections"
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#111827] px-3 text-[11px] font-bold text-white">
            Connect Gmail
          </Link>}
          <p className={muted+' mt-2'}>Use your authorized business account.</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] p-3">
          <p className={label}>Verified audience</p>
          <strong className="block text-[24px] font-extrabold">{verifiedCount===undefined?'—':verifiedCount}</strong>
          <p className={muted}>{verifiedCount===undefined?'Subscriber registry not available':'Confirmed subscribers'}</p>
          <Link href="/vendor/leads" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#C65F12] hover:underline">
            View Leads CRM {icon('arrow-right-2',14)}
          </Link>
        </div>
        <div className="space-y-3">
          <label className={label}>Email template</label>
          <select value={campaign.layout} onChange={e=>switchLayout(e.target.value as EmailTemplateLayout)}
            className={input}>
            {EMAIL_TEMPLATE_LAYOUTS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <label className={label}>Language</label>
          <select value={campaign.language} onChange={e=>updateCampaign({language:e.target.value as LocalEmailCampaign['language']})}
            className={input}>
            {EMAIL_LANGUAGES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label className={label}>Campaign type</label>
          <select value={campaign.kind} onChange={e=>updateCampaign({kind:e.target.value as LocalEmailCampaign['kind']})}
            className={input}>
            {EMAIL_CAMPAIGNS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-[#F3E1D2] bg-[#FFF9F5] p-3">
          <p className={label}>Delivery plan</p>
          <label className="flex min-h-9 items-center gap-2 text-[11px] font-medium">
            <input type="radio" checked={deliveryChoice==='now'} onChange={()=>setDeliveryChoice('now')}
              className="accent-[#F97316]"/>Review for immediate delivery
          </label>
          <label className="flex min-h-9 items-center gap-2 text-[11px] font-medium">
            <input type="radio" checked={deliveryChoice==='later'} onChange={()=>setDeliveryChoice('later')}
              className="accent-[#F97316]"/>Plan a date
          </label>
          {deliveryChoice==='later'&&<input aria-label="Planned date and time" type="datetime-local"
            value={plannedAt} onChange={e=>setPlannedAt(e.target.value)} className={input}/>}
          <p className={muted+' mt-2'}>Planning only. No message is scheduled without the approved delivery service.</p>
        </div>
      </aside>

      <main aria-label="Inline email design canvas"
        className={'order-1 min-w-0 overflow-y-visible px-3 py-6 sm:px-5 xl:order-2 xl:overflow-y-auto xl:py-8 '+
          (darkCheck?'bg-[#1F2937]':'bg-[#F3F4F6]')}>
        <div className={'mx-auto w-full transition-[max-width] duration-200 '+(device==='mobile'?'max-w-[390px]':'max-w-[680px]')}>
          <div className={'mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] '+
            (darkCheck?'bg-[#111827] text-[#E5E7EB]':'bg-white text-[#6B7280]')}>
            <span className="h-6 w-6 rounded-full bg-[#EA4335] text-center text-sm font-bold leading-6 text-white">M</span>
            <span className="min-w-0 flex-1 truncate">{brandName} · Inbox preview</span>
            <span>Editable preview</span>
          </div>
          <div className="overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_20px_65px_rgba(17,24,39,.10)]">
            <div className="space-y-1 border-b border-[#F3F4F6] bg-white px-4 py-4 sm:px-7">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Subject</p>
              <InlineText value={campaign.subject} label="Email subject — edit directly" max={140}
                onChange={next=>updateCampaign({subject:next})}
                className="min-h-8 break-words rounded p-1 text-[16px] font-bold text-[#111827]"/>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Inbox preview text</p>
              <InlineText value={campaign.preheader} label="Email preview snippet — edit directly" max={180}
                onChange={next=>updateCampaign({preheader:next})}
                className="min-h-7 break-words rounded p-1 text-[12px] text-[#6B7280]"/>
            </div>
            <div className="border-t-4 px-4 py-6 sm:px-7" style={{borderTopColor:buttonColor}}>
              <div className="flex min-w-0 items-center gap-4 rounded-lg p-1">
                <button type="button" onClick={()=>{setSelectedId('brand');}}
                  aria-label="Select brand header to adjust logo size"
                  className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#FED7AA] bg-[#FFF7ED] text-xl font-bold text-[#C65F12]"
                  style={{width:logoSize,height:logoSize}}>
                  {business.logoUrl?<img alt={brandName+' logo'} src={business.logoUrl} className="h-full w-full object-cover"/>:
                    (brandName.trim()[0]||'B')}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[17px] font-extrabold text-[#111827]">{brandName}</p>
                  <p className="text-[11px] text-[#6B7280]">{business.city||'Business update'}</p>
                </div>
              </div>
              {campaign.layout==='custom'?<div className="mt-5 rounded-lg border border-[#E5E7EB]">
                <iframe sandbox="" referrerPolicy="no-referrer" title="Isolated custom email HTML design"
                  srcDoc={safeCustomPreviewDocument(customHtml)}
                  className="h-[370px] w-full bg-white"/>
              </div>:
                <div className="mt-6 space-y-2" data-testid="email-v4-inline-blocks">
                  {campaign.blocks.map(previewBlock)}
                </div>}
            </div>
            <footer className="border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-5 text-center text-[10px] leading-5 text-[#6B7280]">
              <p>{[business.address,business.city].filter(Boolean).join(', ')||brandName}</p>
              <p className="mt-2">Email preferences and unsubscribe are provided after sending infrastructure activation.</p>
            </footer>
          </div>
          <p className={'mt-3 text-center text-[10px] '+(darkCheck?'text-[#D1D5DB]':'text-[#9CA3AF]')}>
            Click text to edit · Drag blocks to reorder · Dark mode is a visual check
          </p>
        </div>
      </main>

      <aside aria-label="Blocks and AI tools" className="order-3 min-w-0 space-y-5 border-l border-[#E5E7EB] bg-white p-4 sm:p-5 xl:overflow-y-auto">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#EA580C]">03 · Design Tools</p>
          <h2 className="mt-1 text-[17px] font-extrabold">Blocks & AI</h2>
        </div>
        {emailAiEnabled&&<div className="rounded-xl border border-[#FDBA74] bg-[#FFF7ED] p-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#9A3412]">{icon('magic-star')} Gemini Copywriter</div>
          <p className={muted+' mt-2'}>Create a multilingual draft from your business facts. Review before saving.</p>
          <button type="button" disabled={aiBusy} onClick={()=>void generateWithGemini()}
            className="mt-3 min-h-10 w-full rounded-lg bg-[#F97316] px-2 text-[11px] font-bold text-white disabled:opacity-50">
            {aiBusy?'Generating…':'✨ Rewrite email with Gemini'}
          </button>
        </div>}
        {campaign.layout==='custom'?<div className="space-y-2">
          <label className={label}>Custom HTML template</label>
          <input className={input} aria-label="Saved template name" maxLength={70}
            value={customName} onChange={e=>setCustomName(e.target.value)}/>
          <textarea className={input+' min-h-[200px] font-mono'} value={customHtml} rows={8}
            maxLength={12000} onChange={e=>setCustomHtml(e.target.value)}
            aria-label="Custom HTML source"/>
          <button type="button" onClick={saveCustom}
            className="min-h-10 rounded-lg border border-[#D1D5DB] px-3 text-[11px] font-bold">Save HTML template locally</button>
          <p className={muted}>HTML renders inside an isolated preview. It is not sent to recipients.</p>
        </div>:<>
          <div>
            <p className={label}>Add a content block</p>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_BLOCK_TYPES.map(item=><button type="button" key={item.type}
                disabled={campaign.blocks.length>=20} onClick={()=>insertBlock(item.type)}
                title={item.description}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-2 text-left text-[11px] font-semibold hover:border-[#FDBA74] hover:bg-[#FFF7ED] disabled:opacity-40">
                <span className="text-[#EA580C]">{icon(item.type==='poster'?'image':item.type==='button'?'link':'add',16)}</span>
                {item.title}
              </button>)}
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-4">
            <p className={label}>Reorder blocks</p>
            <div className="mt-2 space-y-1.5">
              {campaign.blocks.map((b,i)=><div key={b.id} className={'flex items-center gap-1 rounded-lg border px-2 py-1.5 '+
                (selectedId===b.id?'border-[#FDBA74] bg-[#FFF7ED]':'border-[#F3F4F6]')}>
                <button type="button" onClick={()=>setSelectedId(b.id)}
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold capitalize">
                  <span className="mr-2 text-[#9CA3AF]">≡</span>{b.type}
                </button>
                <button type="button" disabled={i===0} onClick={()=>reorder(b.id,-1)}
                  aria-label={'Move '+b.type+' up'} className="p-1 disabled:opacity-25">{icon('arrow-up-2',14)}</button>
                <button type="button" disabled={i===campaign.blocks.length-1} onClick={()=>reorder(b.id,1)}
                  aria-label={'Move '+b.type+' down'} className="p-1 disabled:opacity-25">{icon('arrow-down-2',14)}</button>
              </div>)}
            </div>
          </div>
        </>}
        <div className="border-t border-[#E5E7EB] pt-4">
          <p className={label}>Brand Kit styles</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px]">
              <input type="color" aria-label="Email button accent color" value={/^#[0-9a-f]{6}$/i.test(buttonColor)?buttonColor:'#F97316'}
                onChange={e=>updateCampaign({buttonColor:e.target.value})}
                className="h-9 w-11 cursor-pointer rounded-lg border border-[#E5E7EB]"/>
              Button color
            </label>
          </div>
          <label className={label+' mt-4'}>Logo size · {logoSize}px</label>
          <input type="range" min={40} max={100} step={4} value={logoSize}
            aria-label="Brand logo size" onChange={e=>updateCampaign({logoSize:Number(e.target.value)})}
            className="w-full accent-[#F97316]"/>
          <p className={muted+' mt-2'}>Uses your registered business logo and Brand Kit.</p>
        </div>
        {selected?.type==='poster'&&<button type="button" onClick={()=>void loadPosters()}
          className="min-h-10 w-full rounded-lg border border-[#FDBA74] text-[11px] font-bold text-[#9A3412]">
          Replace poster
        </button>}
        {selected?.type==='button'&&<label className={label}>CTA link (HTTPS)
          <input value={campaign.ctaUrl} maxLength={600} type="url"
            className={input} onChange={e=>updateCampaign({ctaUrl:e.target.value})}/>
        </label>}
        {notice&&<p role="status" className="rounded-lg bg-[#F0FDF4] p-3 text-[11px] text-[#166534]">{notice}</p>}
        {error&&<p role="alert" className="rounded-lg bg-[#FEF2F2] p-3 text-[11px] text-[#B91C1C]">{error}</p>}
      </aside>
    </div>
    {posterPanel&&<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="presentation"
      onMouseDown={e=>{if(e.target===e.currentTarget)setPosterPanel(false);}}>
      <section role="dialog" aria-modal="true" aria-label="Choose saved poster"
        className="max-h-[85dvh] w-full max-w-[660px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold">Poster Studio Library</h2>
          <button onClick={()=>setPosterPanel(false)} aria-label="Close poster library" className="text-xl">×</button>
        </div>
        {posterBusy?<p className={muted+' mt-4'}>Loading saved posters…</p>:
          posterError?<p role="alert" className={muted+' mt-4'}>{posterError}</p>:
          !posters.length?<p className={muted+' mt-4'}>No saved posters for this business.</p>:
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {posters.map(asset=><button key={asset.id} type="button" onClick={()=>{
              updateCampaign({posterId:asset.id});setPosterPanel(false);
            }} className="overflow-hidden rounded-xl border border-[#E5E7EB] hover:border-[#F97316]">
              <img src={'/api/marketing/poster/saved?businessId='+encodeURIComponent(business.id)+'&assetId='+encodeURIComponent(asset.id)}
                alt="Select a saved poster" className="aspect-square w-full object-contain"/>
            </button>)}
          </div>}
      </section>
    </div>}
    {reviewOpen&&<div role="presentation" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e=>{if(e.target===e.currentTarget)setReviewOpen(false);}}>
      <section role="dialog" aria-modal="true" aria-label="Campaign sending readiness"
        className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">Campaign review</p>
            <h2 className="mt-1 text-[19px] font-extrabold">Before sending</h2></div>
          <button type="button" onClick={()=>setReviewOpen(false)} aria-label="Close review"
            className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-lg">×</button>
        </div>
        <div className="mt-5 space-y-3 text-[12px]">
          <p className="flex items-center gap-2">{sender?'✓':'○'} Connected sender: {sender?.accountDisplayName||'Not connected'}</p>
          <p className="flex items-center gap-2">{verifiedCount&&verifiedCount>0?'✓':'○'} Confirmed audience: {verifiedCount===undefined?'unavailable':verifiedCount}</p>
          <p>○ Unsubscribe handling and delivery provider — not active</p>
          <p>○ Verified send authorization and campaign queue — not active</p>
          {testSendEnabled&&sender?.sendCapable&&<div className="space-y-2 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3">
            <p className="text-[11px] font-bold text-[#9A3412]">Private delivery test</p>
            <p className="break-words text-[11px] text-[#6B7280]">
              One message addressed only to {sender.accountDisplayName}. No customer recipients.
            </p>
            <button type="button" disabled={testBusy||campaign.layout==='custom'}
              onClick={()=>void sendOneSelfTest()}
              className="min-h-10 w-full rounded-xl bg-[#F97316] px-3 text-[11px] font-bold text-white disabled:opacity-40">
              {testBusy?'Sending single test…':'Send one test to my Gmail'}
            </button>
            {testMessage&&<p role="status" className="text-[11px] font-semibold text-[#166534]">{testMessage}</p>}
          </div>}
        </div>
        <p className="mt-4 rounded-xl bg-[#FFF7ED] p-3 text-[11px] leading-5 text-[#9A3412]">
          Your design is editable and can be saved. Connecting Gmail alone cannot activate bulk email sending.
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={()=>{void save();setReviewOpen(false);}}
            className="min-h-11 flex-1 rounded-xl bg-[#111827] px-3 text-[12px] font-bold text-white">Save draft</button>
          {!sender&&<Link href="/vendor/marketing-engine/connections"
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#F97316] px-3 text-[11px] font-bold text-white">Connect Gmail</Link>}
        </div>
      </section>
    </div>}
  </div>;
  return createPortal(screen,document.body);
}
