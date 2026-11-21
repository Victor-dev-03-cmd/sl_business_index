'use client';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Images,Store,ArrowUpRight,ChevronDown,ArrowLeft} from 'lucide-react';
import BusinessProfileEditor from '../my-businesses/[id]/edit/BusinessProfileEditor';
type OwnedBusiness={id:string;name:string;slug:string|null;category:string|null;logo_url:string|null;status:string|null};
export default function GalleryServicesWorkspace({businesses,initialId,unavailable}:{businesses:OwnedBusiness[];initialId:string;unavailable:boolean}){
 const [selectedId,setSelectedId]=useState(initialId);
 const [dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false);
 const business=businesses.find(b=>b.id===selectedId);
 const change=(next:string)=>{
  if(busy||next===selectedId)return;
  if(dirty&&!window.confirm('Discard unsaved gallery and service changes?'))return;
  setDirty(false);setSelectedId(next);
 };
 return <div className="mx-auto w-full max-w-[1360px] space-y-6 pb-10">
  <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-5">
   <div><Link href="/vendor/my-businesses" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"><ArrowLeft size={14}/> My Businesses</Link><h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-[28px]"><Images size={27} className="text-[#E66D00]"/> Gallery &amp; Services</h1><p className="mt-2 text-sm text-neutral-500">Manage what customers see in your business profile.</p></div>
   {business?.status==='approved'&&<Link href={'/business/'+encodeURIComponent(business.slug||business.id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-semibold hover:bg-neutral-50">View public profile <ArrowUpRight size={16}/></Link>}
  </header>
  {unavailable&&<p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The requested business is not available in your account. Select one of your own listings.</p>}
  {!business?<section className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 p-10 text-center"><Store size={42} strokeWidth={1.5} className="text-neutral-400"/><h2 className="text-lg font-semibold">Register a business first</h2><p className="max-w-sm text-sm text-neutral-500">Once you have a business listing, you can add images and services here.</p><Link href="/register-business" className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">Register business</Link></section>:<>
   <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
    <div className="flex min-w-0 items-center gap-3">
     <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">{business.logo_url?<Image src={business.logo_url} alt="" fill sizes="48px" className="object-contain p-1"/>:<Store size={22} className="text-neutral-500"/>}</div>
     <div className="min-w-0"><p className="break-words text-sm font-semibold">{business.name}</p><p className="mt-0.5 text-xs text-neutral-500">{business.category||'Business listing'} · {business.status==='approved'?'Published':business.status||'Pending'}</p></div>
    </div>
    <div className="w-full sm:max-w-xs"><label htmlFor="gallery-business" className="mb-1.5 block text-xs font-semibold text-neutral-600">Select business</label><div className="relative"><select id="gallery-business" value={selectedId} disabled={busy} onChange={e=>change(e.target.value)} className="min-h-11 w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50">{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"/></div></div>
   </section>
   <BusinessProfileEditor key={business.id} businessId={business.id} onDirtyChange={setDirty} onSavingChange={setBusy}/>
   {business.status!=='approved'&&<p className="text-xs text-neutral-500">You can prepare your profile content now. Public visibility follows your business listing status.</p>}
  </>}
 </div>;
}
