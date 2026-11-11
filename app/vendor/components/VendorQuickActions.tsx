'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import IconsaxIcon from './IconsaxIcon';

export const VENDOR_QUICK_ACTIONS = [
  { title:'Business overview', description:'Review live directory listings and recent activity', href:'/vendor/dashboard', icon:'category', group:'Overview', keywords:'home dashboard activity' },
  { title:'Manage listings', description:'View status, public profiles and listing completeness', href:'/vendor/my-businesses', icon:'shop', group:'Businesses', keywords:'business open profile listings' },
  { title:'Customer enquiries', description:'Respond to leads, add notes and track follow-ups', href:'/vendor/leads', icon:'message-text', group:'Customers', keywords:'leads crm pipeline' },
  { title:'Review & reply', description:'Review feedback and manage your reputation', href:'/vendor/reviews', icon:'star', group:'Customers', keywords:'ratings reputation replies' },
  { title:'Growth insights', description:'Views, clicks, enquiries and source attribution', href:'/vendor/insights', icon:'status-up', group:'Growth', keywords:'analytics statistics views' },
  { title:'Growth tools', description:'Credits, eligibility and upcoming growth services', href:'/vendor/growth', icon:'chart', group:'Growth', keywords:'credits allowance tools' },
  { title:'Marketing studio', description:'Build promotions and manage campaign history', href:'/vendor/marketing', icon:'flash', group:'Growth', keywords:'campaign promotion editor' },
  { title:'Business QR codes', description:'Print or download a code linked to your profile', href:'/vendor/qr-code', icon:'scan-barcode', group:'Tools', keywords:'qr print download scan' },
  { title:'Billing & plans', description:'Review your subscription and invoices', href:'/vendor/billing', icon:'card', group:'Account', keywords:'payment invoice subscription' },
  { title:'Account & verification', description:'Profile, business verification and local SEO', href:'/vendor/settings', icon:'setting-2', group:'Account', keywords:'settings notification profile secure' },
] as const;

export default function VendorQuickActions({ open, onClose }:{open:boolean;onClose:()=>void}) {
  const [query,setQuery]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  const pathname=usePathname();
  useEffect(()=>{if(open){setQuery('');const raf=requestAnimationFrame(()=>inputRef.current?.focus());return()=>cancelAnimationFrame(raf)}},[open]);
  useEffect(()=>{if(open)onClose()},[pathname]); // close on completed navigation
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return VENDOR_QUICK_ACTIONS.filter(a=>!q||[a.title,a.description,a.group,a.keywords].join(' ').toLowerCase().includes(q));
  },[query]);

  if(!open)return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#091A15]/75 px-3 pt-[min(12vh,110px)] backdrop-blur-[5px]" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
      <div role="dialog" aria-modal="true" aria-label="Vendor quick actions" className="w-full max-w-[630px] overflow-hidden rounded-[22px] border border-white/20 bg-[#FCFDF9] shadow-[0_40px_100px_rgba(1,28,17,.5)]">
        <div className="flex items-center gap-3 border-b border-[#E4EAE3] p-4 sm:px-5">
          <IconsaxIcon name="search-normal" size={21} color="#4E8064"/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            aria-label="Search vendor portal actions" placeholder="Search actions, pages, tools…" maxLength={80}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#17392D] outline-none placeholder:text-[#8BA293]"/>
          <button type="button" onClick={onClose} aria-label="Close quick actions" className="rounded-lg border border-[#E2EAE3] bg-white px-2 py-1 text-[10px] font-semibold text-[#63806F]">Esc</button>
        </div>
        <div className="max-h-[min(63vh,530px)] overflow-y-auto p-3 sm:p-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#7C9885]">Go straight to the work</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map(item=>(
              <Link key={item.href} href={item.href} onClick={onClose}
                className="group flex items-start gap-3 rounded-[13px] border border-transparent px-3 py-3 transition hover:border-[#CFE2D5] hover:bg-[#EDF6EF] focus-visible:border-[#679878] focus-visible:outline-none">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D9E9DE] bg-[#EDF5EF] text-[#2C7550] transition group-hover:bg-white"><IconsaxIcon name={item.icon} size={20}/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#214C34]">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#7C9383]">{item.description}</p>
                </div>
                <IconsaxIcon name="arrow-right-2" size={13} color="#80A08A"/>
              </Link>
            ))}
          </div>
          {!filtered.length&&<p className="py-10 text-center text-sm text-[#688775]">No tools match that search. Try “leads”, “QR”, or “settings”.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-[#E7EEE7] bg-[#F4F8F3] px-5 py-3 text-[10px] text-[#74927E]">
          <span>SLBI Vendor Command Center</span><span>⌘ / Ctrl + K to open</span>
        </div>
      </div>
    </div>
  );
}
