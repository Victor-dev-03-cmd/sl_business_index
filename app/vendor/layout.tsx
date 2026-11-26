'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import dynamic from 'next/dynamic';
import {Toaster} from 'sonner';
import {MARKETING_STUDIO_APPS} from '@/lib/marketing/studio-apps';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import {useUser} from '@/lib/hooks/useUser';
import IconsaxIcon from './components/IconsaxIcon';
import VendorBootSkeleton from './components/VendorBootSkeleton';
import './vendor-workspace.css';

const VendorQuickActions=dynamic(()=>import('./components/VendorQuickActions'),{
  ssr:false,
  loading:()=> <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-start justify-center bg-[#111114]/55 px-4 pt-24">
    <span className="rounded-xl bg-white px-6 py-4 text-xs text-[#303035] shadow-xl">Opening quick actions…</span>
  </div>,
});

type NavItem={name:string;href:string;icon:string};
const mainNav:NavItem[]=[
  {name:'Overview',href:'/vendor/dashboard',icon:'category'},
  {name:'SEO Engine',href:'/vendor/seo',icon:'global'},
  {name:'My Businesses',href:'/vendor/my-businesses',icon:'shop'},
];
const workspaceNav:NavItem[]=[
  {name:'Gallery & Services',href:'/vendor/gallery-services',icon:'image'},
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
const allItems=[...mainNav,...workspaceNav,...growthNav,...accountNav];

export default function VendorLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const {data:user,isLoading}=useUser();
  const [quickOpen,setQuickOpen]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [marketingExpanded,setMarketingExpanded]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const mobileFirst=useRef<HTMLAnchorElement>(null);

  const active=(href:string)=>href==='/vendor/marketing'
    ?pathname===href||pathname.startsWith('/vendor/marketing/')||pathname.startsWith('/vendor/marketing-engine/')
    :pathname===href||pathname.startsWith(href+'/');
  const currentPage=[...allItems].sort((a,b)=>b.href.length-a.href.length)
    .find(item=>active(item.href))?.name||'Business Workspace';

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setQuickOpen(open=>!open);
      }
      if(event.key==='Escape'){setQuickOpen(false);setMobileOpen(false);setMarketingExpanded(false)}
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[]);
  useEffect(()=>{setQuickOpen(false);setMobileOpen(false)},[pathname]);
  useEffect(()=>{
    if(pathname==='/vendor/marketing'||pathname.startsWith('/vendor/marketing/')||pathname.startsWith('/vendor/marketing-engine/')){
      setMarketingExpanded(true);
    }
  },[pathname]);
  useEffect(()=>{
    if(!mobileOpen)return;
    mobileFirst.current?.focus();
    // A mobile drawer is a modal navigation surface. Contain tab focus.
    const onTab=(event:KeyboardEvent)=>{
      if(event.key!=='Tab')return;
      const panel=document.getElementById('vendor-mobile-drawer');
      if(!panel)return;
      const focusables=Array.from(panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',onTab);
    return()=>document.removeEventListener('keydown',onTab);
  },[mobileOpen]);

  if(isLoading)return <VendorBootSkeleton/>;

  const navLink=(item:NavItem,compact=false,mobile=false)=><Link
    key={item.href}
    ref={mobile&&item.href==='/vendor/dashboard'?mobileFirst:undefined}
    href={item.href}
    onClick={()=>mobile&&setMobileOpen(false)}
    title={compact?item.name:undefined}
    aria-label={compact?item.name:undefined}
    aria-current={active(item.href)?'page':undefined}
    data-testid={item.href==='/vendor/gallery-services'?(mobile?'gallery-compact-nav':'gallery-top-nav'):undefined}
    className={'flex items-center gap-2 rounded-lg px-1.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(mobile?'min-h-11 ':'min-h-[36px] ')+(compact?'justify-center ':'')+
      (active(item.href)?'bg-[#FFF0E5] text-[#AD4D00]':'text-[#62626B] hover:bg-[#F4F4F6] hover:text-[#202024]')}>
    <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] '+(active(item.href)?'bg-[#FFE1CA]':'bg-[#F2F2F5]')}>
      <IconsaxIcon name={item.icon} size={mobile?19:18} variant="bulk" color={active(item.href)?'#DD670C':'#777780'}/>
    </span>
    {!compact&&<span className="min-w-0 flex-1 truncate">{item.name}</span>}
  </Link>;

  // The same source of truth powers the app store and the navigation menu.
  // Links lead to real routes; destination layouts continue to enforce plan/owner access.
  const marketingNav=(compact=false,mobile=false)=>{
    const selected=active('/vendor/marketing');
    const expanded=marketingExpanded&&!compact;
    const panelId=mobile?'vendor-marketing-apps-mobile':'vendor-marketing-apps-desktop';
    return <div key="marketing-studio-nav" className="space-y-0.5">
      <button type="button"
        aria-label={compact?'Expand Marketing Studio apps':'Marketing Studio apps'}
        aria-expanded={expanded} aria-controls={compact?undefined:panelId}
        title={compact?'Marketing Studio — 12 apps':undefined}
        onClick={()=>{if(compact){setSidebarCollapsed(false);setMarketingExpanded(true)}else setMarketingExpanded(open=>!open)}}
        className={'flex w-full items-center gap-2 rounded-lg px-1.5 text-left text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(mobile?'min-h-11 ':'min-h-[36px] ')+(compact?'justify-center ':'')+
          (selected?'bg-[#FFF0E5] text-[#AD4D00]':'text-[#62626B] hover:bg-[#F4F4F6] hover:text-[#202024]')}>
        <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] '+(selected?'bg-[#FFE1CA]':'bg-[#F2F2F5]')}>
          <IconsaxIcon name="flash" size={mobile?19:18} variant="bulk" color={selected?'#DD670C':'#777780'}/>
        </span>
        {!compact&&<>
          <span className="min-w-0 flex-1 truncate">Marketing Studio</span>
          <span aria-label="12 apps" className="rounded-md bg-[#FFF2E9] px-1.5 py-0.5 text-[10px] tabular-nums text-[#BD6220]">{MARKETING_STUDIO_APPS.length}</span>
          <IconsaxIcon name={expanded?'arrow-up-2':'arrow-down-2'} size={14} color="#A0785F"/>
        </>}
      </button>
      {expanded&&<div id={panelId} data-testid={mobile?'vendor-marketing-apps-mobile':'vendor-marketing-apps-desktop'}
        className="ml-3 space-y-0.5 border-l border-[#F4CEAF] pl-2.5">
        <Link href="/vendor/marketing" onClick={()=>mobile&&setMobileOpen(false)}
          aria-current={pathname==='/vendor/marketing'?'page':undefined}
          className={'mb-1 flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(mobile?'min-h-11 ':'')+(pathname==='/vendor/marketing'?'bg-[#FFF0E5] text-[#A94C00]':'text-[#AE5A20] hover:bg-[#FFF5ED]')}>
          <IconsaxIcon name="category" size={16} variant="bulk"/> All 12 apps
        </Link>
        {MARKETING_STUDIO_APPS.map(app=><Link key={app.id} href={app.href} prefetch={false}
          aria-current={pathname===app.href?'page':undefined}
          onClick={()=>mobile&&setMobileOpen(false)}
          title={app.title}
          className={'flex items-center gap-2 rounded-lg px-2 text-[10.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(mobile?'min-h-11 ':'min-h-[34px] ')+
            (pathname===app.href?'bg-[#FFF0E5] text-[#A94C00]':'text-[#727079] hover:bg-[#F5F4F7] hover:text-[#252329]')}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[#FFF1E7] text-[#D56A18]">
            <IconsaxIcon name={app.icon} size={16} variant="bulk"/>
          </span>
          <span className="min-w-0 flex-1 truncate">{app.title}</span>
        </Link>)}
      </div>}
    </div>;
  };
  const sideSections=(compact=false,mobile=false)=>[
    {title:'Workspace',items:[...mainNav,...workspaceNav]},
    {title:'Growth tools',items:growthNav},
    {title:'Account',items:accountNav},
  ].map(section=><section key={section.title} className={mobile?'space-y-1':'space-y-0.5'}>
    {!compact&&<p className="px-2 pb-0.5 pt-2 text-[9px] font-medium uppercase tracking-[.12em] text-[#9A99A2]">{section.title}</p>}
    {compact&&<div className="my-1.5 h-px bg-[#ECECEF]"/>}
    {section.items.map(item=>item.href==='/vendor/marketing'?marketingNav(compact,mobile):navLink(item,compact,mobile))}
  </section>);

  return <div className="vendor-workspace vendor-workspace-v6 flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-white text-[#202024]">
    <header className="vendor-topbar relative z-50 shrink-0 border-b border-[#ECECF0] bg-white">
      <div className="mx-auto flex h-[64px] w-full min-w-0 max-w-[1920px] items-center gap-3 px-3 sm:h-[72px] sm:px-5 lg:gap-5 lg:px-7">
        <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen}
          aria-controls="vendor-mobile-drawer" onClick={()=>setMobileOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ECECF0] text-[#34343A] lg:hidden">
          <IconsaxIcon name="menu" variant="bulk" size={21}/>
        </button>
        <Link href="/vendor/dashboard" aria-label="SL Business Index owner portal overview" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#19191B]"><img src="/slbi-mark.svg" alt="" className="h-8 w-8"/></span>
          <span className="hidden flex-col sm:flex">
            <span className="text-[12px] font-semibold tracking-tight text-[#171719]">SL Business Index</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[.13em] text-[#96969B]">Owner portal</span>
          </span>
        </Link>
        {/* Real flex sizing, never absolute centered nav: no collision at 1024–1920px. */}
        <nav aria-label="Vendor primary navigation" className="ml-4 hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {mainNav.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}
            className={'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[12px] font-medium transition-colors '+(active(item.href)?'bg-[#FFF0E5] text-[#A94C00]':'text-[#67676F] hover:bg-[#F7F7F9] hover:text-[#202024]')}>
            <IconsaxIcon name={item.icon} size={18} variant="bulk"/>{item.name}
          </Link>)}
        </nav>
        <span aria-label="Current vendor page" className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#686871] lg:hidden">{currentPage}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Search actions and tools" title="Search actions (Ctrl+K)"
            className="hidden h-10 items-center gap-2 rounded-xl border border-[#ECECF0] px-3 text-[11px] font-medium text-[#67676D] xl:inline-flex">
            <IconsaxIcon name="search-normal" size={16}/> Search actions
          </button>
          <button type="button" onClick={()=>setQuickOpen(true)} aria-label="Open quick actions"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E1E21] text-white sm:w-auto sm:gap-2 sm:px-3">
            <IconsaxIcon name="flash" size={17} color="#FF7900"/><span className="hidden text-[11px] font-medium sm:inline">Quick actions</span>
          </button>
          <NotificationBell/>
          <AuthButton user={user}/>
        </div>
      </div>
    </header>

    <div className="relative flex min-h-0 min-w-0 flex-1">
      <aside aria-label="Vendor sidebar navigation" data-slbi-ui="vendor-sidebar"
        className={'hidden shrink-0 flex-col border-r border-[#EDEDF1] bg-[#FCFCFD] transition-[width] duration-150 lg:flex '+(sidebarCollapsed?'w-[70px]':'w-[226px]')}>
        <div className={'flex h-12 shrink-0 items-center border-b border-[#EFEFF1] px-2 '+(sidebarCollapsed?'justify-center':'justify-between')}>
          {!sidebarCollapsed&&<span className="px-2 text-[11px] font-medium text-[#787881]">Workspace menu</span>}
          <button type="button" aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setSidebarCollapsed(v=>!v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#696973] hover:bg-[#F0F0F3]">
            <IconsaxIcon name={sidebarCollapsed?'arrow-right-2':'arrow-left-2'} variant="bulk" size={18}/>
          </button>
        </div>
        <nav aria-label="Vendor workspace and tools" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 pt-1">
          {sideSections(sidebarCollapsed)}
          {!sidebarCollapsed&&<Link href="/" className="mt-2 block border-t border-[#ECECF0] px-2 py-2 text-[11px] font-medium text-[#777780] hover:text-[#BB5B05]">Visit public directory</Link>}
        </nav>
      </aside>

      {mobileOpen&&<div className="absolute inset-0 z-40 bg-[#17171B]/55 lg:hidden" role="presentation"
        onMouseDown={e=>{if(e.target===e.currentTarget)setMobileOpen(false)}}>
        <aside id="vendor-mobile-drawer" role="dialog" aria-modal="true" aria-label="Vendor mobile navigation"
          className="flex h-full w-[min(300px,88vw)] flex-col border-r border-[#E8E8ED] bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between border-b border-[#ECECF0] px-5">
            <span className="text-sm font-medium text-[#232326]">Business workspace</span>
            <button type="button" onClick={()=>setMobileOpen(false)} aria-label="Close navigation" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#F4F4F6]"><IconsaxIcon name="close-circle" variant="bulk" size={21}/></button>
          </div>
          <nav aria-label="Vendor compact navigation" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">{sideSections(false,true)}</nav>
        </aside>
      </div>}

      <main id="vendor-main" aria-label={currentPage+' workspace'} className="vendor-content min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto bg-white px-3 py-5 sm:px-6 sm:py-7 xl:px-8">
        <div className="mx-auto w-full max-w-[1640px]">{children}</div>
      </main>
    </div>
    <Toaster id="vendor-portal" position="top-right" offset={90} duration={4300} visibleToasts={2} closeButton
      icons={{success:<IconsaxIcon name="tick-circle" variant="bulk" size={18} color="#F57807"/>,error:<IconsaxIcon name="close-circle" variant="bulk" size={18} color="#DB3545"/>,info:<IconsaxIcon name="info-circle" variant="bulk" size={18} color="#F57807"/>}}
      toastOptions={{style:{background:'#fff',color:'#202024',border:'1px solid #e8e8ec',borderLeft:'3px solid #FF7900',borderRadius:'12px',padding:'10px 12px',maxWidth: 'min(340px, calc(100vw - 24px))'}}}
    />
    {quickOpen&&<VendorQuickActions open={quickOpen} onClose={()=>setQuickOpen(false)}/>}
  </div>;
}
