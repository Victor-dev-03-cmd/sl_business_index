'use client';

import Link from 'next/link';
import BrandIcon from '@/app/components/BrandIcon';
import {useSavedBusinesses} from '@/lib/public-saved-businesses';

export default function SavedBusinessesPage(){
  const {items,ready,toggle}=useSavedBusinesses();
  return <main className="min-h-[75dvh] bg-[#F8F7F2] px-4 pb-14 pt-8 text-[#203B31] sm:px-8 sm:pt-14">
    <div className="mx-auto max-w-[940px]">
      <div className="mb-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#D7C9B1] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#966E36]">
          <BrandIcon name="bookmark-2" size={15}/> My collection
        </span>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3.3rem)] font-semibold tracking-[-.05em]">Saved businesses<span className="text-[#C7A16E]">.</span></h1>
        <p className="mt-3 max-w-[520px] text-[13px] leading-6 text-[#63766B]">
          Keep useful Sri Lankan businesses a tap away. These bookmarks are stored on this device, not synced across your accounts.
        </p>
      </div>
      {!ready?<p role="status" className="rounded-2xl bg-white p-6 text-sm text-[#62776A]">Loading your saved places…</p>:
        items.length? <div className="grid gap-3 sm:grid-cols-2">
          {items.map(item=><article key={item.id} className="flex min-w-0 items-start gap-4 rounded-[18px] border border-[#E5E8DF] bg-white p-4 shadow-[0_8px_24px_rgba(23,49,38,.04)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F483C] text-lg font-semibold text-[#F1D4A9]" aria-hidden="true">
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <Link className="block truncate text-[15px] font-semibold text-[#204337] hover:underline" href={'/business/'+encodeURIComponent(item.slug||item.id)}>{item.name}</Link>
              <p className="mt-1 truncate text-[11px] text-[#84958B]">{[item.category,item.city].filter(Boolean).join(' · ')||'Sri Lankan business'}</p>
              <button type="button" onClick={()=>toggle(item)}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#E6D8C4] bg-[#FFF9EF] px-3 text-[11px] font-semibold text-[#895F2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A17843]">
                <BrandIcon name="bookmark-2" size={15} variant="bold"/> Remove bookmark
              </button>
            </div>
          </article>)}
        </div>:
        <div className="rounded-[25px] border border-dashed border-[#DADFD3] bg-white px-5 py-12 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#EDF4EB] text-[#3E7761]"><BrandIcon name="bookmark-2" size={28}/></span>
          <h2 className="mt-5 text-xl font-semibold">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-[390px] text-[13px] leading-6 text-[#6D8072]">Open a business profile and tap “Save business” to build your collection.</p>
          <Link href="/nearby" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1B3430] px-5 text-[13px] font-semibold text-white"><BrandIcon name="search-normal" size={16}/> Explore businesses</Link>
        </div>}
    </div>
  </main>;
}
