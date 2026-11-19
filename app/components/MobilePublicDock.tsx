'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';

/** Same five public destinations and order as the real desktop menu. */
export const mobilePublicTabs=[
  {href:'/',label:'Explore',icon:'home-2'},
  {href:'/category',label:'Categories',icon:'category-2'},
  {href:'/nearby',label:'Nearby',icon:'location'},
  {href:'/business-news',label:'Business News',icon:'note-2'},
  {href:'/about',label:'About',icon:'info-circle'},
] as const;

/** Mobile-only bottom dock. Five equal-width grid cells, all icons exactly
 * centered; no "add" tab that can spill outside 320px viewports.
 * The center-relative fixed width is independent of body scrollbar/gutter. */
export default function MobilePublicDock(){
  const pathname=usePathname();
  const [typing,setTyping]=useState(false);
  useEffect(()=>{
    const isInput=()=>{
      const node=document.activeElement;
      return Boolean(node instanceof HTMLElement&&
        node.matches('input,textarea,select,[contenteditable="true"]'));
    };
    const onFocus=()=>setTyping(isInput());
    const onBlur=()=>window.requestAnimationFrame(()=>setTyping(isInput()));
    document.addEventListener('focusin',onFocus);
    document.addEventListener('focusout',onBlur);
    return()=>{
      document.removeEventListener('focusin',onFocus);
      document.removeEventListener('focusout',onBlur);
    };
  },[]);

  const excluded=['/login','/signup','/forgot-password','/reset-password',
    '/update-password','/auth','/admin','/vendor'];
  if(excluded.some(route=>pathname===route||pathname.startsWith(route+'/')))return null;

  return <>
    <div aria-hidden="true" className="h-[86px] sm:hidden"/>
    {!typing&&<nav aria-label="Mobile quick navigation"
      style={{left:'50%',width:'calc(100vw - 24px)',maxWidth:440,
        transform:'translateX(-50%)',boxSizing:'border-box'}}
      className="fixed bottom-[max(10px,env(safe-area-inset-bottom))] z-[80] grid h-[66px] grid-cols-5 items-center gap-0.5 overflow-hidden rounded-[20px] border border-white/30 bg-[#29453E]/90 px-1.5 text-[#E5F1E9] shadow-[0_12px_36px_rgba(7,31,23,.30)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#304D43]/80 sm:hidden">
      {mobilePublicTabs.map(tab=>{
        const active=tab.href==='/'?pathname==='/':
          tab.href==='/category'?pathname==='/category'||pathname.startsWith('/category/'):
          tab.href==='/business-news'?pathname==='/business-news'||pathname.startsWith('/business-news/'):
          pathname===tab.href;
        return <Link key={tab.href} href={tab.href} prefetch={false}
          aria-label={tab.label} aria-current={active?'page':undefined}
          title={tab.label}
          className={'relative flex h-[56px] w-full min-w-0 items-center justify-center rounded-[14px] outline-none transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-[#F0D19D] '+
            (active?'text-[#F1D39A]':'text-[#CEDCD2] hover:bg-white/10')}>
          <BrandIcon name={tab.icon} size={23}
            variant={active?'bulk':'linear'} className="shrink-0"/>
          {active&&<span aria-hidden="true"
            className="absolute bottom-[4px] h-[5px] w-[5px] rounded-full bg-[#F2D79F]"/>}
        </Link>;
      })}
    </nav>}
  </>;
}
