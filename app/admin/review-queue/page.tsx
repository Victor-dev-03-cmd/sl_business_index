'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck, RotateCw, XCircle } from 'lucide-react';

type PendingReview = {
  id: string;
  business_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  moderation_status: string;
};
type QueueResponse = {
  reviews?: PendingReview[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

export default function ReviewModerationQueue() {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reviews?page=' + page, {
        credentials: 'same-origin', cache: 'no-store', signal,
      });
      const body: QueueResponse = await response.json();
      if (!response.ok || !Array.isArray(body.reviews) || typeof body.total !== 'number') {
        throw new Error(body.error || 'Unable to retrieve the staff moderation queue.');
      }
      if (signal?.aborted) return;
      setItems(body.reviews);
      setTotal(body.total);
    } catch (cause) {
      if (signal?.aborted) return;
      setItems([]);
      setTotal(0);
      setError(cause instanceof Error ? cause.message : 'Unable to load the review queue.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function decide(item: PendingReview, action: 'approve' | 'reject') {
    if (busyId) return;
    if (action === 'approve' && !window.confirm('Publish this review publicly?')) return;
    if (action === 'reject' && reason.trim().length < 5) {
      toast.error('Enter a rejection reason (at least 5 characters).');
      return;
    }
    setBusyId(item.id);
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: item.id, action,
          note: action === 'reject' ? reason.trim() : '',
        }),
      });
      const result: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Moderation action did not complete.');
      }
      toast.success(action === 'approve' ? 'Review published.' : 'Review rejected and kept private.');
      setRejectedId(null);
      setReason('');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to moderate review.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E5E9] bg-white px-6 py-7">
        <div>
          <div className="flex items-center gap-2 text-[#AE570D]">
            <ShieldCheck size={19} />
            <span className="text-xs font-bold uppercase tracking-widest">Admin / CEO only</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#202024]">Customer review approvals</h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-slate-600">
            Every new review starts as private and pending. Approval publishes it;
            rejection keeps the review and moderator reason for accountability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/moderation" className="rounded-lg border px-3 py-2 text-xs font-semibold">Safety reports</Link>
          <button type="button" onClick={() => void load()} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#222228] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <RotateCw size={14} /> Refresh
          </button>
        </div>
      </header>

      {error && <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
        {error} <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">Retry</button>
      </section>}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{loading || error ? 'Pending reviews unavailable' : total + ' pending reviews'}</span>
        <span>Page {page} · 50 per page</span>
      </div>

      {loading ? <p role="status" className="p-8 text-center text-sm text-slate-600">Loading review queue…</p>
        : !error && !items.length ? <div className="rounded-xl border bg-white p-12 text-center text-sm text-slate-600">
          No pending reviews on this page.
        </div>
        : <section aria-label="Reviews awaiting approval" className="grid gap-4">
          {items.map(item => (
            <article key={item.id} className="rounded-xl border border-[#E2E4E7] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#202024]">{item.user_name} · {item.rating}/5 stars</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Business ID: {item.business_id} · {new Date(item.created_at).toLocaleString('en-LK')}
                  </p>
                </div>
                <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">Pending</span>
              </div>
              <p className="my-4 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">
                {item.comment || 'No comment provided'}
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item, 'approve')}
                  className="flex items-center gap-2 rounded-lg bg-[#27724E] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  <CheckCircle2 size={14} /> Approve & publish
                </button>
                <button type="button" disabled={Boolean(busyId)}
                  onClick={() => { setRejectedId(rejectedId === item.id ? null : item.id); setReason(''); }}
                  className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50">
                  <XCircle size={14} /> Reject
                </button>
              </div>
              {rejectedId === item.id && (
                <form className="mt-4 space-y-2" onSubmit={event => { event.preventDefault(); void decide(item, 'reject'); }}>
                  <label htmlFor={'reject-reason-' + item.id} className="text-xs font-semibold text-slate-700">
                    Reason for rejection (staff audit only)
                  </label>
                  <textarea id={'reject-reason-' + item.id} required minLength={5} maxLength={500} rows={2}
                    value={reason} onChange={event => setReason(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                  <button type="submit" disabled={Boolean(busyId) || reason.trim().length < 5}
                    className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                    Confirm rejection
                  </button>
                </form>
              )}
            </article>
          ))}
        </section>}
      <nav aria-label="Review queue pages" className="flex justify-end gap-3">
        <button type="button" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}
          className="rounded-lg border bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
        <button type="button" disabled={loading || page * 50 >= total} onClick={() => setPage(p => p + 1)}
          className="rounded-lg border bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
      </nav>
    </main>
  );
}
