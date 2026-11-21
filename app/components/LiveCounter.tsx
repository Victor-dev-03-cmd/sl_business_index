'use client'
import {useState} from 'react'
import dynamic from 'next/dynamic'
import {Activity, ChevronDown} from 'lucide-react'
import {useLiveCount} from './LivePresenceProvider'
const LiveVisitorsPanel = dynamic(()=>import('./LiveVisitorsPanel'),{ssr:false})
export default function LiveCounter(){
  const count=useLiveCount()
  const [open,setOpen]=useState(false)
  return <>
    <button type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={'Live visitors: '+(count===null?'unavailable':count)+' active connections'} title="Live Visitors" data-slbi-ui="live-trigger"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 sm:px-3">
      <span data-slbi-ui="live-dot" className="relative h-2 w-2 shrink-0 rounded-full bg-emerald-500"><span className="absolute inset-0 rounded-full bg-emerald-400 motion-safe:animate-ping opacity-50"/></span>
      <span className="hidden 2xl:inline">Live Now:</span><span className="tabular-nums">{count===null?'—':count}</span>
      <ChevronDown size={12} className="hidden 2xl:block"/><Activity size={13} className="2xl:hidden"/>
    </button>
    {open&&<LiveVisitorsPanel open={open} onClose={()=>setOpen(false)} count={count}/>}
  </>
}
