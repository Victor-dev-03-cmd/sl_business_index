'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { toast } from 'sonner';
import { Business } from '@/lib/types';
import IconsaxIcon from '../components/IconsaxIcon';

type Status = 'all' | 'approved' | 'pending' | 'rejected' | 'suspended';
type Sort = 'newest' | 'oldest' | 'name' | 'views';
type BusinessRecord = Business & { views?: number | null; calls?: number | null; is_open?: boolean | null };
const panel = 'rounded-xl border border-[#e7ebef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]';
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e1e6eb] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#baccc4] hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50';
const number = (value: number) => new Intl.NumberFormat('en-LK').format(value);
const statuses: Status[] = ['all', 'approved', 'pending', 'rejected', 'suspended'];

function statusDetails(value?: Business['status']) {
  switch (value) {
    case 'approved': return { label: 'Published', className: 'border-[#d5eadc] bg-[#eef8f1] text-[#267348]', icon: 'tick-circle' };
    case 'pending': return { label: 'Pending review', className: 'border-[#f1e3c8] bg-[#fffaec] text-[#a57727]', icon: 'calendar' };
    case 'rejected': return { label: 'Rejected', className: 'border-[#f5d6d5] bg-[#fff2f1] text-[#b34949]', icon: 'close-circle' };
    case 'suspended': return { label: 'Suspended', className: 'border-[#efd9d7] bg-[#fff4f2] text-[#9f5147]', icon: 'shield-tick' };
    default: return { label: 'Under review', className: 'border-[#e3e8ef] bg-[#f5f7fa] text-slate-600', icon: 'calendar' };
  }
}

function profileScore(b: BusinessRecord) {
  const fields = [
    b.name, b.category, b.description, b.logo_url, b.image_url, b.phone,
    b.email, b.address, b.website_url, b.working_hours,
  ];
  const complete = fields.filter(v => typeof v === 'string' && v.trim().length > 0).length;
  return Math.round((complete / fields.length) * 100);
}

function listingUrl(b: BusinessRecord) {
  return '/business/' + encodeURIComponent(String(b.slug || b.id));
}

function safeCsvCell(v: string | number) {
  let raw = String(v);
  if (/^\s*[=+@-]/.test(raw)) raw = "'" + raw;
  return '"' + raw.replace(/"/g, '""') + '"';
}

export default function MyBusinessesPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: businesses = [], isLoading: businessesLoading, error: businessesError, refetch, isFetching } = useQuery({
    queryKey: ['my-businesses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as BusinessRecord[];
      const { data, error } = await supabase.from('businesses').select('*')
        .eq('owner_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BusinessRecord[];
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('subscriptions').select('plan_name')
        .eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const planName = subscription?.plan_name || 'Basic';
  const { data: planDetails, isError: planError } = useQuery({
    queryKey: ['plan-details', planName],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans')
        .select('max_listings').eq('name', planName).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const count = businesses.length;
  const maxListings = typeof planDetails?.max_listings === 'number' ? planDetails.max_listings : null;
  const limitReached = maxListings !== null && count >= maxListings;
  const available = maxListings === null ? null : Math.max(0, maxListings - count);
  const approved = businesses.filter(b => b.status === 'approved').length;
  const pending = businesses.filter(b => !b.status || b.status === 'pending').length;
  const needsAttention = businesses.filter(b => b.status === 'rejected' || b.status === 'suspended').length;
  const categories = useMemo(() => Array.from(new Set(businesses.map(b => b.category?.trim()).filter((v): v is string => !!v))).sort(), [businesses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return businesses.filter(b => {
      const matchesSearch = !term || [b.name, b.category, b.address, b.city, b.phone].some(v => String(v || '').toLowerCase().includes(term));
      const matchesStatus = status === 'all' || (status === 'pending' ? !b.status || b.status === 'pending' : b.status === status);
      const matchesCategory = category === 'all' || b.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'views') return Number(b.views || 0) - Number(a.views || 0);
      const aTime = a.created_at ? Date.parse(a.created_at) || 0 : 0;
      const bTime = b.created_at ? Date.parse(b.created_at) || 0 : 0;
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [businesses, search, status, category, sort]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = businesses.find(b => String(b.id) === selectedId);

  function changeStatus(value: Status) { setStatus(value); setPage(1); }
  function exportCsv() {
    if (!filtered.length) return;
    const rows: (string | number)[][] = [
      ['Business', 'Category', 'Status', 'Address', 'Phone', 'Email', 'Profile completion', 'Views', 'Calls'],
      ...filtered.map(b => [b.name, b.category || '', b.status || 'pending', b.address || '', b.phone || '', b.email || '', profileScore(b) + '%', Number(b.views || 0), Number(b.calls || 0)]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(safeCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'slbi-my-businesses.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  async function copyProfile(b: BusinessRecord) {
    const url = window.location.origin + listingUrl(b);
    try { await navigator.clipboard.writeText(url); toast.success('Public profile link copied'); }
    catch { toast.error('Unable to copy link. Open the profile to copy its address.'); }
  }

  const loading = userLoading || (!!user && businessesLoading);
  if (!userLoading && !user) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-xl font-bold text-[#1c3f2f]">Sign in to manage your businesses</h1>
      <p className="mt-2 text-sm text-slate-500">Your registered business listings are available in your vendor account.</p>
      <Link href="/login?redirect=/vendor/my-businesses" className="mt-5 inline-flex rounded-lg bg-[#1c4d3b] px-5 py-2.5 text-xs font-bold text-white">Sign in</Link>
    </div>
  );

  return (
    <div className="-m-4 min-h-full bg-[#f8f9fb] p-4 text-slate-800 md:-m-8 md:p-6 xl:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-[#e7ebef] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> My Businesses
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">My Businesses</h1>
            <p className="text-[12px] text-slate-500">Manage your directory presence, listing details and publication status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void refetch()} disabled={loading || isFetching} className={button}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <Link href={limitReached ? '/vendor/billing' : '/register-business'}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1c4d3b] px-3.5 text-xs font-bold text-white transition hover:bg-[#2d664f]">
              <IconsaxIcon name={limitReached ? 'card' : 'add'} size={17} color="#ffffff" />
              {limitReached ? 'Upgrade plan' : 'Register business'}
            </Link>
          </div>
        </header>

        {businessesError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>Unable to load your businesses. Please check the connection and try again.</span>
            <button type="button" onClick={() => void refetch()} className="font-bold underline">Retry</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-bold text-[#1d3f31]">Portfolio overview</h2>
          <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Your listings only</span>
        </div>
        <section aria-label="Business portfolio summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total businesses', value: count, icon: 'shop', color: '#2563eb', hint: 'Registered listings' },
            { label: 'Published', value: approved, icon: 'tick-circle', color: '#129568', hint: 'Approved by administrators' },
            { label: 'Pending review', value: pending, icon: 'calendar', color: '#bd8634', hint: 'Awaiting moderation' },
            { label: 'Needs attention', value: needsAttention, icon: 'shield-tick', color: '#b45d59', hint: 'Rejected or suspended' },
          ].map(item => (
            <div key={item.label} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{item.label}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: item.color + '12', color: item.color }}>
                  <IconsaxIcon name={item.icon} size={18} />
                </span>
              </div>
              <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#182b25]">{loading ? '—' : number(item.value)}</p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{item.hint}</p>
            </div>
          ))}
        </section>

        <section className={panel + ' px-4 py-4 sm:px-5'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold text-[#233d2e]">Listing allowance <span className="ml-1 text-[10px] font-semibold text-slate-400">· {planName} plan</span></p>
              <p className="mt-1 text-[11px] text-slate-500">
                {maxListings === null ? (planError ? 'Unable to verify your listing allowance.' : 'Checking your listing allowance…') :
                  `${number(count)} of ${number(maxListings)} listings used · ${number(available || 0)} remaining`}
              </p>
            </div>
            <Link href="/vendor/billing" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#28704e] hover:underline">
              Manage plan <IconsaxIcon name="arrow-right-2" size={13} />
            </Link>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ebf0ed]">
            <div className="h-full rounded-full bg-[#347e5b] transition-[width]" style={{ width: maxListings === null || maxListings <= 0 ? '0%' : Math.min(100, count / maxListings * 100) + '%' }} />
          </div>
          {limitReached && <p className="mt-2 text-[10px] font-medium text-[#986b2b]">Your plan's listing allowance is full. Review billing options to add another business.</p>}
        </section>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#23392f]">Business directory</h2>
              <p className="mt-1 text-[11px] text-slate-400">Search, review and manage your business profiles</p>
            </div>
            <button type="button" onClick={exportCsv} disabled={!filtered.length} className={button}>
              <IconsaxIcon name="document-download" size={15} /> Export CSV
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f3] px-4 py-3 sm:px-5">
            <label className="relative min-w-[180px] flex-1 sm:max-w-[330px]">
              <span className="sr-only">Search businesses</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconsaxIcon name="search-normal" size={15} /></span>
              <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, category or location" className="h-9 w-full rounded-lg border border-[#e1e6ec] bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none focus:border-[#9cb9aa]" />
            </label>
            <select value={category} aria-label="Filter by category" onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="h-9 max-w-[180px] rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All categories</option>
              {categories.map(c => <option value={c} key={c}>{c}</option>)}
            </select>
            <select value={sort} aria-label="Sort listings" onChange={e => { setSort(e.target.value as Sort); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option><option value="views">Most views</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#edf0f3] px-4 py-2.5 sm:px-5" aria-label="Filter by listing status">
            {statuses.map(s => (
              <button type="button" key={s} onClick={() => changeStatus(s)} aria-pressed={status === s}
                className={'rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ' + (status === s ? 'bg-[#eaf3ed] text-[#1b5438]' : 'text-slate-500 hover:bg-slate-100')}>
                {s === 'all' ? 'All' : s === 'approved' ? 'Published' : s === 'pending' ? 'Pending' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? <div role="status" className="space-y-3 p-5">{[0,1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div> :
          businessesError ? <div className="px-5 py-10 text-center text-xs text-slate-500">Business records are unavailable.</div> :
          !businesses.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6f1] text-[#347653]"><IconsaxIcon name="shop" size={24} /></span>
              <h3 className="text-[13px] font-bold text-[#223d2c]">No businesses registered yet</h3>
              <p className="max-w-sm text-[11px] leading-5 text-slate-500">Create your first business listing to appear in the Sri Lanka business directory.</p>
              <Link href="/register-business" className="mt-1 rounded-lg bg-[#1c4d3b] px-4 py-2.5 text-[11px] font-bold text-white">Register your first business</Link>
            </div>
          ) : !filtered.length ? (
            <div className="py-12 text-center">
              <p className="text-[12px] font-bold text-[#233d2e]">No matching businesses</p>
              <p className="mt-1 text-[11px] text-slate-400">Try a different keyword or clear the filters.</p>
              <button type="button" onClick={() => { setSearch(''); setStatus('all'); setCategory('all'); setPage(1); }}
                className="mt-3 text-[11px] font-bold text-[#28704e] hover:underline">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-[#edf0f3] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr><th scope="col" className="px-5 py-3">Business</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-3 py-3">Completion</th><th scope="col" className="px-3 py-3 text-right">Views</th><th scope="col" className="px-3 py-3 text-right">Calls</th><th scope="col" className="px-5 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f2]">
                    {visible.map(b => {
                      const st = statusDetails(b.status);
                      const score = profileScore(b);
                      return (
                        <tr key={String(b.id)} className="hover:bg-[#fbfcfb]">
                          <td className="max-w-[320px] px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e8eeea] bg-[#f3f7f4] text-[#769080]">
                                {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-cover" /> : <IconsaxIcon name="shop" size={21} />}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[12px] font-bold text-[#223b2c]">{b.name}</p>
                                <p className="mt-1 truncate text-[10px] text-slate-400">{[b.category, b.city || b.address].filter(Boolean).join(' · ') || 'Business information'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><span className={'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ' + st.className}><IconsaxIcon name={st.icon} size={12} /> {st.label}</span></td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2"><span className="w-9 text-[11px] font-bold tabular-nums text-[#274a36]">{score}%</span><div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#eaf0ec]"><div className="h-full rounded-full bg-[#40916c]" style={{ width: score + '%' }} /></div></div>
                          </td>
                          <td className="px-3 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-600">{typeof b.views === 'number' ? number(b.views) : '—'}</td>
                          <td className="px-3 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-600">{typeof b.calls === 'number' ? number(b.calls) : '—'}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => setSelectedId(String(b.id))} className={button} aria-label={'View details of ' + b.name}><IconsaxIcon name="eye" size={14} /> Details</button>
                              <Link className={button} href={`/vendor/my-businesses/${encodeURIComponent(String(b.id))}/edit`}><IconsaxIcon name="setting-2" size={14} /> Edit</Link>
                              {b.status === 'approved' && <Link className={button} title="Open public profile" target="_blank" rel="noopener noreferrer" href={listingUrl(b)}><IconsaxIcon name="arrow-right-2" size={14} /></Link>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[#eef0f2] lg:hidden">
                {visible.map(b => {
                  const st = statusDetails(b.status);
                  const score = profileScore(b);
                  return <article key={String(b.id)} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e8eeea] bg-[#f3f7f4] text-[#769080]">{b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-cover" /> : <IconsaxIcon name="shop" size={22} />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-[#223b2c]">{b.name}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{[b.category, b.city || b.address].filter(Boolean).join(' · ') || 'Business listing'}</p>
                        <span className={'mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ' + st.className}>{st.label}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                      <span>Profile completion <strong className="text-[#24553b]">{score}%</strong></span>
                      <span>{typeof b.views === 'number' ? number(b.views) : '—'} views · {typeof b.calls === 'number' ? number(b.calls) : '—'} calls</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={button} onClick={() => setSelectedId(String(b.id))}>Details</button>
                      <Link href={`/vendor/my-businesses/${encodeURIComponent(String(b.id))}/edit`} className={button}>Edit business</Link>
                      {b.status === 'approved' && <Link href={listingUrl(b)} target="_blank" rel="noopener noreferrer" className={button}>Public profile</Link>}
                    </div>
                  </article>;
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] px-5 py-3">
                <p className="text-[10px] text-slate-400">Showing {number((currentPage - 1) * pageSize + 1)}–{number(Math.min(currentPage * pageSize, filtered.length))} of {number(filtered.length)} businesses</p>
                <div className="flex items-center gap-2">
                  <button type="button" className={button} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><IconsaxIcon name="arrow-left-2" size={14} /></button>
                  <span className="text-[11px] font-semibold text-slate-500">{currentPage} / {totalPages}</span>
                  <button type="button" className={button} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><IconsaxIcon name="arrow-right-2" size={14} /></button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="text-[10px] leading-5 text-slate-400">Listing statuses are controlled by SL Business Index moderation. Completion percentages measure provided profile information, not approval or verification. Opening hours are vendor-submitted.</p>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-[#162b20]/40" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <section role="dialog" aria-modal="true" aria-label={'Business details: ' + selected.name} className="flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-4">
              <div><h2 className="text-[14px] font-bold text-[#203e2e]">Business details</h2><p className="mt-1 text-[11px] text-slate-400">Your directory profile overview</p></div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><IconsaxIcon name="close-circle" size={19} /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e6ece8] bg-[#f4f7f5] text-[#6b9078]">{selected.logo_url ? <img src={selected.logo_url} alt="" className="h-full w-full object-cover" /> : <IconsaxIcon name="shop" size={27} />}</div>
                <div className="min-w-0"><h3 className="text-[16px] font-bold text-[#203e2e]">{selected.name}</h3><p className="mt-1 text-[11px] text-slate-500">{selected.category || 'Uncategorised'}</p><span className={'mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ' + statusDetails(selected.status).className}>{statusDetails(selected.status).label}</span></div>
              </div>
              {selected.status === 'rejected' && selected.admin_notes && <div className="rounded-lg border border-[#f1d9d8] bg-[#fff7f6] p-3"><p className="text-[11px] font-bold text-[#a44d4b]">Review notes</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#9c615b]">{selected.admin_notes}</p></div>}
              <div className={panel + ' p-4'}>
                <div className="flex justify-between text-[11px]"><span className="font-bold text-[#294735]">Profile completeness</span><span className="font-bold text-[#317650]">{profileScore(selected)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eaf0ec]"><div className="h-full rounded-full bg-[#3e916a]" style={{ width: profileScore(selected) + '%' }} /></div>
                <p className="mt-2 text-[10px] text-slate-500">Adding missing profile details helps customers understand your business.</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-[#203e2e]">Contact & location</h4>
                {[
                  { label: 'Phone', value: selected.phone },
                  { label: 'Email', value: selected.email },
                  { label: 'Website', value: selected.website_url },
                  { label: 'Address', value: selected.detailed_address || selected.address },
                  { label: 'Working hours', value: selected.working_hours },
                ].map(row => <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-[#f0f2f0] py-2 text-[11px]" key={row.label}><span className="font-semibold text-slate-400">{row.label}</span><span className="break-words text-slate-700">{row.value || 'Not provided'}</span></div>)}
              </div>
              <div><h4 className="text-[12px] font-bold text-[#203e2e]">Business description</h4><p className="mt-2 whitespace-pre-line text-[11px] leading-6 text-slate-500">{selected.description || 'No description provided yet.'}</p></div>
              {!!selected.facilities?.length && <div><h4 className="text-[12px] font-bold text-[#203e2e]">Facilities</h4><div className="mt-2 flex flex-wrap gap-1.5">{selected.facilities.map(f => <span key={f} className="rounded-md bg-[#edf5ef] px-2 py-1 text-[10px] font-semibold text-[#377352]">{f}</span>)}</div></div>}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#edf0ee] p-3"><p className="text-[10px] text-slate-400">Profile views</p><p className="mt-1 text-lg font-bold text-[#244533]">{typeof selected.views === 'number' ? number(selected.views) : '—'}</p></div>
                <div className="rounded-lg border border-[#edf0ee] p-3"><p className="text-[10px] text-slate-400">Call clicks</p><p className="mt-1 text-lg font-bold text-[#244533]">{typeof selected.calls === 'number' ? number(selected.calls) : '—'}</p></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#edf0ee] bg-white p-4">
              <Link href={`/vendor/my-businesses/${encodeURIComponent(String(selected.id))}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1c4d3b] px-3 text-xs font-bold text-white"><IconsaxIcon name="setting-2" size={15} color="#fff" /> Edit details</Link>
              {selected.status === 'approved' && <>
                <Link href={listingUrl(selected)} target="_blank" rel="noopener noreferrer" className={button}>View profile</Link>
                <button type="button" onClick={() => void copyProfile(selected)} className={button}>Copy link</button>
              </>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
