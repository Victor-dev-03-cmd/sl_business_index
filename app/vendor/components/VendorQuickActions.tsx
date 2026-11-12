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
  { title:'Verify a business', description:'Open the verification form and document checklist', href:'/vendor/settings?tab=verification', icon:'shield-tick', group:'Account', keywords:'verify upload business registration' },
  { title:'Optimize local discovery', description:'Edit service radius and approved SEO keywords', href:'/vendor/settings?tab=optimization', icon:'search-normal', group:'Growth', keywords:'seo visibility location keywords ranking' },
  { title:'Notification preferences', description:'Choose which account updates to receive', href:'/vendor/settings?tab=notifications', icon:'sms', group:'Account', keywords:'email alerts notification preferences' },
  { title:'Account security', description:'Change your password and review security information', href:'/vendor/settings?tab=security', icon:'shield-tick', group:'Account', keywords:'password login security' },
] as const;

export default function VendorQuickActions({ open, onClose }:{open:boolean;onClose:()=>void}) {
  const [query,setQuery]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  const pathname=usePathname();
  useEffect(()=>{if(open){setQuery('');const raf=requestAnimationFrame(()=>inputRef.current?.focus());return()=>cancelAnimationFrame(raf)}},[open]);
  // The parent owns route-change closing. An effect here ran on the initial mount
  // and immediately dismissed the dialog on the first Search / Quick Actions click.
  // The command palette is a modal: keep keyboard focus inside it, and return
  // focus to its original trigger when the user finishes or presses Escape.
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!dialogRef.current)return;
      const targets=Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(node=>node.getClientRects().length>0);
      if(!targets.length)return;
      const first=targets[0],last=targets[targets.length-1];
      const active=document.activeElement;
      if(event.shiftKey&&(active===first||!dialogRef.current.contains(active))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&(active===last||!dialogRef.current.contains(active))){
        event.preventDefault();first.focus();
      }
    };
    document.addEventListener('keydown',trap);
    return()=>{document.removeEventListener('keydown',trap);previous?.focus()};
  },[open]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return VENDOR_QUICK_ACTIONS.filter(a=>!q||[a.title,a.description,a.group,a.keywords].join(' ').toLowerCase().includes(q));
  },[query]);

  const navigateAction=(href:string)=>{
    // Query-only transitions within an already mounted Settings route need an
    // explicit tab event; a URL navigation may reuse the existing component.
    if(pathname==='/vendor/settings'&&href.startsWith('/vendor/settings?')){
      const tab=new URLSearchParams(href.split('?')[1]||'').get('tab');
      if(tab)window.dispatchEvent(new CustomEvent('slbi:settings-tab',{detail:tab}));
    }
    onClose();
  };
  if(!open)return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#111114]/60 px-3 pt-[min(12vh,110px)] backdrop-blur-[5px]" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Vendor quick actions" className="w-full max-w-[630px] overflow-hidden rounded-[22px] border border-white/20 bg-white shadow-[0_35px_90px_rgba(27,31,42,.35)]">
        <div className="flex items-center gap-3 border-b border-[#d9dfe8] p-4 sm:px-5">
          <IconsaxIcon name="search-normal" size={21} color="#F57807"/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            aria-label="Search vendor portal actions" placeholder="Search actions, pages, tools…" maxLength={80}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#26262B] outline-none placeholder:text-[#94949D]"/>
          <button type="button" onClick={onClose} aria-label="Close quick actions" className="rounded-lg border border-[#E8E8EC] bg-[#FAFAFB] px-2 py-1 text-[10px] font-semibold text-[#64646C]">Esc</button>
        </div>
        <div className="max-h-[min(63vh,530px)] overflow-y-auto p-3 sm:p-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#73737B]">Go straight to the work</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map(item=>(
              <Link key={item.href} href={item.href} onClick={()=>navigateAction(item.href)}
                className="group flex items-start gap-3 rounded-[13px] border border-transparent px-3 py-3 transition hover:border-[#ffceab] hover:bg-[#fff1e5] focus-visible:border-[#FF7900] focus-visible:outline-none">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F6E1D2] bg-[#FFF5ED] text-[#e67519] transition group-hover:bg-white"><IconsaxIcon name={item.icon} size={20}/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#29292E]">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#777780]">{item.description}</p>
                </div>
                <IconsaxIcon name="arrow-right-2" size={13} color="#C46A21"/>
              </Link>
            ))}
          </div>
          {!filtered.length&&<p className="py-10 text-center text-sm text-[#74747C]">No tools match that search. Try “leads”, “QR”, or “settings”.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-[#EAEAEF] bg-[#FAFAFC] px-5 py-3 text-[10px] text-[#777780]">
          <span>SLBI Vendor Command Center</span><span>⌘ / Ctrl + K to open</span>
        </div>
      </div>
    </div>
  );
}
