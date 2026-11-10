'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

type BillingRequest = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
};
const panel = 'rounded-xl border border-[#e7ebef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]';
function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}
function extractField(message: string, label: string) {
  const line = message.split(/\r?\n/).find(row => row.startsWith(label + ': '));
  return line ? line.slice(label.length + 2) : 'Not specified';
}

export default function AdminBillingRequestsPage() {
  const [requests, setRequests] = useState<BillingRequest[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Sign in required.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!profile || !['admin', 'ceo'].includes(profile.role)) throw new Error('Administrator access required.');
      // Contact submissions are admin-only by existing RLS. Never use a service role in the browser.
      const { data, error: queryError } = await supabase.from('contact_submissions')
        .select('id,name,email,subject,message,created_at')
        .eq('department', 'billing')
        .eq('location', 'vendor-billing')
        .order('created_at', { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      setRequests((data || []) as BillingRequest[]);
    } catch (caught) {
      console.error('Admin billing requests fetch failed', caught);
      setError(caught instanceof Error ? caught.message : 'Unable to load billing requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => !q || [r.id, r.email, r.name, r.subject, r.message]
      .some(v => String(v || '').toLowerCase().includes(q)));
  }, [requests, search]);
  const selected = requests.find(r => r.id === selectedId) || null;

  async function copyReference(id: string) {
    try { await navigator.clipboard.writeText(id); toast.success('Reference copied'); }
    catch { toast.error('Could not copy request reference.'); }
  }

  return (
    <div className="min-h-full bg-[#f8f9fb] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7ebef] pb-5">
          <div className="space-y-2">
            <Link href="/admin/billing" className="text-[11px] font-semibold text-[#377855] hover:underline">← Back to billing administration</Link>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">Subscription upgrade requests</h1>
            <p className="text-[12px] text-slate-500">Review vendor requests received through the authenticated billing workspace.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading}
            className="h-9 rounded-lg border border-[#e0e8e3] bg-white px-4 text-[11px] font-bold text-[#34664b] hover:bg-[#f3f8f4] disabled:opacity-50">Refresh requests</button>
        </div>

        <div className="rounded-xl border border-[#e5eadc] bg-[#f6faf4] px-4 py-3 text-[11px] leading-6 text-[#42674b]">
          These records are <strong>subscription enquiries only</strong>. No payment has been collected or verified by creating a request. Confirm payment independently and use a trusted administrative process before changing subscriptions or Growth OS entitlements. This inbox does not activate plans or issue paid invoices.
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-800">{error}</div>}
        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1ef] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#244130]">Incoming requests</h2>
              <p className="mt-1 text-[10px] text-slate-400">Most recent 200 entries · customer-submitted requests</p>
            </div>
            <span className="rounded-md bg-[#ecf5ef] px-3 py-1 text-[11px] font-bold text-[#2e6a49]">{loading ? 'Loading…' : filtered.length + ' requests'}</span>
          </div>
          <div className="border-b border-[#eef1ef] px-5 py-3">
            <label className="sr-only" htmlFor="billing-request-search">Search requests</label>
            <input id="billing-request-search" type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search vendor, email, plan or reference…" className="h-10 w-full max-w-md rounded-lg border border-[#e2e8e5] px-3 text-[11px] outline-none focus:border-[#9cc6aa]" />
          </div>
          {loading ? <div className="space-y-3 p-5">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div> :
            error ? <p className="px-5 py-12 text-center text-xs text-slate-500">The inbox is unavailable.</p> :
            !filtered.length ? <p className="px-5 py-12 text-center text-xs text-slate-500">No subscription requests found.</p> :
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="border-b border-[#edf0f3] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr><th className="px-5 py-3">Vendor</th><th className="px-3 py-3">Requested plan</th><th className="px-3 py-3">Submitted</th><th className="px-5 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf0f2]">
                  {filtered.map(r => <tr key={r.id} className="hover:bg-[#fbfcfb]">
                    <td className="px-5 py-3.5"><p className="text-[12px] font-bold text-[#254734]">{r.name}</p><p className="mt-1 text-[10px] text-slate-400">{r.email}</p></td>
                    <td className="px-3 py-3.5"><p className="text-[12px] font-semibold text-slate-700">{extractField(r.message,'Requested plan')}</p><p className="mt-1 text-[10px] text-slate-400">{extractField(r.message,'Billing period')}</p></td>
                    <td className="px-3 py-3.5 text-[11px] text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-5 py-3.5 text-right"><button type="button" onClick={() => setSelectedId(r.id)} className="h-9 rounded-lg border border-[#e2e8e3] bg-white px-3 text-[11px] font-bold text-[#2a6749] hover:bg-[#f3f8f4]">View request</button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>}
        </section>

        {selected && <div className="fixed inset-0 z-[95] flex justify-end bg-[#162b20]/40" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <section role="dialog" aria-modal="true" aria-label="Subscription request details" className="flex h-full w-full max-w-[540px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf0ee] p-5">
              <div><h2 className="text-[15px] font-bold text-[#254632]">Subscription request</h2><p className="mt-1 text-[11px] text-slate-400">Received {formatDate(selected.created_at)}</p></div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-[12px] font-bold text-[#254632]">{selected.name}</p>
              <p className="break-all text-[11px] text-slate-500">{selected.email}</p>
              <p className="break-all rounded-lg bg-[#f5f7f6] p-3 text-[10px] text-slate-500">Request reference: {selected.id}</p>
              <div><h3 className="text-[11px] font-bold text-[#254632]">Submitted details</h3><p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#e7ece9] bg-[#fbfcfb] p-4 text-[11px] leading-6 text-slate-700">{selected.message}</p></div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">Do not activate this plan based on the request alone. Obtain official payment confirmation first.</div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#edf0ee] p-4">
              <button type="button" onClick={() => void copyReference(selected.id)} className="h-10 rounded-lg border border-[#e1e7e3] bg-white px-4 text-[11px] font-bold text-slate-600">Copy reference</button>
              <a className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#1c4d3b] px-4 text-[11px] font-bold text-white"
                href={'mailto:' + encodeURIComponent(selected.email) + '?subject=' + encodeURIComponent('SL Business Index – Subscription request ' + selected.id) + '&body=' + encodeURIComponent('Hello,\n\nWe have received your subscription request. We will confirm payment instructions and activation details separately.\n\nRequest reference: ' + selected.id + '\n')}>
                Reply by email
              </a>
            </div>
          </section>
        </div>}
      </div>
    </div>
  );
}
