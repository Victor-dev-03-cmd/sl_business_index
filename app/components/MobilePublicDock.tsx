'use client';

import {useLayoutEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';

/** Exactly the five public destinations in the desktop menu order. */
export const mobilePublicTabs=[
  {href:'/',label:'Explore',icon:'home-2'},
  {href:'/category',label:'Categories',icon:'category-2'},
  {href:'/nearby',label:'Nearby',icon:'location'},
  {href:'/business-news',label:'Business News',icon:'note-2'},
  {href:'/about',label:'About',icon:'info-circle'},
] as const;

/**
 * Mobile viewport dock:
 *
 * Render the nav into document.body, completely outside site wrappers whose
 * stacking contexts, overflow, transformations, and streaming updates can
 * change the containing block of a normal position:fixed descendant.
 *
 * Use an EXPLICIT viewport-width-constrained size with left/right:0 and
 * auto margins rather than width:auto or a transform for centering.
 *
 * The dock is never gated on scrolling, input focus, media queries in JS,
 * page data or current scroll position. Mount during the first hydration
 * layout pass and leave it in place through scrolls and route changes.
 */
export default function MobilePublicDock({role='nav'}:{role?:'nav'|'spacer'}){
  const pathname=usePathname();
  const [portalRoot,setPortalRoot]=useState<HTMLElement|null>(null);

  useLayoutEffect(()=>{
    if(role==='nav')setPortalRoot(document.body);
  },[role]);

  // Nearby is a focused explorer with its own Map / Listings / Filters
  // mobile navigator. Never stack the global five-tab bar above that navigator.
  const excluded=['/login','/signup','/forgot-password','/reset-password',
    '/update-password','/auth','/admin','/vendor','/nearby'];
  if(excluded.some(route=>pathname===route||pathname.startsWith(route+'/')))return null;

  // The end-of-document spacer stays inside the page, NOT inside the portal.
  if(role==='spacer')return <div aria-hidden="true" className="h-[94px] sm:hidden"/>;

  if(!portalRoot)return null;

  return createPortal(
    <nav
      aria-label="Mobile quick navigation"
      data-slbi-viewport-dock="true"
      style={{
        position:'fixed',
        left:0,
        right:0,
        bottom:'max(12px, env(safe-area-inset-bottom, 0px))',
        width:'min(420px, calc(100vw - 24px))',
        maxWidth:420,
        marginInline:'auto',
        boxSizing:'border-box',
        transform:'none',
      }}
      className="z-[1200] grid h-[66px] grid-cols-5 items-center gap-0.5 overflow-hidden rounded-[20px] border border-white/30 bg-[#29453E]/95 px-1.5 text-[#E5F1E9] shadow-[0_12px_36px_rgba(7,31,23,.30)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#304D43]/85 sm:hidden">
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
    </nav>,
    portalRoot
  );
}
