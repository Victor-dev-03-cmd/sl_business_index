'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import CreativeLibraryUpload from './components/CreativeLibraryUpload';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ClipboardCopy, Clock3,
  FileText, Globe2, Megaphone, MessageSquareText, Plus, RefreshCw,
  Send, ShieldCheck, Sparkles, Target, Users, Image as ImageIcon,
} from 'lucide-react';

type Tab = 'overview' | 'social' | 'calendar' | 'library' | 'email';
type Language = 'English' | 'Tamil' | 'Sinhala';
type Business = {
  id: string; name: string; category: string | null; city: string | null;
  description: string | null; phone: string | null; slug: string | null; website_url: string | null;
};
type Campaign = {
  id: string; business_id: string | null; banner_text: string;
  banner_color: string; status: string | null; platforms: string[] | null;
  scheduled_at: string | null; created_at: string | null;
};
type Promotion = {
  id: string; business_id: string | null; caption: string | null;
  image_url: string; status: string | null; social_platforms: string[] | null;
  created_at: string | null;
};

const tabs: {id:Tab;title:string;subtitle:string;icon:typeof Target}[] = [
  {id:'overview',title:'Overview',subtitle:'Your campaigns',icon:Target},
  {id:'social',title:'Social content',subtitle:'Brief & captions',icon:Megaphone},
  {id:'calendar',title:'Planner',subtitle:'Scheduled drafts',icon:CalendarDays},
  {id:'library',title:'Library',subtitle:'Saved assets',icon:ImageIcon},
  {id:'email',title:'Email strategy',subtitle:'Consent-first',icon:Send},
];
const objectiveList = ['Promote a special offer', 'Build local awareness', 'Launch a new product', 'Seasonal campaign', 'Customer re-engagement'] as const;
const channels=['Facebook','Instagram','LinkedIn','WhatsApp'] as const;
const card='border border-[#DFE6DF] bg-white shadow-[0_1px_3px_rgba(20,44,29,0.04)]';
const input='w-full min-w-0 rounded-md border border-[#CCD8CD] bg-white px-3 py-2.5 text-[13px] text-[#203E2D] outline-none focus:border-[#478764] focus:ring-2 focus:ring-[#D4E9D9]';
const action='inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#CCD8CD] bg-white px-4 text-xs font-semibold text-[#355944] transition hover:bg-[#F4F8F3] disabled:cursor-not-allowed disabled:opacity-50';
const primary='inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#285D42] px-4 text-xs font-bold text-white transition hover:bg-[#194730] disabled:cursor-not-allowed disabled:opacity-50';

function formatDay(value:string|null):string {
  if(!value)return 'Not scheduled';
  const dt=new Date(value);
  return Number.isFinite(dt.getTime())?dt.toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'}):'Unknown date';
}
function makeCaption(business:Business|undefined, objective:string, offer:string, audience:string, language:Language, cta:string):string {
  const name=business?.name || 'Our business';
  const city=business?.city?.trim() || 'Sri Lanka';
  const value=offer.trim() || (business?.description?.trim().slice(0,130) || 'Discover what makes our services different');
  if(language==='Tamil')
    return `${name} | ${city}\n\n${objective==='Promote a special offer'?'உங்களுக்கான சிறப்பு தகவல்!':'உங்கள் அருகிலுள்ள நம்பகமான சேவைகள்.'}\n${value}\n\n${audience?audience+' — ':''}${cta==='Visit profile'?'எங்கள் Business Profile-ஐ பாருங்கள்.':cta==='Call us'?'மேலும் அறிய எங்களை அழையுங்கள்.':'மேலும் அறிய எங்களுடன் தொடர்பு கொள்ளுங்கள்.'}\n\n#SriLanka #LocalBusiness`;
  if(language==='Sinhala')
    return `${name} | ${city}\n\n${objective==='Promote a special offer'?'ඔබ වෙනුවෙන් විශේෂ පණිවිඩයක්!':'ඔබ අසල විශ්වාසදායක සේවාවන්.'}\n${value}\n\n${audience?audience+' — ':''}${cta==='Visit profile'?'අපගේ ව්‍යාපාර පිටුව බලන්න.':cta==='Call us'?'වැඩි විස්තර සඳහා අමතන්න.':'වැඩි විස්තර සඳහා සම්බන්ධ වන්න.'}\n\n#SriLanka #LocalBusiness`;
  return `${name} · ${city}\n\n${objective==='Promote a special offer'?'Something special for our community.':objective+'.'}\n${value}\n\n${audience?'For '+audience+'. ':''}${cta==='Visit profile'?'Explore our business profile.':cta==='Call us'?'Call us to learn more.':'Message us for details.'}\n\n#SriLanka #ShopLocal`;
}
function readTab():Tab {
  if(typeof window==='undefined')return 'overview';
  const value=new URLSearchParams(window.location.search).get('tab');
  return tabs.some(t=>t.id===value)?value as Tab:'overview';
}

export default function MarketingStudio() {
  const [activeTab,setActiveTab]=useState<Tab>('overview');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [userId,setUserId]=useState<string|null>(null);
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [promotions,setPromotions]=useState<Promotion[]>([]);
  const [language,setLanguage]=useState<Language>('English');
  const [objective,setObjective]=useState<string>(objectiveList[0]);
  const [offer,setOffer]=useState('');
  const [audience,setAudience]=useState('');
  const [cta,setCta]=useState('Visit profile');
  const [platforms,setPlatforms]=useState<string[]>(['Facebook','Instagram']);
  const [caption,setCaption]=useState('');
  const [scheduleAt,setScheduleAt]=useState('');

  const selected=businesses.find(b=>b.id===businessId);
  const campaignsForBusiness=useMemo(()=>campaigns.filter(c=>c.business_id===businessId),[campaigns,businessId]);
  const promotionsForBusiness=useMemo(()=>promotions.filter(p=>p.business_id===businessId),[promotions,businessId]);
  const planned=campaignsForBusiness.filter(c=>c.status==='scheduled');
  const drafts=campaignsForBusiness.filter(c=>c.status==='drafted');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setUserId(null);setBusinesses([]);setCampaigns([]);setPromotions([]);return;}
      setUserId(user.id);
      const owned=await supabase.from('businesses')
        .select('id,name,category,city,description,phone,slug,website_url')
        .eq('owner_id',user.id).order('name');
      if(owned.error)throw owned.error;
      const list=(owned.data||[]) as Business[];
      setBusinesses(list);
      setBusinessId(prev=>list.some(b=>b.id===prev)?prev:(list[0]?.id||''));
      const ids=list.map(b=>b.id);
      if(!ids.length){setCampaigns([]);setPromotions([]);return;}
      const [marketing,media]=await Promise.all([
        supabase.from('marketing_campaigns')
          .select('id,business_id,banner_text,banner_color,platforms,scheduled_at,status,created_at')
          .in('business_id',ids).order('created_at',{ascending:false}).limit(200),
        supabase.from('promotions')
          .select('id,business_id,caption,image_url,status,social_platforms,created_at')
          .in('business_id',ids).order('created_at',{ascending:false}).limit(120),
      ]);
      if(marketing.error)throw marketing.error;
      if(media.error)throw media.error;
      setCampaigns((marketing.data||[]) as Campaign[]);
      setPromotions((media.data||[]) as Promotion[]);
    }catch(e){setError(e instanceof Error?e.message:'Could not load your marketing workspace.');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    setActiveTab(readTab());
    const fn=()=>setActiveTab(readTab());
    window.addEventListener('popstate',fn);
    return()=>window.removeEventListener('popstate',fn);
  },[]);
  const openTab=(id:Tab)=>{
    setActiveTab(id);
    const u=new URL(window.location.href);
    u.searchParams.set('tab',id);
    window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);
  };
  const generate=()=>{
    if(!selected){toast.error('Select an owned business first.');return;}
    setCaption(makeCaption(selected,objective,offer,audience,language,cta));
    toast.success('Editable campaign caption prepared from your business brief');
  };
  const copy=async(text:string)=>{
    if(!text){toast.error('Prepare content before copying.');return;}
    try{await navigator.clipboard.writeText(text);toast.success('Copied to clipboard');}
    catch{toast.error('Browser clipboard access is unavailable.');}
  };
  const save=async(shouldSchedule:boolean)=>{
    if(!userId||!selected){toast.error('Select an owned business first.');return;}
    const text=caption.trim();
    if(text.length<10||text.length>2500){toast.error('Write a caption of 10–2500 characters.');return;}
    if(!platforms.length){toast.error('Choose at least one channel.');return;}
    if(shouldSchedule&&(!scheduleAt||new Date(scheduleAt).getTime()<=Date.now())){toast.error('Select a future planning time.');return;}
    setSaving(true);
    try{
      const {error:writeError}=await supabase.from('marketing_campaigns').insert({
        business_id:selected.id,banner_text:text,banner_color:'slbi-brand',
        platforms:platforms.map(p=>p.toLowerCase()),
        scheduled_at:shouldSchedule?new Date(scheduleAt).toISOString():null,
        status:shouldSchedule?'scheduled':'drafted',
      });
      if(writeError)throw writeError;
      toast.success(shouldSchedule?'Planning reminder saved — no external posting occurs.':'Draft saved to your content library.');
      await load();openTab(shouldSchedule?'calendar':'library');
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to save campaign.');}
    finally{setSaving(false);}
  };
  const togglePlatform=(name:string)=>setPlatforms(prev=>prev.includes(name)?prev.filter(p=>p!==name):[...prev,name]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-[#203B2D]">
      <header className="vendor-premium-header flex flex-col justify-between gap-5 px-6 py-7 lg:flex-row lg:items-end">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#C9E8CF]">Growth OS / Marketing intelligence</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.04em] text-white sm:text-[34px]">Marketing Studio</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#D9EADD]">Plan brand-consistent campaigns, prepare multilingual captions, and organize your owned content — without an unnecessary canvas editor.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <button type="button" onClick={()=>openTab('social')} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#E9F3E5] px-4 text-xs font-bold text-[#245539]"><Plus size={16}/> New content brief</button>
          <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/30 px-4 text-xs font-bold text-white"><RefreshCw size={15}/> Refresh</button>
        </div>
      </header>

      <section className={card+' grid grid-cols-1 items-end gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5'}>
        <label className="min-w-0">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#6F876F]">Active brand workspace</span>
          <select className={input} value={businessId} onChange={e=>setBusinessId(e.target.value)} disabled={loading}>
            {!businesses.length&&<option value="">No businesses available</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}{b.city?' · '+b.city:''}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-md bg-[#EFF6EE] px-3 py-2 text-[11px] font-semibold text-[#32624A]"><ShieldCheck size={15}/> Owner-scoped data</span>
          <Link href="/vendor/insights" className={action}><ArrowUpRight size={15}/> Growth insights</Link>
        </div>
      </section>

      {error&&<div role="alert" className="border border-[#EED1C8] bg-[#FFF7F3] p-4 text-xs text-[#8B433A]">{error}</div>}
      {!loading&&!userId&&<div className={card+' p-6 text-sm'}>Sign in to manage your marketing workspace. <Link href="/login?redirect=/vendor/marketing" className="font-bold underline">Sign in</Link></div>}
      {!loading&&userId&&!businesses.length&&<div className={card+' p-6 text-sm'}>Add a business listing to start creating campaigns. <Link href="/vendor/my-businesses" className="font-bold underline">Manage businesses</Link></div>}

      <div className="grid gap-5 lg:grid-cols-[215px_minmax(0,1fr)]">
        <nav aria-label="Marketing studio sections" className={card+' flex h-fit gap-1 overflow-x-auto p-2 lg:flex-col'}>
          {tabs.map(t=><button type="button" key={t.id} onClick={()=>openTab(t.id)}
            aria-current={activeTab===t.id?'page':undefined}
            className={'flex min-w-max items-center gap-3 rounded-md px-3 py-3 text-left transition lg:min-w-0 '+(activeTab===t.id?'bg-[#EAF3E9] text-[#265A3E]':'text-[#617B68] hover:bg-[#F6F8F5]')}>
            <t.icon size={18}/>
            <span><span className="block text-[12px] font-bold">{t.title}</span><span className="hidden text-[10px] opacity-70 lg:block">{t.subtitle}</span></span>
          </button>)}
        </nav>
        <div className="min-w-0 space-y-5">
          {activeTab==='overview'&&<>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {name:'Draft campaigns',n:drafts.length,description:'Saved internal briefs',icon:FileText},
                {name:'Planned campaigns',n:planned.length,description:'Dates stored, not autopublished',icon:CalendarDays},
                {name:'Media submissions',n:promotionsForBusiness.length,description:'Existing image records',icon:ImageIcon},
              ].map(k=><div key={k.name} className={card+' p-5'}>
                <div className="flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#62766B]">{k.name}</span><k.icon size={18} className="text-[#4E8D65]"/></div>
                <p className="mt-4 text-3xl font-bold tabular-nums">{loading?'—':k.n}</p><p className="mt-1 text-[11px] text-[#849589]">{k.description}</p>
              </div>)}
            </div>
            <div className={card+' p-6'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64956E]">Campaign planning</p>
              <h2 className="mt-2 text-xl font-bold">Launch a consistent brand message.</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#687C6E]">Start with your approved business information, choose a marketing objective and language, write the final copy, then save or plan a campaign. Every external post requires your own publishing action.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  {step:'01',title:'Brand brief',desc:'Business, offer, audience and goal',tab:'social' as Tab},
                  {step:'02',title:'Review your copy',desc:'Tamil, Sinhala or English draft',tab:'social' as Tab},
                  {step:'03',title:'Plan & measure',desc:'Organize assets and recorded results',tab:'calendar' as Tab},
                ].map(a=><button key={a.step} type="button" onClick={()=>openTab(a.tab)} className="group rounded-md border border-[#E0E9DE] p-4 text-left hover:border-[#7AAA87] hover:bg-[#F8FBF7]">
                  <span className="text-[11px] font-extrabold text-[#559266]">{a.step}</span><p className="mt-2 text-[13px] font-bold">{a.title}</p>
                  <p className="mt-1 text-[11px] text-[#849688]">{a.desc}</p><ArrowRight size={15} className="mt-3 text-[#5A8865] group-hover:translate-x-1"/>
                </button>)}
              </div>
            </div>
            <div className={card+' p-5'}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[15px] font-bold">Brand context</h2><Link href="/vendor/settings?tab=optimization" className="text-xs font-bold text-[#31704C] hover:underline">Improve discovery profile</Link></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <p className="text-xs"><span className="block text-[#8A9D8D]">Business</span><strong className="mt-1 block text-[#244D33]">{selected?.name||'—'}</strong></p>
                <p className="text-xs"><span className="block text-[#8A9D8D]">Category & city</span><strong className="mt-1 block text-[#244D33]">{[selected?.category,selected?.city].filter(Boolean).join(' · ')||'Not provided'}</strong></p>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#6C806F]">{selected?.description||'Add a meaningful business description before preparing campaign content.'}</p>
            </div>
          </>}
          {activeTab==='social'&&<div className={card+' p-5 sm:p-6'}>
            <div className="flex items-center gap-2"><Target size={18} className="text-[#4C8A65]"/><span className="text-[10px] font-bold uppercase tracking-widest text-[#55816A]">Creative brief / Social</span></div>
            <h2 className="mt-2 text-[21px] font-bold">Business-aware content planning</h2>
            <p className="mt-1 text-[12px] leading-6 text-[#728373]">Start with approved business facts. The caption builder is a transparent template assistant, not a live AI image generator.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-[11px] font-bold">Objective</span><select className={input} value={objective} onChange={e=>setObjective(e.target.value)}>{objectiveList.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span className="mb-1.5 block text-[11px] font-bold">Language</span><select className={input} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{(['English','Tamil','Sinhala'] as const).map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-[11px] font-bold">Offer or key message</span><textarea className={input+' min-h-24 resize-y'} value={offer} onChange={e=>setOffer(e.target.value)} maxLength={500} placeholder="Offer details, dates and terms must be verified by your business."/></label>
              <label><span className="mb-1.5 block text-[11px] font-bold">Audience (optional)</span><input className={input} value={audience} onChange={e=>setAudience(e.target.value)} maxLength={120} placeholder="e.g. families in Jaffna"/></label>
              <label><span className="mb-1.5 block text-[11px] font-bold">Call to action</span><select className={input} value={cta} onChange={e=>setCta(e.target.value)}><option>Visit profile</option><option>Call us</option><option>Message us</option></select></label>
            </div>
            <fieldset className="mt-5"><legend className="mb-2 text-[11px] font-bold">Channels for manual publishing</legend>
              <div className="flex flex-wrap gap-2">{channels.map(p=><button key={p} type="button" aria-pressed={platforms.includes(p)} onClick={()=>togglePlatform(p)}
                className={'min-h-9 rounded-md border px-3 text-xs font-bold '+(platforms.includes(p)?'border-[#2D6F49] bg-[#E6F2E8] text-[#265F40]':'border-[#DCE5DC] text-[#819286]')}>{platforms.includes(p)&&<Check size={12} className="mr-1 inline"/>}{p}</button>)}</div>
            </fieldset>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={primary} disabled={!selected} onClick={generate}><Sparkles size={16}/> Prepare caption</button><button type="button" className={action} disabled={!caption} onClick={()=>void copy(caption)}><ClipboardCopy size={15}/> Copy caption</button></div>
            <label className="mt-5 block"><span className="mb-1.5 block text-[11px] font-bold">Final caption — review and edit before publishing</span>
              <textarea className={input+' min-h-56 resize-y leading-7'} value={caption} onChange={e=>setCaption(e.target.value)} maxLength={2500} placeholder="Your reviewed caption will appear here…"/></label>
            <div className="mt-5 grid items-end gap-4 border-t border-[#E2EAE1] pt-5 md:grid-cols-[1fr_auto]">
              <label><span className="mb-1.5 block text-[11px] font-bold">Optional planning date</span><input type="datetime-local" className={input} value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)}/></label>
              <div className="flex flex-wrap gap-2"><button type="button" disabled={saving||!selected} onClick={()=>void save(false)} className={action}><FileText size={15}/> Save draft</button><button type="button" disabled={saving||!selected} onClick={()=>void save(true)} className={primary}><CalendarDays size={15}/> Save planned</button></div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#849388]">Dates are recorded in SLBI only. Facebook, Instagram, LinkedIn, WhatsApp and email are not automatically posted or sent. Confirm prices and terms before sharing.</p>
          </div>}
          {activeTab==='calendar'&&<div className={card+' p-5 sm:p-6'}>
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#568565]">Planning calendar</p><h2 className="mt-2 text-[20px] font-bold">Upcoming content plan</h2></div><button type="button" className={action} onClick={()=>openTab('social')}><Plus size={15}/> Plan content</button></div>
            <p className="mt-1 text-[12px] text-[#789080]">Scheduled campaign records are reminders, not third-party social network deliveries.</p>
            <div className="mt-5 space-y-3">{planned.sort((a,b)=>Date.parse(a.scheduled_at||'')-Date.parse(b.scheduled_at||'')).map(c=><article key={c.id} className="grid gap-3 rounded-md border border-[#E1E9E0] p-4 sm:grid-cols-[150px_1fr_auto]">
              <div className="text-[11px] font-bold text-[#41805A]"><CalendarDays size={15} className="mr-1 inline"/>{formatDay(c.scheduled_at)}</div>
              <p className="line-clamp-2 whitespace-pre-line text-[12px] leading-5 text-[#536B59]">{c.banner_text}</p>
              <button className={action} type="button" onClick={()=>void copy(c.banner_text)}><ClipboardCopy size={14}/> Copy</button>
            </article>)}
              {!planned.length&&<div className="border border-dashed border-[#C9DCC9] bg-[#F8FAF7] p-8 text-center text-[12px] text-[#819481]">No campaigns planned for this business yet.</div>}
            </div>
          </div>}
          {activeTab==='library'&&<div className={card+' p-5 sm:p-6'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#568565]">Content workspace</p><h2 className="mt-2 text-[20px] font-bold">Saved campaign library</h2>
            <p className="mt-1 text-[12px] text-[#789080]">Your real draft, planned and previously submitted media records.</p>
            <div className="mt-4"><CreativeLibraryUpload business={selected} onSuccess={()=>{void load()}}/></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {campaignsForBusiness.map(c=><article key={'c'+c.id} className="rounded-md border border-[#DCE7DC] bg-[#FBFDFB] p-4">
                <div className="flex justify-between gap-2"><span className="text-[10px] font-extrabold uppercase text-[#4C865E]">{c.status==='posted'?'Legacy posted status':c.status||'Draft'}</span><span className="text-[10px] text-[#93A399]">{formatDay(c.created_at)}</span></div>
                <p className="mt-3 line-clamp-4 min-h-20 whitespace-pre-line text-xs leading-6">{c.banner_text}</p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E8EEE8] pt-3"><span className="max-w-[170px] truncate text-[10px] text-[#829586]">{(c.platforms||[]).join(' · ')||'No channel'}</span><button type="button" className={action} onClick={()=>void copy(c.banner_text)}><ClipboardCopy size={14}/> Copy</button></div>
              </article>)}
              {promotionsForBusiness.map(p=><article key={'p'+p.id} className="rounded-md border border-[#DCE7DC] bg-[#FBFDFB] p-4">
                <div className="flex justify-between gap-2"><span className="text-[10px] font-extrabold uppercase text-[#4C865E]">Media · {p.status||'pending'}</span><span className="text-[10px] text-[#93A399]">{formatDay(p.created_at)}</span></div>
                {/^https:\/\//.test(p.image_url)&&<a href={p.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs font-semibold text-[#2C7950] underline">Open submitted media <ArrowUpRight size={13} className="inline"/></a>}
                <p className="mt-3 line-clamp-4 whitespace-pre-line text-xs leading-6">{p.caption||'No caption included'}</p>
              </article>)}
            </div>
            {!campaignsForBusiness.length&&!promotionsForBusiness.length&&<p className="mt-5 border border-dashed border-[#C9DCC9] p-8 text-center text-xs text-[#829483]">No saved content for this business. Prepare your first brief in Social content.</p>}
          </div>}
          {activeTab==='email'&&<div className={card+' p-5 sm:p-6'}>
            <div className="flex items-center gap-2 text-[#437B58]"><Users size={17}/><span className="text-[10px] font-bold uppercase tracking-widest">Consent-based email marketing</span></div>
            <h2 className="mt-2 text-[22px] font-bold">Email strategy & readiness</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#647968]">Your CRM enquiry addresses are not automatically marketing subscribers. Sending remains unavailable until verified opt-in, suppression, unsubscribe, sender authentication and compliant delivery are connected.</p>
            <div className="mt-5 space-y-3">
              {[
                {title:'Audience & explicit consent',info:'Collect marketing-specific consent and retain proof of purpose and time.'},
                {title:'Suppression & unsubscribe',info:'Prevent sending to opted-out or complained-about recipients.'},
                {title:'Sender trust',info:'Validate SPF, DKIM and DMARC for the business-owned sender domain.'},
                {title:'Draft, approve & schedule',info:'Human review before any future provider integration sends a message.'},
              ].map((item,i)=><div key={item.title} className="flex items-start gap-3 rounded-md border border-[#E2E9E0] p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ECF5E9] text-[11px] font-extrabold text-[#497E57]">{i+1}</span><div><h3 className="text-[13px] font-bold">{item.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#859587]">{item.info}</p></div>
              </div>)}
            </div>
            <div className="mt-5 border border-[#E4D9B5] bg-[#FFFBEF] p-4 text-[12px] leading-6 text-[#766036]"><ShieldCheck size={17} className="mr-2 inline"/> Email delivery is not enabled. No user contacts are copied, exported or mailed by this page.</div>
          </div>}
        </div>
      </div>
    </div>
  );
}
