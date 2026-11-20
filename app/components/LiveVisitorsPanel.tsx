'use client'
import {useEffect,useRef,useState,useId,type PointerEvent} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {Activity,Globe2,MapPin,Minus,Plus,RotateCcw,X,ShieldCheck,Info} from 'lucide-react'
import {coastline} from '@/lib/live/geo'
type Bucket={name:string;count:number;x?:number;y?:number}
type Report={status:'ready'|'not_configured'|'unavailable';total?:number|null;countries?:Bucket[];cities?:Bucket[];updatedAt?:string}
const colors=['#18b98d','#f6b65c','#66b8f3','#bda4f4','#f18091']
export default function LiveVisitorsPanel({open,onClose,count}:{open:boolean;onClose:()=>void;count:number|null}){
  const [report,setReport]=useState<Report|null>(null)
  const [tab,setTab]=useState<'island'|'world'>('island')
  const [view,setView]=useState({x:0,y:0,zoom:1})
  const [selected,setSelected]=useState<string|null>(null)
  const drag=useRef<{x:number;y:number;vx:number;vy:number}|null>(null)
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
  const cities=report?.cities||[], countries=report?.countries||[]
  const items=tab==='island'?cities:countries
  const ready=report?.status==='ready'
  const zoom=(delta:number)=>setView(v=>({...v,zoom:Math.max(1,Math.min(3,v.zoom+delta))}))
  function pointerDown(e:PointerEvent<SVGSVGElement>){
    if(e.button!==0)return
    drag.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};e.currentTarget.setPointerCapture(e.pointerId)
  }
  function pointerMove(e:PointerEvent<SVGSVGElement>){
    if(!drag.current||!svg.current)return
    const ratio=Math.max(340/svg.current.clientWidth,470/svg.current.clientHeight)
    setView(v=>({...v,x:Math.max(-160,Math.min(160,drag.current!.vx+(e.clientX-drag.current!.x)*ratio)),y:Math.max(-180,Math.min(180,drag.current!.vy+(e.clientY-drag.current!.y)*ratio))}))
  }
  return <Dialog.Root open={open} onOpenChange={value=>{if(!value)onClose()}}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1000] bg-[#102b24]/55 backdrop-blur-sm"/>
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[92dvh] w-[calc(100%-20px)] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#dce8df] bg-[#f8fbf9] shadow-2xl outline-none">
        <header className="flex items-center justify-between gap-3 border-b border-[#e0eae3] bg-white px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e3f5eb] text-[#16845c]"><Activity size={23}/></span><div>
          <Dialog.Title className="text-xl font-bold tracking-tight text-[#173a2e] sm:text-2xl">Live Visitors</Dialog.Title><Dialog.Description className="mt-1 text-xs text-[#6b8075]">SL Business Index · Community activity</Dialog.Description></div></div>
          <Dialog.Close aria-label="Close live visitors" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#597267] hover:bg-[#eef4ef]"><X size={20}/></Dialog.Close>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-[#eaf8f0] p-3 sm:p-4"><p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a7657]"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Active now</p><p className="mt-2 text-3xl font-bold tabular-nums text-[#164a33]">{count??'—'}</p><p className="mt-1 text-[10px] text-[#587e69]">Connected public-page tabs</p></div>
            <div className="rounded-xl border border-[#e0e8e3] bg-white p-3 sm:p-4"><p className="text-[11px] font-semibold text-[#60776c]">Recent active users</p><p className="mt-2 text-3xl font-bold tabular-nums text-[#193d30]">{ready?report?.total??'—':'—'}</p><p className="mt-1 text-[10px] text-[#788b80]">GA4 · Last 30 minutes</p></div>
            <div className="col-span-2 rounded-xl border border-[#e0e8e3] bg-white p-3 sm:col-span-1 sm:p-4"><p className="text-[11px] font-semibold text-[#60776c]">Visible locations</p><p className="mt-2 text-3xl font-bold tabular-nums text-[#193d30]">{ready?items.length:'—'}</p><p className="mt-1 text-[10px] text-[#788b80]">Privacy-filtered {tab==='island'?'cities':'countries'}</p></div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)]">
            <section className="min-w-0 overflow-hidden rounded-xl border border-[#dde9e1] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6eee8] px-3 py-3 sm:px-4">
                <div className="flex rounded-lg bg-[#f0f5f1] p-1 text-xs font-semibold">
                  {(['island','world'] as const).map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>{setTab(t);setSelected(null)}} className={'flex items-center gap-1.5 rounded-md px-3 py-2 '+(t===tab?'bg-white text-[#1b6e4b] shadow-sm':'text-[#66796d]')}>{t==='island'?<MapPin size={14}/>:<Globe2 size={14}/>} {t==='island'?'Sri Lanka':'Worldwide'}</button>)}
                </div>
                {tab==='island'&&<div className="flex gap-1">{[{Icon:Minus,label:'Zoom out',fn:()=>zoom(-.25)},{Icon:Plus,label:'Zoom in',fn:()=>zoom(.25)},{Icon:RotateCcw,label:'Reset map',fn:()=>setView({x:0,y:0,zoom:1})}].map(({Icon,label,fn})=><button key={label} aria-label={label} type="button" onClick={fn} className="grid h-8 w-8 place-items-center rounded-md border border-[#e3ebe5] text-[#3d6d57] hover:bg-[#eef6ef]"><Icon size={15}/></button>)}</div>}
              </div>
              {tab==='island'?<div className="relative overflow-hidden bg-gradient-to-br from-[#123b32] via-[#174c3d] to-[#102d26]">
                <svg ref={svg} viewBox="165 45 340 470" aria-label="Sri Lanka approximate city activity map" className="block h-[355px] w-full cursor-grab touch-none select-none active:cursor-grabbing sm:h-[415px]" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
                  <defs><pattern id={gid+'grid'} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#9bc5a8" opacity=".18"/></pattern><linearGradient id={gid+'land'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#307b60"/><stop offset="1" stopColor="#20523e"/></linearGradient></defs>
                  <rect x="165" y="45" width="340" height="470" fill={'url(#'+gid+'grid)'}/>
                  <g transform={'translate('+view.x+' '+view.y+') translate(335 280) scale('+view.zoom+') translate(-335 -280)'}>
                    <path d={coastline} fill={'url(#'+gid+'land)'} stroke="#a5e2bd" strokeWidth="1.7" vectorEffect="non-scaling-stroke"/>
                    {cities.filter(c=>c.x!==undefined&&c.y!==undefined).map((c,i)=><g key={c.name} transform={'translate('+c.x+' '+c.y+')'} onPointerDown={e=>e.stopPropagation()} onClick={()=>setSelected(c.name)} role="button" tabIndex={0} aria-label={c.name+' '+c.count+' or more'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(c.name)}}} className="cursor-pointer">
                      <circle r={Math.min(18,9+Math.log2(c.count))} fill={colors[i%colors.length]} opacity=".2"/><circle r="5" fill={colors[i%colors.length]} stroke="white" strokeWidth="1.1"/>
                      <rect x="8" y="-12" width={Math.max(38,c.name.length*5.8+28)} height="23" rx="5" fill="#12392e" stroke="#569c7c"/><text x="13" y="3" fill="#fff" fontSize="9" fontWeight="600">{c.name} {c.count}+</text><title>{c.name}: at least {c.count} active users in the last 30 minutes</title></g>)}
                  </g>
                </svg>
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-[#102f28]/90 px-3 py-1.5 text-[10px] text-[#b0ddc7]">Drag to explore · Zoom with + / −</span>
                {selected&&<div className="absolute right-3 top-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#21563e]">{selected} · {cities.find(c=>c.name===selected)?.count??'—'}+</div>}
              </div>:<div className="flex min-h-[355px] flex-col justify-center bg-[#173a31] p-6 sm:p-9"><Globe2 size={52} className="text-[#83d7b4]"/><h3 className="mt-4 text-2xl font-bold text-white">Across the world</h3><p className="mt-1 text-xs leading-5 text-[#b5d6c5]">Country-level activity from the last 30 minutes.</p>
                <div className="mt-5 space-y-3">{countries.slice(0,6).map((c,i)=><div key={c.name}><div className="flex justify-between text-xs text-white"><span>{c.name}</span><span>{c.count}+</span></div><div className="mt-1 h-2 rounded-full bg-white/10"><div style={{width:Math.round(c.count/Math.max(1,countries[0]?.count||1)*100)+'%',backgroundColor:colors[i%colors.length]}} className="h-2 rounded-full"/></div></div>)}</div></div>}
            </section>
            <aside className="rounded-xl border border-[#dde9e1] bg-white p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7e9b88]">Location overview</p><h3 className="mt-2 text-lg font-bold text-[#254a39]">{tab==='island'?'Sri Lankan cities':'Worldwide countries'}</h3>
              {!report?<p className="mt-5 text-sm text-[#6c8273]">Loading aggregate activity…</p>:!ready?<div className="mt-5 flex gap-2 rounded-lg bg-[#f2f6f3] p-3 text-xs leading-5 text-[#637b6a]"><Info size={17} className="shrink-0"/>{report.status==='not_configured'?'Geographic statistics are not connected yet. Live connection count is independent.':'Geographic statistics are temporarily unavailable.'}</div>:items.length===0?<p className="mt-5 text-sm leading-6 text-[#6c8273]">No location groups currently meet the public privacy threshold. No individual visitor locations are shown.</p>:<div className="mt-3 max-h-[300px] divide-y divide-[#edf1ed] overflow-y-auto">{items.map((c,i)=><button type="button" key={c.name} onClick={()=>{setSelected(c.name);if(c.x!==undefined&&c.y!==undefined)setView({x:335-c.x,y:280-c.y,zoom:1.5})}} className="flex w-full items-center gap-2 py-3 text-left text-sm hover:bg-[#f5f9f5]"><span className="h-2.5 w-2.5 rounded-full" style={{background:colors[i%colors.length]}}/><span className="flex-1 text-[#405a49]">{c.name}</span><span className="font-bold tabular-nums text-[#287353]">{c.count}+</span></button>)}</div>}
              <div className="mt-5 border-t border-[#e6eee8] pt-4 text-[11px] leading-5 text-[#70897a]"><ShieldCheck size={16} className="mb-1 text-[#34865d]"/>Only approximate city or country aggregates of at least five users. Counts are rounded down in groups of five. No IP, GPS, name or individual location is displayed.</div>
              {report?.updatedAt&&<p className="mt-3 text-[10px] text-[#7c9385]">Updated {new Date(report.updatedAt).toLocaleTimeString()} · Refreshes every 60 seconds</p>}
            </aside>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#74897b]">Sources: Supabase Realtime Presence (connected tabs, not unique people) and Google Analytics 4 (recent active users, not a live socket count). <a href="/privacy-policy" className="font-semibold underline">Privacy policy</a></p>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
