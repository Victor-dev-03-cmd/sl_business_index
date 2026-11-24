'use client';

import Link from 'next/link';
import {ArrowUpRight,CheckCircle2,ClipboardList,Info} from 'lucide-react';
import type {G1ReadOnlyKnowledge} from '@/lib/growth/g1/read-only-knowledge';
import {buildG2ContentChecklist} from '@/lib/growth/g2/listing-content-checklist';

/**
 * An action-oriented, observed-content checklist. Never pretend that five
 * listing fields measure business health, search ranking or real sales.
 */
export default function G2ListingContentChecklist({
  knowledge,
}:{knowledge:G1ReadOnlyKnowledge}){
  const result=buildG2ContentChecklist(knowledge);
  if(!result)return null;
  const allReady=result.nextActions.length===0 && result.unavailableCount===0;
  return <section aria-labelledby="g2-content-title"
    className="rounded-xl border border-[#EDDED0] bg-[#FFFBF7] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-xl">
        <div className="flex items-center gap-2">
          <ClipboardList size={17} className="text-[#D86A16]"/>
          <h3 id="g2-content-title" className="text-[15px] font-bold text-[#262426]">
            Listing content readiness
          </h3>
          <span className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-[#9B4B18]">
            G2 · First actions
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-[#6B625A]">
          {result.description}
        </p>
      </div>
      <div aria-label={result.readyCount+' of '+result.observedCount+' observed content checks ready'}
        className="rounded-lg border border-[#F3E0CF] bg-white px-3 py-2 text-right">
        <p className="text-[21px] font-extrabold tabular-nums leading-6 text-[#252327]">
          {result.readyCount}<span className="text-[12px] text-[#77716C]"> / {result.observedCount}</span>
        </p>
        <p className="text-[10px] text-[#716B67]">available content checks</p>
      </div>
    </div>
    {result.unavailableCount>0&&<p role="status"
      className="mt-3 rounded-md bg-white p-2 text-[11px] text-[#605752]">
      {result.unavailableCount} check{result.unavailableCount===1?'':'s'} could not be verified and were excluded.
    </p>}
    {allReady?<p role="status"
      className="mt-3 flex items-center gap-2 rounded-lg border border-[#D7E8DD] bg-[#F4FAF6] p-3 text-[12px] font-medium text-[#245B3A]">
      <CheckCircle2 size={16}/> All five available listing content checks are complete.
    </p>:result.nextActions.length>0?<div className="mt-4">
      <p className="text-[11px] font-bold text-[#35302C]">Recommended next steps</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {result.nextActions.slice(0,3).map(action=><div key={action.key}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#F0E7DC] bg-white px-3 py-3">
          <span className="text-[12px] font-medium text-[#332D28]">{action.title} missing</span>
          <Link href={action.href}
            className="inline-flex min-h-10 items-center gap-1 rounded-md bg-[#29272A] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#CD6312] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CD6312]">
            {action.actionLabel}<ArrowUpRight size={13}/>
          </Link>
        </div>)}
      </div>
      {result.nextActions.length>3&&<p className="mt-2 text-[11px] text-[#786F68]">
        {result.nextActions.length-3} more content check{result.nextActions.length-3===1?'':'s'} need details.
      </p>}
    </div>:null}
    <p className="mt-3 inline-flex items-start gap-1.5 text-[10px] leading-5 text-[#71685F]">
      <Info size={13} className="mt-[3px] shrink-0"/>
      Only your already-approved business facts are used. This does not change your listing, issue credits or publish anything.
    </p>
  </section>;
}
