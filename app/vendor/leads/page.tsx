'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';

type Stage = 'new' | 'contacted' | 'converted' | 'lost';
type StageFilter = 'all' | Stage;
type Period = 'all' | '7' | '30' | '90';
type Sort = 'newest' | 'oldest' | 'name' | 'stage';

type LeadNote = { id: string; note: string; created_at: string };
type Lead = {
  id: string;
  business_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string | null;
  source: string | null;
  created_at: string;
  lead_notes: LeadNote[] | null;
};
type OwnedBusiness = { id: string; name: string };

const stages: Stage[] = ['new', 'contacted', 'converted', 'lost'];
const statuses: StageFilter[] = ['all', ...stages];
const panel = 'vendor-premium-card';
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e1e6eb] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#baccc4] hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50';
const nfmt = (n: number) => new Intl.NumberFormat('en-LK').format(n);

const statusStyle: Record<Stage, { label: string; css: string; dot: string }> = {
  new: { label: 'New', css: 'border-[#dbe8fc] bg-[#f1f6ff] text-[#376ab2]', dot: 'bg-[#3778cb]' },
  contacted: { label: 'Contacted', css: 'border-[#f0e1c5] bg-[#fff9eb] text-[#9a742a]', dot: 'bg-[#b98938]' },
  converted: { label: 'Converted', css: 'border-[#d5eadc] bg-[#eff8f2] text-[#287b51]', dot: 'bg-[#298159]' },
  lost: { label: 'Lost', css: 'border-[#e5e8ec] bg-[#f5f6f8] text-[#687581]', dot: 'bg-[#8996a1]' },
};

function safeStage(value: string | null): Stage | null {
  return stages.find(stage => stage === value) || null;
}

function formatDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-LK', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function csvCell(value: string | number) {
  let data = String(value);
  // Prevent exported contact fields from being interpreted as spreadsheet formulas.
  if (/^\s*[=+@-]/.test(data)) data = "'" + data;
  return '"' + data.replace(/"/g, '""') + '"';
}

function whatsappNumber(phone: string | null) {
  if (!phone) return null;
  const stripped = phone.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(stripped)) return null;
  let digits = stripped.replace(/^\+/, '');
  if (/^00\d+/.test(digits)) digits = digits.substring(2);
  if (/^0\d{9}$/.test(digits)) digits = '94' + digits.substring(1);
  else if (/^7\d{8}$/.test(digits)) digits = '94' + digits;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export default function LeadsPage() {
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUserSignedIn(false);
        setBusinesses([]);
        setLeads([]);
        return;
      }
      setUserSignedIn(true);
      const { data: owned, error: businessError } = await supabase
        .from('businesses')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });
      if (businessError) throw businessError;
      const ownedRows = (owned || []) as OwnedBusiness[];
      setBusinesses(ownedRows);

      if (!ownedRows.length) {
        setLeads([]);
        setSelectedId(null);
        return;
      }

      const { data: rows, error: leadError } = await supabase
        .from('leads')
        .select('*, lead_notes(id,note,created_at)')
        .in('business_id', ownedRows.map(b => b.id))
        .order('created_at', { ascending: false });
      if (leadError) throw leadError;
      const current = (rows || []) as Lead[];
      setLeads(current);
      setSelectedId(prev => current.some(l => l.id === prev) ? prev : null);
    } catch (caught) {
      console.error('Vendor Leads fetch failed', caught);
      setError('Unable to load your customer enquiries. Check the connection and retry.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const businessNames = useMemo(
    () => new Map(businesses.map(b => [String(b.id), b.name])),
    [businesses]
  );
  const selected = useMemo(() => leads.find(l => l.id === selectedId) || null, [leads, selectedId]);
  const total = leads.length;
  const newCount = leads.filter(l => l.status === 'new').length;
  const contactedCount = leads.filter(l => l.status === 'contacted').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;
  const lostCount = leads.filter(l => l.status === 'lost').length;
  const conversionRate = total ? (convertedCount / total * 100) : 0;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const earliest = period === 'all' ? null : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    const list = leads.filter(l => {
      const matchesSearch = !needle || [l.name, l.email, l.phone, l.message, l.source, businessNames.get(String(l.business_id))]
        .some(v => String(v || '').toLowerCase().includes(needle));
      const matchesStage = stageFilter === 'all' || l.status === stageFilter;
      const matchesBusiness = businessFilter === 'all' || String(l.business_id) === businessFilter;
      const matchesPeriod = earliest === null || new Date(l.created_at).getTime() >= earliest;
      return matchesSearch && matchesStage && matchesBusiness && matchesPeriod;
    });
    list.sort((a, b) => {
      if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sort === 'stage') return String(a.status || '').localeCompare(String(b.status || ''));
      const left = new Date(a.created_at).getTime() || 0;
      const right = new Date(b.created_at).getTime() || 0;
      return sort === 'oldest' ? left - right : right - left;
    });
    return list;
  }, [leads, search, stageFilter, businessFilter, period, sort, businessNames]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openLead(id: string) {
    setSelectedId(id);
    setNoteDraft('');
  }

  async function updateStatus(lead: Lead, next: Stage) {
    if (savingStatusId || lead.status === next) return;
    // The UI only operates on leads fetched through businesses owned by this vendor.
    if (!businesses.some(b => String(b.id) === String(lead.business_id))) {
      toast.error('This enquiry is not associated with your business.');
      return;
    }
    setSavingStatusId(lead.id);
    try {
      const { data, error: mutationError } = await supabase.from('leads')
        .update({ status: next })
        .eq('id', lead.id)
        .eq('business_id', lead.business_id)
        .select('id,status')
        .single();
      if (mutationError || !data) throw mutationError || new Error('Update not permitted');
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: data.status } : l));
      toast.success('Lead moved to ' + statusStyle[next].label);
    } catch (caught) {
      console.error('Vendor Lead status update failed', caught);
      toast.error('Could not update this lead. Please try again.');
    } finally {
      setSavingStatusId(null);
    }
  }

  async function addNote() {
    const current = selected;
    const note = noteDraft.trim();
    if (!current || !note || savingNote) return;
    if (note.length > 2000) {
      toast.error('Notes must be 2,000 characters or fewer.');
      return;
    }
    if (!businesses.some(b => String(b.id) === String(current.business_id))) {
      toast.error('This enquiry is not associated with your business.');
      return;
    }
    setSavingNote(true);
    try {
      const { data, error: noteError } = await supabase.from('lead_notes')
        .insert({ lead_id: current.id, note })
        .select('id,note,created_at')
        .single();
      if (noteError || !data) throw noteError || new Error('Unable to save note');
      const newNote = data as LeadNote;
      setLeads(prev => prev.map(l => l.id === current.id
        ? { ...l, lead_notes: [...(l.lead_notes || []), newNote] }
        : l));
      setNoteDraft('');
      toast.success('Internal note saved');
    } catch (caught) {
      console.error('Vendor Lead note failed', caught);
      toast.error('Unable to save this note. Please retry.');
    } finally {
      setSavingNote(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const rows: (string | number)[][] = [
      ['Lead', 'Business', 'Email', 'Phone', 'Source', 'Status', 'Message', 'Received'],
      ...filtered.map(l => [
        l.name || '', businessNames.get(String(l.business_id)) || '',
        l.email || '', l.phone || '', l.source || '', l.status || '',
        l.message || '', l.created_at || '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'slbi-vendor-leads.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: 'Total enquiries', count: total, icon: 'people', color: '#2563eb', note: 'All recorded leads' },
    { label: 'New leads', count: newCount, icon: 'message-text', color: '#387ac4', note: 'Awaiting first response' },
    { label: 'Contacted', count: contactedCount, icon: 'call', color: '#ae8637', note: 'Follow-up in progress' },
    { label: 'Converted', count: convertedCount, icon: 'tick-circle', color: '#15946a', note: 'Marked as customers' },
  ];

  if (!loading && !userSignedIn) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-xl font-bold text-[#1c3f2f]">Sign in to view your leads</h1>
      <p className="mt-2 text-sm text-slate-500">Customer enquiries are available to their business owners.</p>
      <Link href="/login?redirect=/vendor/leads" className="mt-5 inline-flex rounded-lg bg-[#1c4d3b] px-5 py-2.5 text-xs font-bold text-white">Sign in</Link>
    </div>
  );

  return (
    <div className="mx-auto min-h-full max-w-[1500px] pb-6 text-[#283F30]">
      <div className="space-y-5">
        <header className="vendor-premium-card flex flex-col gap-5 border-t-4 border-t-[#2D6749] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> Leads CRM
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">Leads management</h1>
            <p className="text-[12px] text-slate-500">Track enquiries, contact prospects and keep follow-up activity organised.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 items-center gap-2 rounded-lg border border-[#dfebe4] bg-[#f1f7f2] px-3 text-[11px] font-semibold text-[#37694c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#329368]" /> Vendor CRM
            </span>
            <button type="button" onClick={() => void load()} disabled={loading} className={button}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={loading || !filtered.length} className={button}>
              <IconsaxIcon name="document-download" size={15} /> Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">Retry loading</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-bold text-[#1d3f31]">Enquiry overview</h2>
          <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">All-time records</span>
        </div>
        <section aria-label="Lead statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{kpi.label}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.color + '12', color: kpi.color }}>
                  <IconsaxIcon name={kpi.icon} size={18} />
                </span>
              </div>
              <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#182b25]">
                {loading ? '—' : nfmt(kpi.count)}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{kpi.note}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.85fr)]">
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-bold text-[#23372e]">Lead pipeline</h2>
                <p className="mt-1 text-[11px] text-slate-400">Live status breakdown across your businesses</p>
              </div>
              <IconsaxIcon name="status-up" size={18} color="#3f7860" />
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {[
                { stage: 'new' as Stage, count: newCount, bar: '#3778cb' },
                { stage: 'contacted' as Stage, count: contactedCount, bar: '#b98938' },
                { stage: 'converted' as Stage, count: convertedCount, bar: '#298159' },
                { stage: 'lost' as Stage, count: lostCount, bar: '#8996a1' },
              ].map(item => (
                <button key={item.stage} type="button" onClick={() => { setStageFilter(item.stage); setPage(1); }}
                  aria-label={'Filter ' + statusStyle[item.stage].label + ' leads'}
                  className="rounded-lg border border-[#eef1f0] bg-[#fbfcfb] p-3 text-left transition hover:border-[#b9d2c4] hover:bg-[#f6faf7]">
                  <p className="text-[10px] font-semibold text-slate-500">{statusStyle[item.stage].label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[#253d30]">{loading ? '—' : nfmt(item.count)}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eaf0ed]">
                    <div className="h-full rounded-full" style={{ width: (total ? item.count / total * 100 : 0) + '%', backgroundColor: item.bar }} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className={panel + ' flex min-w-0 flex-col overflow-hidden'}>
            <div className="border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[13px] font-bold text-[#23372e]">Conversion snapshot</h2>
              <p className="mt-1 text-[11px] text-slate-400">Based on the status of recorded enquiries</p>
            </div>
            <div className="flex flex-1 flex-col justify-center px-5 py-5">
              <p className="text-[11px] font-semibold text-slate-500">Lead conversion rate</p>
              <p className="mt-2 text-[34px] font-bold tabular-nums tracking-[-0.05em] text-[#224835]">
                {loading ? '—' : conversionRate.toFixed(1) + '%'}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8f0e9]">
                <div className="h-full rounded-full bg-[#30845e]" style={{ width: conversionRate + '%' }} />
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">Converted leads ÷ total leads. This is a CRM status ratio, not a verified sales or revenue figure.</p>
            </div>
          </section>
        </div>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#23392f]">Lead directory</h2>
              <p className="mt-1 text-[11px] text-slate-400">Manage every customer enquiry from one workspace</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{loading ? 'Loading…' : nfmt(filtered.length) + ' results'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e9edf0] px-4 py-3 sm:px-5">
            <label className="relative min-w-[180px] flex-1 sm:max-w-[330px]">
              <span className="sr-only">Search leads</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconsaxIcon name="search-normal" size={15} />
              </span>
              <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search customers, phone, enquiries…" className="h-9 w-full rounded-lg border border-[#e1e6ec] bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none focus:border-[#9cb9aa]" />
            </label>
            <select aria-label="Filter leads by business" value={businessFilter} onChange={e => { setBusinessFilter(e.target.value); setPage(1); }}
              className="h-9 max-w-[180px] rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All businesses</option>
              {businesses.map(b => <option key={String(b.id)} value={String(b.id)}>{b.name}</option>)}
            </select>
            <select aria-label="Date range" value={period} onChange={e => { setPeriod(e.target.value as Period); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All time</option><option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select>
            <select aria-label="Sort leads" value={sort} onChange={e => { setSort(e.target.value as Sort); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option><option value="stage">Pipeline status</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#edf0f3] px-4 py-2.5 sm:px-5" aria-label="Lead status filters">
            {statuses.map(s => (
              <button type="button" key={s} onClick={() => { setStageFilter(s); setPage(1); }}
                aria-pressed={stageFilter === s}
                className={'rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ' +
                  (stageFilter === s ? 'bg-[#eaf3ed] text-[#1b5438]' : 'text-slate-500 hover:bg-slate-100')}>
                {s === 'all' ? 'All leads' : statusStyle[s].label}
              </button>
            ))}
          </div>

          {loading ? (
            <div role="status" className="space-y-3 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : error ? (
            <div className="px-5 py-12 text-center text-[12px] text-slate-500">Lead records are temporarily unavailable.</div>
          ) : !businesses.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6f1] text-[#347653]"><IconsaxIcon name="shop" size={23} /></span>
              <h3 className="text-[13px] font-bold text-[#223d2c]">Register your first business</h3>
              <p className="max-w-sm text-[11px] leading-5 text-slate-500">Customer enquiries will appear here after your business is registered and receives leads.</p>
              <Link href="/vendor/my-businesses" className="mt-1 rounded-lg bg-[#1c4d3b] px-4 py-2.5 text-[11px] font-bold text-white">Manage businesses</Link>
            </div>
          ) : !leads.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6f1] text-[#347653]"><IconsaxIcon name="people" size={23} /></span>
              <h3 className="text-[13px] font-bold text-[#223d2c]">No enquiries received yet</h3>
              <p className="max-w-sm text-[11px] leading-5 text-slate-500">New customer enquiries from your business listings will be shown in this CRM.</p>
              <Link href="/vendor/my-businesses" className="mt-1 text-[11px] font-bold text-[#28704e] hover:underline">Review your listings</Link>
            </div>
          ) : !filtered.length ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[12px] font-bold text-[#233d2e]">No matching leads</p>
              <p className="mt-1 text-[11px] text-slate-400">Try a different search or clear the filters.</p>
              <button type="button" onClick={() => { setSearch(''); setStageFilter('all'); setBusinessFilter('all'); setPeriod('all'); setPage(1); }}
                className="mt-3 text-[11px] font-bold text-[#28704e] hover:underline">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-[#edf0f3] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="px-5 py-3">Customer</th>
                      <th scope="col" className="px-3 py-3">Business & enquiry</th>
                      <th scope="col" className="px-3 py-3">Received</th>
                      <th scope="col" className="px-3 py-3">Status</th>
                      <th scope="col" className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f2]">
                    {visible.map(lead => {
                      const stage = safeStage(lead.status);
                      return (
                        <tr key={lead.id} className="hover:bg-[#fbfcfb]">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf5f0] text-[#4a8060]"><IconsaxIcon name="people" size={18} /></span>
                              <div className="min-w-0">
                                <button type="button" onClick={() => openLead(lead.id)} className="block max-w-[220px] truncate text-left text-[12px] font-bold text-[#223b2c] hover:underline">{lead.name || 'Unnamed customer'}</button>
                                <p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-400">{lead.email || lead.phone || 'Contact not provided'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[330px] px-3 py-3.5">
                            <p className="truncate text-[11px] font-semibold text-[#36513e]">{businessNames.get(String(lead.business_id)) || 'Your business'}</p>
                            <p className="mt-1 truncate text-[10px] text-slate-400">{lead.message || 'No message provided'}</p>
                            {!!lead.source && <p className="mt-1 truncate text-[10px] text-slate-400">Source: {lead.source}</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[11px] text-slate-500">{formatDate(lead.created_at)}</td>
                          <td className="px-3 py-3.5">
                            <span className={'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ' + (stage ? statusStyle[stage].css : 'border-slate-200 bg-slate-50 text-slate-600')}>
                              <span className={'h-1.5 w-1.5 rounded-full ' + (stage ? statusStyle[stage].dot : 'bg-slate-400')} />
                              {stage ? statusStyle[stage].label : lead.status || 'Unclassified'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button type="button" onClick={() => openLead(lead.id)} className={button}>
                              <IconsaxIcon name="eye" size={14} /> Open lead
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[#eef0f2] lg:hidden">
                {visible.map(lead => {
                  const stage = safeStage(lead.status);
                  return (
                    <article key={lead.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#edf5f0] text-[#4a8060]"><IconsaxIcon name="people" size={19} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-[#223b2c]">{lead.name || 'Unnamed customer'}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-400">{businessNames.get(String(lead.business_id)) || 'Your business'}</p>
                          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{lead.message || 'No message provided'}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400">{formatDate(lead.created_at)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className={'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ' + (stage ? statusStyle[stage].css : 'border-slate-200 bg-slate-50 text-slate-600')}>
                          {stage ? statusStyle[stage].label : lead.status || 'Unclassified'}
                        </span>
                        <button type="button" onClick={() => openLead(lead.id)} className={button}>View details <IconsaxIcon name="arrow-right-2" size={13} /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] px-5 py-3">
                <p className="text-[10px] text-slate-400">
                  Showing {nfmt((currentPage - 1) * pageSize + 1)}–{nfmt(Math.min(currentPage * pageSize, filtered.length))} of {nfmt(filtered.length)} leads
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" className={button} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><IconsaxIcon name="arrow-left-2" size={14} /></button>
                  <span className="text-[11px] font-semibold text-slate-500">{currentPage} / {pages}</span>
                  <button type="button" className={button} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><IconsaxIcon name="arrow-right-2" size={14} /></button>
                </div>
              </div>
            </>
          )}
        </section>
        <p className="text-[10px] leading-5 text-slate-400">Only your businesses' recorded enquiries are shown. CRM status and conversion metrics are vendor-managed, not verified transactions.</p>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-[#162b20]/40" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <section role="dialog" aria-modal="true" aria-label={'Lead details: ' + (selected.name || 'Customer')}
            className="flex h-full w-full max-w-[500px] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-bold text-[#203e2e]">Customer enquiry</h2>
                <p className="mt-1 text-[11px] text-slate-400">Private lead details & follow-up</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close lead details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <IconsaxIcon name="close-circle" size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eaf3ed] text-[#42805b]"><IconsaxIcon name="people" size={24} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-bold text-[#233f30]">{selected.name || 'Unnamed customer'}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{businessNames.get(String(selected.business_id)) || 'Your business'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Received {formatDate(selected.created_at, true)}</p>
                </div>
              </div>

              <div className={panel + ' p-4'}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#2b4535]">Pipeline stage</p>
                    <p className="mt-1 text-[10px] text-slate-500">Select a stage to save your follow-up progress.</p>
                  </div>
                  <select aria-label="Change lead status" value={safeStage(selected.status) || ''}
                    disabled={savingStatusId === selected.id}
                    onChange={e => { if (stages.includes(e.target.value as Stage)) void updateStatus(selected, e.target.value as Stage); }}
                    className="h-9 rounded-lg border border-[#dce6de] bg-[#f7faf8] px-3 text-[11px] font-bold text-[#286243] disabled:opacity-50">
                    {!safeStage(selected.status) && <option value="">Unclassified</option>}
                    {stages.map(stage => <option key={stage} value={stage}>{statusStyle[stage].label}</option>)}
                  </select>
                </div>
                <p className="mt-3 text-[10px] text-slate-400">Changes are saved to the existing lead record. No automatic messages are sent.</p>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-[#294634]">Quick contact</h4>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selected.phone?.trim() ? (
                    <a href={'tel:' + selected.phone.trim().replace(/[^\d+]/g, '')} className="flex flex-col items-center gap-2 rounded-lg border border-[#e4eae6] bg-[#f8faf8] p-3 text-[11px] font-semibold text-[#366a4d] hover:bg-[#edf5ee]">
                      <IconsaxIcon name="call" size={19} /> Call
                    </a>
                  ) : <span className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-400"><IconsaxIcon name="call" size={19} /> No phone</span>}
                  {selected.email?.trim() ? (
                    <a href={'mailto:' + selected.email.trim()} className="flex flex-col items-center gap-2 rounded-lg border border-[#e4eae6] bg-[#f8faf8] p-3 text-[11px] font-semibold text-[#366a4d] hover:bg-[#edf5ee]">
                      <IconsaxIcon name="sms" size={19} /> Email
                    </a>
                  ) : <span className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-400"><IconsaxIcon name="sms" size={19} /> No email</span>}
                  {whatsappNumber(selected.phone) ? (
                    <a href={'https://wa.me/' + whatsappNumber(selected.phone)} target="_blank" rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 rounded-lg border border-[#e4eae6] bg-[#f8faf8] p-3 text-[11px] font-semibold text-[#366a4d] hover:bg-[#edf5ee]">
                      <IconsaxIcon name="message-text" size={19} /> WhatsApp
                    </a>
                  ) : <span className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-400"><IconsaxIcon name="message-text" size={19} /> Unavailable</span>}
                </div>
              </div>

              <div>
                <h4 className="border-b border-[#edf0ee] pb-2 text-[12px] font-bold text-[#294634]">Contact information</h4>
                {[
                  { label: 'Phone', value: selected.phone },
                  { label: 'Email', value: selected.email },
                  { label: 'Source', value: selected.source },
                  { label: 'Business', value: businessNames.get(String(selected.business_id)) },
                  { label: 'Received', value: formatDate(selected.created_at, true) },
                ].map(row => (
                  <div key={row.label} className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b border-[#f1f2f1] py-3 text-[11px]">
                    <span className="font-semibold text-slate-400">{row.label}</span>
                    <span className="break-all text-slate-700">{row.value || 'Not provided'}</span>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-[#294634]">Customer message</h4>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#e9eeeb] bg-[#fafcfa] p-4 text-[11px] leading-6 text-slate-600">
                  {selected.message || 'No enquiry message provided.'}
                </p>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-[#294634]">Internal notes</h4>
                <p className="mt-1 text-[10px] text-slate-400">Notes are intended for your internal follow-up and are not sent to the customer.</p>
                <div className="mt-3 space-y-2">
                  {!selected.lead_notes?.length ? (
                    <p className="rounded-lg bg-[#f8faf8] px-3 py-4 text-[11px] text-slate-400">No follow-up notes yet.</p>
                  ) : [...selected.lead_notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(note => (
                    <div key={note.id} className="rounded-lg border border-[#e7ece7] bg-[#fcfdfb] p-3">
                      <p className="whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-600">{note.note}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{formatDate(note.created_at, true)}</p>
                    </div>
                  ))}
                </div>
                <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); void addNote(); }}>
                  <label htmlFor="lead-follow-up-note" className="sr-only">New internal note</label>
                  <textarea id="lead-follow-up-note" value={noteDraft} maxLength={2000} rows={3}
                    onChange={e => setNoteDraft(e.target.value)} placeholder="Add follow-up details or next steps…"
                    className="w-full resize-y rounded-lg border border-[#dfe8e2] bg-white px-3 py-2.5 text-[11px] text-slate-700 outline-none focus:border-[#86b29c]" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-400">{noteDraft.length}/2000 characters</p>
                    <button type="submit" disabled={savingNote || !noteDraft.trim()}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1c4d3b] px-4 text-[11px] font-bold text-white transition hover:bg-[#2e674f] disabled:cursor-not-allowed disabled:opacity-50">
                      <IconsaxIcon name="add" size={14} color="#fff" /> {savingNote ? 'Saving…' : 'Save note'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#edf0ee] bg-white px-5 py-3">
              <p className="text-[10px] text-slate-400">Changes saved directly to your vendor CRM</p>
              <button type="button" className={button} onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
