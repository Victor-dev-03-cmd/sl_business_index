'use client'
import { neo } from '../../components/neumorphic';

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon'

const enabled = process.env.NEXT_PUBLIC_BILLING_HYBRID_ENABLED === 'true'
type Plan = {
  id:string;slug:string;name:string;monthly_lkr:number;yearly_lkr:number;
  listing_limit:number;monthly_credits:number;entitlements:Record<string,boolean>;
  version:number
}
type Order = {
  id:string;plan_name:string;cycle:string;quoted_lkr:number;status:string;created_at:string
}
type Subscription = {
  id:string;plan_name:string;cycle:string;price_lkr:number;status:string;
  started_at:string;ends_at:string
}
type Receipt = {id:string;amount_lkr:number;document_type:string;created_at:string}
type Snapshot = {orders:Order[];subscriptions:Subscription[];receipts:Receipt[]}
const empty:Snapshot={orders:[],subscriptions:[],receipts:[]}
const money=(v:number)=>'LKR '+new Intl.NumberFormat('en-LK',{maximumFractionDigits:2}).format(v)
const date=(v:string)=>new Date(v).toLocaleDateString('en-LK',{year:'numeric',month:'short',day:'2-digit'})
const surface = neo.card;
const button = neo.button;

export default function HybridVendorBilling() {
  const [loading,setLoading]=useState(enabled)
  const [error,setError]=useState('')
  const [plans,setPlans]=useState<Plan[]>([])
  const [snapshot,setSnapshot]=useState<Snapshot>(empty)
  const [cycle,setCycle]=useState<'monthly'|'yearly'>('monthly')
  const [submitting,setSubmitting]=useState<string|null>(null)
  const load=useCallback(async()=>{
    if(!enabled) return
    setLoading(true);setError('')
    try {
      const res=await fetch('/api/billing/hybrid',{cache:'no-store',credentials:'same-origin'})
      const data=await res.json()
      if(!res.ok) throw Error(data.error||'Billing is unavailable')
      setPlans(Array.isArray(data.plans)?data.plans:[])
      setSnapshot({
        orders:Array.isArray(data.account?.orders)?data.account.orders:[],
        subscriptions:Array.isArray(data.account?.subscriptions)?data.account.subscriptions:[],
        receipts:Array.isArray(data.account?.receipts)?data.account.receipts:[],
      })
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to load')
      setPlans([]);setSnapshot(empty)
    } finally {setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  const active=useMemo(()=>snapshot.subscriptions.find(s=>s.status==='active'&&new Date(s.ends_at).getTime()>Date.now()),[snapshot])
  const pending=useMemo(()=>snapshot.orders.filter(o=>['submitted','reviewing','awaiting_payment'].includes(o.status)),[snapshot])
  async function cancelRequest(order:Order){
    if(submitting) return
    setSubmitting(order.id)
    try {
      const res=await fetch('/api/billing/hybrid',{method:'DELETE',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:order.id})})
      const data=await res.json()
      if(!res.ok)throw Error(data.error||'Unable to cancel request')
      toast.success('Request cancelled');await load()
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to cancel request')}
    finally{setSubmitting(null)}
  }
  async function submit(plan:Plan){
    if(submitting)return
    const price=cycle==='yearly'?plan.yearly_lkr:plan.monthly_lkr
    if(price<=0){toast.info('This plan is not open for paid orders.');return}
    setSubmitting(plan.id)
    try {
      const res=await fetch('/api/billing/hybrid',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({planId:plan.id,billingCycle:cycle,idempotencyKey:crypto.randomUUID()})})
      const data=await res.json()
      if(!res.ok)throw Error(data.error||'Request failed')
      toast.success('Request registered. Payment has not been taken.')
      await load()
    }catch(e){toast.error(e instanceof Error?e.message:'Request failed')}
    finally{setSubmitting(null)}
  }

  return <div className={neo.page + " min-h-full bg-[#F7F7F9] px-4 py-6 text-[#28282D] md:px-8"}>
    <div className="mx-auto max-w-[1420px] space-y-5">
      <div className={neo.hero + " flex flex-wrap items-end justify-between gap-3 px-6 py-6"}>
        <div>
          <Link href="/vendor/billing" className="mb-2 inline-block text-[11px] font-semibold text-[#2C2C31] hover:underline">Back to Billing</Link>
          <h1 className="text-[24px] font-bold tracking-tight">Billing & Growth Credits</h1>
          <p className="mt-1 text-xs text-slate-500">Independent PostgreSQL ledger · secure vendor account view</p>
        </div>
        <button type="button" className={button} onClick={()=>void load()} disabled={loading||!enabled}>
          <IconsaxIcon name="refresh" size={15}/> Refresh
        </button>
      </div>
      {!enabled && <div className={surface+' p-6 text-sm'}>Hybrid Billing is in development and is not yet enabled. Your existing subscription is unchanged.</div>}
      {enabled&&error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}
      {enabled&&loading&&<div className={surface+' p-8 text-sm text-slate-500'}>Loading verified billing records…</div>}
      {enabled&&!loading&&!error&&<>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {title:'Current subscription',value:active?.plan_name||'None active',detail:active?'Expires '+date(active.ends_at):'No paid entitlement is active',icon:'card'},
            {title:'Open requests',value:String(pending.length),detail:'Awaiting staff review or payment',icon:'calendar'},
            {title:'Payment records',value:String(snapshot.receipts.length),detail:'Recorded, verified payments only',icon:'document-download'},
          ].map(item=><div key={item.title} className={surface+' p-5'}>
            <div className="flex items-center gap-2 text-xs text-slate-500"><IconsaxIcon name={item.icon} size={17}/>{item.title}</div>
            <p className="mt-3 text-lg font-bold">{item.value}</p>
            <p className="mt-1 text-[11px] text-slate-400">{item.detail}</p>
          </div>)}
        </div>
        <section className={surface+' p-5'}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-sm font-bold">Approved subscription plans</h2><p className="mt-1 text-[11px] text-slate-500">Only published prices from PostgreSQL are shown.</p></div>
            <div className="flex rounded-lg border border-[#E7E7EC] bg-[#f7faf8] p-1 text-xs">
              {(['monthly','yearly'] as const).map(c=><button key={c} onClick={()=>setCycle(c)} type="button"
                className={'rounded-md px-3 py-1.5 font-semibold '+(cycle===c?'bg-white text-[#2C2C31] shadow-sm':'text-slate-500')}>{c==='monthly'?'Monthly':'Yearly'}</button>)}
            </div>
          </div>
          {plans.length===0?<p className="rounded-lg border border-dashed border-[#E7E7EC] bg-[#f9fcfa] p-7 text-center text-xs text-slate-500">No new commercial plans have been approved or published yet. No prices have been invented.</p>:
            <div className="grid gap-3 md:grid-cols-3">{plans.map(plan=><article key={plan.id} className="rounded-xl border border-[#E7E7EC] p-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">{plan.name}</h3><span className="text-[10px] text-slate-400">v{plan.version}</span></div>
              <p className="mt-4 text-xl font-bold">{money(Number(cycle==='yearly'?plan.yearly_lkr:plan.monthly_lkr))}</p>
              <p className="mt-1 text-[11px] text-slate-500">per {cycle==='yearly'?'year':'month'}</p>
              <p className="mt-4 text-xs text-slate-600">{plan.listing_limit} business listings · {plan.monthly_credits} AI credits / month</p>
              <button className="mt-5 flex h-9 w-full items-center justify-center rounded-lg bg-[#242428] px-3 text-xs font-bold text-white hover:bg-[#39393D] disabled:opacity-40"
                disabled={!!submitting || (cycle==='yearly'?plan.yearly_lkr:plan.monthly_lkr)<=0 || active?.plan_name===plan.name&&active.cycle===cycle}
                onClick={()=>void submit(plan)}>{submitting===plan.id?'Sending…':'Request plan review'}</button>
            </article>)}</div>}
        </section>
        <section className={surface+' overflow-hidden'}>
          <div className="border-b border-[#edf0ed] px-5 py-4"><h2 className="text-sm font-bold">Subscription requests</h2><p className="mt-1 text-[11px] text-slate-500">All payment statuses are independently recorded; submitting is not paying.</p></div>
          {snapshot.orders.length===0?<p className="p-7 text-center text-xs text-slate-500">No billing requests.</p>:
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#fafcfb] text-[10px] uppercase text-slate-500"><tr><th className="p-4">Plan</th><th className="p-4">Cycle</th><th className="p-4">Quoted</th><th className="p-4">Status</th><th className="p-4">Created</th></tr></thead>
            <tbody className="divide-y divide-[#edf2ee]">{snapshot.orders.map(o=><tr key={o.id}><td className="p-4 font-semibold">{o.plan_name}</td><td className="p-4">{o.cycle}</td><td className="p-4">{money(Number(o.quoted_lkr))}</td><td className="p-4"><span className="rounded-md bg-[#F8F8FA] px-2 py-1 text-[10px] font-semibold">{o.status.replaceAll('_',' ')}</span>
              {['submitted','reviewing','awaiting_payment'].includes(o.status)&&<button type="button" disabled={!!submitting} onClick={()=>void cancelRequest(o)} className="ml-2 text-[10px] font-semibold text-rose-600 hover:underline disabled:opacity-40">Cancel</button>}</td><td className="p-4">{date(o.created_at)}</td></tr>)}</tbody></table></div>}
        </section>
        <section className={surface+' overflow-hidden'}>
          <div className="border-b border-[#edf0ed] px-5 py-4"><h2 className="text-sm font-bold">Verified payment records</h2><p className="mt-1 text-[11px] text-slate-500">Payment record only. Not a certified tax invoice.</p></div>
          {snapshot.receipts.length===0?<p className="p-7 text-center text-xs text-slate-500">No verified payment records.</p>:
          <div className="divide-y divide-[#edf2ee]">{snapshot.receipts.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs">
            <div><p className="font-semibold">{money(Number(r.amount_lkr))}</p><p className="mt-1 text-[10px] text-slate-500">{r.id}</p></div>
            <p className="text-slate-500">{date(r.created_at)} · Verified record</p>
          </div>)}</div>}
        </section>
      </>}
    </div>
  </div>
}
