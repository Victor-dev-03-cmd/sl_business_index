'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,LockKeyhole,PlugZap,X} from 'lucide-react';
import {MARKETING_CONNECTORS,type MarketingConnector} from '@/lib/marketing/engine-registry';

const labels:Record<MarketingConnector['group'],string>={
 social:'Social',messages:'Messaging',email:'Email',voice:'Calls',
};

/**
 * Simple connection-first catalogue. A tile opens ONLY its own setup information.
 * No fake OAuth, browser token storage, test-number impersonation or AI prompt.
 */
export default function ConnectorGrid({googleReady,googleConnected,gmailPreview}:{
 googleReady:boolean;googleConnected:boolean;gmailPreview:ReactNode;
}){
 const [selected,setSelected]=useState<MarketingConnector['id']|null>(null);
 const detailRef=useRef<HTMLDivElement>(null);
 const current=MARKETING_CONNECTORS.find(item=>item.id===selected);
 useEffect(()=>{
  if(!selected)return;
  const id=requestAnimationFrame(()=>detailRef.current?.scrollIntoView({
   behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start',
  }));
  return()=>cancelAnimationFrame(id);
 },[selected]);
 return <section aria-label="Connect business apps" className="space-y-5">
  <div className="flex items-center gap-3">
   <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E3] text-[#C6600E]"><PlugZap size={21}/></span>
   <div>
    <h2 className="text-lg font-extrabold text-[#232327]">Choose an app to connect</h2>
    <p className="mt-1 text-xs leading-5 text-[#777781]">Select an app. See what you need. Authorize when the official connection is available.</p>
   </div>
  </div>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
   {MARKETING_CONNECTORS.map(item=>{
    const linked=item.id==='gmail'&&googleReady&&googleConnected;
    const itemClasses='group flex min-h-[155px] min-w-0 flex-col items-start rounded-2xl border border-[#E7E7EA] bg-white p-4 text-left shadow-[0_4px_14px_rgba(18,18,23,.035)] transition hover:border-[#FFB878] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900]';
    const inner=<>
     <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#C26011]"><PlugZap size={20}/></span>
     <span className="mt-3 break-words text-[13px] font-extrabold text-[#242429]">{item.name}</span>
     <span className="mt-1 text-[10px] text-[#929199]">{labels[item.group]}</span>
     <span className="mt-auto flex w-full items-center justify-between gap-2 pt-3 text-[11px] font-bold text-[#AB5716]">
      {linked?'Preview linked':'Set up'}<ArrowRight size={15}/>
     </span>
    </>;
    if(item.id==='whatsapp_business')return <Link key={item.id} href="/vendor/marketing/whatsapp" prefetch={false}
     className={itemClasses} aria-label="Set up WhatsApp Business">{inner}</Link>;
    return <button key={item.id} type="button" className={itemClasses} aria-pressed={selected===item.id}
     onClick={()=>setSelected(item.id)}>{inner}</button>;
   })}
  </div>
  {current&&<div ref={detailRef} id="connector-setup" tabIndex={-1}
   className="scroll-mt-24 rounded-2xl border border-[#EAE7E3] bg-[#FCFCFD] p-5 outline-none sm:p-7">
   <div className="flex items-start justify-between gap-3">
    <div>
     <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#AB5B21]">Connect app</p>
     <h3 className="mt-1 text-xl font-extrabold text-[#242428]">{current.name}</h3>
     <p className="mt-2 text-xs text-[#777781]">Not connected to production</p>
    </div>
    <button type="button" aria-label="Close setup" onClick={()=>setSelected(null)}
     className="rounded-lg border border-[#E7E7EA] bg-white p-2 text-[#5E5D62] hover:bg-[#FFF5EC]"><X size={17}/></button>
   </div>
   <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
    <div className="rounded-xl border border-[#E9E5E1] bg-white p-4">
     <h4 className="flex items-center gap-2 text-sm font-bold text-[#29282C]"><CheckCircle2 size={17} className="text-[#BF6518]"/>Before connecting</h4>
     <p className="mt-2 text-xs leading-6 text-[#626168]">{current.requirements}</p>
     <p className="mt-3 text-[11px] leading-5 text-[#8A8080]">
      Official account sign-in and permission approval will happen here after this provider is enabled.
     </p>
    </div>
    <div className="space-y-2 lg:w-[235px]">
     {current.id==='gmail'&&googleReady
      ?<p className="text-[11px] text-[#725B4B]">Google Mail is enabled on this limited preview only.</p>
      :<button type="button" disabled aria-disabled="true"
       className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#E5E5E9] bg-[#F1F1F3] px-4 text-xs font-bold text-[#77777F]">
       <LockKeyhole size={15}/>Connect · not available yet</button>}
     <Link href="/vendor/marketing" className="flex min-h-10 items-center justify-center gap-2 text-xs font-semibold text-[#AD5814] hover:underline">
      <ArrowLeft size={14}/>Marketing Studio
     </Link>
    </div>
   </div>
   {current.id==='gmail'&&<div className="mt-4">{gmailPreview}</div>}
  </div>}
  <p className="text-[11px] leading-6 text-[#85838B]">
   Connecting an app never means automatic posts, emails, customer replies or account changes. Those need separate owner approval and provider permissions.
  </p>
 </section>;
}
