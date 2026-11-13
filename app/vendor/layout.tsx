'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import VerifiedBadge from '@/app/components/VerifiedBadge';
import { useUser } from '@/lib/hooks/useUser';
import IconsaxIcon from './components/IconsaxIcon';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import { CircleCheck, CircleAlert, Info } from 'lucide-react';
const VendorQuickActions = dynamic(() => import('./components/VendorQuickActions'), {
  ssr: false,
  loading: () => (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-start justify-center bg-[#111114]/55 px-4 pt-[min(12vh,110px)]">
      <div className="rounded-2xl border border-[#e7e7eb] bg-white px-6 py-5 text-sm font-semibold text-[#303035] shadow-[0_22px_55px_rgba(0,0,0,0.18)]">
        Opening quick actions…
      </div>
    </div>
  ),
});
import './vendor-workspace.css';

type NavItem = {name:string;href:string;icon:string};
const primaryNav:NavItem[]=[
  {name:'Overview',href:'/vendor/dashboard',icon:'category'},
  {name:'My Businesses',href:'/vendor/my-businesses',icon:'shop'},
  {name:'Enquiries',href:'/vendor/leads',icon:'message-text'},
  {name:'Reviews',href:'/vendor/reviews',icon:'star'},
  {name:'Growth Insights',href:'/vendor/insights',icon:'status-up'},
];
const growthNav:NavItem[]=[
  {name:'Growth OS',href:'/vendor/growth',icon:'chart'},
  {name:'Marketing Studio',href:'/vendor/marketing',icon:'flash'},
  {name:'Marketing Engine',href:'/vendor/marketing/engine',icon:'global'},
  {name:'QR Studio',href:'/vendor/qr-code',icon:'scan-barcode'},
];
const accountNav:NavItem[]=[
  {name:'Billing & Plans',href:'/vendor/billing',icon:'card'},
  {name:'Settings',href:'/vendor/settings',icon:'setting-2'},
];
const allItems=[...primaryNav,...growthNav,...accountNav];

export default function VendorLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const {data:user,isLoading}=useUser();
  const [quickOpen,setQuickOpen]=useState(false);
  const [openMenu,setOpenMenu]=useState<'tools'|'account'|null>(null);
  const dropdownsRef=useRef<HTMLDivElement>(null);
  const toolsButtonRef=useRef<HTMLButtonElement>(null);
  const accountButtonRef=useRef<HTMLButtonElement>(null);
  const active=(href:string)=>href==='/vendor/marketing'?pathname===href:pathname===href||pathname.startsWith(href+'/');
  const currentPage=allItems.find(item=>pathname===item.href)?.name
    ||[...allItems].sort((a,b)=>b.href.length-a.href.length).find(item=>pathname.startsWith(item.href+'/'))?.name
    ||'Business Workspace';

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        setQuickOpen(open=>!open);
      }
      if(event.key==='Escape'){
        if(openMenu){
          event.preventDefault();
          (openMenu==='tools'?toolsButtonRef:accountButtonRef).current?.focus();
          setOpenMenu(null);
        }
        setQuickOpen(false);
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[openMenu]);

  useEffect(()=>{
    if(!openMenu)return;
    const onPointerDown=(event:PointerEvent)=>{
      if(!dropdownsRef.current?.contains(event.target as Node))setOpenMenu(null);
    };
    document.addEventListener('pointerdown',onPointerDown);
    return()=>document.removeEventListener('pointerdown',onPointerDown);
  },[openMenu]);

  // A route transition closes an already-open palette; opening it must never close it.
  useEffect(()=>{setOpenMenu(null);setQuickOpen(false);},[pathname]);

  if(isLoading)return <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8]">
    <div role="status" className="flex items-center gap-3 rounded-lg border border-[#E7E7E9] bg-white px-5 py-4 text-sm font-semibold text-[#242529]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F5D7BB] border-t-[#FF7900]"/>Preparing your workspace
    </div>
  </div>;

  return <div className="vendor-workspace vendor-workspace-v6 flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-white text-[#202024]">
    <header className="vendor-topbar relative z-50 shrink-0 border-b border-[#efeff2] bg-white shadow-[0_3px_13px_rgba(28,28,34,0.055)]">
      <div className="mx-auto flex h-[76px] w-full max-w-[1840px] items-center gap-4 px-4 sm:px-6 xl:gap-6 xl:px-9">
        <Link href="/vendor/dashboard" aria-label="SL Business Index owner portal overview" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1B1B1D]">
            <img src="/slbi-mark.svg" alt="" className="h-8 w-8 object-contain"/>
          </span>
          <span className="hidden flex-col sm:flex">
            <span className="text-[13px] font-extrabold tracking-[-.035em] text-[#141416]">SL Business Index</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#99989D]">Owner Portal</span>
          </span>
        </Link>

        {/* Center the complete navigation group independently of the brand and right-side utilities. */}
        <div className="vendor-topbar-center absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 min-[1400px]:flex">
          <nav aria-label="Vendor primary navigation" className="vendor-topbar-primary flex min-w-0 items-center gap-1 rounded-[16px] border border-[#e8e8eb] bg-[#fafafb] p-1 shadow-[inset_2px_2px_5px_#ededf0,inset_-2px_-2px_5px_#ffffff]">
            {primaryNav.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}
              className={'vendor-topnav-link flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[11px] font-semibold transition-colors '+(active(item.href)?'bg-[#FF7900] text-white shadow-[0_4px_12px_rgba(255,121,0,0.19)]':'text-[#68686E] hover:bg-white hover:text-[#141416]')}>
              <IconsaxIcon name={item.icon} size={15} color={active(item.href)?'#18181A':'#86868B'}/>{item.name}
            </Link>)}
          </nav>
          <div ref={dropdownsRef} className="vendor-topbar-menu-group flex items-center gap-1 border-l border-[#E8E8EB] pl-2">
            <div className="vendor-topbar-dropdown relative">
              <button ref={toolsButtonRef} type="button" id="vendor-tools-trigger" aria-expanded={openMenu==='tools'} aria-controls="vendor-tools-menu"
                onClick={()=>setOpenMenu(open=>open==='tools'?null:'tools')}
                className="vendor-topbar-dropdown-trigger flex h-9 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-semibold text-[#505158] transition-colors hover:bg-[#F6F6F8]">
                Tools <IconsaxIcon name="arrow-down-2" size={13}/>
              </button>
              {openMenu==='tools'&&<nav id="vendor-tools-menu" aria-label="Growth and marketing tools" className="vendor-topbar-dropdown-panel absolute right-0 top-[44px] z-[70] grid w-[226px] gap-1 border border-[#E7E7EA] bg-white p-2">
                {growthNav.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpenMenu(null)}
                  className="vendor-topbar-dropdown-link flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold text-[#36373B] hover:bg-[#FFF3E8] hover:text-[#D46100]">
                  <IconsaxIcon name={item.icon} size={16}/>{item.name}
                </Link>)}
              </nav>}
            </div>
            <div className="vendor-topbar-dropdown relative">
              <button ref={accountButtonRef} type="button" id="vendor-account-trigger" aria-expanded={openMenu==='account'} aria-controls="vendor-account-menu"
                onClick={()=>setOpenMenu(open=>open==='account'?null:'account')}
                className="vendor-topbar-dropdown-trigger flex h-9 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-semibold text-[#505158] transition-colors hover:bg-[#F6F6F8]">
                Account <IconsaxIcon name="arrow-down-2" size={13}/>
              </button>
              {openMenu==='account'&&<nav id="vendor-account-menu" aria-label="Vendor account pages" className="vendor-topbar-dropdown-panel absolute right-0 top-[44px] z-[70] grid w-[214px] gap-1 border border-[#E7E7EA] bg-white p-2">
                {accountNav.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpenMenu(null)}
                  className="vendor-topbar-dropdown-link flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold text-[#36373B] hover:bg-[#FFF3E8] hover:text-[#D46100]">
                  <IconsaxIcon name={item.icon} size={16}/>{item.name}
                </Link>)}
                <Link href="/" onClick={()=>setOpenMenu(null)} className="mt-1 border-t border-[#ECECEF] px-3 py-3 text-[11px] font-medium text-[#66676C] hover:text-[#D46100]">Visit public directory</Link>
              </nav>}
            </div>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 ">
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Search actions and tools" title="Search actions (Ctrl+K)"
            className="hidden h-9 items-center gap-2 rounded-[8px] border border-[#ECECEF] bg-[#FAFAFB] px-3 text-[11px] font-medium text-[#8A8B92] hover:border-[#FFCB9B] hover:text-[#D46100] 2xl:inline-flex">
            <IconsaxIcon name="search-normal" size={17}/><span className="hidden min-[1800px]:inline">Search actions</span><span className="rounded border border-[#E9E9ED] bg-white px-1 py-0.5 text-[9px]">⌘K</span>
          </button>
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Open quick actions" title="Quick actions (Ctrl+K)"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1C1C1E] px-3 text-[11px] font-semibold text-white transition hover:bg-[#39393D]">
            <IconsaxIcon name="flash" size={16} color="#FF7900"/><span className="hidden 2xl:inline">Quick actions</span>
          </button>
          {user?.verification_status==='verified'&&<span className="hidden items-center gap-1 rounded-md border border-[#D6E8DA] bg-[#F0F8F2] px-2 py-1 text-[10px] font-semibold text-[#2B7B4D] 2xl:inline-flex"><VerifiedBadge size={13}/> Verified</span>}
          <NotificationBell/>
          <AuthButton user={user}/>
        </div>
      </div>

      {/* On narrower screens navigation remains at the top — horizontally scrollable, never a sidebar. */}
      <nav aria-label="Vendor compact navigation" className="vendor-topbar-scrollbar flex h-[49px] w-full items-center gap-1 overflow-x-auto border-t border-[#F1F1F2] px-4 sm:px-6 min-[1400px]:hidden">
        {allItems.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}
          className={'flex h-9 shrink-0 items-center gap-1.5 rounded-[7px] px-3 text-[11px] font-semibold transition '+(active(item.href)?'bg-[#FF7900] text-[#18181A]':'text-[#73737A] hover:bg-[#FFF3E8] hover:text-[#B45300]')}>
          <IconsaxIcon name={item.icon} size={15} color={active(item.href)?'#18181A':'#888990'}/>{item.name}
        </Link>)}
        <Link href="/" className="ml-1 shrink-0 border-l border-[#E9E9EB] px-3 py-2 text-[11px] font-medium text-[#73737A]">Visit directory</Link>
      </nav>
    </header>
    <main id="vendor-main" aria-label={currentPage+' workspace'} className="vendor-content min-h-0 flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-6 sm:py-8 xl:px-9 xl:py-9">
      <div className="mx-auto w-full max-w-[1760px]">{children}</div>
    </main>
    {/* Dedicated toast layer for vendor actions; public-site notifications keep their own toaster. */}
    <Toaster
      id="vendor-portal"
      position="top-right"
      offset={90}
      duration={4500}
      visibleToasts={3}
      closeButton
      icons={{
        success: <CircleCheck size={19} className="text-[#f57807]" aria-hidden="true"/>,
        error: <CircleAlert size={19} className="text-[#db3545]" aria-hidden="true"/>,
        info: <Info size={19} className="text-[#f57807]" aria-hidden="true"/>,
      }}
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#202024',
          border: '1px solid #e8e8ec',
          borderLeft: '3px solid #FF7900',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 16px 38px rgba(30, 30, 34, .14)',
        },
        classNames: {
          title: '!text-[13px] !font-bold !text-[#202024]',
          description: '!text-[12px] !leading-5 !text-[#686872]',
        },
      }}
    />
    {quickOpen&&<VendorQuickActions open={quickOpen} onClose={()=>setQuickOpen(false)}/>}
  </div>;
}
