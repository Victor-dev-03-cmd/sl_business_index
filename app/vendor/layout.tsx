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
  const active=(href:string)=>pathname===href||pathname.startsWith(href+'/');
  const currentPage=allItems.find(item=>active(item.href))?.name||'Business Workspace';

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        setQuickOpen(open=>!open);
      }
      if(event.key==='Escape')setQuickOpen(false);
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[]);

  if(isLoading)return <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8]">
    <div role="status" className="flex items-center gap-3 rounded-lg border border-[#E7E7E9] bg-white px-5 py-4 text-sm font-semibold text-[#242529]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F5D7BB] border-t-[#FF7900]"/>Preparing your workspace
    </div>
  </div>;

  return <div className="vendor-workspace vendor-workspace-v6 flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-[#F7F7F8] text-[#202124]">
    <header className="vendor-topbar relative z-50 shrink-0 border-b border-[#E8E8EB] bg-white">
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

        <nav aria-label="Vendor primary navigation" className="vendor-topbar-primary ml-auto hidden min-w-0 items-center gap-1 rounded-[12px] border border-[#F0EFF1] bg-[#F8F8F9] p-1 xl:flex">
          {primaryNav.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}
            className={'vendor-topnav-link flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-semibold transition-colors '+(active(item.href)?'bg-[#FF7900] text-white shadow-[0_4px_10px_rgba(255,121,0,.16)]':'text-[#68686E] hover:bg-white hover:text-[#141416]')}>
            <IconsaxIcon name={item.icon} size={15} color={active(item.href)?'#FFFFFF':'#86868B'}/>{item.name}
          </Link>)}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
          <details key={'tools-'+pathname} className="vendor-topbar-dropdown group relative hidden xl:block">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-semibold text-[#505158] hover:bg-[#F6F6F8]">
              Tools <IconsaxIcon name="arrow-down-1" size={13}/>
            </summary>
            <nav aria-label="Growth and marketing tools" className="absolute right-0 top-[44px] z-[70] grid w-[234px] gap-1 rounded-xl border border-[#E7E7EA] bg-white p-2 shadow-[0_18px_44px_rgba(17,17,20,.14)]">
              {growthNav.map(item=><Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12px] font-semibold text-[#36373B] hover:bg-[#FFF3E8] hover:text-[#D46100]">
                <IconsaxIcon name={item.icon} size={16}/>{item.name}
              </Link>)}
            </nav>
          </details>
          <details key={'account-'+pathname} className="vendor-topbar-dropdown group relative hidden xl:block">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-semibold text-[#505158] hover:bg-[#F6F6F8]">
              Account <IconsaxIcon name="arrow-down-1" size={13}/>
            </summary>
            <nav aria-label="Vendor account pages" className="absolute right-0 top-[44px] z-[70] grid w-[218px] gap-1 rounded-xl border border-[#E7E7EA] bg-white p-2 shadow-[0_18px_44px_rgba(17,17,20,.14)]">
              {accountNav.map(item=><Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12px] font-semibold text-[#36373B] hover:bg-[#FFF3E8] hover:text-[#D46100]">
                <IconsaxIcon name={item.icon} size={16}/>{item.name}
              </Link>)}
              <Link href="/" className="mt-1 border-t border-[#ECECEF] px-3 py-3 text-[11px] font-medium text-[#66676C] hover:text-[#D46100]">Visit public directory</Link>
            </nav>
          </details>
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Search actions and tools" title="Search actions (Ctrl+K)"
            className="hidden h-9 items-center gap-2 rounded-[8px] border border-[#ECECEF] bg-[#FAFAFB] px-3 text-[11px] font-medium text-[#8A8B92] hover:border-[#FFCB9B] hover:text-[#D46100] lg:inline-flex">
            <IconsaxIcon name="search-normal" size={17}/><span className="hidden 2xl:inline">Search actions</span><span className="rounded border border-[#E9E9ED] bg-white px-1 py-0.5 text-[9px]">⌘K</span>
          </button>
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Open quick actions" title="Quick actions (Ctrl+K)"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1C1C1E] px-3 text-[11px] font-semibold text-white transition hover:bg-[#39393D]">
            <IconsaxIcon name="flash" size={16} color="#FF7900"/><span className="hidden md:inline">Quick actions</span>
          </button>
          {user?.verification_status==='verified'&&<span className="hidden items-center gap-1 rounded-md border border-[#D6E8DA] bg-[#F0F8F2] px-2 py-1 text-[10px] font-semibold text-[#2B7B4D] 2xl:inline-flex"><VerifiedBadge size={13}/> Verified</span>}
          <NotificationBell/>
          <AuthButton user={user}/>
        </div>
      </div>

      {/* On narrower screens navigation remains at the top — horizontally scrollable, never a sidebar. */}
      <nav aria-label="Vendor compact navigation" className="vendor-topbar-scrollbar flex h-[49px] w-full items-center gap-1 overflow-x-auto border-t border-[#F1F1F2] px-4 sm:px-6 xl:hidden">
        {allItems.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}
          className={'flex h-9 shrink-0 items-center gap-1.5 rounded-[7px] px-3 text-[11px] font-semibold transition '+(active(item.href)?'bg-[#FF7900] text-white':'text-[#73737A] hover:bg-[#FFF3E8] hover:text-[#B45300]')}>
          <IconsaxIcon name={item.icon} size={15} color={active(item.href)?'#FFFFFF':'#888990'}/>{item.name}
        </Link>)}
        <Link href="/" className="ml-1 shrink-0 border-l border-[#E9E9EB] px-3 py-2 text-[11px] font-medium text-[#73737A]">Visit directory</Link>
      </nav>
    </header>
    <main id="vendor-main" aria-label={currentPage+' workspace'} className="vendor-content min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] px-4 py-5 sm:px-6 sm:py-7 xl:px-9 xl:py-8">
      <div className="mx-auto w-full max-w-[1760px]">{children}</div>
    </main>
    <VendorQuickActions open={quickOpen} onClose={()=>setQuickOpen(false)}/>
  </div>;
}
