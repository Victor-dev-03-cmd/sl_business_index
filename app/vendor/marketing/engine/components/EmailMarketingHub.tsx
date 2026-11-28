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
import AudienceNetworkSummary from './AudienceNetworkSummary';
import {normalizeSuppressionEmail} from '@/lib/marketing/email-suppression-contract';

type HubTab='overview'|'campaigns'|'audience'|'templates'|'automations'|'analytics'|'settings';
const TABS:{id:HubTab;title:string;icon:string}[]=[
  {id:'overview',title:'Overview',icon:'chart'},
  {id:'campaigns',title:'Campaigns',icon:'document'},
  {id:'audience',title:'Audience & Lists',icon:'people'},
  {id:'templates',title:'Templates',icon:'image'},
  {id:'automations',title:'Automations',icon:'flash'},
  {id:'analytics',title:'Analytics',icon:'chart'},
  {id:'settings',title:'Sender Settings',icon:'setting-2'},
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
  testSendEnabled?:boolean;
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
  testSendEnabled=false,serverDrafts=[],serverStorageReady=false,inboxPreview,
}:Props){
  const preferred=connections.find(c=>c.status==='connected'&&businesses.some(b=>b.id===c.businessId))?.businessId;
  const [businessId,setBusinessId]=useState(preferred||businesses[0]?.id||'');
  const [tab,setTab]=useState<HubTab>('overview');
  const [drafts,setDrafts]=useState<LocalEmailCampaign[]>([]);
  const [serverVersions,setServerVersions]=useState<Record<string,number>>({});
  const [syncBusy,setSyncBusy]=useState(false);
  const [historyId,setHistoryId]=useState<string|null>(null);
  const [history,setHistory]=useState<Array<{revision:number;draft:LocalEmailCampaign;createdAt:string}>>([]);
  const [historyBusy,setHistoryBusy]=useState(false);
  const [editor,setEditor]=useState<LocalEmailCampaign|null>(null);
  const [ready,setReady]=useState(false);
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState<'recent'|'name'>('recent');
  const [filter,setFilter]=useState<'all'|'drafts'>('all');
  const [csvReport,setCsvReport]=useState<{valid:number;invalid:number;declaredOptIn:number}|null>(null);
  const [pasteReport,setPasteReport]=useState<{valid:number;invalid:number}|null>(null);
  const [paste,setPaste]=useState('');
  const [excludeEmail,setExcludeEmail]=useState('');
  const [exclusions,setExclusions]=useState<Array<{email:string;reason:string;createdAt:string}>>([]);
  const [exclusionCount,setExclusionCount]=useState<number|null>(null);
  const [exclusionState,setExclusionState]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
  const [exclusionSaving,setExclusionSaving]=useState(false);
  const [exclusionNotice,setExclusionNotice]=useState('');
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
    // Browser storage is a backup, not the source of truth for cloud campaigns.
    setDrafts(next);
    try{
      localStorage.setItem(emailLocalStorageKey(ownerScope),JSON.stringify(items));
      return true;
    }catch{setError('Browser backup could not be saved. Account sync may still work.');return false;}
  };
  const saveDraft=async(campaign:LocalEmailCampaign):Promise<'server'|'browser'|'failed'>=>{
    if(!ownerScope||campaign.ownerScope!==ownerScope||!businesses.some(b=>b.id===campaign.businessId))
      return 'failed';
    const next=[campaign,...drafts.filter(d=>d.id!==campaign.id)]
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    const localSaved=persist(next);
    if(!serverStorageReady){
      if(!localSaved)return 'failed';
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
      setNotice(localSaved?'Campaign saved securely to your SLBI account.':
        'Campaign saved to your SLBI account, but browser backup is unavailable.');
      setError('');return 'server';
    }catch(e){
      const message=e instanceof Error?e.message:'Server unavailable.';
      setError(message+(localSaved?' Your browser backup is preserved.':
        ' Browser backup also failed; keep the editor open.'));
      return localSaved?'browser':'failed';
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
  const businessDrafts=useMemo(()=>drafts.filter(d=>d.businessId===businessId),[drafts,businessId]);
  const cloudCount=businessDrafts.filter(d=>Boolean(serverVersions[d.id])).length;
  const duplicateDraft=(d:LocalEmailCampaign)=>{
    if(d.businessId!==businessId||!canCreate)return;
    const stamp=new Date().toISOString();
    setEditor({...d,id:crypto.randomUUID(),title:('Copy of '+d.title).slice(0,100),createdAt:stamp,updatedAt:stamp});
  };
  const navigate=(next:HubTab)=>{setTab(next);setNotice('');setError('');};
  const shown=useMemo(()=>drafts.filter(d=>d.businessId===businessId)
    .filter(d=>!search.trim()||[d.title,d.subject].some(x=>x.toLowerCase().includes(search.trim().toLowerCase())))
    .filter(d=>filter==='all'||d.status==='local_draft')
    .sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):b.updatedAt.localeCompare(a.updatedAt)),[drafts,businessId,search,filter,sort]);
  useEffect(()=>{
    if(!['audience','analytics','settings'].includes(tab)||!businessId){return;}
    let live=true;
    setExclusionState('loading');setExclusionCount(null);setExclusions([]);
    setExclusionNotice('');
    void (async()=>{
      try{
        const response=await fetch('/api/marketing/email/suppressions?businessId='+encodeURIComponent(businessId),{
          credentials:'same-origin',cache:'no-store',
        });
        if(!response.ok)throw Error('Registry unavailable');
        const body:unknown=await response.json();
        if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid response');
        const record=body as {count?:unknown;items?:unknown};
        if(typeof record.count!=='number'||!Array.isArray(record.items))throw Error('Invalid registry');
        if(!live)return;
        setExclusionCount(record.count);
        setExclusions(record.items.flatMap(item=>{
          if(!item||typeof item!=='object'||Array.isArray(item))return [];
          const row=item as Record<string,unknown>;
          const email=normalizeSuppressionEmail(row.email);
          return email&&row.reason==='manual'&&typeof row.createdAt==='string'?
            [{email,reason:'manual',createdAt:row.createdAt}]:[];
        }));
        setExclusionState('ready');
      }catch{
        if(live){setExclusionState('unavailable');setExclusionCount(null);setExclusions([]);}
      }
    })();
    return()=>{live=false;};
  },[businessId,tab]);
  const excludeAddress=async()=>{
    const email=normalizeSuppressionEmail(excludeEmail);
    if(!email){setExclusionNotice('Enter one valid email address.');return;}
    if(!businessId||exclusionState!=='ready'||exclusionSaving)return;
    if(!window.confirm('Block this address from future marketing emails for this business? This exclusion cannot be removed from the Studio.'))return;
    setExclusionSaving(true);setExclusionNotice('');
    try{
      const response=await fetch('/api/marketing/email/suppressions',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId,email}),
      });
      const body:unknown=await response.json();
      const data=body&&typeof body==='object'&&!Array.isArray(body)?
        body as {saved?:boolean;alreadyExcluded?:boolean;error?:string}:{};
      if(!response.ok||!data.saved)throw Error(typeof data.error==='string'?data.error:'Could not save exclusion.');
      if(!data.alreadyExcluded){
        setExclusions(old=>[{email,reason:'manual',createdAt:new Date().toISOString()},
          ...old.filter(x=>x.email!==email)].slice(0,100));
        setExclusionCount(old=>old===null?null:old+1);
      }
      setExcludeEmail('');
      setExclusionNotice(data.alreadyExcluded?'Address is already excluded.':'Address added to the do-not-email registry.');
    }catch(e){setExclusionNotice(e instanceof Error?e.message:'Could not save exclusion.');}
    finally{setExclusionSaving(false);}
  };
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

  return <div data-testid="email-v4-marketing-hub" data-email-v7="workspace" className="email-v7-workspace w-full min-w-0 space-y-6 pb-10 text-[#111827]"
    style={{colorScheme:'light'}}>
    <header className="email-v7-header overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] px-5 py-6 sm:flex-row sm:items-center sm:px-7">
        <div className="min-w-0">
          <Link href="/vendor/marketing" className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B7280] hover:text-[#EA580C]">{icon('arrow-left-2',14)} Marketing Studio <span aria-hidden="true">/</span> Email</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#111827] sm:text-[32px]">Email Marketing Studio</h1>
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
      <nav role="tablist" aria-label="Email Marketing Studio tabs" className="flex w-full gap-1 overflow-x-auto px-3 py-2 sm:px-5">
        {TABS.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id}
          onClick={()=>navigate(t.id)}
          className={'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition sm:px-4 '+
            (tab===t.id?'bg-[#111827] text-white':'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]')}>
          {icon(t.icon,17)}{t.title}
          {t.id==='campaigns'&&drafts.filter(d=>d.businessId===businessId).length>0&&
            <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] text-[#C2410C]">
              {drafts.filter(d=>d.businessId===businessId).length}
            </span>}
        </button>)}
      </nav>
    </header>

    {!sender&&business&&tab==='settings'&&<section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-4 sm:p-5">
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

    {tab==='overview'&&<section aria-label="Email workspace overview" data-testid="email-v7-overview" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-6 text-white sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full border-[44px] border-[#F97316]/15"/>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 h-64 w-64 rounded-full border-[36px] border-white/5"/>
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FDBA74]">{icon('sms',17)} Email workspace</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">Make every message matter.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#D1D5DB]">Build branded emails, organize your campaigns and prepare your audience for {business?.name||'your business'}.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={!canCreate} onClick={()=>start('minimal')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#F97316] px-5 text-sm font-bold text-white hover:bg-[#EA580C] disabled:opacity-40">{icon('add',18)} Create campaign</button>
              <button type="button" onClick={()=>navigate('templates')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">{icon('image',18)} Browse templates</button>
            </div>
          </div>
          <div aria-hidden="true" className="hidden w-64 rotate-3 rounded-xl border border-white/10 bg-white p-4 shadow-2xl lg:block">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFEDD5] text-[#EA580C]">{icon('sms',18)}</span><div className="h-2 w-20 rounded bg-[#111827]"/></div>
            <div className="mt-4 rounded-lg bg-[#FFF1E6] p-4 text-[#111827]"><p className="text-[10px] font-bold uppercase tracking-wider text-[#C2410C]">New campaign</p><p className="mt-2 text-xl font-bold">Your next big idea.</p><div className="mt-3 h-2 w-32 rounded bg-[#FDBA74]"/><div className="mt-2 h-2 w-24 rounded bg-[#FED7AA]"/></div>
            <div className="mt-4 h-2 w-full rounded bg-[#E5E7EB]"/><div className="mt-2 h-2 w-2/3 rounded bg-[#E5E7EB]"/><div className="mt-4 h-7 w-24 rounded bg-[#F97316]"/>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {name:'Campaign drafts',value:ready?String(businessDrafts.length):'—',hint:'Saved designs',iconName:'document'},
          {name:'Cloud drafts',value:ready?String(cloudCount):'—',hint:'Account-synced',iconName:'document'},
          {name:'Subscribers',value:verifiedCount===undefined?'—':String(verifiedCount),hint:'Verified-account opt-ins',iconName:'people'},
          {name:'Sender',value:sender?'Connected':'Not linked',hint:'Mailbox status only',iconName:'sms'},
        ].map(k=><div key={k.name} className={panel+' p-4 sm:p-5'}>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]"><span className="text-[#EA580C]">{icon(k.iconName,19)}</span>{k.name}</div>
          <p className="mt-4 break-words text-xl font-bold tracking-tight sm:text-2xl">{k.value}</p><p className="mt-1 text-xs text-[#6B7280]">{k.hint}</p>
        </div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className={panel+' overflow-hidden'}>
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] p-5"><div><h3 className="text-base font-bold">Recent campaigns</h3><p className="mt-1 text-xs text-[#6B7280]">Pick up where you left off.</p></div><button type="button" onClick={()=>navigate('campaigns')} className="inline-flex items-center gap-1 text-sm font-semibold text-[#C2410C]">View all {icon('arrow-right-2',15)}</button></div>
          {!ready?<p className="p-6 text-sm text-[#6B7280]">Loading campaigns…</p>:businessDrafts.length===0?<div className="p-8 text-center"><p className="font-semibold">Start with your first email</p><p className="mt-2 text-sm text-[#6B7280]">Choose a template or build your own design.</p><button type="button" disabled={!canCreate} onClick={()=>start('minimal')} className="mt-4 rounded-lg border border-[#FDBA74] px-4 py-2 text-sm font-semibold text-[#C2410C] disabled:opacity-40">Create a draft</button></div>:businessDrafts.slice(0,5).map(d=><button type="button" key={d.id} onClick={()=>setEditor(d)} className="flex w-full items-center gap-3 border-b border-[#F3F4F6] p-4 text-left last:border-0 hover:bg-[#FFF7ED]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF1E6] text-[#EA580C]">{icon('document',20)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{d.title}</strong><span className="block truncate text-xs text-[#6B7280]">{niceDate(d.updatedAt)} · {serverVersions[d.id]?'Cloud draft':'Browser draft'}</span></span>{icon('arrow-right-2',16)}</button>)}
        </div>
        <div className={panel+' p-5'}>
          <h3 className="text-base font-bold">Workspace setup</h3><p className="mt-1 text-xs text-[#6B7280]">Prepare your account before delivery.</p>
          {[
            {name:'Business identity',ok:Boolean(business),detail:business?'Approved business selected':'Select an approved business',target:'settings' as HubTab},
            {name:'Cloud draft storage',ok:serverStorageReady,detail:serverStorageReady?'Ready':'Browser backup only',target:'campaigns' as HubTab},
            {name:'Connected mailbox',ok:Boolean(sender),detail:sender?'Connected':'Connect your Gmail account',target:'settings' as HubTab},
            {name:'Audience consent',ok:typeof verifiedCount==='number'&&verifiedCount>0,detail:'Verified-account opt-ins only',target:'audience' as HubTab},
            {name:'Delivery provider',ok:false,detail:'Not configured',target:'settings' as HubTab},
          ].map(s=><button key={s.name} type="button" onClick={()=>navigate(s.target)} className="mt-3 flex w-full items-center gap-3 rounded-lg border border-[#E5E7EB] p-3 text-left hover:border-[#FDBA74]"><span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold '+(s.ok?'bg-[#DCFCE7] text-[#166534]':'bg-[#F3F4F6] text-[#6B7280]')}>{s.ok?'✓':'○'}</span><span className="min-w-0 flex-1"><strong className="block text-xs">{s.name}</strong><span className="block text-xs text-[#6B7280]">{s.detail}</span></span>{icon('arrow-right-2',14)}</button>)}
        </div>
      </div>
    </section>}

    {tab==='campaigns'&&<section className="space-y-5" aria-label="Email campaign overview">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {name:'Draft campaigns',value:ready?String(businessDrafts.length):'—',hint:'Selected business',iconName:'document'},
          {name:'Cloud drafts',value:ready?String(cloudCount):'—',hint:'Saved to account',iconName:'document'},
          {name:'Browser drafts',value:ready?String(businessDrafts.length-cloudCount):'—',hint:'Local backup only',iconName:'document'},
          {name:'Subscribers',value:verifiedCount===undefined?'—':String(verifiedCount),
            hint:verifiedCount===undefined?'List not activated':'Verified-account opt-ins',iconName:'people'},
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
          <div className="flex flex-wrap items-center gap-2">
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
            <select aria-label="Sort campaigns" value={sort} onChange={e=>setSort(e.target.value as 'recent'|'name')} className="min-h-10 min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs"><option value="recent">Recently edited</option><option value="name">Name A–Z</option></select>
          </div>
        </div>
        {!ready?<p className="p-8 text-center text-[12px] text-[#6B7280]">Loading your saved designs…</p>:
          shown.length===0?<div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">{icon('document',27)}</div>
            <h3 className="text-[16px] font-extrabold">{businessDrafts.length?'No matching campaigns':'Your first great campaign starts here'}</h3>
            <p className="max-w-[390px] text-[12px] leading-6 text-[#6B7280]">{businessDrafts.length?
              'Try another search or select a different business.':
              'Choose a design and write your message. Save a draft before sending anything.'}</p>
            <button type="button" disabled={!canCreate} onClick={()=>start('hero')}
              className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-[12px] font-bold text-white disabled:opacity-40">
              {icon('add',17)} Create first campaign
            </button>
          </div>:
          <div className="divide-y divide-[#F3F4F6]" data-testid="email-v4-draft-list">
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_17rem] gap-3 bg-[#F9FAFB] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280] lg:grid"><span>Campaign</span><span>Status & updated</span><span>Actions</span></div>
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
                <button type="button" onClick={()=>duplicateDraft(d)} aria-label={'Duplicate '+d.title} className="min-h-10 rounded-lg border border-[#E5E7EB] px-3 text-[11px] font-semibold text-[#6B7280]">Duplicate</button>
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
            <p className="text-[11px] font-bold text-[#6B7280]">Verified-account opt-ins</p>
            <p className="mt-2 text-[27px] font-extrabold">{verifiedCount===undefined?'—':verifiedCount}</p>
          </div>
          <div className="rounded-xl bg-[#F9FAFB] p-4">
            <p className="text-[11px] font-bold text-[#6B7280]">Do-not-email entries</p>
            <p className="mt-2 text-[27px] font-extrabold">{exclusionCount===null?'—':exclusionCount}</p>
            <p className="text-[10px] text-[#9CA3AF]">{exclusionState==='ready'?'Manual exclusions only':'Registry unavailable · no sends allowed'}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">{icon('people',20)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-extrabold">Leads CRM</h3>
              <p className={secondary+' mt-1'}>Review enquiries and follow-ups. Account-verified opt-ins are collected separately; delivery still requires provider and recipient verification gates.</p>
              <Link href="/vendor/leads" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#C2410C]">Open Leads CRM {icon('arrow-right-2',14)}</Link>
            </div>
          </div>
        </div>
        <AudienceNetworkSummary businessId={businessId}/>
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
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFFBF5] p-4" data-testid="email-v6-suppressions">
          <div className="flex items-center gap-2 text-[#9A3412]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEDD5]">{icon('shield-tick',17)}</span>
            <h3 className="text-[13px] font-extrabold">Do-not-email registry</h3>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#92400E]">
            Manually exclude customers who must never receive marketing campaigns. This is not a subscriber list.
            Entries are business-specific and cannot be cleared from this Studio.
          </p>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();void excludeAddress();}}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Email address to exclude</span>
              <input type="email" autoComplete="off" inputMode="email" value={excludeEmail}
                onChange={e=>setExcludeEmail(e.target.value)} maxLength={254}
                placeholder="customer@example.com"
                className="min-h-10 w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[12px] outline-none focus:border-[#F97316]"
                disabled={exclusionState!=='ready'||exclusionSaving}/>
            </label>
            <button type="submit" disabled={exclusionState!=='ready'||exclusionSaving||!excludeEmail.trim()}
              className="min-h-10 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {exclusionSaving?'Saving…':'Block address'}
            </button>
          </form>
          {exclusionNotice&&<p role="status" className="mt-2 text-[11px] text-[#9A3412]">{exclusionNotice}</p>}
          {exclusionState==='loading'&&<p className="mt-3 text-[11px] text-[#6B7280]">Checking your private registry…</p>}
          {exclusionState==='unavailable'&&<p className="mt-3 text-[11px] font-semibold text-[#9A3412]">
            Registry is not yet activated. Blocking is disabled until secured database setup is complete.
          </p>}
          {exclusionState==='ready'&&<div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
            {exclusions.length===0?<p className="py-2 text-[11px] text-[#6B7280]">No manual exclusions recorded for this business.</p>:
              exclusions.slice(0,25).map(item=><div key={item.email}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#F3E8D8] bg-white px-3 py-2">
                <span className="min-w-0 truncate text-[11px] font-semibold text-[#374151]">{item.email}</span>
                <span className="shrink-0 text-[10px] text-[#9A3412]">Blocked</span>
              </div>)}
            {(exclusionCount||0)>25&&<p className="pt-1 text-[10px] text-[#92400E]">Showing latest 25 of {exclusionCount} exclusions.</p>}
          </div>}
        </div>
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
          <div className="flex h-[250px] items-center justify-center overflow-hidden border-b border-[#E5E7EB] bg-[#F3F4F6] p-5">
            <div className="h-full w-[190px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg">
              <div className="mb-3 flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-[#F97316]"/>
                <div className="h-2.5 w-20 rounded bg-[#111827]"/>
              </div>
              {i===1&&<div className="mb-3 h-14 rounded bg-gradient-to-tr from-[#FB923C] to-[#FFEDD5]"/>}
              {i===2&&<div className="mb-3 grid grid-cols-2 gap-2"><div className="h-14 rounded bg-[#FFF1E6]"/><div className="h-14 rounded bg-[#FEE2CE]"/></div>}
              {i===3&&<div className="mb-3 h-9 rounded border border-dashed border-[#F97316] bg-[#FFF7ED] p-1 text-[8px] text-[#EA580C]">Custom HTML</div>}
              <p className="mb-2 text-[12px] font-bold leading-tight text-[#111827]">{['A fresh update','Your exclusive offer','Two offers. More value.','Create your own design'][i]||item.label}</p>
              <div className="mb-2 h-2 w-full rounded bg-[#E5E7EB]"/>
              <div className="mb-2 h-2 w-4/5 rounded bg-[#E5E7EB]"/>
              <div className="mb-3 h-2 w-3/5 rounded bg-[#E5E7EB]"/>
              <div className="mx-auto flex h-6 w-24 items-center justify-center rounded bg-[#F97316] text-[8px] font-bold text-white">Discover more</div>
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
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs"><div className="flex items-center gap-2 font-semibold">{icon('flash',15)} {a.delay}</div><div className="my-1 ml-2 h-5 w-px bg-[#D1D5DB]"/><div className="flex items-center gap-2 font-semibold">{icon('sms',15)} Prepare email draft</div><p className="mt-2 text-[#6B7280]">Preview journey · not active</p></div>
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

    {tab==='analytics'&&<section aria-label="Email Analytics" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">Reporting</p>
          <h2 className="mt-1 text-[20px] font-extrabold">Email performance</h2>
          <p className={secondary+' mt-1'}>Live account and preparation data. Delivery reporting begins after a verified provider is connected.</p>
        </div>
        <span className="rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[11px] font-bold text-[#9A3412]">Delivery reporting not active</span>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {label:'Saved campaigns',number:String(drafts.filter(d=>d.businessId===businessId).length),note:'Real saved drafts'},
          {label:'Cloud-synced',number:String(drafts.filter(d=>d.businessId===businessId&&Boolean(serverVersions[d.id])).length),note:'Server draft records'},
          {label:'Verified-account opt-ins',number:verifiedCount===undefined?'—':String(verifiedCount),note:verifiedCount===undefined?'Ledger not activated':'Verified ledger records'},
          {label:'Manual exclusions',number:exclusionCount===null?'—':String(exclusionCount),note:exclusionState==='ready'?'Private do-not-email registry':'Registry unavailable'},
        ].map(item=><div key={item.label} className={panel+' p-5'}>
          <p className="text-[11px] font-semibold text-[#6B7280]">{item.label}</p>
          <p className="mt-3 text-[28px] font-extrabold tabular-nums">{item.number}</p>
          <p className="mt-1 text-[10px] text-[#9CA3AF]">{item.note}</p>
        </div>)}
      </div>
      <div className={panel+' p-5 sm:p-7'}>
        <h3 className="text-[15px] font-extrabold">Delivery funnel</h3>
        <p className={secondary+' mt-2'}>Sent, delivered, bounced, opened, clicked and unsubscribed events require an authenticated provider event stream. No fabricated engagement rates are displayed.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {['Delivery & bounces','Opens & clicks','Unsubscribes & complaints'].map(name=>
            <div key={name} className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-4">
              <p className="text-[11px] font-bold">{name}</p>
              <p className="mt-2 text-[23px] font-extrabold text-[#9CA3AF]">—</p>
              <p className="mt-1 text-[10px] text-[#9CA3AF]">Not connected</p>
            </div>)}
        </div>
      </div>
    </section>}

    {tab==='settings'&&<section aria-label="Email Sender Settings" className="grid gap-4 lg:grid-cols-2">
      <div className={panel+' space-y-5 p-5 sm:p-7'}>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">Account</p>
          <h2 className="mt-1 text-[20px] font-extrabold">Sender & brand</h2>
          <p className={secondary+' mt-1'}>Live business identity, connection and reusable brand assets.</p>
        </div>
        <div className="space-y-2 rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-[11px] font-bold text-[#6B7280]">Selected business</p>
          <p className="text-[14px] font-extrabold">{business?.brandName||business?.name||'No approved business'}</p>
          <p className={secondary}>Gmail: {sender?sender.accountDisplayName:'Not connected'}</p>
          <p className={secondary}>Cloud drafts: {serverStorageReady?'Available':'Not available'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendor/marketing-engine/connections"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-[11px] font-bold text-white">
            {sender?'Manage connected Gmail':'Connect Gmail'} {icon('arrow-right-2',15)}
          </Link>
          <Link href="/vendor/marketing/brand"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#FDBA74] px-4 text-[11px] font-bold text-[#C2410C]">
            Edit Brand Kit {icon('arrow-right-2',15)}
          </Link>
        </div>
      </div>
      <div className={panel+' space-y-4 p-5 sm:p-7'}>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">Delivery</p>
          <h2 className="mt-1 text-[20px] font-extrabold">Launch readiness</h2>
          <p className={secondary+' mt-1'}>Required safeguards before a marketing campaign can be sent.</p>
        </div>
        {[
          {label:'Approved SLBI business',ready:Boolean(business),detail:'Required owner-bound identity'},
          {label:'Gmail account linked',ready:Boolean(sender),detail:'Gmail alone is not bulk sender authorization'},
          {label:'Account-verified consent registry',ready:verifiedCount!==undefined,detail:'A verified count alone does not activate sending'},
          {label:'Manual suppression registry',ready:exclusionState==='ready',detail:'Independent provider exclusion list'},
        ].map(step=><div key={step.label} className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] p-3">
          <span className={'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full '+
            (step.ready?'bg-[#DCFCE7] text-[#166534]':'bg-[#F3F4F6] text-[#6B7280]')}>
            {icon(step.ready?'tick-circle':'clock',14)}
          </span>
          <div><p className="text-[12px] font-bold">{step.label}</p><p className={secondary}>{step.detail}</p></div>
        </div>)}
        <p className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3 text-[11px] leading-5 text-[#9A3412]">
          Bulk provider/domain verification, double-opt-in, one-click unsubscribe, rate-limited worker
          and signed delivery events are still required. Sending and scheduling remain unavailable.
        </p>
      </div>
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
        emailAiEnabled={emailAiEnabled} testSendEnabled={testSendEnabled}
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
