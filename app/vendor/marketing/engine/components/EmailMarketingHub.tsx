'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {EMAIL_CAMPAIGNS,EMAIL_LANGUAGES,defaultEmailDraft,hexColor,
  parseAudienceCsv,countPastedEmails,type EmailBrand,type EmailCampaignType} from '@/lib/marketing/email-studio';
import {EMAIL_TEMPLATE_LAYOUTS,type EmailTemplateLayout} from '@/lib/marketing/email-template-contract';
import {
  LOCAL_EMAIL_CAMPAIGN_LIMIT,emailLocalStorageKey,initialEmailBlocks,readLocalEmailDrafts,normalizeLocalCampaign,
  type LocalEmailCampaign,
} from '@/lib/marketing/email-hub-contract';
import type {EmailStudioBusiness,EmailStudioConnection} from './EmailMarketingWorkbench';
import EmailCampaignCanvas from './EmailCampaignCanvas';

type HubTab='campaigns'|'audience'|'templates'|'automations';
const TABS:{id:HubTab;title:string;icon:string}[]=[
  {id:'campaigns',title:'Campaigns',icon:'document'},
  {id:'audience',title:'Audience & Lists',icon:'people'},
  {id:'templates',title:'Templates',icon:'image'},
  {id:'automations',title:'Automations',icon:'flash'},
];
const panel='rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_6px_20px_rgba(17,24,39,.035)]';
const secondary='text-[12px] leading-6 text-[#6B7280]';
const icon=(name:string,size=18)=><IconsaxIcon name={name} size={size}/>;
type Props={
  businesses:readonly EmailStudioBusiness[];
  connections:readonly EmailStudioConnection[];
  ownerScope:string;
  verifiedCounts?:Record<string,number>;
  emailAiEnabled?:boolean;
  serverDrafts?:readonly {draft:LocalEmailCampaign;revision:number}[];
  serverStorageReady?:boolean;
  inboxPreview?:React.ReactNode;
};
function brandOf(b:EmailStudioBusiness):EmailBrand{
  const slug=b.slug&&/^[a-z0-9-]{1,120}$/i.test(b.slug)?b.slug:b.id;
  return {name:b.brandName||b.name,slogan:b.slogan||'',
    primaryColor:hexColor(b.primaryColor,'#111827'),
    accentColor:hexColor(b.accentColor,'#F97316'),
    logoUrl:b.logoUrl,address:b.address||'',city:b.city||'',
    profileUrl:'https://www.slbusinessindex.com/business/'+slug};
}
const niceDate=(date:string)=>{
  try{return new Intl.DateTimeFormat('en-LK',{month:'short',day:'numeric',year:'numeric'})
    .format(new Date(date));}catch{return 'Saved on this browser';}
};
const short=(v:string,max=90)=>v.length>max?v.slice(0,max-1)+'…':v;
export default function EmailMarketingHub({
  businesses,connections,ownerScope,verifiedCounts={},emailAiEnabled=false,
  serverDrafts=[],serverStorageReady=false,inboxPreview,
}:Props){
  const preferred=connections.find(c=>c.status==='connected'&&businesses.some(b=>b.id===c.businessId))?.businessId;
  const [businessId,setBusinessId]=useState(preferred||businesses[0]?.id||'');
  const [tab,setTab]=useState<HubTab>('campaigns');
  const [drafts,setDrafts]=useState<LocalEmailCampaign[]>([]);
  const [serverVersions,setServerVersions]=useState<Record<string,number>>({});
  const [syncBusy,setSyncBusy]=useState(false);
  const [historyId,setHistoryId]=useState<string|null>(null);
  const [history,setHistory]=useState<Array<{revision:number;draft:LocalEmailCampaign;createdAt:string}>>([]);
  const [historyBusy,setHistoryBusy]=useState(false);
  const [editor,setEditor]=useState<LocalEmailCampaign|null>(null);
  const [ready,setReady]=useState(false);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<'all'|'drafts'>('all');
  const [csvReport,setCsvReport]=useState<{valid:number;invalid:number;declaredOptIn:number}|null>(null);
  const [pasteReport,setPasteReport]=useState<{valid:number;invalid:number}|null>(null);
  const [paste,setPaste]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const fileRef=useRef<HTMLInputElement|null>(null);
  const ownerBusinesses=businesses.map(x=>x.id).join('|');
  const business=businesses.find(b=>b.id===businessId)||businesses[0]||null;
  const sender=connections.find(c=>c.businessId===business?.id&&c.status==='connected')||null;
  const verifiedCount=business?verifiedCounts[business.id]:undefined;
  const canCreate=Boolean(business&&ownerScope);

  useEffect(()=>{
    if(!ownerScope){setDrafts([]);setReady(true);return;}
    const ids=ownerBusinesses.split('|').filter(Boolean);
    const local=readLocalEmailDrafts(
      localStorage.getItem(emailLocalStorageKey(ownerScope)),ownerScope,ids);
    const remote=serverDrafts.map(x=>x.draft);
    const existing=new Set(remote.map(x=>x.id));
    setDrafts([...remote,...local.filter(x=>!existing.has(x.id))]
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    setServerVersions(Object.fromEntries(serverDrafts.map(x=>[x.draft.id,x.revision])));
    setReady(true);
  },[ownerScope,ownerBusinesses,serverDrafts]);

  const persist=(next:LocalEmailCampaign[])=>{
    const items=next.slice(0,LOCAL_EMAIL_CAMPAIGN_LIMIT);
    try{
      localStorage.setItem(emailLocalStorageKey(ownerScope),JSON.stringify(items));
      setDrafts(items);return true;
    }catch{setError('Could not save to this browser. Try freeing browser storage.');return false;}
  };
  const saveDraft=async(campaign:LocalEmailCampaign):Promise<'server'|'browser'|'failed'>=>{
    if(!ownerScope||campaign.ownerScope!==ownerScope||!businesses.some(b=>b.id===campaign.businessId))
      return 'failed';
    const next=[campaign,...drafts.filter(d=>d.id!==campaign.id)]
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    if(!persist(next))return 'failed';
    if(!serverStorageReady){
      setNotice('Saved on this browser. Server campaign sync is unavailable.');
      return 'browser';
    }
    setSyncBusy(true);
    try{
      const response=await fetch('/api/marketing/email/campaigns',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({draft:campaign,expectedRevision:serverVersions[campaign.id]||0}),
      });
      const body:unknown=await response.json();
      if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Unexpected campaign server response');
      const result=body as {revision?:unknown;error?:unknown};
      if(!response.ok||!Number.isInteger(result.revision)){
        const message=typeof result.error==='string'?result.error:'Server campaign save failed.';
        throw Error(message);
      }
      setServerVersions(prev=>({...prev,[campaign.id]:Number(result.revision)}));
      setNotice('Campaign saved securely to your SLBI account.');
      setError('');return 'server';
    }catch(e){
      const message=e instanceof Error?e.message:'Server unavailable.';
      setError(message+' Your browser backup is preserved.');
      return 'browser';
    }finally{setSyncBusy(false);}
  };
  const openHistory=async(id:string)=>{
    if(!serverVersions[id])return;
    setHistoryId(id);setHistory([]);setHistoryBusy(true);setError('');
    try{
      const response=await fetch('/api/marketing/email/campaigns/'+encodeURIComponent(id),{
        credentials:'same-origin',cache:'no-store'});
      const body:unknown=await response.json();
      if(!response.ok||!body||typeof body!=='object'||Array.isArray(body))throw Error('Could not load history.');
      const value=body as {history?:unknown};
      const businessIds=businesses.map(b=>b.id);
      if(!Array.isArray(value.history))throw Error('History unavailable.');
      setHistory(value.history.flatMap(x=>{
        const y=x as {revision?:number;draft?:unknown;createdAt?:string};
        const validated=normalizeLocalCampaign(y.draft,ownerScope,businessIds);
        return validated&&typeof y.revision==='number'&&typeof y.createdAt==='string'?
          [{revision:y.revision,draft:validated,createdAt:y.createdAt}]:[];
      }));
    }catch(e){setError(e instanceof Error?e.message:'Could not load history.');}
    finally{setHistoryBusy(false);}
  };
  const start=(layout:EmailTemplateLayout='minimal',kind:EmailCampaignType='offer')=>{
    if(!business||!ownerScope)return;
    const brand=brandOf(business);
    const base=defaultEmailDraft('en',kind,brand);
    const blocks=initialEmailBlocks(layout,base.body);
    blocks[0].text=base.subject;
    const button=blocks.find(b=>b.type==='button');if(button)button.text=base.ctaLabel;
    const stamp=new Date().toISOString();
    setEditor({
      id:crypto.randomUUID(),ownerScope,businessId:business.id,
      title:kind==='offer'?'New promotional campaign':kind==='newsletter'?'New newsletter':
        kind==='followup'?'Customer follow-up':'New launch campaign',
      subject:base.subject,preheader:base.preheader,ctaUrl:base.ctaUrl,
      language:'en',kind,layout,blocks,posterId:null,
      createdAt:stamp,updatedAt:stamp,status:'local_draft',
      buttonColor:brand.accentColor,logoSize:56,
    });
    setNotice('');setError('');
  };
  const removeDraft=async(id:string)=>{
    if(!window.confirm('Permanently remove this campaign and its server revision history?'))return;
    if(serverVersions[id]){
      setSyncBusy(true);
      try{
        const response=await fetch('/api/marketing/email/campaigns/'+encodeURIComponent(id),{
          method:'DELETE',credentials:'same-origin',cache:'no-store',
        });
        if(!response.ok)throw Error('Could not delete the server draft.');
      }catch(e){setError(e instanceof Error?e.message:'Delete failed.');setSyncBusy(false);return;}
      setSyncBusy(false);
      setServerVersions(prev=>{const next={...prev};delete next[id];return next;});
    }
    if(persist(drafts.filter(d=>d.id!==id)))setNotice('Campaign draft removed.');
  };
  const shown=useMemo(()=>drafts.filter(d=>d.businessId===businessId)
    .filter(d=>!search.trim()||[d.title,d.subject].some(x=>x.toLowerCase().includes(search.trim().toLowerCase())))
    .filter(d=>filter==='all'||d.status==='local_draft')
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[drafts,businessId,search,filter]);
  const inspectCsv=async(file:File|null)=>{
    if(!file)return;setError('');setCsvReport(null);
    try{
      if(!file.name.toLowerCase().endsWith('.csv')||file.size>1_000_000)
        throw Error('Choose a CSV file under 1 MB.');
      const result=parseAudienceCsv(await file.text());
      if(result.truncated)throw Error('Limit: 2,000 contacts.');
      setCsvReport(result);
      setNotice('CSV checked in your browser; contacts were not uploaded.');
    }catch(e){setError(e instanceof Error?e.message:'CSV not readable.');}
    if(fileRef.current)fileRef.current.value='';
  };
  const inspectPaste=()=>{
    setError('');
    try{
      setPasteReport(countPastedEmails(paste));
      setNotice('Email formats checked in your browser; no contacts were imported.');
    }catch(e){setError(e instanceof Error?e.message:'Email list is invalid.');}
  };

  return <div data-testid="email-v4-marketing-hub" className="w-full min-w-0 space-y-5 pb-10 text-[#111827]"
    style={{colorScheme:'light'}}>
    <header className={panel+' overflow-hidden'}>
      <div className="flex flex-col justify-between gap-5 border-b border-[#F3F4F6] px-5 py-5 sm:flex-row sm:items-center sm:px-7 sm:py-6">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#EA580C]">GrowthOS · Marketing Suite</p>
          <h1 className="mt-1 text-[25px] font-extrabold tracking-[-.04em] text-[#111827] sm:text-[31px]">Email Marketing Studio</h1>
          <p className={secondary+' mt-1'}>Design campaigns. Build your audience. Grow customer relationships.</p>
          <p className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold text-[#6B7280]">
            <span className={'h-2 w-2 rounded-full '+(serverStorageReady?'bg-[#22C55E]':'bg-[#D97706]')}/>
            {serverStorageReady?'Account-synced drafts with version history':'Browser draft backup · cloud sync not active'}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {businesses.length>1&&<select aria-label="Choose your business" value={businessId}
            onChange={e=>{setBusinessId(e.target.value);setNotice('');}}
            className="min-h-10 max-w-[200px] rounded-xl border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold">
            {businesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
          </select>}
          {sender?<Link href="/vendor/marketing-engine/connections"
            className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 text-[11px] font-semibold text-[#166534]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]"/><span className="max-w-[185px] truncate">{sender.accountDisplayName}</span>
            {icon('arrow-down-2',14)}
          </Link>:<Link href="/vendor/marketing-engine/connections"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white">
            {icon('link',16)} Connect Gmail
          </Link>}
          <button type="button" disabled={!canCreate} onClick={()=>start('minimal')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-[12px] font-extrabold text-white transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-40">
            {icon('add',18)} New Campaign
          </button>
        </div>
      </div>
      <nav aria-label="Email Marketing Studio tabs" className="flex w-full gap-1 overflow-x-auto px-3 pt-2 sm:px-5">
        {TABS.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id}
          onClick={()=>{setTab(t.id);setNotice('');setError('');}}
          className={'inline-flex min-h-12 shrink-0 items-center gap-2 border-b-[3px] px-3 text-[12px] font-bold transition sm:px-5 '+
            (tab===t.id?'border-[#F97316] text-[#C2410C]':'border-transparent text-[#6B7280] hover:text-[#111827]')}>
          {icon(t.icon,17)}{t.title}
          {t.id==='campaigns'&&drafts.filter(d=>d.businessId===businessId).length>0&&
            <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] text-[#C2410C]">
              {drafts.filter(d=>d.businessId===businessId).length}
            </span>}
        </button>)}
      </nav>
    </header>

    {!sender&&business&&<section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#C2410C]">{icon('sms',22)}</div>
        <div><p className="text-[13px] font-extrabold">Connect your business email</p>
          <p className="mt-1 text-[11px] text-[#9A3412]">Create designs now. Connect Gmail to prepare your account for email delivery.</p></div>
      </div>
      <Link href="/vendor/marketing-engine/connections"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white">
        Connect Gmail {icon('arrow-right-2',14)}
      </Link>
    </section>}
    {!business&&<section className={panel+' p-8 text-center'}>
      <p className="text-[17px] font-bold">Add an approved business to get started.</p>
      <p className={secondary+' mt-2'}>Your email campaigns will use your verified business identity and Brand Kit.</p>
      <Link href="/vendor/my-businesses" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#F97316] px-4 text-[12px] font-bold text-white">My Businesses</Link>
    </section>}

    {tab==='campaigns'&&<section className="space-y-5" aria-label="Email campaign overview">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {name:'Total sent',value:'—',hint:'Delivery data unavailable',iconName:'sms'},
          {name:'Open rate',value:'—',hint:'No verified tracking',iconName:'eye'},
          {name:'Click rate',value:'—',hint:'No verified tracking',iconName:'status-up'},
          {name:'Subscribers',value:verifiedCount===undefined?'—':String(verifiedCount),
            hint:verifiedCount===undefined?'List not activated':'Confirmed opt-ins',iconName:'people'},
        ].map(k=> <div key={k.name} className={panel+' min-h-[130px] p-4 sm:p-5'}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-[#6B7280]">{k.name}</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#F97316]">{icon(k.iconName,18)}</span>
          </div>
          <p className="mt-3 text-[29px] font-extrabold tabular-nums tracking-tight">{k.value}</p>
          <p className="mt-1 text-[10px] text-[#9CA3AF]">{k.hint}</p>
        </div>)}
      </div>
      <div className={panel+' overflow-hidden'}>
        <div className="flex flex-col justify-between gap-3 border-b border-[#F3F4F6] p-5 sm:flex-row sm:items-center sm:px-6">
          <div><h2 className="text-[16px] font-extrabold">Your campaigns</h2>
            <p className={secondary+' mt-1'}>Continue designing your saved drafts.</p></div>
          <div className="flex items-center gap-2">
            <label className="relative min-w-0">
              <span className="sr-only">Search campaigns</span>
              <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
                className="min-h-10 w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[11px] outline-none focus:border-[#F97316] sm:w-[210px]"
                placeholder="Search campaigns…"/>
            </label>
            <select aria-label="Filter campaigns" value={filter}
              onChange={e=>setFilter(e.target.value as 'all'|'drafts')}
              className="min-h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold">
              <option value="all">All</option><option value="drafts">Drafts</option>
            </select>
          </div>
        </div>
        {!ready?<p className="p-8 text-center text-[12px] text-[#6B7280]">Loading your saved designs…</p>:
          shown.length===0?<div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">{icon('document',27)}</div>
            <h3 className="text-[16px] font-extrabold">{drafts.length?'No matching campaigns':'Your first great campaign starts here'}</h3>
            <p className="max-w-[390px] text-[12px] leading-6 text-[#6B7280]">{drafts.length?
              'Try another search or select a different business.':
              'Choose a design and write your message. Save a draft before sending anything.'}</p>
            <button type="button" disabled={!canCreate} onClick={()=>start('hero')}
              className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-[12px] font-bold text-white disabled:opacity-40">
              {icon('add',17)} Create first campaign
            </button>
          </div>:
          <div className="divide-y divide-[#F3F4F6]" data-testid="email-v4-draft-list">
            {shown.map(d=><div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-4 hover:bg-[#FCFCFD] sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">{icon('document',20)}</div>
              <div className="min-w-[150px] flex-1">
                <p className="truncate text-[13px] font-bold">{short(d.title,100)}</p>
                <p className="mt-1 truncate text-[11px] text-[#6B7280]">{short(d.subject,140)}</p>
              </div>
              <div className="text-[10px] text-[#6B7280] sm:w-32">
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 font-bold">
                  {serverVersions[d.id]?'Cloud draft · v'+serverVersions[d.id]:'Browser draft'}
                </span>
                <p className="mt-2">Edited {niceDate(d.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>setEditor(d)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#FDBA74] bg-[#FFF7ED] px-3 text-[11px] font-bold text-[#C2410C]">
                  Continue editing {icon('arrow-right-2',14)}
                </button>
                {!serverVersions[d.id]&&serverStorageReady&&<button type="button" disabled={syncBusy}
                  onClick={()=>void saveDraft(d)}
                  className="min-h-10 rounded-lg border border-[#E5E7EB] px-3 text-[11px] font-semibold text-[#EA580C] disabled:opacity-40">
                  Sync
                </button>}
                {Boolean(serverVersions[d.id])&&<button type="button" onClick={()=>void openHistory(d.id)}
                  className="min-h-10 rounded-lg border border-[#E5E7EB] px-3 text-[11px] font-semibold text-[#6B7280]">
                  History
                </button>}
                <button type="button" onClick={()=>void removeDraft(d.id)} aria-label={'Delete '+d.title}
                  className="min-h-10 rounded-lg border border-[#E5E7EB] px-3 text-[11px] font-bold text-[#6B7280]">Delete</button>
              </div>
            </div>)}
          </div>}
        <div className="border-t border-[#F3F4F6] bg-[#FAFAFB] px-6 py-3 text-[10px] text-[#6B7280]">
          {serverStorageReady?
            'Cloud drafts sync to your SLBI account; offline browser backups remain available.':
            'Drafts are saved in this browser until cloud sync is available.'}
          {' '}Sent, opened and clicked figures appear only when verified delivery reporting is available.
        </div>
      </div>
    </section>}

    {tab==='audience'&&<section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]" aria-label="Audience and subscriber lists">
      <div className={panel+' space-y-5 p-5 sm:p-7'}>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">Audience</p>
          <h2 className="mt-1 text-[20px] font-extrabold">Customers & Subscribers</h2>
          <p className={secondary+' mt-2'}>Keep customer enquiries separate from subscriptions to marketing emails.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F9FAFB] p-4">
            <p className="text-[11px] font-bold text-[#6B7280]">Confirmed subscribers</p>
            <p className="mt-2 text-[27px] font-extrabold">{verifiedCount===undefined?'—':verifiedCount}</p>
          </div>
          <div className="rounded-xl bg-[#F9FAFB] p-4">
            <p className="text-[11px] font-bold text-[#6B7280]">Unsubscribed</p>
            <p className="mt-2 text-[27px] font-extrabold">—</p>
            <p className="text-[10px] text-[#9CA3AF]">Registry not yet connected</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">{icon('people',20)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-extrabold">Leads CRM</h3>
              <p className={secondary+' mt-1'}>Review enquiries and follow-ups. Only separately confirmed subscribers qualify for marketing campaigns.</p>
              <Link href="/vendor/leads" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#C2410C]">Open Leads CRM {icon('arrow-right-2',14)}</Link>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-[13px] font-extrabold">Customer segments</h3>
          <p className={secondary+' mt-2'}>VIP, inactive customers and purchase-based groups need confirmed subscriber records and campaign events. No unsupported segments are shown.</p>
        </div>
        {inboxPreview&&<details className="rounded-xl border border-[#E5E7EB] p-4">
          <summary className="cursor-pointer text-[12px] font-bold">Optional Gmail inbox insights</summary>
          <div className="mt-3">{inboxPreview}</div>
        </details>}
      </div>
      <div className={panel+' space-y-5 p-5 sm:p-7'}>
        <div><h2 className="text-[17px] font-extrabold">Prepare an audience</h2>
          <p className={secondary+' mt-2'}>Check your contact list before importing it into an approved subscriber system.</p></div>
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold">Check a CSV file</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="Select customer CSV file"
            onChange={e=>void inspectCsv(e.target.files?.[0]||null)}
            className="mt-3 block w-full text-[11px] text-[#6B7280]"/>
          <p className={secondary+' mt-2'}>Include an email column. Consent evidence can be reviewed locally.</p>
          {csvReport&&<div className="mt-3 rounded-xl bg-[#F9FAFB] p-3 text-[12px]">
            <strong>{csvReport.valid} unique valid formats</strong>
            <p className="mt-1 text-[#6B7280]">{csvReport.invalid} invalid/duplicates · {csvReport.declaredOptIn} declared consent records (not verified).</p>
          </div>}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <label htmlFor="email-v4-paste" className="text-[12px] font-bold">Paste email addresses</label>
          <textarea id="email-v4-paste" value={paste} onChange={e=>setPaste(e.target.value)}
            maxLength={100000} rows={5} placeholder="one@example.com&#10;two@example.com"
            className="mt-3 w-full min-w-0 rounded-xl border border-[#E5E7EB] p-3 text-[12px] outline-none focus:border-[#F97316]"/>
          <button type="button" onClick={inspectPaste}
            className="mt-2 min-h-10 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white">Check addresses</button>
          {pasteReport&&<p role="status" className="mt-3 text-[12px] text-[#374151]">
            {pasteReport.valid} unique valid formats · {pasteReport.invalid} invalid entries.
          </p>}
        </div>
        <p className={secondary+' rounded-xl bg-[#FFF7ED] p-3 text-[#9A3412]'}>
          Your pasted and uploaded addresses stay in this browser session. They are not verified, subscribed, uploaded or sent any message.
        </p>
      </div>
    </section>}

    {tab==='templates'&&<section aria-label="Email templates" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-[19px] font-extrabold">Choose a starting design</h2>
          <p className={secondary+' mt-1'}>Brand Kit colors and your business identity are applied in the builder.</p></div>
        <Link href="/vendor/marketing/brand" className="text-[12px] font-bold text-[#C2410C] hover:underline">Edit Brand Kit</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {EMAIL_TEMPLATE_LAYOUTS.map((item,i)=><div className={panel+' overflow-hidden'} key={item.id}>
          <div className="flex h-[190px] items-center justify-center border-b border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <div className="h-full w-[165px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-[#F97316]"/>
                <div className="h-2.5 w-20 rounded bg-[#111827]"/>
              </div>
              {i===1&&<div className="mb-3 h-14 rounded bg-gradient-to-tr from-[#FB923C] to-[#FFEDD5]"/>}
              {i===2&&<div className="mb-3 grid grid-cols-2 gap-2"><div className="h-14 rounded bg-[#FFF1E6]"/><div className="h-14 rounded bg-[#FEE2CE]"/></div>}
              {i===3&&<div className="mb-3 h-9 rounded border border-dashed border-[#F97316] bg-[#FFF7ED] p-1 text-[8px] text-[#EA580C]">Custom HTML</div>}
              <div className="mb-2 h-2 w-full rounded bg-[#E5E7EB]"/>
              <div className="mb-2 h-2 w-4/5 rounded bg-[#E5E7EB]"/>
              <div className="mb-3 h-2 w-3/5 rounded bg-[#E5E7EB]"/>
              <div className="mx-auto h-5 w-20 rounded bg-[#F97316]"/>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <h3 className="text-[13px] font-extrabold">{item.label}</h3>
            <p className="min-h-[40px] text-[11px] leading-5 text-[#6B7280]">{item.description}</p>
            <button type="button" disabled={!canCreate} onClick={()=>start(item.id)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-3 text-[12px] font-bold text-[#C2410C] hover:bg-[#FFEDD5] disabled:opacity-40">
              Use template {icon('arrow-right-2',15)}
            </button>
          </div>
        </div>)}
      </div>
    </section>}

    {tab==='automations'&&<section aria-label="Marketing automation plans" className="space-y-4">
      <div><h2 className="text-[19px] font-extrabold">Customer journeys</h2>
        <p className={secondary+' mt-1'}>Prepare the right message for every customer moment. Sending rules are managed separately.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {name:'Welcome after an enquiry',desc:'Draft a warm first response for a customer who contacts you.',
            kind:'followup' as EmailCampaignType,delay:'Customer enquiry'},
          {name:'Thoughtful follow-up',desc:'Prepare a helpful reminder without overwhelming your customer.',
            kind:'followup' as EmailCampaignType,delay:'After a conversation'},
          {name:'Festival & seasonal offer',desc:'Design a timely message using your approved offer details.',
            kind:'offer' as EmailCampaignType,delay:'Seasonal occasion'},
        ].map(a=><article key={a.name} className={panel+' space-y-3 p-5 sm:p-6'}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#F97316]">{icon('flash',24)}</div>
          <h3 className="text-[15px] font-extrabold">{a.name}</h3>
          <p className={secondary}>{a.desc}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{a.delay}</p>
          <button type="button" disabled={!canCreate} onClick={()=>start('minimal',a.kind)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white disabled:opacity-40">
            Design message {icon('arrow-right-2',15)}
          </button>
        </article>)}
      </div>
      <Link href="/vendor/marketing-engine/automation"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-4 text-[12px] font-bold text-[#C2410C]">
        Open Marketing Automations {icon('arrow-right-2',15)}
      </Link>
      <p className={secondary}>No workflow in this tab silently schedules or sends email.</p>
    </section>}

    {(notice||error)&&<p role={error?'alert':'status'} className={'rounded-xl border px-4 py-3 text-[12px] '+
      (error?'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]':'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]')}>
      {error||notice}
    </p>}
    {editor&&businesses.some(b=>b.id===editor.businessId)&&
      <EmailCampaignCanvas key={editor.id} campaign={editor}
        business={businesses.find(b=>b.id===editor.businessId)!}
        sender={connections.find(c=>c.businessId===editor.businessId&&c.status==='connected')||null}
        verifiedCount={verifiedCounts[editor.businessId]}
        emailAiEnabled={emailAiEnabled}
        onSave={saveDraft} onClose={()=>setEditor(null)}/>}
    {historyId&&<div role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryId(null);}}>
      <section role="dialog" aria-modal="true" aria-label="Email campaign version history"
        className="max-h-[85dvh] w-full max-w-[540px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase text-[#EA580C]">Version history</p>
            <h2 className="text-[18px] font-extrabold">Saved campaign versions</h2></div>
          <button type="button" onClick={()=>setHistoryId(null)} aria-label="Close version history"
            className="min-h-10 rounded-xl border border-[#E5E7EB] px-3">Close</button>
        </div>
        {historyBusy?<p className={secondary+' mt-5'}>Loading saved revisions…</p>:
          !history.length?<p className={secondary+' mt-5'}>No server revisions to display.</p>:
          <div className="mt-4 divide-y divide-[#E5E7EB]">
            {history.map(h=><div key={h.revision} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold">Version {h.revision} · {short(h.draft.title,55)}</p>
                <p className="mt-1 text-[11px] text-[#6B7280]">{niceDate(h.createdAt)}</p>
              </div>
              <button type="button" onClick={()=>{
                setEditor({...h.draft,updatedAt:new Date().toISOString()});
                setHistoryId(null);setNotice('Past version opened. Save to create a new revision.');
              }} className="min-h-10 rounded-xl bg-[#FFF7ED] px-3 text-[11px] font-bold text-[#C2410C]">
                Restore in editor
              </button>
            </div>)}
          </div>}
      </section>
    </div>}
  </div>;
}
