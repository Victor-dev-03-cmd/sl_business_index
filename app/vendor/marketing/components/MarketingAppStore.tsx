'use client';

import {memo,useDeferredValue,useMemo,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {
  MARKETING_STUDIO_APPS,MARKETING_STUDIO_CATEGORIES,filterMarketingStudioApps,
  type MarketingStudioApp,type StudioFilter,type StudioTone,
} from '@/lib/marketing/studio-apps';

const tones:Record<StudioTone,{background:string;ink:string;outline:string;glow:string}>={
  orange:{background:'bg-[#FFF0E4]',ink:'text-[#CA6212]',outline:'border-[#F5D5B7]',glow:'from-[#FFE5C8] to-[#FFF8F0]'},
  blue:{background:'bg-[#EAF3FF]',ink:'text-[#3173BD]',outline:'border-[#CEDFF4]',glow:'from-[#DAEAFE] to-[#F6FAFF]'},
  purple:{background:'bg-[#F2EDFF]',ink:'text-[#7854BA]',outline:'border-[#DFD4F8]',glow:'from-[#E6DBFF] to-[#FAF8FF]'},
  teal:{background:'bg-[#E5F6F2]',ink:'text-[#21836D]',outline:'border-[#C6E9E0]',glow:'from-[#D2F1E7] to-[#F7FCFA]'},
  rose:{background:'bg-[#FFF0F3]',ink:'text-[#B75779]',outline:'border-[#F4D7E1]',glow:'from-[#FFE3EB] to-[#FFFAFB]'},
  amber:{background:'bg-[#FFF4DD]',ink:'text-[#A6711E]',outline:'border-[#F3DDB4]',glow:'from-[#FFE9BC] to-[#FFFCF5]'},
};
const statusText={working:'Available workspace',foundation:'Foundation / preview',planned:'Integration planned'} as const;

const AppTile=memo(function AppTile({app,proEnabled}:{app:MarketingStudioApp;proEnabled:boolean}){
  const style=tones[app.tone];
  return <Link
    href={app.href}
    prefetch={false} // Do not eagerly fetch twelve separate Pro routes and entitlements.
    id={'marketing-app-'+app.id}
    aria-label={app.title+(app.pro?' — Pro app':' — included app')}
    className="group relative flex min-h-[273px] min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E9E8EA] bg-white p-5 shadow-[0_5px_18px_rgba(30,30,35,.035)] outline-none transition duration-200 hover:-translate-y-1 hover:border-[#F0BC8D] hover:shadow-[0_18px_32px_rgba(31,31,38,.10)] focus-visible:ring-2 focus-visible:ring-[#FF7900] motion-reduce:transform-none motion-reduce:transition-none"
  >
    <span className={'pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-gradient-to-br opacity-65 blur-xl '+style.glow} aria-hidden="true"/>
    <div className="relative flex items-start justify-between gap-3">
      <div className={'flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_2px_#ffffff,0_6px_15px_rgba(0,0,0,.035)] '+style.background+' '+style.outline+' '+style.ink}>
        <IconsaxIcon name={app.icon} size={33} variant="bulk"/>
      </div>
      <span className={'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold '+
        (app.pro?'border-[#E7D7CB] bg-[#FFF6ED] text-[#AA581C]':'border-[#DCEBE4] bg-[#F0F9F4] text-[#38805A]')}>
        {app.pro?<IconsaxIcon name="shield-tick" size={12}/>:<IconsaxIcon name="tick-circle" size={12}/>}
        {app.pro?'PRO':'INCLUDED'}
      </span>
    </div>
    <div className="relative mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#A56E43]">{app.subtitle}</p>
      <h3 className="mt-1 text-[16px] font-extrabold tracking-[-.025em] text-[#202025]">{app.title}</h3>
      <p className="mt-2 line-clamp-3 text-[12px] leading-[1.75] text-[#777780]">{app.description}</p>
    </div>
    <div className="relative mt-auto flex items-end justify-between gap-2 pt-5">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-[#8D8D95]">{statusText[app.availability]}</p>
        <p className="text-[10px] text-[#95959C]">{app.note}</p>
      </div>
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8E7E9] bg-[#FAFAFB] text-[#B9601B] transition group-hover:border-[#FF7900] group-hover:bg-[#FF7900] group-hover:text-white">
        <IconsaxIcon name="arrow-right-2" size={16}/>
      </span>
    </div>
    {app.pro&&!proEnabled&&<span className="sr-only">Requires a verified Professional or Enterprise subscription. Select to review upgrade options.</span>}
  </Link>;
});

export default function MarketingAppStore({proEnabled}:{proEnabled:boolean}){
  const [category,setCategory]=useState<StudioFilter>('All apps');
  const [search,setSearch]=useState('');
  const deferredSearch=useDeferredValue(search);
  const filtered=useMemo(()=>filterMarketingStudioApps(MARKETING_STUDIO_APPS,deferredSearch,category),[category,deferredSearch]);
  return <section id="marketing-app-store" aria-label="Marketing Studio app store" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#BA631C]">DISCOVER YOUR APPS</p>
        <h2 className="mt-1 text-[24px] font-extrabold tracking-[-.04em] text-[#242428] sm:text-[27px]">Explore the marketing collection</h2>
        <p className="mt-1 text-[12px] leading-6 text-[#82818A]">Every app opens its own workspace. Pro features require a verified subscription, and provider connections need separate approval.</p>
      </div>
      <span className="rounded-full border border-[#E8E6E7] bg-[#FAFAFB] px-3 py-1.5 text-[11px] font-bold text-[#77767B]">{MARKETING_STUDIO_APPS.length} first-party apps</span>
    </div>
    <div className="flex flex-col gap-3 rounded-[17px] border border-[#EAE9EB] bg-[#FCFCFD] p-3 sm:p-4">
      <label htmlFor="marketing-app-search" className="sr-only">Search marketing apps</label>
      <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E5E3E7] bg-white px-4 shadow-[0_2px_8px_rgba(24,24,26,.025)] focus-within:border-[#F2A45E] focus-within:ring-2 focus-within:ring-[#FF7900]/10">
        <IconsaxIcon name="search-normal" size={19} color="#99949A"/>
        <input id="marketing-app-search" type="search" autoComplete="off" value={search} maxLength={80}
          placeholder="Search email, social media, AI poster, plugins…" onChange={event=>setSearch(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[#25242A] outline-none placeholder:text-[#98949B]"/>
        {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear app search"
          className="rounded-md px-2 py-1 text-[11px] font-bold text-[#BA631C] hover:bg-[#FFF4E7]">Clear</button>}
      </div>
      <div role="group" aria-label="Filter marketing apps by category" className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {MARKETING_STUDIO_CATEGORIES.map(option=><button key={option} type="button"
          aria-pressed={category===option} onClick={()=>setCategory(option)}
          className={'h-9 shrink-0 rounded-[9px] border px-4 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] '+
            (category===option?'border-[#262326] bg-[#252326] text-white':'border-[#E9E6E8] bg-white text-[#6F6D76] hover:border-[#F0B57B] hover:text-[#C0651D]')}>
          {option}
        </button>)}
      </div>
    </div>
    <div className="flex items-center justify-between gap-4">
      <p className="text-[12px] font-semibold text-[#76747C]" role="status" aria-live="polite">
        {filtered.length} {filtered.length===1?'app':'apps'} found
      </p>
      <p className="hidden text-[11px] text-[#939098] sm:block">Official integrations · Human-controlled actions · No automatic publishing</p>
    </div>
    {filtered.length?<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filtered.map(app=><AppTile key={app.id} app={app} proEnabled={proEnabled}/>)}
    </div>:<div className="rounded-[18px] border border-dashed border-[#E6E1E4] bg-[#FAFAFB] px-5 py-14 text-center">
      <IconsaxIcon name="search-normal" size={30} color="#A19AA0"/>
      <h3 className="mt-3 text-[16px] font-bold text-[#2D2B31]">No apps match your search</h3>
      <p className="mt-1 text-[12px] text-[#8E8991]">Try a different keyword or view the complete collection.</p>
      <button type="button" onClick={()=>{setSearch('');setCategory('All apps')}}
        className="mt-4 rounded-lg bg-[#242326] px-4 py-2.5 text-[12px] font-bold text-white">Show all apps</button>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F0E1D5] bg-[#FFF9F3] p-4 sm:px-6">
      <div>
        <p className="text-[12px] font-bold text-[#544030]">{proEnabled?'Your verified Pro tools are accessible.':'Want the full Marketing Studio experience?'}</p>
        <p className="mt-1 text-[11px] leading-5 text-[#8E7A6D]">Apps display actual current capabilities. Email sending, provider account OAuth and automatic posts stay off until separate setup and consent.</p>
      </div>
      {!proEnabled&&<Link href="/vendor/billing"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#252225] px-4 text-[11px] font-bold text-white transition hover:bg-[#43372F]">
        Explore Pro plans <IconsaxIcon name="arrow-right-2" size={14} color="white"/>
      </Link>}
    </div>
  </section>;
}
