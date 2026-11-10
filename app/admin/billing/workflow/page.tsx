'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

const enabled = process.env.NEXT_PUBLIC_BILLING_V2_ENABLED === 'true';
type BillingRequest = {
  id: string;
  user_id: string;
  plan_name: string;
  billing_cycle: string;
  quoted_lkr: number;
  status: 'submitted' | 'reviewing' | 'awaiting_payment' | 'activated' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  staff_note: string | null;
  payment_reference: string | null;
  invoice_id: string | null;
  subscription_id: string | null;
};
const panel = 'rounded-xl border border-[#e4ebe6] bg-white shadow-[0_1px_3px_rgba(27,58,38,0.04)]';
const money = (value: number) => 'LKR ' + new Intl.NumberFormat('en-LK', {maximumFractionDigits: 2}).format(value);
const formatted = (value: string) => new Date(value).toLocaleString('en-LK', {dateStyle: 'medium',timeStyle:'short'});

export default function BillingWorkflowPage() {
  const [records, setRecords] = useState<BillingRequest[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [verified, setVerified] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sign in as a billing administrator.');
      const { data: profile, error: roleError } = await supabase.from('profiles')
        .select('role').eq('id',user.id).single();
      if (roleError || !['admin','ceo'].includes(String(profile?.role))) {
        throw new Error('Only Admin/CEO accounts can view the billing workflow.');
      }
      const { data, error: dbError } = await supabase.from('billing_requests')
        .select('id,user_id,plan_name,billing_cycle,quoted_lkr,status,created_at,updated_at,staff_note,payment_reference,invoice_id,subscription_id')
        .order('created_at',{ascending:false}).limit(250);
      if (dbError) throw dbError;
      setRecords((data || []) as BillingRequest[]);
    } catch (e) {
      setRecords([]);
      setError(e instanceof Error ? e.message : 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => records.filter(r => {
    const statusMatch = filter === 'all' || (filter === 'open'
      ? ['submitted','reviewing','awaiting_payment'].includes(r.status) : r.status === filter);
    const q=search.trim().toLowerCase();
    return statusMatch && (!q || [r.id,r.user_id,r.plan_name,r.billing_cycle,r.status]
      .some(v => String(v||'').toLowerCase().includes(q)));
  }),[records,filter,search]);
  const selected = records.find(r => r.id===selectedId) || null;

  function select(request: BillingRequest) {
    setSelectedId(request.id);
    setNote(request.staff_note || '');
    setPaymentReference('');
    setVerified(false);
  }
  async function action(name: 'review'|'request_payment'|'reject'|'activate') {
    if (!selected || busy) return;
    if (name === 'activate' &&
       (!verified || paymentReference.trim().length < 6 || note.trim().length < 12)) {
      toast.error('Check the bank settlement independently, enter a reference and detailed audit note, then confirm verification.');
      return;
    }
    setBusy(true);
    try {
      const { error: e } = await supabase.rpc('slbi_admin_billing_action', {
        p_id: selected.id, p_action: name, p_note: note.trim(),
        p_payment_reference: name === 'activate' ? paymentReference.trim() : null,
        p_verified: name === 'activate' ? verified : false,
      });
      if (e) throw e;
      toast.success(name === 'activate'
        ? 'Manual settlement recorded and subscription activated.'
        : 'Billing request updated.');
      setSelectedId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Billing action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return <div className="min-h-full bg-[#f8f9fb] p-8">
      <div className={panel + ' mx-auto max-w-xl p-7'}>
        <h1 className="text-lg font-bold text-[#234633]">Billing settlement workflow</h1>
        <p className="mt-3 text-xs leading-6 text-slate-600">
          Billing V2 is intentionally disabled until its RLS migration, server configuration and payment-verification tests pass in staging.
          Existing plan enquiries remain in the legacy billing inbox.
        </p>
        <Link href="/admin/billing/requests" className="mt-5 inline-flex text-xs font-bold text-[#286a49]">Open existing requests</Link>
      </div>
    </div>;
  }

  return <div className="min-h-full bg-[#f8f9fb] px-4 py-6 md:px-8">
    <div className="mx-auto max-w-[1450px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7ebe8] pb-5">
        <div>
          <Link href="/admin/billing" className="text-[11px] font-bold text-[#377855]">← Billing overview</Link>
          <div className="mt-3 flex items-center gap-3">
            <IconsaxIcon name="shield-tick" size={24} color="#266b47"/>
            <h1 className="text-2xl font-bold text-[#1b3a2b]">Payment review & activation</h1>
          </div>
          <p className="mt-2 text-xs text-slate-500">Audited manual settlement only. No payment gateway is integrated.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg border border-[#dee7e1] bg-white px-4 py-2 text-xs font-bold text-[#286647] disabled:opacity-50">Refresh</button>
      </header>
      <div className="rounded-lg border border-[#f0ddad] bg-[#fffcf4] p-4 text-[11px] leading-5 text-[#785f23]">
        A customer request or screenshot is not proof of payment. Activate ONLY after confirming settlement against the official provider/bank account.
        Staff confirmation, reference and audit notes are permanently recorded. Paid receipts remain account records, not tax invoices.
      </div>
      <section className={panel + ' overflow-hidden'}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eef0ee] p-4">
          <input aria-label="Find billing request" placeholder="Search plan, account or reference…" value={search} onChange={e=>setSearch(e.target.value)}
            className="h-10 min-w-[180px] flex-1 rounded-lg border border-[#e2e8e3] px-3 text-xs outline-none"/>
          <select aria-label="Filter billing requests" value={filter} onChange={e=>setFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#e2e8e3] bg-white px-3 text-xs">
            {['open','all','submitted','reviewing','awaiting_payment','activated','rejected','cancelled'].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
          </select>
          <span className="text-xs font-semibold text-slate-500">{filtered.length} requests</span>
        </div>
        {error && <p className="m-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
        {loading ? <p className="p-8 text-xs text-slate-500">Loading billing requests…</p> :
          !filtered.length ? <p className="p-8 text-xs text-slate-500">No matching billing requests.</p> :
          <div className="divide-y divide-[#edf1ee]">{filtered.map(r=>
            <button type="button" key={r.id} onClick={()=>select(r)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#f8fbf9]">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1f4832]">{r.plan_name} · {r.billing_cycle}</p>
                <p className="mt-1 break-all text-[10px] text-slate-500">{r.user_id} · {formatted(r.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-bold text-[#1f4832]">{money(Number(r.quoted_lkr))}</p>
                <p className="mt-1 text-[10px] font-semibold capitalize text-[#367b51]">{r.status.replaceAll('_',' ')}</p>
              </div>
            </button>
          )}</div>}
      </section>
    </div>
    {selected && <div className="fixed inset-0 z-[99] flex justify-end bg-[#183325]/45" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setSelectedId(null)}}>
      <section role="dialog" aria-modal="true" aria-label="Payment verification review" className="flex h-full w-full max-w-[540px] flex-col bg-white shadow-2xl">
        <div className="flex justify-between border-b p-5">
          <div><h2 className="font-bold text-[#214533]">{selected.plan_name}</h2>
          <p className="mt-1 text-xs text-slate-500">{selected.billing_cycle} · {money(Number(selected.quoted_lkr))}</p></div>
          <button onClick={()=>setSelectedId(null)} disabled={busy} className="text-xs font-semibold text-slate-500">Close</button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-lg bg-[#f6f9f7] p-3 text-[11px] text-slate-600">
            <p className="font-bold capitalize">{selected.status.replaceAll('_',' ')}</p>
            <p className="mt-2 break-all">Request ID: {selected.id}</p>
            <p className="mt-1 break-all">Account: {selected.user_id}</p>
            {selected.invoice_id && <p className="mt-1 break-all">Invoice record: {selected.invoice_id}</p>}
          </div>
          <label className="block text-[11px] font-bold text-[#315440]">
            Internal review / settlement note
            <textarea rows={4} value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Record the verified payment date, bank statement reference and finance review details…"
              className="mt-2 w-full rounded-lg border border-[#dde6df] p-3 text-[12px] font-normal outline-none" />
          </label>
          {selected.status==='awaiting_payment' && <>
            <label className="block text-[11px] font-bold text-[#315440]">
              Official settlement reference
              <input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)}
                placeholder="Bank/payment provider transaction reference" className="mt-2 h-10 w-full rounded-lg border border-[#dde6df] px-3 text-xs font-normal"/>
            </label>
            <label className="flex items-start gap-2 text-[11px] leading-5 text-slate-700">
              <input type="checkbox" className="mt-1" checked={verified} onChange={e=>setVerified(e.target.checked)}/>
              I independently verified this exact amount against the official bank/payment provider settlement, not a customer screenshot.
            </label>
          </>}
        </div>
        <div className="flex flex-wrap gap-2 border-t p-4">
          {selected.status==='submitted' && <button onClick={()=>void action('review')} disabled={busy} className="rounded-lg bg-[#205c40] px-4 py-3 text-xs font-bold text-white">Start review</button>}
          {selected.status==='reviewing' && <button onClick={()=>void action('request_payment')} disabled={busy} className="rounded-lg bg-[#205c40] px-4 py-3 text-xs font-bold text-white">Await payment</button>}
          {selected.status==='awaiting_payment' && <button onClick={()=>void action('activate')} disabled={busy||!verified} className="rounded-lg bg-[#205c40] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">Verify & activate</button>}
          {['submitted','reviewing','awaiting_payment'].includes(selected.status) && <button onClick={()=>void action('reject')} disabled={busy} className="rounded-lg border border-red-200 px-4 py-3 text-xs font-bold text-red-700">Reject</button>}
          {!['submitted','reviewing','awaiting_payment'].includes(selected.status) && <p className="text-xs text-slate-500">This request has reached a terminal status.</p>}
        </div>
      </section>
    </div>}
  </div>;
}
