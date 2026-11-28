'use client';

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Poppins,Outfit} from 'next/font/google';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import type {EmailStudioBusiness,EmailStudioConnection} from './EmailMarketingWorkbench';
import {EMAIL_LANGUAGES,EMAIL_CAMPAIGNS,httpsLink} from '@/lib/marketing/email-studio';
import {EMAIL_TEMPLATE_LAYOUTS,safeCustomPreviewDocument,type EmailTemplateLayout}
  from '@/lib/marketing/email-template-contract';
import {
  EMAIL_BLOCK_TYPES,newEmailBlock,moveEmailBlock,briefFromBlocks,
  EMAIL_EDITOR_FONTS,emailBlockTypography,emailTypographyStyle,defaultEmailTypography,
  type EmailTypography,type EmailFontFamily,
  type EmailVisualBlock,type EmailBlockType,type LocalEmailCampaign,
} from '@/lib/marketing/email-hub-contract';

type Props={
  campaign:LocalEmailCampaign;business:EmailStudioBusiness;
  sender:EmailStudioConnection|null;verifiedCount:number|undefined;
  emailAiEnabled:boolean;testSendEnabled:boolean;
  onSave:(campaign:LocalEmailCampaign)=>Promise<'server'|'browser'|'failed'>;onClose:()=>void;
};
const poppins=Poppins({weight:['400','700'],subsets:['latin'],display:'swap',preload:false,variable:'--email-poppins'});
const outfit=Outfit({weight:['400','700'],subsets:['latin'],display:'swap',preload:false,variable:'--email-outfit'});
const previewTypography=(block:EmailVisualBlock)=>{const style=emailTypographyStyle(block);const font=emailBlockTypography(block).font;return {...style,fontFamily:font==='poppins'?'var(--email-poppins), Arial, sans-serif':font==='outfit'?'var(--email-outfit), Arial, sans-serif':font==='inter'?'var(--font-inter), Arial, sans-serif':style.fontFamily};};
const input='min-h-8 w-full min-w-0 rounded-md border border-[#DDE1E6] bg-white px-2 py-1 text-[12px] text-[#111827] outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20';
const label='mb-1 block text-[11px] font-semibold text-[#374151]';
const muted='text-[11px] leading-5 text-[#6B7280]';
const icon=(name:string,size=16)=><IconsaxIcon name={name} size={size} variant="bulk"/>;
const toolButton='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#374151] hover:bg-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-[#F97316] disabled:opacity-35';
const blockIcons:Record<EmailBlockType,string>={headline:'text',body:'document-text',poster:'gallery',button:'mouse-square',offers:'gift',divider:'minus',image:'gallery-add',spacer:'paragraphspacing',quote:'quote-up',link:'link',columns:'grid-2'};
/** Commit only a valid value on blur/Enter. Typing intermediate digits does not
 * rerender the campaign or queue an autosave. Native number controls stay keyboard accessible. */
function CompactNumber({label:caption,value,min,max,step=1,unit='',onCommit}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;onCommit:(n:number)=>void}){
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>{setDraft(String(value));},[value]);
  const commit=()=>{
    const n=Number(draft);
    if(!draft.trim()||!Number.isFinite(n)||n<min||n>max||Math.abs((n-min)/step-Math.round((n-min)/step))>0.000001){setDraft(String(value));return;}
    if(n!==value)onCommit(n);
    setDraft(String(n));
  };
  return <label className="flex min-h-8 items-center justify-between gap-2 text-[11px] font-medium text-[#374151]">
    <span className="min-w-0">{caption}</span>
    <span className="flex h-8 w-[92px] shrink-0 items-center gap-1 rounded-md border border-[#DDE1E6] bg-white px-2 focus-within:border-[#F97316]">
      <input type="number" aria-label={caption} min={min} max={max} step={step} value={draft}
        onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.stopPropagation();setDraft(String(value));}}}
        className="w-full min-w-0 bg-transparent text-right text-[12px] font-medium tabular-nums text-[#111827] outline-none"/>
      {unit&&<span className="text-[10px] text-[#6B7280]">{unit}</span>}
    </span>
  </label>;
}
const PALETTE=['#111827','#374151','#6B7280','#D1D5DB','#FFFFFF','#F97316','#EA580C','#F59E0B','#FACC15','#EF4444','#DC2626','#DB2777','#EC4899','#A855F7','#7C3AED','#4F46E5','#2563EB','#0EA5E9','#06B6D4','#14B8A6','#059669','#16A34A','#84CC16','#92400E'];
/** Portal popup stays inside the visual viewport instead of using the OS-native
 * colour dialog, which may open beyond the screen on Linux/Chromium. */
function CompactColour({label:caption,value,onCommit}:{label:string;value:string;onCommit:(v:string)=>void}){
  const button=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const [hex,setHex]=useState(value);
  const [position,setPosition]=useState({left:0,top:0,width:248,maxHeight:320});
  const close=()=>{setOpen(false);button.current?.focus();};
  const locate=()=>{
    const anchor=button.current?.getBoundingClientRect();if(!anchor)return;
    const vw=window.innerWidth,vh=window.innerHeight;
    const width=Math.min(248,vw-16),maxHeight=Math.max(80,Math.min(320,vh-16));
    setPosition({width,maxHeight,left:Math.max(8,Math.min(anchor.right-width,vw-width-8)),top:Math.max(8,Math.min(anchor.bottom+6,vh-maxHeight-8))});
  };
  useEffect(()=>{
    if(!open)return;
    locate();
    const handle=(e:PointerEvent)=>{if(!popup.current?.contains(e.target as Node)&&!button.current?.contains(e.target as Node))setOpen(false);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}};
    const scroll=(e:Event)=>{if(!(e.target instanceof Node)||!popup.current?.contains(e.target))locate();};
    document.addEventListener('pointerdown',handle);document.addEventListener('keydown',key,true);
    window.addEventListener('resize',locate);window.addEventListener('scroll',scroll,true);
    popup.current?.querySelector<HTMLInputElement>('input')?.focus();
    return()=>{document.removeEventListener('pointerdown',handle);document.removeEventListener('keydown',key,true);window.removeEventListener('resize',locate);window.removeEventListener('scroll',scroll,true);};
  },[open]);
  const valid=/^#[0-9a-f]{6}$/i.test(hex);
  const apply=(colour:string)=>{onCommit(colour.toUpperCase());close();};
  return <><button ref={button} type="button" title={caption} aria-label={caption} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{if(open){close();return;}setHex(value);locate();setOpen(true);}} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#DDE1E6] bg-white p-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F97316]"><span className="h-5 w-5 rounded-sm border border-black/10" style={{backgroundColor:value}}/></button>
    {open&&createPortal(<div ref={popup} role="dialog" aria-label={caption+' picker'} data-testid="email-viewport-colour-picker" className="fixed z-[10002] overflow-auto rounded-lg border border-[#DDE1E6] bg-white p-3 text-[#111827] shadow-lg" style={position}>
      <div className="mb-2 flex items-center justify-between"><strong className="text-xs">{caption}</strong><button type="button" aria-label="Close colour picker" onClick={close} className={toolButton}>{icon('close-circle',16)}</button></div>
      <div className="grid grid-cols-6 gap-1.5">{PALETTE.map(colour=><button key={colour} type="button" aria-label={'Set colour '+colour} title={colour} onClick={()=>apply(colour)} className="aspect-square rounded-sm border border-black/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F97316]" style={{backgroundColor:colour}}/>)}</div>
      <label className="mt-3 block text-[11px] font-semibold">Custom HEX<span className="mt-1 flex items-center gap-2"><span className="h-7 w-7 shrink-0 rounded border border-[#DDE1E6]" style={{backgroundColor:valid?hex:value}}/><input aria-label="Custom HEX colour" value={hex} maxLength={7} onChange={e=>setHex(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&valid){e.preventDefault();apply(hex);}}} className={input}/></span></label>
      <button type="button" disabled={!valid} onClick={()=>apply(hex)} className="mt-2 min-h-8 w-full rounded-md bg-[#F97316] text-xs font-semibold text-white disabled:opacity-40">Apply colour</button>
    </div>,document.body)}</>;
}
type InlineProps={
  value:string;onChange:(next:string)=>void;label:string;max:number;
  className:string;multiline?:boolean;style?:CSSProperties;
};
/** Plain-text contentEditable: the React state stays canonical, and paste
 * inserts text nodes only, never pasted HTML/scripts or external images. */
function InlineText({value,onChange,label,max,className,multiline=false,style}:InlineProps){
  const ref=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(ref.current&&document.activeElement!==ref.current&&ref.current.innerText!==value)
      ref.current.innerText=value;
  },[value]);
  return <div ref={ref} contentEditable role="textbox" aria-label={label}
    aria-multiline={multiline} tabIndex={0} spellCheck
    data-inline-editable={label}
    style={style}
    className={className+' cursor-text outline-none focus-visible:ring-0'}
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
const selectionBorder='border border-transparent transition-colors hover:border-[#FDBA74] focus-within:border-[#F97316]';

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
  const [selectedId,setSelectedId]=useState<string|null>(()=>initial.layout==='custom'?null:initial.blocks.find(b=>b.type==='headline')?.id||initial.blocks[0]?.id||null);
  const [dragId,setDragId]=useState<string|null>(null);
  const [posterPanel,setPosterPanel]=useState(false);
  const [imageBusy,setImageBusy]=useState(false);
  const imageInput=useRef<HTMLInputElement|null>(null);
  const imageTarget=useRef<string|null>(null);
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
  const typography=selected?emailBlockTypography(selected):null;
  const canvasWidth=campaign.canvasWidth||600;
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
  const updateTypography=(patch:Partial<EmailTypography>)=>{
    if(!selected)return;
    updateBlock(selected.id,{typography:{...emailBlockTypography(selected),...patch}});
  };
  const chooseImage=(id:string)=>{
    if(imageBusy)return;
    imageTarget.current=id;
    imageInput.current?.click();
  };
  const uploadImage=async(file:File|null)=>{
    const target=imageTarget.current;
    if(!file||!target||imageBusy)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3_000_000){setError('Choose a JPG, PNG or WebP up to 3 MB.');return;}
    setImageBusy(true);setError('');setNotice('');
    try{
      const res=await fetch('/api/marketing/email/images?businessId='+encodeURIComponent(business.id),{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file,
      });
      const result=await res.json();
      if(!res.ok||!result.saved||typeof result.assetId!=='string')throw Error(result.error||'Image upload failed.');
      updateBlock(target,{imageId:result.assetId});
      setNotice('Image saved to your private business library.');
    }catch(e){setError(e instanceof Error?e.message:'Image upload failed.');}
    finally{setImageBusy(false);if(imageInput.current)imageInput.current.value='';}
  };
  const insertBlock=(type:EmailBlockType)=>{
    const block=newEmailBlock(type);
    if(type==='link')block.linkUrl=campaign.ctaUrl;
    if(campaign.blocks.length>=20)return;
    setCampaign(old=>({...old,blocks:[...old.blocks,block].slice(0,20)}));
    setSelectedId(block.id);setDirty(true);setNotice('');
    if(type==='image')chooseImage(block.id);
    // Selection is immediately visible in the compact inspector.
  };
  const insertSection=(types:EmailBlockType[])=>{
    if(campaign.blocks.length+types.length>20)return;
    const blocks=types.map(type=>newEmailBlock(type,type==='body'?'Add your message here.':''));
    setCampaign(old=>({...old,blocks:[...old.blocks,...blocks]}));setSelectedId(blocks[0].id);setDirty(true);setNotice('');
  };
  const duplicateBlock=(id:string)=>{
    const source=campaign.blocks.find(b=>b.id===id);
    if(!source||campaign.blocks.length>=20)return;
    const copy={...source,id:crypto.randomUUID()};
    setCampaign(old=>({...old,blocks:old.blocks.flatMap(b=>b.id===id?[b,copy]:[b])}));
    setSelectedId(copy.id);setDirty(true);setNotice('');
  };
  const deleteBlock=(id:string)=>{
    if(campaign.blocks.length<=1){setError('Keep at least one content block in the campaign.');return;}
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
    if(saving||imageBusy)return;
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
    if(!dirty||saving||imageBusy)return;
    const handle=setTimeout(()=>{void save();},2500);
    return()=>clearTimeout(handle);
  },[campaign,dirty,saving,imageBusy]);
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
    onClick={()=>setSelectedId(b.id)} onFocus={()=>setSelectedId(b.id)}
    className={'group relative min-w-0 rounded-lg p-2 '+selectionBorder+
      (selectedId===b.id?' !border-[#F97316]':'')+
      (dragId===b.id?' opacity-50':'')}>
    <span className="pointer-events-none absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded bg-[#111827] px-1.5 py-1 text-[9px] font-bold text-white group-hover:block" aria-hidden="true">⋮⋮</span>
    {b.type==='headline'&&<InlineText value={b.text} label="Headline — edit directly"
      max={200} style={previewTypography(b)} onChange={next=>updateBlock(b.id,{text:next})}
      className="min-h-9 break-words rounded p-1 text-[23px] font-bold leading-tight text-[#111827]"/>}
    {b.type==='body'&&<InlineText value={b.text} label="Email body — edit directly"
      max={3000} multiline style={previewTypography(b)} onChange={next=>updateBlock(b.id,{text:next})}
      className="min-h-[80px] whitespace-pre-wrap break-words rounded p-1 text-[13px] leading-7 text-[#374151]"/>}
    {b.type==='button'&&<div className="py-3" style={{textAlign:emailBlockTypography(b).align==='justify'?'left':emailBlockTypography(b).align}}>
      <div style={{backgroundColor:buttonColor}} className="mx-auto inline-block max-w-full rounded-xl">
        <InlineText value={b.text} label="CTA button label — edit directly" max={90} style={previewTypography(b)}
          onChange={next=>updateBlock(b.id,{text:next})}
          className="inline-block min-h-11 max-w-full rounded-xl px-6 py-3 text-center text-[12px] font-bold text-white"/>
      </div>
      <span className="sr-only">Button color can be changed in the Blocks and Brand panel.</span>
    </div>}
    {b.type==='image'&&<div style={{textAlign:b.imageAlign||'center'}} className="py-2">
      {b.imageId?<button type="button" aria-label="Replace uploaded image" disabled={imageBusy} onClick={e=>{e.stopPropagation();setSelectedId(b.id);chooseImage(b.id);}} className="inline-block max-w-full overflow-hidden rounded-md" style={{width:(b.imageWidth||100)+'%'}}>
        <img src={'/api/marketing/email/images?businessId='+encodeURIComponent(business.id)+'&assetId='+encodeURIComponent(b.imageId)} alt={b.text||'Uploaded email image'} loading="lazy" decoding="async" className="block h-auto w-full"/>
      </button>:<button type="button" disabled={imageBusy} onClick={e=>{e.stopPropagation();setSelectedId(b.id);chooseImage(b.id);}} className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#FDBA74] bg-[#FFF7ED] text-sm font-semibold text-[#C2410C]">{icon('image',28)}{imageBusy?'Uploading…':'Upload an image'}<span className="text-xs font-normal">JPG, PNG, WebP · up to 3 MB</span></button>}
    </div>}
    {b.type==='spacer'&&<div aria-label="Adjustable spacer" style={{height:b.spacing||24}} className="flex items-center justify-center rounded border border-dashed border-[#E5E7EB] text-[10px] text-[#9CA3AF]">{b.spacing||24}px</div>}
    {b.type==='quote'&&<div className="border-l-4 border-[#F97316] bg-[#FFF7ED] px-3 py-2"><InlineText value={b.text} label="Quote — edit directly" max={3000} multiline style={previewTypography(b)} onChange={next=>updateBlock(b.id,{text:next})} className="min-h-12 whitespace-pre-wrap break-words rounded p-1"/></div>}
    {b.type==='link'&&<InlineText value={b.text} label="Link text — edit directly" max={90} style={{...previewTypography(b),textDecoration:'underline'}} onChange={next=>updateBlock(b.id,{text:next})} className="min-h-8 break-words rounded p-1"/>}
    {b.type==='columns'&&<div className="grid grid-cols-2 gap-2">{[b.text,b.secondText||''].map((value,i)=><div key={i} className="min-w-0 rounded-lg border border-dashed border-[#E5E7EB] p-2"><InlineText value={value} label={'Column '+(i+1)+' — edit directly'} max={400} multiline style={previewTypography(b)} onChange={next=>updateBlock(b.id,i===0?{text:next}:{secondText:next})} className="min-h-16 whitespace-pre-wrap break-words"/></div>)}</div>}
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
        <InlineText value={offer} label={'Offer '+(i+1)+' — edit directly'} max={400} multiline style={previewTypography(b)}
          onChange={next=>updateBlock(b.id,i===0?{text:next}:{secondText:next})}
          className="mt-2 min-h-16 whitespace-pre-wrap break-words rounded p-1 text-[12px] leading-5 text-[#292524]"/>
      </div>)}
    </div>}
    <div className={'absolute right-1 top-1 items-center gap-1 rounded-lg border bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex '+(selectedId===b.id?'flex':'hidden')}>
      <button type="button" aria-label={'Move '+b.type+' up'} disabled={index===0}
        onClick={e=>{e.stopPropagation();reorder(b.id,-1);}}
        className="rounded p-1 text-[#4B5563] hover:bg-orange-50 disabled:opacity-25">{icon('arrow-up-2',15)}</button>
      <button type="button" aria-label={'Move '+b.type+' down'} disabled={index===campaign.blocks.length-1}
        onClick={e=>{e.stopPropagation();reorder(b.id,1);}}
        className="rounded p-1 text-[#4B5563] hover:bg-orange-50 disabled:opacity-25">{icon('arrow-down-2',15)}</button>
      <button type="button" aria-label={'Remove '+b.type} disabled={campaign.blocks.length<=1}
        onClick={e=>{e.stopPropagation();deleteBlock(b.id);}}
        className="rounded p-1 font-bold text-red-600 hover:bg-red-50">×</button>
    </div>
  </div>;
  const screen=<div role="dialog" aria-modal="true" aria-label="Email campaign visual editor"
    data-testid="email-v4-focus-builder" data-email-v7="designer" className={poppins.variable+' '+outfit.variable+' fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#111827]'}
    style={{colorScheme:'light'}}>
    <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const file=e.target.files?.[0]||null;e.target.value='';void uploadImage(file);}}/>
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
          Preview &amp; review
        </button>
      </div>
    </header>

    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[232px_minmax(0,1fr)_280px] 2xl:grid-cols-[248px_minmax(0,1fr)_300px] lg:overflow-hidden">
      <aside aria-label="Content blocks and AI tools" className="order-2 min-w-0 space-y-4 border-r border-[#E5E7EB] bg-white p-3 lg:order-1 lg:overflow-y-auto">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">{icon('category',17)} Content library</h2>
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
            <p className={label}>Add a block <span className="float-right font-normal text-[#6B7280]">{campaign.blocks.length}/20</span></p>
            <div className="grid grid-cols-2 gap-1.5" data-testid="email-compact-block-library">
              {EMAIL_BLOCK_TYPES.map(item=><button type="button" key={item.type}
                disabled={campaign.blocks.length>=20} onClick={()=>insertBlock(item.type)}
                title={item.description}
                className="flex min-h-11 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2 text-left text-[11px] font-medium hover:border-[#FDBA74] hover:bg-[#FFF7ED] disabled:opacity-40">
                <span className="text-[#EA580C]">{icon(blockIcons[item.type],17)}</span>
                {item.title}
              </button>)}
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-3">
            <p className={label}>Quick sections</p>
            <div className="space-y-1">
              {([{name:'Promotion',iconName:'gift',types:['headline','body','button']},{name:'Newsletter',iconName:'document-text',types:['headline','body','divider','columns']},{name:'Testimonial',iconName:'quote-up',types:['headline','quote','button']}] satisfies {name:string;iconName:string;types:EmailBlockType[]}[]).map(s=><button key={s.name} type="button" disabled={campaign.blocks.length+s.types.length>20} onClick={()=>insertSection(s.types)} className="flex min-h-8 w-full items-center gap-2 rounded-md border border-[#E5E7EB] px-2 text-left text-[11px] font-medium hover:border-[#FDBA74] hover:bg-[#FFF7ED] disabled:opacity-40"><span className="text-[#EA580C]">{icon(s.iconName,17)}</span><span className="flex-1">{s.name}</span>{icon('add',14)}</button>)}
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-3">
            <p className={label}>Layers</p>
            <div className="mt-2 space-y-1.5">
              {campaign.blocks.map((b,i)=><div key={b.id} className={'flex items-center gap-1 rounded-lg border px-2 py-1.5 '+
                (selectedId===b.id?'border-[#FDBA74] bg-[#FFF7ED]':'border-[#F3F4F6]')}>
                <button type="button" onClick={()=>setSelectedId(b.id)}
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold capitalize">
                  <span className="mr-1.5 text-[#6B7280]">{icon(blockIcons[b.type],14)}</span>{EMAIL_BLOCK_TYPES.find(x=>x.type===b.type)?.title||b.type}
                </button>
                <button type="button" disabled={i===0} onClick={()=>reorder(b.id,-1)}
                  aria-label={'Move '+b.type+' up'} className="p-1 disabled:opacity-25">{icon('arrow-up-2',14)}</button>
                <button type="button" disabled={i===campaign.blocks.length-1} onClick={()=>reorder(b.id,1)}
                  aria-label={'Move '+b.type+' down'} className="p-1 disabled:opacity-25">{icon('arrow-down-2',14)}</button>
              </div>)}
            </div>
          </div>
        </>}
      </aside>

      <main aria-label="Inline email design canvas"
        className={'order-1 min-w-0 overflow-y-visible px-3 py-6 sm:px-5 lg:order-2 lg:overflow-y-auto lg:py-6 '+
          (darkCheck?'bg-[#1F2937]':'bg-[#F3F4F6]')}>
        <div className="mx-auto w-full" style={{maxWidth:device==='mobile'?Math.min(390,canvasWidth):canvasWidth}}>
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
            Click text to edit · Drag to reorder · Dark is an inbox preview
          </p>
        </div>
      </main>

      <aside aria-label="Block properties and campaign setup" className="order-3 min-w-0 space-y-3 border-l border-[#E5E7EB] bg-white p-3 lg:order-3 lg:overflow-y-auto">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">{icon('setting-2',17)} Properties</h2>
        </div>
        <div data-testid="email-v7-properties" className="space-y-2 border-t border-[#E5E7EB] pt-3">
          <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-xs font-semibold capitalize">{icon(selected?blockIcons[selected.type]:'document',16)}{selected?EMAIL_BLOCK_TYPES.find(x=>x.type===selected.type)?.title:(selectedId==='brand'?'Brand header':'Email design')}</p>{selected&&<div className="flex items-center gap-0.5"><button type="button" title="Duplicate selected block" aria-label="Duplicate selected block" disabled={campaign.blocks.length>=20} onClick={()=>duplicateBlock(selected.id)} className={toolButton}>{icon('copy',16)}</button><button type="button" title="Remove selected block" aria-label="Remove selected block" disabled={campaign.blocks.length<=1} onClick={()=>deleteBlock(selected.id)} className={toolButton}>{icon('trash',16)}</button></div>}</div>
          {selected&&!['poster','divider','image','spacer'].includes(selected.type)&&<label className={label}>Content
            <textarea aria-label="Selected block content" rows={2} value={selected.text} maxLength={selected.type==='body'||selected.type==='quote'?3000:selected.type==='offers'||selected.type==='columns'?400:selected.type==='headline'?200:90}
              onChange={e=>updateBlock(selected.id,{text:e.target.value})} className={input+' resize-y'}/>
          </label>}
          {(selected?.type==='offers'||selected?.type==='columns')&&<label className={label}>{selected.type==='columns'?'Second column':'Second offer'}
            <textarea aria-label="Second offer content" rows={2} value={selected.secondText||''} maxLength={400} onChange={e=>updateBlock(selected.id,{secondText:e.target.value})} className={input+' resize-y'}/>
          </label>}
          {selected&&typography&&!['poster','divider','image','spacer'].includes(selected.type)&&<section data-testid="email-v8-typography" aria-label="Typography controls" className="space-y-2 border-t border-[#E5E7EB] pt-2">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Typography</h3><button type="button" onClick={()=>updateBlock(selected.id,{typography:defaultEmailTypography(selected.type)})} title="Reset typography" aria-label="Reset typography" className={toolButton+' text-[#C2410C]'}>{icon('refresh',16)}</button></div>
            <label className={label}>Font family<select aria-label="Block font family" value={typography.font} onChange={e=>updateTypography({font:e.target.value as EmailFontFamily})} className={input}>
              {!EMAIL_EDITOR_FONTS.some(font=>font.id===typography.font)&&<option hidden value={typography.font}>Previous font</option>}
              {EMAIL_EDITOR_FONTS.map(font=><option key={font.id} value={font.id}>{font.label}</option>)}
            </select></label>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1"><CompactNumber key={selected.id+'-font'} label="Block font size" value={typography.fontSize} min={10} max={64} unit="px" onCommit={fontSize=>updateTypography({fontSize})}/></div>
              <CompactColour label="Block text colour" value={typography.color} onCommit={color=>updateTypography({color})}/>
            </div>
            <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-[#E5E7EB] p-0.5">
              {([{name:'Bold',iconName:'text-bold',active:typography.fontWeight===700,patch:{fontWeight:typography.fontWeight===700?400:700}},{name:'Italic',iconName:'text-italic',active:typography.italic,patch:{italic:!typography.italic}},{name:'Underline',iconName:'text-underline',active:typography.underline,patch:{underline:!typography.underline}}] satisfies {name:string;iconName:string;active:boolean;patch:Partial<EmailTypography>}[]).map(t=><button key={t.name} type="button" title={t.name} aria-label={t.name} aria-pressed={t.active} onClick={()=>updateTypography(t.patch)} className={toolButton+(t.active?' bg-[#FFF1E6] text-[#C2410C]':'')}>{icon(t.iconName,16)}</button>)}
              <span className="mx-0.5 h-5 w-px bg-[#E5E7EB]" aria-hidden="true"/>
              {(['left','center','right','justify'] as const).map(a=><button key={a} type="button" aria-label={'Align '+a} title={'Align '+a} aria-pressed={typography.align===a} onClick={()=>updateTypography({align:a})} className={toolButton+(typography.align===a?' bg-[#FFF1E6] text-[#C2410C]':'')}>{icon(a==='justify'?'textalign-justifycenter':'textalign-'+a,16)}</button>)}
            </div>
            <CompactNumber key={selected.id+'-line'} label="Line height" value={typography.lineHeight} min={1} max={2.5} step={0.1} onCommit={lineHeight=>updateTypography({lineHeight})}/>
            <CompactNumber key={selected.id+'-spacing'} label="Letter spacing" value={typography.letterSpacing} min={0} max={4} step={0.1} unit="px" onCommit={letterSpacing=>updateTypography({letterSpacing})}/>
          </section>}
          {selected?.type==='image'&&<section className="space-y-2" aria-label="Uploaded image properties">
            <button type="button" disabled={imageBusy} onClick={()=>chooseImage(selected.id)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-[#F97316] px-2.5 text-xs font-semibold text-white disabled:opacity-40">{icon('image',17)} {selected.imageId?'Replace image':'Upload image'}</button>
            <label className={label}>Alt text<input aria-label="Image alt text" value={selected.text} maxLength={200} onChange={e=>updateBlock(selected.id,{text:e.target.value})} className={input}/></label>
            <CompactNumber key={selected.id+'-image-width'} label="Image width" value={selected.imageWidth||100} min={25} max={100} unit="%" onCommit={imageWidth=>updateBlock(selected.id,{imageWidth})}/>
            <label className={label}>Image alignment<select aria-label="Image alignment" value={selected.imageAlign||'center'} onChange={e=>updateBlock(selected.id,{imageAlign:e.target.value as 'left'|'center'|'right'})} className={input}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <p className={muted}>Private preview. Delivery assets require the future approved sending provider.</p>
          </section>}
          {selected?.type==='spacer'&&<CompactNumber key={selected.id+'-spacer'} label="Spacer height" value={selected.spacing||24} min={8} max={80} unit="px" onCommit={spacing=>updateBlock(selected.id,{spacing})}/>}
          {selected?.type==='link'&&<label className={label+' mt-3'}>Link destination (HTTPS)<input key={selected.id} type="url" defaultValue={selected.linkUrl||campaign.ctaUrl} maxLength={600} aria-label="Text link URL" onBlur={e=>{const url=httpsLink(e.target.value);if(url)updateBlock(selected.id,{linkUrl:url});else{setError('Enter a valid HTTPS link.');e.target.value=selected.linkUrl||campaign.ctaUrl;}}} className={input}/></label>}
          {!selected&&<p className={muted+' mt-2'}>Select a block on the canvas to edit its content.</p>}
        </div>
        <div data-testid="email-v8-canvas-settings" className="space-y-2 border-t border-[#E5E7EB] pt-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold">{icon('monitor',16)} Canvas &amp; brand</h3>
          <CompactNumber label="Desktop canvas width" value={canvasWidth} min={480} max={720} unit="px" onCommit={canvasWidth=>updateCampaign({canvasWidth})}/>
          <CompactNumber label="Brand logo size" value={logoSize} min={40} max={100} unit="px" onCommit={logoSize=>updateCampaign({logoSize})}/>
          <label className="flex min-h-8 items-center justify-between gap-2 text-[11px] font-medium text-[#374151]">Button colour
            <CompactColour label="Email button accent color" value={/^#[0-9a-f]{6}$/i.test(buttonColor)?buttonColor:'#F97316'} onCommit={buttonColor=>updateCampaign({buttonColor})}/>
          </label>
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
        <details className="rounded-md border border-[#E5E7EB] p-2">
          <summary className="cursor-pointer text-xs font-semibold">Campaign setup &amp; audience</summary>
          <div className="mt-4 space-y-4">
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
          </div>
        </details>
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
