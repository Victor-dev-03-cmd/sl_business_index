'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon'

const enabled=process.env.NEXT_PUBLIC_BILLING_HYBRID_ENABLED==='true'
type Order={id:string;user_id:string;plan_name:string;cycle:string;quoted_lkr:number;status:string;created_at:string;staff_note:string|null}
const money=(value:number)=>'LKR '+new Intl.NumberFormat('en-LK').format(value)
const date=(value:string)=>new Date(value).toLocaleString('en-LK',{dateStyle:'medium',timeStyle:'short'})
const panel='rounded-xl border border-[#e3ebe6] bg-white shadow-[0_1px_2px_rgba(20,54,35,0.04)]'
const button='rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#285b42] hover:bg-[#f0f7f2] disabled:opacity-40'

export default function HybridBillingStaff() {
  const [orders,setOrders]=useState<Order[]>([])
  const [loading,setLoading]=useState(enabled)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<Order|null>(null)
  const [note,setNote]=useState('')
  const [bankRef,setBankRef]=useState('')
  const [verified,setVerified]=useState(false)
  const load=useCallback(async()=>{
    if(!enabled)return
    setLoading(true);setError('')
    try{
      const res=await fetch('/api/admin/billing/hybrid',{cache:'no-store',credentials:'same-origin'})
      const data=await res.json()
      if(!res.ok)throw Error(data.error||'Unable to load billing requests')
      setOrders(Array.isArray(data.requests)?data.requests:[])
    }catch(e){setError(e instanceof Error?e.message:'Unable to load');setOrders([])}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  const filtered=useMemo(()=>orders.filter(o=>
    !query.trim()||[o.user_id,o.plan_name,o.status,o.id].some(x=>x.toLowerCase().includes(query.trim().toLowerCase()))
  ),[orders,query])
  function open(o:Order){setSelected(o);setNote(o.staff_note||'');setBankRef('');setVerified(false)}
  async function act(action:'review'|'request_payment'|'reject'|'activate'){
    if(!selected||busy)return
    if(action==='activate'&&(!verified||note.trim().length<20||bankRef.trim().length<6)){
      toast.error('Verify real bank settlement independently, enter reference and a detailed audit note.')
      return
    }
    setBusy(true)
    try{
      const res=await fetch('/api/admin/billing/hybrid',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requestId:selected.id,action,note,bankReference:action==='activate'?bankRef:undefined,verified:action==='activate'?verified:false})})
      const data=await res.json()
      if(!res.ok)throw Error(data.error||'Billing action failed')
      toast.success('Billing action recorded');setSelected(null);await load()
    }catch(e){toast.error(e instanceof Error?e.message:'Billing action failed')}
    finally{setBusy(false)}
  }
  return <div className="min-h-full bg-[#f8faf9] px-4 py-6 md:px-8">
    <div className="mx-auto max-w-[1420px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e5ece6] pb-5">
        <div><Link href="/admin/billing" className="text-[11px] font-semibold text-[#377855] hover:underline">Back to Billing Administration</Link>
          <h1 className="mt-2 text-[24px] font-bold tracking-tight text-[#24422f]">Hybrid Billing Settlement</h1>
          <p className="mt-1 text-xs text-slate-500">Restricted staff queue · independently reconciled manual bank payments</p></div>
        <button type="button" className={button+' flex items-center gap-2'} disabled={!enabled||loading} onClick={()=>void load()}>
          <IconsaxIcon name="refresh" size={15}/>Refresh</button>
      </div>
      {!enabled&&<section className={panel+' p-6 text-sm text-slate-600'}>Hybrid Billing settlement is disabled until PostgreSQL hosting, new plan approval and staged E2E validation are complete.</section>}
      {enabled&&<div className={panel+' p-4 text-[11px] leading-6 text-[#855a17]'}>Manual settlement is NOT automatic checkout. Never activate on a screenshot or vendor claim. Independently verify the bank entry, amount, currency and customer reference before proceeding.</div>}
      {enabled&&error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}
      {enabled&&<section className={panel+' overflow-hidden'}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee8] p-5">
          <div><h2 className="text-sm font-bold text-[#24422f]">Subscription request queue</h2>
            <p className="mt-1 text-[11px] text-slate-400">Only records actually saved to independent PostgreSQL are shown.</p></div>
          <label><span className="sr-only">Filter requests</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search account / plan / status"
            className="h-9 w-64 max-w-full rounded-lg border border-[#dfe8e0] px-3 text-xs outline-none focus:border-[#4b916a]"/></label>
        </div>
        {loading?<p className="p-8 text-center text-xs text-slate-500">Loading request queue…</p>:filtered.length===0?
        <p className="p-8 text-center text-xs text-slate-500">No matching billing requests.</p>:
        <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-xs">
          <thead className="bg-[#fafcfb] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">Account ID</th><th className="p-4">Plan</th><th className="p-4">Quoted</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4">Action</th></tr></thead>
          <tbody className="divide-y divide-[#eef2ee]">{filtered.map(o=><tr key={o.id}>
            <td className="p-4 font-mono text-[10px]">{o.user_id.slice(0,8)}…</td>
            <td className="p-4 font-semibold">{o.plan_name} <span className="font-normal text-slate-500">({o.cycle})</span></td>
            <td className="p-4">{money(Number(o.quoted_lkr))}</td><td className="p-4">{o.status.replaceAll('_',' ')}</td><td className="p-4">{date(o.created_at)}</td>
            <td className="p-4"><button className={button} onClick={()=>open(o)}>Review</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
      {selected&&<div className="fixed inset-0 z-[110] flex justify-end bg-black/40" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setSelected(null)}}>
        <section role="dialog" aria-label="Staff Billing review" aria-modal="true" className="flex h-full w-full max-w-[550px] flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#e5ece7] p-5">
            <div><h2 className="text-base font-bold text-[#254632]">{selected.plan_name}</h2><p className="mt-1 text-xs text-slate-500">{money(Number(selected.quoted_lkr))} · {selected.cycle} · {selected.status}</p></div>
            <button type="button" className={button} disabled={busy} onClick={()=>setSelected(null)}>Close</button>
          </div>
          <div className="flex-1 space-y-5 overflow-auto p-5">
            <div className="rounded-lg bg-[#f5f7f5] p-3 text-[11px] text-slate-600">Account: {selected.user_id}<p className="mt-1">Request: {selected.id}</p></div>
            <div><label className="mb-2 block text-xs font-semibold text-[#254632]">Staff audit note</label>
              <textarea className="min-h-28 w-full rounded-lg border border-[#dce6de] p-3 text-xs outline-none focus:border-[#5b9974]" value={note} onChange={e=>setNote(e.target.value)} maxLength={2000}
                placeholder="Document reconciliation evidence; do not include account/card numbers or secrets."/></div>
            {selected.status==='awaiting_payment'&&<div className="space-y-3 rounded-lg border border-[#f1dcc3] bg-[#fffaf3] p-4">
              <p className="text-xs font-bold text-[#865c25]">Independent bank settlement verification</p>
              <input className="h-10 w-full rounded-lg border border-[#e1d5c1] px-3 text-xs" value={bankRef} onChange={e=>setBankRef(e.target.value)} maxLength={160} placeholder="Unique verified bank transfer reference"/>
              <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#6d562d]">
                <input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} className="mt-1"/>
                I personally verified the bank settlement with an independent bank record and confirmed payer and amount.</label>
            </div>}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[#e5ece7] p-4">
            {selected.status==='submitted'&&<button disabled={busy} className={button} onClick={()=>void act('review')}>Mark reviewing</button>}
            {selected.status==='reviewing'&&<button disabled={busy} className={button} onClick={()=>void act('request_payment')}>Await payment</button>}
            {['submitted','reviewing','awaiting_payment'].includes(selected.status)&&
              <button disabled={busy} className={button} onClick={()=>void act('reject')}>Reject</button>}
            {selected.status==='awaiting_payment'&&<button disabled={busy||!verified||note.trim().length<20||bankRef.trim().length<6}
              className="flex-1 rounded-lg bg-[#205a40] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              onClick={()=>void act('activate')}>Verify & activate</button>}
            {!['submitted','reviewing','awaiting_payment'].includes(selected.status)&&<p className="text-xs text-slate-500">No further transition is available.</p>}
          </div>
        </section>
      </div>}
    </div>
  </div>
}
