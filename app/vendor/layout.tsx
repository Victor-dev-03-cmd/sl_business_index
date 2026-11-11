'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import VerifiedBadge from '@/app/components/VerifiedBadge';
import { useUser } from '@/lib/hooks/useUser';
import IconsaxIcon from './components/IconsaxIcon';
import VendorQuickActions from './components/VendorQuickActions';
import './vendor-workspace.css';

const primaryNav = [
  { name:'Overview', href:'/vendor/dashboard', icon:'category' },
  { name:'Growth Insights', href:'/vendor/insights', icon:'status-up' },
  { name:'My Businesses', href:'/vendor/my-businesses', icon:'shop' },
  { name:'Enquiries', href:'/vendor/leads', icon:'message-text' },
  { name:'Reviews', href:'/vendor/reviews', icon:'star' },
];
const growthNav = [
  { name:'Growth OS', href:'/vendor/growth', icon:'chart' },
  { name:'Marketing Studio', href:'/vendor/marketing', icon:'flash' },
  { name:'QR Studio', href:'/vendor/qr-code', icon:'scan-barcode' },
];
const accountNav = [
  { name:'Billing & Plans', href:'/vendor/billing', icon:'card' },
  { name:'Settings', href:'/vendor/settings', icon:'setting-2' },
];
const quickNav = [
  { name:'Home', href:'/vendor/dashboard', icon:'category' },
  { name:'Businesses', href:'/vendor/my-businesses', icon:'shop' },
  { name:'Enquiries', href:'/vendor/leads', icon:'message-text' },
  { name:'Insights', href:'/vendor/insights', icon:'status-up' },
  { name:'Tools', href:'/vendor/growth', icon:'chart' },
];
type NavItem = {name:string;href:string;icon:string};
const allItems: NavItem[] = [...primaryNav,...growthNav,...accountNav];

export default function VendorLayout({children}:{children:React.ReactNode}) {
  const pathname = usePathname();
  const {data:user,isLoading} = useUser();
  const [expanded,setExpanded]=useState(true);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [quickOpen,setQuickOpen]=useState(false);
  const active=(href:string)=>pathname===href||pathname.startsWith(href+'/');
  const selected=allItems.find(item=>active(item.href));
  const pageTitle=selected?.name || 'Business Workspace';

  useEffect(()=>{setDrawerOpen(false)},[pathname]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setQuickOpen(v=>!v);
      }
      if(event.key==='Escape'){setQuickOpen(false);setDrawerOpen(false)}
    };
    document.addEventListener('keydown',key);
    return()=>document.removeEventListener('keydown',key);
  },[]);

  function items(list:readonly NavItem[],mobile=false) {
    return list.map(item=>{
      const current=active(item.href);
      return <Link key={item.href} href={item.href} aria-current={current?'page':undefined}
        title={!expanded&&!mobile?item.name:undefined}
        className={'vendor-nav-item group relative flex items-center gap-3 rounded-[12px] px-3 py-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B2D7BC] ' +
          (current?'vendor-nav-current':'vendor-nav-idle')}>
        <IconsaxIcon name={item.icon} size={19} variant={current?'bold':'linear'} color={current?'#D9F1DB':'#8BA99A'}/>
        {(expanded||mobile)&&<span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{item.name}</span>}
        {current&&(expanded||mobile)&&<span className="h-[6px] w-[6px] rounded-full bg-[#B7E3AC]"/>}
      </Link>;
    });
  }

  if(isLoading)return <div className="flex min-h-screen items-center justify-center bg-[#F6F8F4]">
    <div className="flex items-center gap-3 rounded-2xl border border-[#DEE8E0] bg-white px-5 py-4 text-sm font-semibold text-[#35624A] shadow-sm">
      <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[#DCECE0] border-t-[#32714B]"/>Preparing your workspace
    </div>
  </div>;

  return (
    <div className="vendor-workspace relative flex h-[100dvh] min-w-0 overflow-hidden bg-[#F6F8F4] text-[#20382E]">
      {/* Desktop — premium fixed navigation */}
      <aside aria-label="Vendor desktop navigation" className={'vendor-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-[#244A39] transition-[width] duration-200 md:flex '+(expanded?'w-[260px]':'w-[76px]')}>
        <Link href="/vendor/dashboard" className={'flex h-[83px] shrink-0 items-center gap-3 border-b border-white/10 '+(expanded?'px-5':'justify-center px-2')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8FBF3] shadow-[0_5px_18px_rgba(0,0,0,.16)]">
            <img src="/slbi-mark.svg" className="h-8 w-8 object-contain" alt="SLBI"/>
          </span>
          {expanded&&<div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-[.025em] text-[#F0F8ED]">SL BUSINESS INDEX</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.18em] text-[#9BBEAA]">Owner Growth Portal</p>
          </div>}
        </Link>
        {expanded&&<div className="mx-4 mt-5 rounded-[14px] border border-[#446B53] bg-[#234A37]/70 p-3.5">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8BD8A0] shadow-[0_0_9px_rgba(116,225,149,.45)]"/><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#B7DBC0]">Business command center</p></div>
          <p className="mt-2 text-[11px] leading-[1.6] text-[#D7E9D9]">Manage visibility, enquiries and growth from one workspace.</p>
        </div>}
        <nav aria-label="Vendor pages" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-5">
          <div>
            {expanded&&<p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#89AE99]">Workspace</p>}
            <div className="space-y-1">{items(primaryNav)}</div>
          </div>
          <div className="border-t border-[#325745] pt-4">
            {expanded&&<p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#89AE99]">Growth & tools</p>}
            <div className="space-y-1">{items(growthNav)}</div>
          </div>
          <div className="border-t border-[#325745] pt-4">
            {expanded&&<p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#89AE99]">Account</p>}
            <div className="space-y-1">{items(accountNav)}</div>
          </div>
        </nav>
        <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
          <button type="button" onClick={()=>setQuickOpen(true)} title="Quick actions (Ctrl+K)" className="flex min-h-10 w-full items-center gap-3 rounded-xl border border-[#587E63] bg-[#315C43] px-3 text-left text-[12px] font-bold text-[#E7F5E7] transition hover:bg-[#407153]">
            <IconsaxIcon name="flash" size={18} color="#C4DE9C"/>{expanded&&<><span className="flex-1">Quick actions</span><span className="text-[10px] font-medium text-[#A4C1A8]">⌘K</span></>}
          </button>
          <Link href="/" title="View public directory" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-[#AFC8B8] transition hover:bg-white/10 hover:text-white">
            <IconsaxIcon name="home" size={18} color="#AFC8B8"/>{expanded&&'Visit directory'}
          </Link>
          {expanded&&<div className="truncate rounded-xl border border-[#456B52] bg-[#1B3D2E] px-3 py-3">
            <p className="truncate text-[11px] font-bold text-white">{user?.email||'SLBI vendor'}</p>
            <p className="mt-1 text-[10px] text-[#9EC0A7]">Business owner workspace</p>
          </div>}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen&&<button type="button" aria-label="Close vendor navigation" onClick={()=>setDrawerOpen(false)} className="fixed inset-0 z-[60] bg-[#10251C]/70 backdrop-blur-[3px] md:hidden"/>}
      <aside aria-label="Vendor mobile navigation" className={'vendor-sidebar fixed inset-y-0 left-0 z-[70] flex w-[292px] flex-col shadow-2xl transition-transform duration-200 md:hidden '+(drawerOpen?'translate-x-0':'-translate-x-full')}>
        <div className="flex h-[75px] shrink-0 items-center gap-3 border-b border-white/10 px-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"><img src="/slbi-mark.svg" className="h-8 w-8" alt="SLBI"/></span>
          <div className="min-w-0 flex-1"><p className="text-xs font-black text-white">SL Business Index</p><p className="mt-1 text-[10px] text-[#ACCCB5]">Owner Growth Portal</p></div>
          <button type="button" aria-label="Close menu" onClick={()=>setDrawerOpen(false)} className="rounded-lg border border-white/15 p-2 text-white"><IconsaxIcon name="close-circle" size={20}/></button>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#A5C4AC]">Workspace</p>
          <div className="space-y-1">{items(primaryNav,true)}</div>
          <p className="border-t border-white/15 px-3 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#A5C4AC]">Growth & tools</p>
          <div className="space-y-1">{items(growthNav,true)}</div>
          <p className="border-t border-white/15 px-3 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#A5C4AC]">Account</p>
          <div className="space-y-1">{items(accountNav,true)}</div>
          <Link href="/" className="flex gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-[#B4CCBD]"><IconsaxIcon name="home" size={18}/> Visit directory</Link>
        </nav>
        <button type="button" onClick={()=>{setDrawerOpen(false);setQuickOpen(true)}} className="m-3 flex items-center gap-3 rounded-xl border border-[#587E63] bg-[#315C43] px-4 py-3 text-left text-xs font-bold text-white"><IconsaxIcon name="flash" size={18}/> Open quick actions</button>
      </aside>

      <div className={'flex min-w-0 flex-1 flex-col transition-[margin] duration-200 '+(expanded?'md:ml-[260px]':'md:ml-[76px]')}>
        {/* Application header */}
        <header className="sticky top-0 z-40 flex h-[75px] shrink-0 items-center gap-3 border-b border-[#E0E9DF] bg-[#FCFDFB]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={()=>setDrawerOpen(true)} aria-label="Open vendor menu" className="rounded-xl border border-[#E4EDE5] p-2.5 text-[#456B52] transition hover:bg-[#EDF6ED] md:hidden"><IconsaxIcon name="menu" size={20}/></button>
          <button type="button" onClick={()=>setExpanded(v=>!v)} aria-label={expanded?'Collapse sidebar':'Expand sidebar'} className="hidden rounded-xl border border-[#E2EAE2] bg-white p-2.5 text-[#587A62] transition hover:bg-[#F1F7F0] md:flex"><IconsaxIcon name="sidebar-left" size={20}/></button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[10px] font-bold uppercase tracking-[.13em] text-[#91A696] sm:block">Vendor Portal <span className="mx-1.5 text-[#CCD9CE]">/</span> Workspace</p>
            <p className="truncate text-[14px] font-extrabold tracking-tight text-[#213D2E] sm:mt-1">{pageTitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button type="button" onClick={()=>setQuickOpen(true)} title="Search tasks and tools (Ctrl+K)" className="hidden h-10 min-w-[178px] items-center gap-2.5 rounded-xl border border-[#DFE9E0] bg-[#F5F9F3] px-3 text-left text-[11px] font-medium text-[#869D89] transition hover:border-[#9FC9AC] hover:bg-white lg:flex">
              <IconsaxIcon name="search-normal" size={17}/><span className="flex-1">Search actions</span><span className="rounded border border-[#DEE9DF] bg-white px-1.5 py-0.5 text-[10px]">⌘K</span>
            </button>
            <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Open quick actions" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#275C40] px-3 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(27,94,60,.14)] transition hover:bg-[#1C5035] sm:px-4">
              <IconsaxIcon name="flash" size={16} color="white"/><span className="hidden sm:inline">Quick actions</span>
            </button>
            {user?.verification_status==='verified'&&<span className="hidden items-center gap-1 rounded-full border border-[#D8E8DB] bg-[#F0F7EF] px-2.5 py-1.5 text-[10px] font-bold text-[#33704C] xl:inline-flex"><VerifiedBadge size={13}/> Verified</span>}
            <NotificationBell/>
            <span className="hidden h-8 w-px bg-[#DFE7DF] sm:block"/>
            <AuthButton user={user}/>
          </div>
        </header>
        <main id="vendor-main" className="vendor-content min-h-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:p-7 md:pb-9 xl:p-8">
          {children}
        </main>
      </div>

      <nav aria-label="Mobile vendor quick navigation" className="fixed bottom-0 left-0 right-0 z-50 flex min-h-16 border-t border-[#E1E9E1] bg-[#FEFFFC]/95 shadow-[0_-6px_18px_rgba(30,57,39,.07)] backdrop-blur-lg md:hidden" style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
        {quickNav.map(item=>{
          const current=active(item.href);
          return <Link key={item.href} href={item.href} aria-current={current?'page':undefined} className={'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] font-bold '+(current?'text-[#256340]':'text-[#899E8C]')}>
            <span className={'flex h-7 w-9 items-center justify-center rounded-xl '+(current?'bg-[#E7F2E7]':'')}><IconsaxIcon name={item.icon} size={18} variant={current?'bold':'linear'}/></span>
            <span className="truncate">{item.name}</span>
          </Link>;
        })}
      </nav>
      <VendorQuickActions open={quickOpen} onClose={()=>setQuickOpen(false)}/>
    </div>
  );
}
