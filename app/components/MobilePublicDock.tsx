'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';

const tabs=[
  {href:'/',label:'Home',icon:'home-2'},
  {href:'/search',label:'Search',icon:'search-normal'},
  {href:'/saved',label:'Saved businesses',icon:'bookmark-2'},
  {href:'/notifications',label:'Notifications',icon:'notification'},
  {href:'/register-business',label:'List a business',icon:'add-square'},
] as const;

/** Public mobile-only navigation. No dead icon actions, no duplicate vendor
 * navbar and no bookmark/database schema changes. */
export default function MobilePublicDock(){
  const pathname=usePathname();
  const [typing,setTyping]=useState(false);
  useEffect(()=>{
    const onFocus=(event:FocusEvent)=>{
      const node=event.target as HTMLElement|null;
      setTyping(Boolean(node&&
        (node.matches('input,textarea,select,[contenteditable="true"]'))));
    };
    const onBlur=()=>setTyping(false);
    document.addEventListener('focusin',onFocus);
    document.addEventListener('focusout',onBlur);
    return()=>{document.removeEventListener('focusin',onFocus);document.removeEventListener('focusout',onBlur);};
  },[]);
  const excluded=['/login','/signup','/forgot-password','/reset-password',
    '/update-password','/auth','/admin','/vendor'];
  if(excluded.some(route=>pathname===route||pathname.startsWith(route+'/')))return null;
  return <>
    <div aria-hidden="true" className="h-[90px] md:hidden"/>
    {!typing&&<nav aria-label="Mobile quick navigation"
      className="slbi-mobile-dock fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-[80] mx-auto flex h-[66px] max-w-[460px] items-center justify-around rounded-[22px] border border-white/30 bg-[#29453E]/90 px-2 text-[#E5F1E9] shadow-[0_12px_36px_rgba(7,31,23,.30)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#304D43]/80 md:hidden">
      {tabs.map(tab=>{
        const active=tab.href==='/'?pathname==='/':
          tab.href==='/search'?(pathname==='/search'||pathname==='/nearby'):
          pathname===tab.href;
        return <Link key={tab.href} href={tab.href} prefetch={false}
          aria-label={tab.label} aria-current={active?'page':undefined}
          className={'relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#F0D19D] '+
            (active?'text-[#F1D39A]':'text-[#CEDCD2] hover:bg-white/10')}>
          <span className={tab.href==='/register-business'?
            'flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F5DBA9] to-[#CAA16B] text-[#1D4235] shadow-[0_3px_12px_rgba(0,0,0,.16)]':
            'inline-flex size-[26px] items-center justify-center'}>
            <BrandIcon name={tab.icon} size={tab.href==='/register-business'?21:24}
              variant={active?'bold':'linear'}/>
          </span>
          {active&&<span aria-hidden="true" className="absolute bottom-[3px] size-[5px] rounded-full bg-[#F2D79F]"/>}
          <span className="sr-only">{tab.label}</span>
        </Link>;
      })}
    </nav>}
  </>;
}
