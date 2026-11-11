'use client';
import { neo } from '../components/neumorphic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import IconsaxIcon from '../components/IconsaxIcon';
import { summarizeGrowthMetrics } from '@/lib/growth/attribution';

type Period = '7' | '30' | '90';
type OwnedBusiness = { id: string; name: string };
type EventRow = { id: string; business_id: string | null; event_type: string; created_at: string };
type LeadRow = { id: string; business_id: string | null; status: string | null; source: string | null; created_at: string | null };

const MAX_EVENTS = 2000;
const MAX_LEADS = 2000;
const panel = neo.card;
const periodDays = (period: Period) => Number(period);

const startDate = (period: Period): string => {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - periodDays(period));
  return now.toISOString();
};
const formatNumber = (n: number) => new Intl.NumberFormat('en-LK').format(n);
const describeCount = (value: number, partial: boolean) => (partial ? '≥ ' : '') + formatNumber(value);

function lastDays(period: Period, events: EventRow[]) {
  const dates: { key: string; label: string; views: number; calls: number; directions: number }[] = [];
  const today = new Date();
  for (let offset = periodDays(period) - 1; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    dates.push({
      key: dt.toISOString().slice(0, 10),
      label: dt.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      views: 0, calls: 0, directions: 0,
    });
  }
  const index = new Map(dates.map((date) => [date.key, date]));
  for (const item of events) {
    const row = index.get((item.created_at || '').slice(0, 10));
    if (!row) continue;
    if (item.event_type === 'view') row.views++;
    if (item.event_type === 'call_click') row.calls++;
    if (item.event_type === 'location_click') row.directions++;
  }
  return dates;
}

export default function GrowthInsightsPage() {
  const [period, setPeriod] = useState<Period>('30');
  const [businessId, setBusinessId] = useState('all');
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [eventPartial, setEventPartial] = useState(false);
  const [leadPartial, setLeadPartial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setUnauthenticated(false);
    setEvents([]);
    setLeads([]);
    setEventPartial(false);
    setLeadPartial(false);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUnauthenticated(true);
        setBusinesses([]);
        return;
      }
      // RLS is the actual security boundary. The UI performs an additional
      // owner-scoped lookup; no service-role client is ever used in the browser.
      const ownedResult = await supabase.from('businesses')
        .select('id,name').eq('owner_id', user.id).eq('status', 'approved')
        .order('name', { ascending: true }).limit(250);
      if (ownedResult.error) throw ownedResult.error;
      const owned = (ownedResult.data || []) as OwnedBusiness[];
      setBusinesses(owned);
      const ownedIds = owned.map(item => item.id);
      if (!ownedIds.length) return;
      const ids = businessId === 'all' ? ownedIds : ownedIds.filter(id => id === businessId);
      if (!ids.length) return;
      const since = startDate(period);
      const [eventResult, leadResult] = await Promise.all([
        supabase.from('analytics_logs').select('id,business_id,event_type,created_at', { count: 'exact' })
          .in('business_id', ids).gte('created_at', since)
          .order('created_at', { ascending: false }).limit(MAX_EVENTS),
        supabase.from('leads').select('id,business_id,status,source,created_at', { count: 'exact' })
          .in('business_id', ids).gte('created_at', since)
          .order('created_at', { ascending: false }).limit(MAX_LEADS),
      ]);
      if (eventResult.error) throw eventResult.error;
      if (leadResult.error) throw leadResult.error;
      const eventRows = (eventResult.data || []) as EventRow[];
      const leadRows = (leadResult.data || []) as LeadRow[];
      setEvents(eventRows);
      setLeads(leadRows);
      setEventPartial((eventResult.count || 0) > eventRows.length);
      setLeadPartial((leadResult.count || 0) > leadRows.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load growth insights.');
    } finally {
      setLoading(false);
    }
  }, [businessId, period, refreshKey]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => summarizeGrowthMetrics(events, leads), [events, leads]);
  const daily = useMemo(() => lastDays(period, events), [period, events]);
  const maxVolume = Math.max(1, ...daily.map(item => item.views + item.calls + item.directions));
  const byBusiness = useMemo(() => businesses.map(item => {
    const ownedEvents = events.filter(row => row.business_id === item.id);
    const ownedLeads = leads.filter(row => row.business_id === item.id);
    return { ...item, ...summarizeGrowthMetrics(ownedEvents, ownedLeads) };
  }).filter(item => businessId === 'all' || item.id === businessId), [businesses, events, leads, businessId]);

  const cards = [
    { title: 'Listing view events', value: metrics.listingViewEvents, icon: 'eye', note: 'Page views recorded, not unique visitors' },
    { title: 'Call click events', value: metrics.callClickEvents, icon: 'call', note: 'Click intent; calls not verified' },
    { title: 'Directions clicks', value: metrics.locationClickEvents, icon: 'location', note: 'Directions link interactions' },
    { title: 'CRM enquiries', value: metrics.crmLeadRecords, icon: 'message-text', note: 'Stored lead records, not closed sales' },
  ];

  if (unauthenticated) return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className={panel + ' p-8'}>
        <h1 className="text-2xl font-bold text-[#2C2C31]">Sign in to view Growth Insights</h1>
        <p className="mt-2 text-sm text-slate-500">Only the owner can view their business analytics and enquiries.</p>
        <Link href="/login?redirect=/vendor/insights" className="mt-6 inline-flex rounded-xl bg-[#242428] px-5 py-3 text-xs font-bold text-white">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className={neo.page + " mx-auto w-full  space-y-5 pb-7"}>
      <header className={neo.heroDark + " flex flex-col items-start justify-between gap-5 px-6 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-end"}>
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#FFBC82]">Growth intelligence / Owner insights</p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-.045em] text-white sm:text-[35px]">Know what drives your growth.</h1>
          <p className="mt-2 text-[12px] leading-6 text-[#D2D2D6]">Understand recorded listing views, customer actions and stored enquiries. Clicks and CRM stages are never presented as verified sales.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[#EDEDEF]">Business-scoped metrics</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[#EDEDEF]">Transparent attribution</span>
          </div>
        </div>
        <button type="button" onClick={() => setRefreshKey(n => n + 1)} disabled={loading}
          className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-[#FFF5EC] px-4 text-xs font-bold text-[#9A4300] transition hover:bg-white disabled:opacity-50">
          <IconsaxIcon name="refresh" size={15} /> Refresh
        </button>
      </header>

      <div className={panel + ' flex flex-wrap items-center gap-3 p-4'}>
        <label className="flex min-w-[210px] flex-1 flex-col gap-1 text-[11px] font-bold text-[#62626A]">
          Business
          <select value={businessId} onChange={e => setBusinessId(e.target.value)}
            className="h-10 rounded-lg border border-[#E7E7EC] bg-[#FBFCF9] px-3 text-[12px] font-medium text-[#34343A]">
            <option value="all">All my approved businesses</option>
            {businesses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-[11px] font-bold text-[#62626A]">
          Reporting period
          <select value={period} onChange={e => setPeriod(e.target.value as Period)}
            className="h-10 rounded-lg border border-[#E7E7EC] bg-[#FBFCF9] px-3 text-[12px] font-medium text-[#34343A]">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <span className="rounded-full border border-[#E7E7EB] bg-[#F7F7F9] px-3 py-2 text-[10px] font-semibold text-[#6C6C73]">Owner-scoped · RLS protected</span>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load insights: {error}</div>}
      {(eventPartial || leadPartial) && !loading && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900">
        Large dataset: event or lead rows were capped for this overview. Totals with ≥ are lower bounds and the chart is a sample. Narrow the reporting period for accurate totals.
      </div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.title} className={panel + ' p-5'}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold text-[#2C2C31]">{card.title}</p>
              <span className="rounded-lg bg-[#F8F8FA] p-2 text-[#2C2C31]"><IconsaxIcon name={card.icon} size={18}/></span>
            </div>
            <p className="mt-3 text-[31px] font-extrabold tabular-nums tracking-[-0.05em] text-[#2C2C31]">
              {loading ? '—' : describeCount(card.value, card.title === 'CRM enquiries' ? leadPartial : eventPartial)}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className={panel + ' p-5 sm:p-6'} aria-labelledby="growth-trend-title">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="growth-trend-title" className="text-[17px] font-bold text-[#2B2B30]">Recorded interactions</h2>
              <p className="mt-1 text-[11px] text-slate-500">UTC day · listing views, call clicks and directions clicks</p>
            </div>
            <span className="text-[10px] font-medium text-[#2C2C31]">{period} days</span>
          </div>
          <div className="mt-8 flex h-44 items-end gap-[3px] rounded-lg border-b border-[#E7E7EC] pb-1" role="img" aria-label="Daily recorded interactions bar chart">
            {daily.map((day, i) => {
              const views = day.views, contacts = day.calls + day.directions;
              const size = views + contacts;
              return (
                <div key={day.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={day.label + ': ' + size + ' interactions'}>
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm" style={{height: Math.max(size > 0 ? 3 : 0, (size/maxVolume)*100) + '%'}}>
                    <div className="bg-[#FFF2E7]" style={{flex: views || 0}} />
                    <div className="bg-[#242428]" style={{flex: contacts || 0}} />
                  </div>
                  {period === '7' && <span className="absolute hidden text-[8px]">{i}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>{daily[0]?.label ?? '—'}</span>
            <div className="flex flex-wrap gap-3"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#FFF2E7]"/>Views</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#242428]"/>Call / directions clicks</span></div>
            <span>{daily[daily.length-1]?.label ?? '—'}</span>
          </div>
        </section>
        <section className={panel + ' p-5 sm:p-6'}>
          <h2 className="text-[17px] font-bold text-[#2B2B30]">Lead attribution</h2>
          <p className="mt-1 text-[11px] text-slate-500">Only recorded CRM sources are counted. We do not infer where unknown enquiries originated.</p>
          <div className="mt-6 space-y-4">
            {[
              {name:'Website detail page',value:metrics.leadsFromWebDetail},
              {name:'Mobile business detail',value:metrics.leadsFromMobileDetail},
              {name:'Other / unknown source',value:metrics.leadsFromOtherSources},
            ].map(item => <div key={item.name}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[#2C2C31]">{item.name}</span><strong className="tabular-nums text-[#2C2C31]">{formatNumber(item.value)}</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F8F8FA]"><div className="h-full rounded-full bg-[#FFF2E7]" style={{width: (metrics.crmLeadRecords ? item.value / metrics.crmLeadRecords * 100 : 0) + '%'}} /></div>
            </div>)}
          </div>
          <div className="mt-6 rounded-xl bg-[#F4F8F1] p-4">
            <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold text-[#2C2C31]">CRM marked converted</span><strong className="text-xl font-extrabold tabular-nums text-[#2C2C31]">{loading ? '—' : formatNumber(metrics.crmMarkedConverted)}</strong></div>
            <p className="mt-2 text-[10px] leading-5 text-[#777780]">Vendor-updated CRM status; not verified payments, completed sales or revenue.</p>
          </div>
          <Link href="/vendor/leads" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#2C2C31] hover:underline">Manage CRM enquiries <IconsaxIcon name="arrow-right-2" size={14}/></Link>
        </section>
      </div>

      <section className={panel + ' overflow-hidden'} aria-labelledby="business-performance-title">
        <div className="border-b border-[#E7E7EC] p-5 sm:px-6">
          <h2 id="business-performance-title" className="text-[17px] font-bold text-[#2B2B30]">Performance by business</h2>
          <p className="mt-1 text-[11px] text-slate-500">This period · counts are recorded interaction events and CRM records, not customer identities.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[590px] text-left">
            <thead className="bg-[#F8FBF8] text-[10px] font-bold uppercase tracking-wider text-[#777780]">
              <tr><th className="px-5 py-3">Business</th><th className="px-4 py-3 text-right">Views</th><th className="px-4 py-3 text-right">Calls</th><th className="px-4 py-3 text-right">Directions</th><th className="px-5 py-3 text-right">CRM enquiries</th></tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EF]">
              {byBusiness.map(item => <tr key={item.id} className="text-[12px] text-[#2C2C31] hover:bg-[#FBFDFB]">
                <td className="px-5 py-4 font-semibold text-[#2C2C31]">{item.name}</td>
                <td className="px-4 py-4 text-right tabular-nums">{formatNumber(item.listingViewEvents)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{formatNumber(item.callClickEvents)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{formatNumber(item.locationClickEvents)}</td>
                <td className="px-5 py-4 text-right tabular-nums">{formatNumber(item.crmLeadRecords)}</td>
              </tr>)}
              {!loading && !byBusiness.length && <tr><td colSpan={5} className="p-8 text-center text-[12px] text-slate-500">No approved owned businesses found for this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="rounded-xl border border-[#E7E7EC] bg-[#F8FBF6] px-5 py-4 text-[11px] leading-6 text-[#2C2C31]">
        <strong className="text-[#2C2C31]">Measurement quality notice:</strong> Existing interaction logs predate secure collection and may contain automated or duplicate requests. This dashboard deliberately does not claim unique visitors, sales, confirmed calls, order value, or conversion revenue. No precise GPS or raw search queries are shown.
      </div>
    </div>
  );
}
