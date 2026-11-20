'use client'
import {useEffect,useRef,useState,useId,type PointerEvent} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {Activity,Globe2,MapPin,Minus,Plus,RotateCcw,X,ShieldCheck,Info,Maximize2,Minimize2} from 'lucide-react'
import {coastline} from '@/lib/live/geo'
import {useLiveActivity} from './LivePresenceProvider'
import {openAnalyticsPreferences} from './GoogleAnalyticsTracker'
type Bucket={name:string;count:number;x?:number;y?:number}
type Report={status:'ready'|'not_configured'|'unavailable';total?:number|null;countries?:Bucket[];cities?:Bucket[];updatedAt?:string}
const colors=['#087fdd','#f97316','#d946ef','#16a34a','#eab308','#e11d48','#06b6d4']
const initial={x:0,y:0,zoom:1}
export default function LiveVisitorsPanel({open,onClose,count}:{open:boolean;onClose:()=>void;count:number|null}){
  const [report,setReport]=useState<Report|null>(null)
  const [tab,setTab]=useState<'island'|'world'>('island')
  const [expanded,setExpanded]=useState(false)
  const [view,setView]=useState(initial)
  const [selected,setSelected]=useState<string|null>(null)
  const drag=useRef<{x:number;y:number;vx:number;vy:number;scale:number}|null>(null)
  const svg=useRef<SVGSVGElement>(null)
  const gid=useId()
  useEffect(()=>{
    if(!open)return
    let active=true
    const controller=new AbortController()
    const refresh=async()=>{
      try{const response=await fetch('/api/live-visitors',{signal:controller.signal});if(!response.ok)throw Error('report');const data=await response.json();if(active)setReport(data)}
      catch{if(active)setReport({status:'unavailable'})}
    }
    void refresh()
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},60000)
    return()=>{active=false;controller.abort();window.clearInterval(timer)}
  },[open])
  const live=useLiveActivity()
  const cities=live.regions, countries=live.countries
  const items=tab==='island'?cities:countries
  const ready=report?.status==='ready'
  const liveReady=live.count!==null
  const sriLanka=countries.find(c=>c.name==='Sri Lanka')
  const bounds=tab==='island'?{x:175,y:43,w:320,h:465}:{x:0,y:0,w:960,h:480}
  const cx=bounds.x+bounds.w/2,cy=bounds.y+bounds.h/2
  const zoom=(delta:number)=>setView(v=>({...v,zoom:Math.max(1,Math.min(4,v.zoom+delta))}))
  function switchTab(t:'island'|'world'){setTab(t);setView(initial);setSelected(null)}
  function pointerDown(e:PointerEvent<SVGSVGElement>){
    if(e.button!==0)return
    const scale=svg.current?.getScreenCTM()?.a||1
    drag.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,scale};e.currentTarget.setPointerCapture(e.pointerId)
  }
  function pointerMove(e:PointerEvent<SVGSVGElement>){
    const d=drag.current;if(!d)return
    setView(v=>({...v,x:Math.max(-bounds.w,Math.min(bounds.w,d.vx+(e.clientX-d.x)/d.scale)),y:Math.max(-bounds.h,Math.min(bounds.h,d.vy+(e.clientY-d.y)/d.scale))}))
  }
  function select(c:Bucket){
    setSelected(c.name)
    if(c.x!==undefined&&c.y!==undefined){const z=tab==='island'?1.5:2;setView({x:(cx-c.x)*z,y:(cy-c.y)*z,zoom:z})}
  }
  const chosen=items.find(c=>c.name===selected)
  return <Dialog.Root open={open} onOpenChange={value=>{if(!value)onClose()}}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm"/>
      <Dialog.Content className={'fixed z-[1001] flex flex-col overflow-hidden border border-slate-200 bg-[#f8f9fb] shadow-2xl outline-none '+(expanded?'inset-0 h-[100dvh] w-full rounded-none':'left-1/2 top-1/2 max-h-[94dvh] w-[calc(100%-20px)] max-w-[1380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl')}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-800"><Activity size={23}/></span><div>
          <Dialog.Title className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Live Visitors</Dialog.Title><Dialog.Description className="mt-1 text-xs text-slate-500">SL Business Index · Worldwide activity</Dialog.Description></div></div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" aria-pressed={expanded} aria-label={expanded?'Exit full view':'Expand full view'} title={expanded?'Exit full view':'Full view'} onClick={()=>setExpanded(v=>!v)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}<span className="hidden sm:inline">{expanded?'Exit full view':'Full view'}</span></button>
            <Dialog.Close aria-label="Close live visitors" className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><X size={20}/></Dialog.Close>
          </div>
        </header>
        <div className={'min-h-0 flex-1 overflow-y-auto p-3 sm:p-6 '+(expanded?'w-full':'')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"><p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/> Active now</p><p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{count??'—'}</p><p className="mt-1 text-[10px] text-slate-500">Connected public-page tabs</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"><p className="text-[11px] font-semibold text-slate-600">Recent active users</p><p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{ready?report?.total??'—':'—'}</p><p className="mt-1 text-[10px] text-slate-500">GA4 · Last 30 minutes</p></div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:col-span-1 sm:p-4"><p className="text-[11px] font-semibold text-slate-600">{tab==='island'?'Sri Lanka activity':'Countries with activity'}</p><p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{liveReady?(tab==='island'?sriLanka?.count??0:countries.length):'—'}</p><p className="mt-1 text-[10px] text-slate-500">Live · shared approximate areas</p></div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
                <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                  {(['island','world'] as const).map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>switchTab(t)} className={'flex items-center gap-1.5 rounded-md px-3 py-2 '+(t===tab?'bg-white text-slate-900 shadow-sm':'text-slate-500')}>{t==='island'?<MapPin size={14}/>:<Globe2 size={14}/>} {t==='island'?'Sri Lanka':'Worldwide'}</button>)}
                </div>
                <div className="flex gap-1">{[{Icon:Minus,label:'Zoom out',fn:()=>zoom(-.25)},{Icon:Plus,label:'Zoom in',fn:()=>zoom(.25)},{Icon:RotateCcw,label:'Reset map',fn:()=>{setView(initial);setSelected(null)}}].map(({Icon,label,fn})=><button key={label} aria-label={label} type="button" onClick={fn} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"><Icon size={16}/></button>)}</div>
              </div>
              <div className="relative overflow-hidden bg-[#f3f5f7]">
                <svg ref={svg} viewBox={bounds.x+' '+bounds.y+' '+bounds.w+' '+bounds.h} aria-label={tab==='island'?'Sri Lanka live activity map':'Worldwide live activity map'} className={'block w-full cursor-grab touch-none select-none active:cursor-grabbing '+(expanded?'h-[56dvh] min-h-[340px] lg:h-[calc(100dvh-290px)]':'h-[420px] sm:h-[540px] lg:h-[565px]')} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
                  <defs><pattern id={gid+'grid'} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#64748b" opacity=".16"/></pattern></defs>
                  <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill={'url(#'+gid+'grid)'}/>
                  <g transform={'translate('+view.x+' '+view.y+') translate('+cx+' '+cy+') scale('+view.zoom+') translate('+(-cx)+' '+(-cy)+')'}>
                    {tab==='island'?<>
                      <path d={coastline} fill="#e1e4e8" stroke="#20242a" strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                    </>:<image href="/live/world.svg" x="0" y="0" width="960" height="480"/>}
                    {items.filter(c=>c.x!==undefined&&c.y!==undefined).map((c,i)=>{const color=colors[i%colors.length],r=tab==='island'?4:5;const active=selected===c.name;return <g key={c.name} transform={'translate('+c.x+' '+c.y+')'} onPointerDown={e=>e.stopPropagation()} onClick={()=>select(c)} role="button" tabIndex={0} aria-label={c.name+' '+c.count+' active connections'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(c)}}} className="cursor-pointer">
                      <circle r={Math.min(20,r+5+Math.log2(c.count+1))} fill={color} opacity={active?.35:.16}/><circle r={r+Math.min(3,Math.log2(c.count+1))} fill={color} stroke="white" strokeWidth="1.6"/><text x="0" y=".5" dominantBaseline="middle" textAnchor="middle" fill="white" fontWeight="700" fontSize={c.count>99?'3.5':'5.5'}>{c.count}</text><title>{c.name}: {c.count} active connections</title>
                      </g>})}
                  </g>
                </svg>
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] text-slate-600">Drag to explore · Zoom with + / −</span>
                {chosen&&<div className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">{chosen.name} · {chosen.count}</div>}
              </div>
            </section>
            <aside className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location overview</p><h3 className="mt-2 text-lg font-bold text-slate-900">{tab==='island'?'Live locations in Sri Lanka':'Live worldwide locations'}</h3>
              {tab==='island'&&liveReady&&sriLanka&&<div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 p-3 text-xs font-semibold"><span>All Sri Lanka</span><span className="tabular-nums">{sriLanka.count}</span></div>}
              {!liveReady?<div className="mt-5 flex gap-2 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600"><Info size={17} className="shrink-0"/>Connecting to live activity…</div>:items.length===0?<p className="mt-5 text-sm leading-6 text-slate-500">No active connections with a shared area in this view yet. A marker appears as soon as a visitor shares their approximate area, even if the count is one.</p>:<div className="mt-3 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">{items.map((c,i)=><button type="button" key={c.name} onClick={()=>select(c)} className={'flex w-full items-center gap-3 px-1 py-3 text-left text-sm hover:bg-slate-50 '+(selected===c.name?'bg-slate-100':'')}><span className="h-3 w-3 shrink-0 rounded-full" style={{background:colors[i%colors.length]}}/><span className="flex-1 text-slate-700">{c.name}</span><span className="font-bold tabular-nums text-slate-900">{c.count}</span></button>)}</div>}
              <div className="mt-5 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-600"><ShieldCheck size={16} className="mb-1 text-slate-700"/>Dots appear only for active connections that opt in to area sharing. Sri Lanka is shown at province level; worldwide at country level. No exact position, identity or device information is shown.</div>
              {liveReady&&<p className="mt-3 text-[10px] text-slate-500">{live.mapped} of {live.count} active connections sharing an area · Live updates</p>}
              <button type="button" onClick={()=>{openAnalyticsPreferences();onClose()}} className="mt-4 text-xs font-semibold text-slate-700 underline">Analytics preferences</button>
            </aside>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-slate-500">Supabase Presence updates live connections and approximate areas while the page is visible. GA4 recent active users is a separate 30-minute statistic. Location estimates can be inaccurate or unavailable. <a href="/privacy-policy" className="font-semibold underline">Privacy policy</a>.</p>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
