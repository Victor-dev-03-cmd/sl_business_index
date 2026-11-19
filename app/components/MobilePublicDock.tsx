'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';

/** Same five public routes and exact order as the desktop menu. */
export const mobilePublicTabs=[
  {href:'/',label:'Explore',icon:'home-2'},
  {href:'/category',label:'Categories',icon:'category-2'},
  {href:'/nearby',label:'Nearby',icon:'location'},
  {href:'/business-news',label:'Business News',icon:'note-2'},
  {href:'/about',label:'About',icon:'info-circle'},
] as const;

/**
 * Server-rendered viewport-fixed dock: visible on first paint, regardless
 * of scroll position, focus, React hydration or browser keyboard.
 *
 * CSS left/right insets and auto margins replace the translated left:50%
 * position that shifted/clipped the dock in mobile viewport screenshots.
 * Keeping the nav in the initial React tree (instead of a mount-time portal)
 * prevents a delayed appearance on low-end/mobile devices.
 */
export default function MobilePublicDock({role='nav'}:{role?:'nav'|'spacer'}){
  const pathname=usePathname();
  const excluded=['/login','/signup','/forgot-password','/reset-password',
    '/update-password','/auth','/admin','/vendor'];
  if(excluded.some(route=>pathname===route||pathname.startsWith(route+'/')))return null;

  // Footer clearance stays at the bottom of the document. Render the dock
  // early (immediately after Navbar) so SSR/streaming never delays it until
  // the entire homepage and footer have loaded.
  if(role==='spacer')return <div aria-hidden="true" className="h-[90px] sm:hidden"/>;

  return <nav
      aria-label="Mobile quick navigation"
      data-slbi-viewport-dock="true"
      style={{
        position:'fixed',
        left:'max(12px, env(safe-area-inset-left, 0px))',
        right:'max(12px, env(safe-area-inset-right, 0px))',
        bottom:'max(12px, env(safe-area-inset-bottom, 0px))',
        width:'auto',
        maxWidth:440,
        marginInline:'auto',
        boxSizing:'border-box',
      }}
      className="z-[80] grid h-[66px] grid-cols-5 items-center gap-0.5 overflow-hidden rounded-[20px] border border-white/30 bg-[#29453E]/95 px-1.5 text-[#E5F1E9] shadow-[0_12px_36px_rgba(7,31,23,.30)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#304D43]/85 sm:hidden">
      {mobilePublicTabs.map(tab=>{
        const active=tab.href==='/'?pathname==='/':
          tab.href==='/category'?pathname==='/category'||pathname.startsWith('/category/'):
          tab.href==='/business-news'?pathname==='/business-news'||pathname.startsWith('/business-news/'):
          pathname===tab.href;
        return <Link key={tab.href} href={tab.href} prefetch={false}
          aria-label={tab.label}
          aria-current={active?'page':undefined}
          title={tab.label}
          className={'relative flex h-[56px] w-full min-w-0 items-center justify-center rounded-[14px] outline-none transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-[#F0D19D] '+
            (active?'text-[#F1D39A]':'text-[#CEDCD2] hover:bg-white/10')}>
          <BrandIcon name={tab.icon} size={23}
            variant={active?'bulk':'linear'} className="shrink-0"/>
          {active&&<span aria-hidden="true"
            className="absolute bottom-[4px] h-[5px] w-[5px] rounded-full bg-[#F2D79F]"/>}
        </Link>;
      })}
    </nav>;
}
