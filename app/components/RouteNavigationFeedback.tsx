"use client";

import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";

/**
 * Lightweight, global feedback for internal link navigation.
 * Does NOT block or override Next.js routing, push history, or start fetches.
 * Works for ordinary Links in the navbar, mobile dock and business cards.
 */
export default function RouteNavigationFeedback(){
  const pathname=usePathname();
  const [opening,setOpening]=useState(false);

  // Next.js committed a new route; hand off to the destination page.
  useEffect(()=>{setOpening(false);},[pathname]);

  useEffect(()=>{
    let timeout:number|undefined;
    const clear=()=>{
      window.clearTimeout(timeout);
      setOpening(false);
    };
    const handleClick=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||
         event.altKey||event.shiftKey)return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const link=target.closest('a[href]');
      if(!link||link.hasAttribute('download')||link.getAttribute('target')==='_blank'||
         link.getAttribute('aria-disabled')==='true')return;
      const raw=link.getAttribute('href');
      if(!raw||raw.startsWith('#'))return;
      let url:URL;
      try{url=new URL(link.href,window.location.href);}catch{return;}
      if(url.origin!==window.location.origin||
        (url.pathname===window.location.pathname&&url.search===window.location.search))return;
      setOpening(true);
      window.clearTimeout(timeout);
      // Network failures must never leave a permanently blocked screen.
      timeout=window.setTimeout(clear,9000);
    };
    document.addEventListener('click',handleClick,true);
    window.addEventListener('pagehide',clear);
    return()=>{
      document.removeEventListener('click',handleClick,true);
      window.removeEventListener('pagehide',clear);
      window.clearTimeout(timeout);
    };
  },[]);

  if(!opening)return null;
  return <div data-slbi-route-feedback="true" role="status" aria-live="polite"
    className="pointer-events-none fixed inset-x-0 top-0 z-[1900]">
    <div aria-hidden="true" className="h-[3px] w-full bg-[#E67520] motion-safe:animate-pulse"/>
    <span className="absolute right-3 top-3 rounded-full border border-[#EED4B9] bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[#A44C0F] shadow-sm">
      Opening page…
    </span>
  </div>;
}
