'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import IconsaxIcon from '../components/IconsaxIcon';

type Wallet = {
  plan_name: string;
  monthly_allowance: number;
  credits_remaining: number;
  credits_used: number;
  period_start: string;
  resets_at: string;
};
type LedgerEntry = {
  id: number;
  action_key: string;
  delta: number;
  balance_after: number;
  created_at: string;
};

const panel = 'rounded-xl border border-[#e7ebef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]';
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e1e6eb] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#baccc4] hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50';
const format = (n: number) => new Intl.NumberFormat('en-LK').format(n);
const plannedTools = [
  { title: 'Domain SEO Studio', icon: 'global', description: 'Domain verification, website audits and keyword tracking.', cost: '10 credits / audit', label: 'SEO & discovery' },
  { title: 'AI Social Marketing', icon: 'flash', description: 'Brand-aware social content drafts and campaign scheduling.', cost: '2 credits / draft', label: 'Social media' },
  { title: 'AI Email Marketing', icon: 'sms', description: 'Opt-in email campaigns and AI-assisted writing.', cost: '3 credits / draft', label: 'Email campaigns' },
];

export default function VendorGrowthCenterPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('Please sign in to view your Growth Credits.');
      const { data: snapshot, error: walletError } = await supabase.rpc('growth_wallet_status');
      if (walletError) {
        if (['PGRST202', '42883', '42P01'].includes(walletError.code)) {
          throw new Error('Growth Credits are not configured yet. The database migration needs to be applied.');
        }
        throw new Error('Unable to load your Growth Credits. Please try again.');
      }
      const row = Array.isArray(snapshot) ? snapshot[0] : null;
      if (!row) throw new Error('Your Growth Credits wallet is currently unavailable.');
      setWallet(row as Wallet);
      const { data: entries, error: historyError } = await supabase
        .from('growth_credit_ledger')
        .select('id, action_key, delta, balance_after, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (historyError) throw historyError;
      setHistory((entries || []) as LedgerEntry[]);
    } catch (caught) {
      setWallet(null);
      setHistory([]);
      setError(caught instanceof Error ? caught.message : 'Unable to load your Growth Credits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const allowance = Number(wallet?.monthly_allowance || 0);
  const used = Number(wallet?.credits_used || 0);
  const remaining = Number(wallet?.credits_remaining || 0);
  const usedPercentage = allowance > 0 ? Math.min(100, Math.max(0, (used / allowance) * 100)) : 0;
  const resetDate = wallet?.resets_at && !Number.isNaN(Date.parse(wallet.resets_at))
    ? new Date(wallet.resets_at).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="-m-4 min-h-full bg-[#f8f9fb] p-4 text-slate-800 md:-m-8 md:p-6 xl:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-[#e7ebef] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> Growth OS
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">Growth OS</h1>
            <p className="text-[12px] text-slate-500">Manage growth credits, monitor usage and discover upcoming marketing tools.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 items-center gap-2 rounded-lg border border-[#dfebe4] bg-[#f1f7f2] px-3 text-[11px] font-semibold text-[#37694c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#329368]" /> {wallet?.plan_name || 'Basic'} plan
            </span>
            <button type="button" onClick={() => void reload()} disabled={loading} className={button}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <Link href="/vendor/billing" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1c4d3b] px-3.5 text-xs font-bold text-white transition hover:bg-[#2d664f]">
              <IconsaxIcon name="card" size={16} color="#ffffff" /> Billing plans
            </Link>
          </div>
        </header>

        {error && (
          <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span>{error}</span>
            <button type="button" className="font-bold underline" onClick={() => void reload()}>Retry loading</button>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold text-[#1d3f31]">Credit overview</h2>
          <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Current billing period</span>
        </div>

        <section aria-label="Growth credit overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { title: 'Available credits', value: remaining, icon: 'flash', tone: '#2563eb', detail: 'Ready for enabled tools' },
            { title: 'Monthly allowance', value: allowance, icon: 'chart', tone: '#129568', detail: 'Included in your plan' },
            { title: 'Credits used', value: used, icon: 'status-up', tone: '#8963c8', detail: 'Consumed this period' },
          ].map(item => (
            <div key={item.title} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{item.title}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: item.tone + '12', color: item.tone }}>
                  <IconsaxIcon name={item.icon} size={18} />
                </span>
              </div>
              <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#182b25]">
                {loading || !wallet ? '—' : format(item.value)}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{item.detail}</p>
            </div>
          ))}
          <div className={panel + ' min-w-0 p-4'}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Next reset</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf6e9] text-[#b17b28]">
                <IconsaxIcon name="calendar" size={18} />
              </span>
            </div>
            <p className="mt-2 text-[20px] font-bold tracking-tight text-[#182b25]">{loading ? '—' : resetDate}</p>
            <p className="mt-3 text-[10px] text-slate-400">Plan-defined credit renewal</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.9fr)]">
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-bold text-[#23372e]">Credit utilization</h2>
                <p className="mt-1 text-[11px] text-slate-400">Live wallet figures, not forecasted usage</p>
              </div>
              <IconsaxIcon name="chart" size={19} color="#3f7860" />
            </div>
            <div className="space-y-5 px-5 py-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Used this period</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#1d392b]">{loading || !wallet ? '—' : usedPercentage.toFixed(1) + '%'}</p>
                </div>
                <p className="text-[11px] font-medium tabular-nums text-slate-500">{wallet ? format(used) + ' of ' + format(allowance) + ' credits' : 'No wallet data'}</p>
              </div>
              <div role="progressbar" aria-label="Credits used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPercentage} className="h-2.5 overflow-hidden rounded-full bg-[#eaf0ec]">
                <div className="h-full rounded-full bg-[#287b58] transition-[width] duration-300" style={{ width: usedPercentage + '%' }} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[#edf0ee] pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Remaining</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[#244634]">{wallet ? format(remaining) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Renewal date</p>
                  <p className="mt-1 text-sm font-bold text-[#244634]">{resetDate}</p>
                </div>
              </div>
            </div>
          </section>
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[13px] font-bold text-[#23372e]">Billing protection</h2>
              <p className="mt-1 text-[11px] text-slate-400">Verified credits and account entitlements</p>
            </div>
            <div className="px-5 py-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ecf5ee] text-[#317553]">
                <IconsaxIcon name="shield-tick" size={21} />
              </div>
              <h3 className="text-[12px] font-bold text-[#213c2d]">Verified credit allocation</h3>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Paid Growth Credits require a verified entitlement. Browser-only payment confirmations do not unlock credits.</p>
              <Link href="/vendor/billing" className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#28704e] hover:underline">
                Review billing <IconsaxIcon name="arrow-right-2" size={13} />
              </Link>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-bold text-[#1d3f31]">Growth tools</h2>
              <p className="mt-1 text-[11px] text-slate-400">Planned features only. No credits are deducted until a tool is enabled.</p>
            </div>
            <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Roadmap</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {plannedTools.map(tool => (
              <article key={tool.title} className={panel + ' flex min-w-0 flex-col p-4'}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6f1] text-[#277650]">
                    <IconsaxIcon name={tool.icon} size={19} />
                  </span>
                  <span className="rounded-md border border-[#f0e5cf] bg-[#fdf8ed] px-2 py-1 text-[10px] font-semibold text-[#99784d]">Coming soon</span>
                </div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{tool.label}</p>
                <h3 className="mt-1 text-[13px] font-bold text-[#23372e]">{tool.title}</h3>
                <p className="mt-2 min-h-[42px] flex-1 text-[11px] leading-5 text-slate-500">{tool.description}</p>
                <div className="mt-4 border-t border-[#edf0ee] pt-3 text-[10px] font-medium text-slate-500">
                  {tool.cost} <span className="text-slate-400">· Not active</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#23372e]">Credit activity</h2>
              <p className="mt-1 text-[11px] text-slate-400">Latest recorded wallet transactions</p>
            </div>
            <span className="text-[10px] text-slate-400">Last 10 entries</span>
          </div>
          {loading ? (
            <div role="status" className="p-6 text-xs text-slate-500">Loading credit activity…</div>
          ) : !history.length ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6f1] text-[#478061]"><IconsaxIcon name="document-download" size={20} /></span>
              <p className="text-[12px] font-bold text-[#2a4736]">No activity recorded yet</p>
              <p className="text-[11px] text-slate-400">Your credit transactions will appear here when available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="border-b border-[#e9edf0] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr><th scope="col" className="px-5 py-3">Activity</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3 text-right">Change</th><th scope="col" className="px-5 py-3 text-right">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ee]">
                  {history.map(entry => (
                    <tr key={entry.id} className="text-[11px] text-slate-600 hover:bg-[#fbfcfb]">
                      <td className="px-5 py-3 font-semibold capitalize text-[#2e4837]">{entry.action_key.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(entry.created_at).toLocaleString('en-LK')}</td>
                      <td className={'px-4 py-3 text-right font-bold tabular-nums ' + (entry.delta >= 0 ? 'text-[#2c7a55]' : 'text-[#ae6848]')}>{entry.delta > 0 ? '+' : ''}{format(entry.delta)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{format(entry.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
