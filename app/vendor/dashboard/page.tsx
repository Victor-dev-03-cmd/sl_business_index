'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';
import VendorAnalytics from './VendorAnalytics';

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  status: string | null;
  is_open: boolean | null;
  views: number | null;
  calls: number | null;
}
interface Review {
  id: string;
  user_name: string | null;
  created_at: string;
  rating: number | null;
  businessName: string;
}
interface Metrics {
  views: number;
  calls: number;
  leads: number;
  reviews: number;
}
type StatusFilter = 'all' | 'approved' | 'pending' | 'open';
type SortKey = 'views' | 'calls' | 'name';
const DEFAULT_METRICS: Metrics = { views: 0, calls: 0, leads: 0, reviews: 0 };
const number = (n: number) => new Intl.NumberFormat('en-LK').format(n);
const smallLabel = 'text-[10px] font-bold uppercase tracking-[0.10em] text-slate-400';
const panel = 'border border-[#e7ebef] bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.025)]';
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e1e6eb] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#baccc4] hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50';

const kpis = [
  { id: 'views', title: 'Profile views', icon: 'eye', tone: '#2563eb', explanation: 'All-time visits to your listings' },
  { id: 'calls', title: 'Call clicks', icon: 'call', tone: '#129568', explanation: 'Clicks on listed phone numbers' },
  { id: 'leads', title: 'Enquiries', icon: 'message-text', tone: '#8963c8', explanation: 'Received customer enquiries' },
  { id: 'reviews', title: 'Reviews', icon: 'star', tone: '#ce9a3b', explanation: 'Customer feedback received' },
] as const;

function csvCell(value: string | number): string {
  let text = String(value);
  // Prevent formulas from executing when opening an exported CSV in Excel.
  if (/^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export default function VendorDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [plan, setPlan] = useState('Basic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('views');
  const [page, setPage] = useState(1);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Sign in to access your vendor workspace.');

      const [businessResult, subResult] = await Promise.all([
        supabase.from('businesses').select('id,name,logo_url,status,is_open,views,calls').eq('owner_id', user.id),
        supabase.from('subscriptions').select('plan_name').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      ]);
      if (businessResult.error) throw businessResult.error;

      const owned = (businessResult.data || []) as Business[];
      setBusinesses(owned);
      setPlan(subResult.data?.plan_name || 'Basic');
      setReviews([]);
      setMetrics({
        views: owned.reduce((sum, b) => sum + Number(b.views || 0), 0),
        calls: owned.reduce((sum, b) => sum + Number(b.calls || 0), 0),
        leads: 0,
        reviews: 0,
      });
      if (!owned.length) return;

      const ids = owned.map(b => b.id);
      const [leadResult, reviewResult, recentResult] = await Promise.all([
        supabase.from('leads').select('id', { head: true, count: 'exact' }).in('business_id', ids),
        supabase.from('reviews').select('id', { head: true, count: 'exact' }).in('business_id', ids),
        supabase.from('reviews').select('id,user_name,rating,created_at,businesses(name)')
          .in('business_id', ids).order('created_at', { ascending: false }).limit(5),
      ]);
      if (leadResult.error) throw leadResult.error;
      if (reviewResult.error) throw reviewResult.error;
      if (recentResult.error) throw recentResult.error;

      setMetrics({
        views: owned.reduce((sum, b) => sum + Number(b.views || 0), 0),
        calls: owned.reduce((sum, b) => sum + Number(b.calls || 0), 0),
        leads: leadResult.count || 0,
        reviews: reviewResult.count || 0,
      });
      setReviews((recentResult.data || []).map(r => {
        const joined = r.businesses as unknown as { name?: string } | { name?: string }[] | null;
        return {
          id: r.id,
          user_name: r.user_name,
          rating: typeof r.rating === 'number' ? r.rating : null,
          created_at: r.created_at,
          businessName: Array.isArray(joined) ? joined[0]?.name || 'Your business' : joined?.name || 'Your business',
        };
      }));
    } catch (e) {
      console.error('Vendor dashboard load error', e);
      setError(e instanceof Error ? e.message : 'Unable to load your business statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleOpen(business: Business) {
    if (updatingIds.includes(business.id)) return;
    setUpdatingIds(prev => [...prev, business.id]);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError || new Error('Sign in required.');
      const { error: updateError } = await supabase.from('businesses')
        .update({ is_open: !business.is_open })
        .eq('owner_id', user.id).eq('id', business.id).select('id').single();
      if (updateError) throw updateError;
      setBusinesses(prev => prev.map(row => row.id === business.id ? { ...row, is_open: !business.is_open } : row));
      toast.success('Opening status saved.');
    } catch (e) {
      console.error('Business update failed', e);
      toast.error('Could not update your business. Try again.');
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== business.id));
    }
  }

  const businessIds = useMemo(() => businesses.map(b => b.id), [businesses]);
  const activeCount = businesses.filter(b => b.status === 'approved').length;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return businesses.filter(b => {
      const matchesName = b.name.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && b.status === 'approved') ||
        (statusFilter === 'pending' && b.status !== 'approved') ||
        (statusFilter === 'open' && !!b.is_open);
      return matchesName && matchesStatus;
    }).sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) :
      sort === 'calls' ? Number(b.calls || 0) - Number(a.calls || 0) :
      Number(b.views || 0) - Number(a.views || 0)
    );
  }, [businesses, query, statusFilter, sort]);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const callRate = metrics.views ? (metrics.calls / metrics.views) * 100 : null;
  const opportunities = [
    ...(businesses.length === 0 ? [{ icon: 'add-circle', title: 'Add your first business', body: 'Create a business listing to start getting discovered.', href: '/register-business', link: 'Register business' }] : []),
    ...(businesses.some(b => b.status !== 'approved') ? [{ icon: 'shield-tick', title: 'Listings awaiting review', body: 'Check the status of your submitted business details.', href: '/vendor/my-businesses', link: 'Review listings' }] : []),
    ...(metrics.views > 0 && metrics.calls === 0 ? [{ icon: 'call', title: 'Make it easy to contact you', body: 'Your listing has views but no recorded call clicks. Check the phone details on your profile.', href: '/vendor/my-businesses', link: 'Check contact details' }] : []),
    ...(metrics.reviews === 0 && businesses.length > 0 ? [{ icon: 'star', title: 'Build customer trust', body: 'Keep an eye on customer reviews as your business grows.', href: '/vendor/reviews', link: 'Open reviews' }] : []),
  ].slice(0, 3);

  function exportCsv() {
    const headers = ['Business', 'Listing status', 'Open status', 'Profile views', 'Call clicks'];
    const rows = filtered.map(b => [b.name, b.status || 'pending', b.is_open ? 'Open' : 'Closed', Number(b.views || 0), Number(b.calls || 0)]);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'slbi-business-performance.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="-m-4 min-h-full bg-[#f8f9fb] p-4 text-slate-800 md:-m-8 md:p-6 xl:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">

        <div className="flex flex-col gap-4 border-b border-[#e7ebef] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> Overview
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">Business overview</h1>
            <p className="text-[12px] text-slate-500">Your listings, customer engagement and performance in one workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 items-center gap-2 rounded-lg border border-[#dfebe4] bg-[#f1f7f2] px-3 text-[11px] font-semibold text-[#37694c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#329368]" /> {plan} plan
            </span>
            <Link href="/vendor/insights" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C7DCD0] bg-[#EBF6EE] px-3 text-xs font-bold text-[#256143] transition hover:bg-[#DCF0E2]"><IconsaxIcon name="status-up" size={15} /> Growth insights</Link>
            <button type="button" onClick={() => void load()} disabled={loading} className={button}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <Link href="/vendor/marketing" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1c4d3b] px-3.5 text-xs font-bold text-white transition hover:bg-[#2d664f]">
              <IconsaxIcon name="add" size={17} /> New promotion
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">Retry loading</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold text-[#1d3f31]">Performance snapshot</h2>
            <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">All-time</span>
          </div>
          <p className="text-[11px] text-slate-400">Recorded counters · Not unique visitors or verified sales</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpis.map(kpi => (
            <div key={kpi.id} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{kpi.title}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.tone + '12', color: kpi.tone }}>
                  <IconsaxIcon name={kpi.icon} variant="linear" size={18} />
                </span>
              </div>
              <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#182b25]">
                {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" /> : number(metrics[kpi.id])}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{kpi.explanation}</p>
            </div>
          ))}
          <div className={panel + ' col-span-2 min-w-0 p-4 lg:col-span-1'}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Call-click rate</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff5f0] text-[#277650]">
                <IconsaxIcon name="chart" size={18} />
              </span>
            </div>
            <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#182b25]">
              {loading ? '—' : callRate === null ? '—' : callRate.toFixed(1) + '%'}
            </p>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">Call clicks ÷ views · not unique-user conversion</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.85fr)]">
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f2] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-bold text-[#23372e]">Engagement trends</h2>
                <p className="mt-1 text-[11px] text-slate-400">Views, calls and lead activity recorded during the selected period</p>
              </div>
              <Link href="/vendor/growth" className="flex items-center gap-1 text-[11px] font-semibold text-[#28704e] hover:underline">
                Growth tools <IconsaxIcon name="arrow-right-2" size={13} />
              </Link>
            </div>
            <div className="p-4 sm:p-5">
              <VendorAnalytics businessIds={businessIds} embedded />
            </div>
          </section>

          <section className={panel + ' min-w-0'}>
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-bold text-[#23372e]">Portfolio health</h2>
                <p className="mt-1 text-[11px] text-slate-400">Current listing and enquiry overview</p>
              </div>
              <IconsaxIcon name="status-up" size={19} color="#3f7860" />
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: businesses.length, label: 'Businesses' },
                  { value: activeCount, label: 'Published' },
                  { value: businesses.filter(b => b.is_open).length, label: 'Open*' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-[#eef1f0] bg-[#fbfcfb] py-3 text-center">
                    <p className="text-xl font-bold tabular-nums text-[#203d30]">{loading ? '—' : number(item.value)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] leading-5 text-slate-400">*Open status reflects your manually selected business availability.</p>
              <div className="border-t border-[#eef0f2] pt-4">
                <h3 className="text-[11px] font-bold text-[#263e31]">Recommended actions</h3>
                {loading ? (
                  <p className="mt-4 text-[11px] text-slate-400">Loading recommendations…</p>
                ) : opportunities.length ? (
                  <div className="mt-2 divide-y divide-[#eef0f2]">
                    {opportunities.map(opportunity => (
                      <div key={opportunity.title} className="py-3">
                        <div className="flex items-center gap-2">
                          <IconsaxIcon name={opportunity.icon} size={17} color="#386b51" />
                          <p className="text-[11px] font-semibold text-[#2d4636]">{opportunity.title}</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-5 text-slate-500">{opportunity.body}</p>
                        <Link href={opportunity.href} className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#2b7955] hover:underline">
                          {opportunity.link} <IconsaxIcon name="arrow-right-2" size={11} />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-[#f2f7f3] p-3 text-[11px] leading-5 text-[#476b54]">
                    Your listings are in good shape. Keep customer details and promotions up to date.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold text-[#23392f]">Business performance</h2>
              <p className="mt-1 text-[11px] text-slate-400">Search, filter and compare your registered business listings</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportCsv} disabled={!filtered.length} className={button}>
                <IconsaxIcon name="document-download" size={16} /> Export CSV
              </button>
              <Link href="/vendor/my-businesses" className={button}>
                Manage listings <IconsaxIcon name="arrow-right-2" size={13} />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[#e9edf0] px-4 py-3 sm:px-5">
            <div className="relative min-w-[180px] flex-1 sm:max-w-[340px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconsaxIcon name="search-normal" size={16} />
              </span>
              <input value={query} aria-label="Search businesses" onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search businesses…" className="h-9 w-full rounded-lg border border-[#e1e6ec] bg-white pl-9 pr-3 text-[12px] text-slate-700 outline-none transition focus:border-[#9cb9aa]" />
            </div>
            <select aria-label="Filter businesses" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-3 text-xs text-slate-600 focus:border-[#9cb9aa]">
              <option value="all">All listings</option>
              <option value="approved">Published</option>
              <option value="pending">Pending / review</option>
              <option value="open">Open businesses</option>
            </select>
            <select aria-label="Sort businesses" value={sort} onChange={e => { setSort(e.target.value as SortKey); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-3 text-xs text-slate-600 focus:border-[#9cb9aa]">
              <option value="views">Most viewed</option>
              <option value="calls">Most calls</option>
              <option value="name">Name A–Z</option>
            </select>
            <span className="ml-auto whitespace-nowrap text-[11px] text-slate-400">{filtered.length} results</span>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>
          ) : businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <IconsaxIcon name="shop" size={30} color="#7c9c8a" />
              <h3 className="text-sm font-bold text-[#324b3c]">No registered businesses yet</h3>
              <p className="text-xs text-slate-500">Add your first listing to start tracking its performance.</p>
              <Link href="/register-business" className="mt-2 rounded-lg bg-[#1c4d3b] px-4 py-2.5 text-xs font-semibold text-white">Register business</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-slate-500">No businesses match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-[#e9edf0] bg-[#f9fafb]">
                  <tr className={smallLabel}>
                    <th className="w-[36%] px-5 py-3 font-bold">Business name</th>
                    <th className="px-3 py-3 font-bold">Listing status</th>
                    <th className="px-3 py-3 text-right font-bold">Views</th>
                    <th className="px-3 py-3 text-right font-bold">Call clicks</th>
                    <th className="px-3 py-3 text-center font-bold">Availability</th>
                    <th className="px-5 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f3]">
                  {visible.map(business => {
                    const published = business.status === 'approved';
                    const busy = updatingIds.includes(business.id);
                    return (
                      <tr key={business.id} className="group transition hover:bg-[#fafcfb]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e5ebe7] bg-[#f4f8f5]">
                              {business.logo_url
                                ? <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                                : <IconsaxIcon name="shop" size={18} color="#648e72" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#233d30]">{business.name}</p>
                              <p className="mt-0.5 max-w-[220px] truncate font-mono text-[10px] text-slate-400">{business.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ' + (published ? 'bg-[#eaf6ee] text-[#2b8b54]' : 'bg-[#fff5e8] text-[#af792c]')}>
                            <span className={'h-1.5 w-1.5 rounded-full ' + (published ? 'bg-[#2b9c61]' : 'bg-[#d19c45]')} />
                            {published ? 'Published' : business.status === 'rejected' ? 'Needs attention' : 'Under review'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-700">{number(Number(business.views || 0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-700">{number(Number(business.calls || 0))}</td>
                        <td className="px-3 py-3 text-center">
                          <button type="button" disabled={busy} onClick={() => void toggleOpen(business)}
                            aria-label={(business.is_open ? 'Mark closed: ' : 'Mark open: ') + business.name}
                            className={'rounded-md border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50 ' + (business.is_open ? 'border-[#d8efe0] bg-[#f0faf3] text-[#268459]' : 'border-[#e6e9ec] bg-[#f7f8fa] text-slate-500')}>
                            {busy ? 'Saving…' : business.is_open ? 'Open' : 'Closed'}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={'/vendor/my-businesses/' + business.id + '/edit'} aria-label={'Edit ' + business.name}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-[#eef5f0] hover:text-[#26774e]">
                            <IconsaxIcon name="edit-2" size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e9edf0] px-5 py-3">
            <p className="text-[11px] text-slate-400">{filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} businesses</p>
            <div className="flex items-center gap-2">
              <button type="button" className={button + ' h-8'} disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
              <span className="text-[11px] text-slate-500">{safePage} / {totalPages}</span>
              <button type="button" className={button + ' h-8'} disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={panel + ' overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#e9edf0] px-5 py-4">
              <div><h2 className="text-[13px] font-bold text-[#22392d]">Recent customer activity</h2><p className="mt-1 text-[11px] text-slate-400">Latest reviews on your listings</p></div>
              <Link href="/vendor/reviews" className="flex items-center gap-1 text-[11px] font-semibold text-[#287750]">All reviews <IconsaxIcon name="arrow-right-2" size={12} /></Link>
            </div>
            {loading ? <p className="p-5 text-xs text-slate-400">Loading reviews…</p> : reviews.length === 0 ? (
              <p className="p-7 text-center text-xs text-slate-400">No customer reviews recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#eef1f3]">
                {reviews.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f1e8] text-[#b28b4a]"><IconsaxIcon name="star" size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#2a4433]">{r.user_name || 'Customer'} · {r.businessName}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    {r.rating !== null && <span className="rounded-md bg-[#fff5e3] px-2 py-1 text-xs font-bold text-[#ae7c34]">{r.rating.toFixed(1)} / 5</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className={panel + ' overflow-hidden'}>
            <div className="border-b border-[#e9edf0] px-5 py-4"><h2 className="text-[13px] font-bold text-[#22392d]">Quick actions</h2><p className="mt-1 text-[11px] text-slate-400">Common tasks for your business</p></div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: 'My listings', href: '/vendor/my-businesses', icon: 'shop' },
                { label: 'Customer leads', href: '/vendor/leads', icon: 'people' },
                { label: 'Marketing', href: '/vendor/marketing', icon: 'flash' },
                { label: 'Growth OS', href: '/vendor/growth', icon: 'chart' },
              ].map(action => (
                <Link key={action.href} href={action.href} className="flex items-center justify-between gap-2 rounded-lg border border-[#e9edf0] p-3 text-xs font-semibold text-[#365242] transition hover:border-[#b6d5c4] hover:bg-[#f8fbf9]">
                  <span className="flex items-center gap-2"><IconsaxIcon name={action.icon} size={17} color="#427c5c" /> {action.label}</span>
                  <IconsaxIcon name="arrow-right-2" size={12} />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <p className="pb-3 text-center text-[10px] text-slate-400">SL Business Index · Vendor Intelligence · Metrics are derived from available business and analytics records.</p>
      </div>
    </div>
  );
}
