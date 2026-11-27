'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {
  EMAIL_CAMPAIGNS,EMAIL_LANGUAGES,EMAIL_MERGE_TAGS,
  defaultEmailDraft,emailContentChecks,escapeEmailHtml,hexColor,
  httpsLink,parseAudienceCsv,countPastedEmails,subjectSuggestions,textLimit,
  type EmailBrand,type EmailCampaignType,type EmailLanguage,type EmailDraft,
  type InboxDevice,
} from '@/lib/marketing/email-studio';

export type EmailStudioBusiness={
  id:string;name:string;logoUrl:string|null;city:string;address:string;
  slug:string|null;websiteUrl:string|null;
  brandName:string|null;slogan:string|null;primaryColor:string|null;
  accentColor:string|null;tone:string|null;
};
export type EmailStudioConnection={
  id:string;businessId:string;accountDisplayName:string;provider:'google_mail';
  status:'connected';
};
type AudienceMode='crm'|'csv'|'paste'|'self';
type Asset={id:string;createdAt:string|null};
const panel='min-w-0 w-full rounded-[19px] border border-[#E9E7E8] bg-white text-[#242126] shadow-[0_7px_25px_rgba(29,25,29,.045)]';
const field='mt-1.5 min-h-10 w-full min-w-0 rounded-xl border border-[#E5E1E2] bg-white px-3 py-2 text-[12px] text-[#26232A] outline-none focus:border-[#F47B24] focus:ring-2 focus:ring-[#F47B24]/15';
const label='block text-[11px] font-semibold text-[#5E575D]';
const sub='text-[10px] leading-[1.6] text-[#89828A]';
const clean=(v:string,n:number)=>textLimit(v,n);
function createBrand(b:EmailStudioBusiness|null):EmailBrand{
  const slug=b?.slug;
  const profileUrl=slug&&/^[a-z0-9-]{1,120}$/i.test(slug)?
    'https://www.slbusinessindex.com/business/'+slug:'https://www.slbusinessindex.com';
  return {
    name:b?.brandName||b?.name||'Your business',
    slogan:b?.slogan||'',primaryColor:hexColor(b?.primaryColor,'#202024'),
    accentColor:hexColor(b?.accentColor,'#FF7900'),
    logoUrl:b?.logoUrl||null,address:b?.address||'',city:b?.city||'',
    profileUrl,
  };
}
function htmlExport(draft:EmailDraft,brand:EmailBrand):string{
  const c=hexColor(brand.accentColor);
  const link=httpsLink(draft.ctaUrl);
  const txt=escapeEmailHtml(draft.body).replace(/\n/g,'<br>');
  const safeLogo=httpsLink(brand.logoUrl);
  const logo=safeLogo?'<img src="'+escapeEmailHtml(safeLogo)+'" alt="Business logo" width="56" height="56" style="height:56px;width:56px;border-radius:50%;object-fit:cover;border:2px solid #f0e2d8">':
    '<div style="height:56px;width:56px;line-height:56px;text-align:center;border-radius:50%;background:#fff4eb;color:#af6226;font-size:23px;font-weight:bold">'+escapeEmailHtml(Array.from(brand.name.trim())[0]||'B')+'</div>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
    '<body style="margin:0;background:#f6f5f4;padding:24px;font-family:Arial,sans-serif">'+
    '<table role="presentation" style="width:100%;max-width:600px;margin:auto;background:#fff;border-collapse:collapse"><tr><td style="padding:20px;border-bottom:1px solid #eee8e7;border-left:4px solid '+
    c+'"><table role="presentation"><tr><td style="vertical-align:middle;padding-right:15px">'+logo+
    '</td><td style="vertical-align:middle"><strong style="display:block;color:#272329;font-size:19px">'+escapeEmailHtml(brand.name)+
    '</strong><span style="display:block;color:#807981;font-size:12px">'+escapeEmailHtml(brand.slogan||brand.city)+
    '</span></td></tr></table></td></tr><tr><td style="padding:26px;color:#29252a;font-size:15px;line-height:1.7">'+txt+
    (link?'<p><a href="'+escapeEmailHtml(link)+'" style="display:inline-block;background:'+c+
      ';color:#fff;padding:12px 20px;border-radius:9px;text-decoration:none">'+escapeEmailHtml(draft.ctaLabel)+'</a></p>':'')+
    '</td></tr><tr><td style="padding:20px;font-size:12px;color:#787178;border-top:1px solid #e7e7e7">'+
    escapeEmailHtml([brand.address,brand.city].filter(Boolean).join(', '))+
    '<p>UNSUBSCRIBE NOT CONFIGURED — DO NOT SEND AS A MARKETING EMAIL UNTIL A WORKING OPT-OUT IS PROVIDED.</p>'+
    '</td></tr></table></body></html>';
}

export default function EmailMarketingWorkbench({businesses,connections}:{
  businesses:readonly EmailStudioBusiness[];
  connections:readonly EmailStudioConnection[];
}){
  const [businessId,setBusinessId]=useState(businesses[0]?.id||'');
  const [senderId,setSenderId]=useState('');
  const [language,setLanguage]=useState<EmailLanguage>('en');
  const [kind,setKind]=useState<EmailCampaignType>('offer');
  const [draft,setDraft]=useState<EmailDraft>(()=>defaultEmailDraft('en','offer',createBrand(businesses[0]||null)));
  const [device,setDevice]=useState<InboxDevice>('desktop');
  const [previewDark,setPreviewDark]=useState(false);
  const [audience,setAudience]=useState<AudienceMode>('crm');
  const [paste,setPaste]=useState('');
  const [audienceReport,setAudienceReport]=useState<{valid:number;invalid:number;declaredOptIn:number}|null>(null);
  const [posterId,setPosterId]=useState<string|null>(null);
  const [posters,setPosters]=useState<Asset[]>([]);
  const [posterPanel,setPosterPanel]=useState(false);
  const [posterBusy,setPosterBusy]=useState(false);
  const [posterError,setPosterError]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [rules,setRules]=useState<string[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);
  const business=businesses.find(b=>b.id===businessId)||null;
  const brand=useMemo(()=>createBrand(business),[business]);
  const ownedSenders=connections.filter(c=>c.businessId===businessId&&c.status==='connected');
  const currentSender=ownedSenders.find(c=>c.id===senderId)||ownedSenders[0]||null;
  const checks=emailContentChecks(draft);
  const suggestions=subjectSuggestions(draft,brand);
  const ctaHref=httpsLink(draft.ctaUrl);
  const selectedPosterSrc=posterId?'/api/marketing/poster/saved?businessId='+
    encodeURIComponent(businessId)+'&assetId='+encodeURIComponent(posterId):null;
  const isDraftEmpty=!businesses.length;
  useEffect(()=>{
    setDraft(defaultEmailDraft(language,kind,createBrand(businesses.find(b=>b.id===businessId)||null)));
    setNotice('');setError('');
  },[businessId,language,kind,businesses]);
  useEffect(()=>{
    setPosterId(null);setPosters([]);setPosterPanel(false);setAudienceReport(null);setPaste('');
    setSenderId('');
  },[businessId]);
  const change=<K extends keyof EmailDraft>(key:K,value:EmailDraft[K])=>{
    setDraft(p=>({...p,[key]:value}));setNotice('');
  };
  const copyDraft=async()=>{
    setError('');setNotice('');
    try{
      await navigator.clipboard.writeText('Subject: '+draft.subject+'\nPreview: '+
        draft.preheader+'\n\n'+draft.body+'\n\n'+draft.ctaLabel+': '+draft.ctaUrl);
      setNotice('Draft copied. Review all details before using any email service.');
    }catch{setError('Clipboard unavailable. Copy the editable text manually.');}
  };
  const exportPreview=()=>{
    const html=htmlExport(draft,brand);
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const a=document.createElement('a');
    a.href=url;a.download='slbi-email-preview.html';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
    setNotice('HTML preview exported. It is NOT send-ready; unsubscribe is not yet connected.');
  };
  const openPosters=async()=>{
    if(!businessId)return;
    setPosterPanel(true);setPosterBusy(true);setPosterError('');
    try{
      const r=await fetch('/api/marketing/poster/saved?businessId='+encodeURIComponent(businessId),{
        method:'GET',credentials:'same-origin',cache:'no-store',
      });
      const body:unknown=await r.json();
      if(!r.ok||!body||typeof body!=='object'||Array.isArray(body))throw Error('Private Poster Studio library is not available for this business.');
      const data=body as {assets?:unknown};
      if(!Array.isArray(data.assets))throw Error('Saved posters are unavailable.');
      setPosters(data.assets.slice(0,50).filter((v):v is Asset=>Boolean(v&&typeof v==='object'&&
        typeof v.id==='string'&&/^[a-f0-9-]{36}$/i.test(v.id))).
        map(x=>({id:x.id,createdAt:typeof x.createdAt==='string'?x.createdAt:null})));
    }catch(e){setPosterError(e instanceof Error?e.message:'Poster library unavailable.');setPosters([]);}
    finally{setPosterBusy(false);}
  };
  const readCsv=async(file:File|null)=>{
    if(!file)return;
    setError('');setAudienceReport(null);
    try{
      if(file.size>1_000_000||!file.name.toLowerCase().endsWith('.csv'))throw Error('Choose a CSV file smaller than 1 MB.');
      const result=parseAudienceCsv(await file.text());
      if(result.truncated)throw Error('Preview a CSV with no more than 2,000 contacts.');
      setAudienceReport(result);
      setNotice('CSV analysed locally. No addresses uploaded or added to a sending list.');
    }catch(e){setError(e instanceof Error?e.message:'CSV could not be parsed.');}
    if(fileRef.current)fileRef.current.value='';
  };
  const previewPaste=()=>{
    setError('');
    try{
      const summary=countPastedEmails(paste);
      setAudienceReport({...summary,declaredOptIn:0});
      setNotice('Pasted emails analysed only in this browser; no consent verified or contacts imported.');
    }catch(e){setError(e instanceof Error?e.message:'Invalid addresses.');}
  };
  const insertTag=(tag:string)=>change('body',(draft.body+'\n'+tag).slice(0,3000));
  const flipRule=(key:string)=>setRules(old=>old.includes(key)?old.filter(x=>x!==key):[...old,key]);
  return <div data-testid="email-marketing-workbench" data-studio-theme="light" className="w-full min-w-0 space-y-4 text-[#242126]" style={{colorScheme:'light'}}>
    <section className={panel+' flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5'}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#B96822]">GrowthOS / Email Marketing</p>
        <h2 className="mt-1 text-[19px] font-extrabold text-[#242126]">Email Campaign Studio</h2>
        <p className={sub+' mt-1'}>Connected Brand Kit · Live inbox preview · Review-first campaign design</p>
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <span className={'inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold '+
          (currentSender?'border-[#D7ECE0] bg-[#F2FBF5] text-[#247B4E]':'border-[#E9E5E5] bg-[#F7F6F6] text-[#736E73]')}>
          <span className={'h-2 w-2 shrink-0 rounded-full '+(currentSender?'bg-[#23A567]':'bg-[#AAA4A7]')}/>
          <span className="truncate">{currentSender?'Connected: '+currentSender.accountDisplayName:'No sender connected'}</span>
        </span>
        <Link href="/vendor/marketing-engine/connections" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#E7DFD8] px-3 text-[11px] font-semibold text-[#AC591D]">
          <IconsaxIcon name="link" size={15}/>Manage
        </Link>
        <details className="relative">
          <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#E7DFD8] px-3 text-[11px] font-semibold text-[#625C60]">
            <IconsaxIcon name="info-circle" size={15}/> Compliance &amp; Consent
          </summary>
          <div className="absolute right-0 top-10 z-30 w-[min(330px,85vw)] rounded-xl border border-[#E9E1DE] bg-white p-4 text-[11px] leading-5 text-[#5A5458] shadow-xl">
            Only contacts with documented marketing opt-in may receive campaigns. CRM enquiries and CSV uploads are not automatic consent. A working unsubscribe, suppression list, verified sender, audited approval and delivery pipeline are prerequisites for real sends. Gmail quota is not available from this Studio.
          </div>
        </details>
      </div>
    </section>

    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,30fr)_minmax(0,42fr)_minmax(0,28fr)]">
      <section aria-label="01 Campaign and Audience" className={panel+' min-h-[680px] space-y-4 p-4 sm:p-5'}>
        <div className="border-b border-[#EFEAEC] pb-3"><p className="text-[10px] font-bold tracking-[.15em] text-[#C46D29]">01 / SETUP</p>
          <h3 className="mt-1 text-[15px] font-extrabold text-[#252229]">Campaign &amp; Audience</h3>
        </div>
        <label className={label}>Business &amp; Brand Kit
          <select value={businessId} onChange={e=>setBusinessId(e.target.value)} className={field}>
            {!businesses.length&&<option value="">No approved business</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className={label}>Connected sender
          <select value={currentSender?.id||''} onChange={e=>setSenderId(e.target.value)} className={field} disabled={!ownedSenders.length}>
            {!ownedSenders.length&&<option value="">Connect Gmail first</option>}
            {ownedSenders.map(c=><option value={c.id} key={c.id}>{c.accountDisplayName}</option>)}
          </select>
        </label>
        <div>
          <p className={label}>Audience source</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['crm','Leads CRM'],['csv','Upload CSV'],['paste','Paste emails'],['self','Test to me']] as const).map(([value,title])=>
              <button key={value} type="button" aria-pressed={audience===value} onClick={()=>{setAudience(value);setAudienceReport(null);setError('');}}
                className={'min-h-10 rounded-xl border px-2 text-[11px] font-bold transition '+
                  (audience===value?'border-[#FEAE71] bg-[#FFF0E3] text-[#A9561E]':'border-[#E8E4E5] bg-[#FAF9F9] text-[#625D62] hover:border-[#F3C8A9]')}>
                {title}
              </button>)}
          </div>
          {audience==='crm'&&<div className="mt-2 rounded-xl bg-[#F8F6F6] p-3 text-[11px] leading-5 text-[#6F676C]">
            <p className="font-bold">Leads CRM · consent not recorded</p>
            <p className="mt-1">An enquiry does not establish marketing opt-in. Verified audience count is unavailable until consent records are implemented.</p>
            <Link href="/vendor/leads" className="mt-2 inline-flex text-[#AA5B20] underline">Review Leads CRM</Link>
          </div>}
          {audience==='csv'&&<div className="mt-2 rounded-xl border border-dashed border-[#E6D8CE] p-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="block w-full text-[11px] text-[#625960]"
              onChange={e=>void readCsv(e.target.files?.[0]||null)}/>
            <p className={sub+' mt-2'}>CSV column: email. Optional marketing_opt_in + consented_at for local evidence review. Nothing uploaded.</p>
          </div>}
          {audience==='paste'&&<div className="mt-2 space-y-2">
            <textarea value={paste} maxLength={100000} onChange={e=>setPaste(e.target.value)} rows={3}
              className={field} placeholder="one@example.com, two@example.com"/>
            <button type="button" onClick={previewPaste} className="rounded-lg border border-[#E7D1C1] px-3 py-2 text-[11px] font-bold text-[#A75A1D]">Preview locally</button>
          </div>}
          {audience==='self'&&<p className={sub+' mt-2 rounded-xl bg-[#F7F5F4] p-3'}>Only your authenticated sender mailbox may receive a test once the test-send workflow is approved. This screen does not send messages.</p>}
          {audienceReport&&<p role="status" className={sub+' mt-2 rounded-lg bg-[#F3F1EF] p-3'}>
            {audienceReport.valid} unique valid format · {audienceReport.invalid} invalid/duplicate · {audienceReport.declaredOptIn} declared consent records. <strong>0 verified for sending.</strong>
          </p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <label className={label}>Campaign type
            <select value={kind} onChange={e=>setKind(e.target.value as EmailCampaignType)} className={field}>
              {EMAIL_CAMPAIGNS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <label className={label}>Language
            <select value={language} onChange={e=>setLanguage(e.target.value as EmailLanguage)} className={field}>
              {EMAIL_LANGUAGES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
        </div>
        <label className={label}>Campaign brief / Offer
          <textarea value={draft.body} maxLength={3000} onChange={e=>change('body',e.target.value)}
            rows={7} className={field+' resize-y'} placeholder="Write only verified business facts and offer conditions"/>
        </label>
        <div className="grid gap-3">
          <label className={label}>Subject line
            <input value={draft.subject} maxLength={140} onChange={e=>change('subject',e.target.value)} className={field}/>
          </label>
          <label className={label}>Preview text
            <input value={draft.preheader} maxLength={180} onChange={e=>change('preheader',e.target.value)} className={field}/>
          </label>
          <label className={label}>CTA label
            <input value={draft.ctaLabel} maxLength={90} onChange={e=>change('ctaLabel',e.target.value)} className={field}/>
          </label>
          <label className={label}>CTA URL (HTTPS)
            <input type="url" value={draft.ctaUrl} maxLength={600} onChange={e=>change('ctaUrl',e.target.value)} className={field}/>
          </label>
        </div>
        <div className="rounded-xl border border-[#EFE8E3] bg-[#FFFBF8] p-3">
          <p className="text-[11px] font-bold text-[#5B514E]">Brand Kit synced</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg border border-black/10" style={{background:brand.primaryColor}}/>
            <span className="h-6 w-6 rounded-lg border border-black/10" style={{background:brand.accentColor}}/>
            <span className={sub+' truncate'}>{brand.name}</span>
          </div>
          <Link href="/vendor/marketing/brand" className="mt-2 inline-block text-[11px] font-bold text-[#A65B23] underline">Edit Brand Kit</Link>
        </div>
        <div className="rounded-xl border border-[#EEE6E0] p-3">
          <button type="button" onClick={()=>void openPosters()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E6C9B1] bg-[#FFF7F0] px-3 text-[11px] font-bold text-[#A95518]">
            <IconsaxIcon name="image" size={17}/> + Attach saved Poster Studio image
          </button>
          {posterPanel&&<div className="mt-3 space-y-2">
            {posterBusy?<p className={sub}>Loading your private posters…</p>:
              posterError?<p className={sub} role="alert">{posterError}</p>:
              posters.length===0?<p className={sub}>No saved posters are available for this business.</p>:
              <div className="grid grid-cols-3 gap-2">
                {posters.map(p=><button key={p.id} type="button" onClick={()=>{setPosterId(p.id);setPosterPanel(false);}}
                  className={'overflow-hidden rounded-lg border-2 '+(posterId===p.id?'border-[#FF7900]':'border-transparent')}>
                  {/* Private authenticated API; never embed this protected URL in sent mail. */}
                  <img src={'/api/marketing/poster/saved?businessId='+encodeURIComponent(businessId)+'&assetId='+encodeURIComponent(p.id)}
                    alt="Saved private poster" loading="lazy" className="aspect-square w-full object-cover"/>
                </button>)}
              </div>}
            <Link href="/vendor/marketing/poster" className="text-[11px] font-bold text-[#A85A1F] underline">Open Poster Studio</Link>
          </div>}
          {posterId&&<button type="button" onClick={()=>setPosterId(null)}
            className="mt-2 text-[11px] font-semibold text-[#8F5650] underline">Remove selected poster</button>}
          <p className={sub+' mt-2'}>Poster preview only. Email-ready image hosting requires a separate reviewed asset pipeline.</p>
        </div>
        {isDraftEmpty&&<p className={sub} role="status">Register an approved business to prepare a branded campaign.</p>}
      </section>

      <section aria-label="02 Live Inbox Preview" className={panel+' min-h-[680px] min-w-0 space-y-4 p-4 sm:p-5 xl:sticky xl:top-24'}>
        <div className="border-b border-[#EFEAEC] pb-3">
          <p className="text-[10px] font-bold tracking-[.15em] text-[#C46D29]">02 / LIVE PREVIEW</p>
          <h3 className="mt-1 text-[15px] font-extrabold text-[#252229]">Inbox simulator</h3>
          <p className={sub+' mt-1'}>Email client approximation · changes live as you edit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['desktop','mobile'] as const).map(mode=><button key={mode} type="button" onClick={()=>setDevice(mode)}
            aria-pressed={device===mode} className={'rounded-lg px-3 py-2 text-[11px] font-bold '+(device===mode?'bg-[#232126] text-white':'border border-[#E9E5E6] text-[#686269]')}>
            {mode==='desktop'?'Desktop Gmail':'Mobile Inbox'}
          </button>)}
          <button type="button" onClick={()=>setPreviewDark(x=>!x)} aria-pressed={previewDark}
            className={'rounded-lg px-3 py-2 text-[11px] font-bold '+(previewDark?'bg-[#38323B] text-white':'border border-[#E9E5E6] text-[#686269]')}>
            Dark check
          </button>
        </div>
        <div className={'mx-auto min-w-0 overflow-hidden rounded-[20px] border border-[#E7E3E3] shadow-[0_15px_38px_rgba(19,18,23,.09)] transition-all '+
          (device==='mobile'?'max-w-[360px]':'w-full')+(previewDark?' bg-[#202127] text-[#F2F3F4]':' bg-white text-[#282A30]')}>
          <div className={'flex items-center gap-2 border-b px-3 py-3 '+(previewDark?'border-[#3B3B42] bg-[#262830]':'border-[#F0ECEE] bg-[#FAFAFB]')}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E74C3C] text-[16px] font-bold text-white">M</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold">{brand.name}</span>
                <span className={sub+' shrink-0'}>Inbox preview</span>
              </div>
              <p className="truncate text-[11px] font-semibold">{draft.subject||'Subject line'}</p>
              <p className={'truncate text-[10px] '+(previewDark?'text-[#BEBCC5]':'text-[#827D84]')}>{draft.preheader||'Email preview text'}</p>
            </div>
          </div>
          <div className={'px-3 py-3 text-[11px] '+(previewDark?'text-[#C5C6CB]':'text-[#77727A]')}>
            <p><strong className={previewDark?'text-white':'text-[#222126]'}>From:</strong> {currentSender?.accountDisplayName||'Choose a connected sender'}</p>
            <p className="mt-1"><strong className={previewDark?'text-white':'text-[#222126]'}>To:</strong> Recipient preview (not sent)</p>
          </div>
          <div className="px-3 pb-4 sm:px-4">
            <div className="overflow-hidden rounded-[15px] border border-[#E7E6E7] bg-white text-[#242126]">
              <div data-testid="email-preview-brand-identity"
                className="flex min-w-0 items-center gap-3 border-b border-[#EFEAEC] border-l-4 bg-white px-4 py-4 sm:gap-4 sm:px-5"
                style={{borderLeftColor:brand.accentColor}}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F3E4D9] bg-[#FFF4EB] shadow-[0_3px_10px_rgba(28,23,27,.07)]"
                  aria-label="Business brand avatar">
                  {brand.logoUrl?
                    <img alt={brand.name+' logo'} src={brand.logoUrl} loading="lazy"
                      className="h-full w-full rounded-full object-cover"/>:
                    <span aria-hidden="true" className="text-xl font-extrabold text-[#B96826]">
                      {Array.from(brand.name.trim())[0]||'B'}
                    </span>}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[9px] font-bold uppercase tracking-[.11em] text-[#B7672A]">Your business</p>
                  <h4 className="mt-1 break-words text-[17px] font-extrabold leading-tight text-[#272329]">{brand.name}</h4>
                  <p className="mt-1 break-words text-[11px] leading-4 text-[#817A81]">{brand.slogan||brand.city||'Official business update'}</p>
                </div>
              </div>
              {selectedPosterSrc&&<img src={selectedPosterSrc} alt="Selected private Poster Studio preview" className="max-h-[320px] w-full object-contain"/>}
              <div className="px-5 py-6">
                <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.9] text-[#343038]">{draft.body||'Email message preview'}</p>
                <div className="pt-5 text-center">
                  {ctaHref?<a href={ctaHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-[12px] font-bold text-white"
                    style={{background:brand.accentColor}}>{draft.ctaLabel||'Learn more'}</a>:
                    <span className="inline-flex min-h-10 items-center rounded-lg bg-[#E9E6E7] px-5 text-[12px] text-[#777078]">Valid HTTPS CTA required</span>}
                </div>
              </div>
              <footer className="border-t border-[#ECE9EB] bg-[#FAF9F9] px-5 py-4 text-center text-[10px] leading-5 text-[#807980]">
                {[brand.address,brand.city].filter(Boolean).join(' · ')||brand.name}
                <p className="mt-2 underline">Unsubscribe — not active in preview</p>
              </footer>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-xl bg-[#ECE9EB] px-2 text-[11px] font-semibold text-[#979099]"
              title="Requires consent/suppression list, sending worker and an approved Gmail sender">Send campaign · gated</button>
            <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-xl border border-[#E7E3E5] px-2 text-[11px] font-semibold text-[#918990]"
              title="Requires a durable owner-approved scheduling worker">Schedule · gated</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>void copyDraft()} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#242126] px-2 text-[11px] font-semibold text-white">
              <IconsaxIcon name="copy" size={16} color="white"/>Copy reviewed draft</button>
            <button type="button" onClick={exportPreview} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E6D0C0] px-2 text-[11px] font-semibold text-[#A75920]">
              <IconsaxIcon name="document-download" size={16}/>Export HTML preview</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled title="Requires a separately authorized Gmail drafts.create permission"
              className="min-h-10 cursor-not-allowed rounded-xl border border-[#E7E3E5] px-2 text-[11px] text-[#918990]">Save Gmail Draft · gated</button>
            <button type="button" disabled title="A rate-limited self-test endpoint is not yet approved"
              className="min-h-10 cursor-not-allowed rounded-xl border border-[#E7E3E5] px-2 text-[11px] text-[#918990]">Send test to me · gated</button>
          </div>
          <p className={sub}>Gmail Draft/Test Send require separately approved API execution. No message is sent from this workspace.</p>
        </div>
      </section>

      <aside aria-label="03 AI Polish and Automation" className={panel+' min-h-[680px] min-w-0 space-y-4 p-4 sm:p-5'}>
        <div className="border-b border-[#EFEAEC] pb-3">
          <p className="text-[10px] font-bold tracking-[.15em] text-[#C46D29]">03 / INTELLIGENCE</p>
          <h3 className="mt-1 text-[15px] font-extrabold text-[#252229]">Polish &amp; Automation</h3>
        </div>
        <div>
          <p className={label}>Subject line alternatives</p>
          <p className={sub+' mt-1'}>Local copy suggestions · no Gemini request or charge</p>
          <div className="mt-2 space-y-2">
            {suggestions.map((line,i)=><button key={line} type="button"
              onClick={()=>change('subject',line)} aria-pressed={draft.subject===line}
              className={'block w-full break-words rounded-xl border px-3 py-2.5 text-left text-[11px] leading-5 '+
                (draft.subject===line?'border-[#F3B789] bg-[#FFF2E6] font-bold text-[#9C4B17]':'border-[#E8E4E6] text-[#5C565E]')}>
              <span className="mr-2 text-[#C07542]">{String(i+1).padStart(2,'0')}</span>{line}
            </button>)}
          </div>
          <p className={sub+' mt-2'}>Gemini generation requires a separate approved, metered email-generation endpoint; it is not yet activated.</p>
        </div>
        <div className="border-t border-[#EFEAEC] pt-3">
          <p className={label}>Content readiness checks</p>
          <div className="mt-2 space-y-2">
            {checks.map(check=><p key={check.label} className="flex items-start gap-2 text-[11px]">
              <span className={check.pass?'text-[#1E9460]':'text-[#B57A44]'}>{check.pass?'✓':'○'}</span>
              <span className="text-[#67616A]">{check.label}</span>
            </p>)}
          </div>
          <p className={sub+' mt-2'}>Heuristic checks only; not a spam score or deliverability prediction.</p>
        </div>
        <div className="border-t border-[#EFEAEC] pt-3">
          <p className={label}>Personalization tags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMAIL_MERGE_TAGS.map(tag=><button type="button" onClick={()=>insertTag(tag)} key={tag}
              className="rounded-lg border border-[#E7E3E5] bg-[#FAF9F8] px-2.5 py-2 text-[10px] font-semibold text-[#5F555D]">
              {tag}
            </button>)}
          </div>
          <p className={sub+' mt-2'}>Inserts placeholders into the draft; contact-based replacement is not active.</p>
        </div>
        <div className="border-t border-[#EFEAEC] pt-3">
          <div className="flex items-center justify-between gap-2"><p className={label}>Automation rule plans</p>
            <Link href="/vendor/marketing-engine/automation" className="text-[10px] text-[#B56B2A] underline">Open</Link></div>
          <p className={sub+' mt-1'}>Plan proposals only — no automatic email is scheduled or sent.</p>
          <div className="mt-3 space-y-2">
            {[
              ['welcome','Welcome after enquiry','2 min'],
              ['followup','Follow-up reminder','3 days'],
              ['festival','Festival / Birthday','9:00 AM'],
            ].map(([id,title,delay])=><button key={id} type="button" onClick={()=>flipRule(id)}
              aria-pressed={rules.includes(id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#E8E4E6] px-3 text-left">
              <span><span className="block text-[11px] font-semibold text-[#302C32]">{title}</span>
                <span className={sub}>{delay} · planned only</span></span>
              <span aria-hidden="true" className={'relative h-5 w-9 shrink-0 rounded-full transition '+(rules.includes(id)?'bg-[#EF8937]':'bg-[#D8D3D7]')}>
                <span className={'absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition '+(rules.includes(id)?'left-[19px]':'left-[3px]')}/>
              </span>
            </button>)}
          </div>
        </div>
        <div className="border-t border-[#EFEAEC] pt-3">
          <p className={label}>Campaign analytics</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['Sent','Delivered','Opened %','Link clicks'].map(n=><div key={n} className="rounded-lg bg-[#F8F6F6] p-3">
              <p className="text-[18px] font-extrabold text-[#8F8990]">—</p>
              <p className={sub}>{n}</p>
            </div>)}
          </div>
          <p className={sub+' mt-2'}>No verified email delivery telemetry is connected yet.</p>
        </div>
      </aside>
    </div>
    {(notice||error)&&<p role={error?'alert':'status'} className={'rounded-xl border p-3 text-[11px] '+(error?'border-[#F0CCCC] bg-[#FFF4F4] text-[#9A3C3C]':'border-[#D8E8DE] bg-[#F6FBF8] text-[#386747]')}>
      {error||notice}
    </p>}
  </div>;
}
