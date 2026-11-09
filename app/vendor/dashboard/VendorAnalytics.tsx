'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowUpRight, BarChart3, Eye, Loader2, MousePointerClick, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface DailyActivity {
  date: string;
  views: number;
  calls: number;
  leads: number;
}

type Range = '7d' | '30d';

export default function VendorAnalytics({ businessIds, embedded = false }: {
  businessIds: string[];
  embedded?: boolean;
}) {
  const [data, setData] = useState<DailyActivity[]>([]);
  const [timeRange, setTimeRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Stable key avoids refetching when a parent renders with the same IDs.
  const idsKey = businessIds.join(',');

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      if (!idsKey) {
        setData([]);
        setLoading(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const days = timeRange === '7d' ? 7 : 30;
        const now = new Date();
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const start = new Date(today - (days - 1) * 86400000);

        const { data: logs, error: queryError } = await supabase
          .from('analytics_logs')
          .select('created_at,event_type')
          .in('business_id', idsKey.split(','))
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true });
        if (queryError) throw queryError;

        const buckets: Record<string, DailyActivity> = {};
        for (let i = 0; i < days; i++) {
          const day = new Date(today - i * 86400000).toISOString().slice(0, 10);
          buckets[day] = { date: day, views: 0, calls: 0, leads: 0 };
        }

        for (const log of logs || []) {
          const key = log.created_at?.slice(0, 10);
          const bucket = buckets[key];
          if (!bucket) continue;
          if (log.event_type === 'view') bucket.views++;
          else if (log.event_type === 'call_click') bucket.calls++;
          else if (log.event_type === 'lead_form_submit') bucket.leads++;
        }

        if (!cancelled) setData(Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date)));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Analytics could not be loaded.');
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchActivity();
    return () => { cancelled = true; };
  }, [idsKey, timeRange, reload]);

  const totals = useMemo(() => data.reduce(
    (acc, point) => ({
      views: acc.views + point.views,
      calls: acc.calls + point.calls,
      leads: acc.leads + point.leads,
    }),
    { views: 0, calls: 0, leads: 0 },
  ), [data]);
  const noEvents = totals.views + totals.calls + totals.leads === 0;

  return (
    <div className={embedded ? 'min-w-0' : 'rounded-3xl border border-[#e1eae4] bg-white p-6 shadow-sm'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#839589]">
          <BarChart3 size={15} className="text-[#448767]" />
          <span>Activity trend</span>
        </div>
        <div className="inline-flex rounded-xl border border-[#e4ebe6] bg-[#f5f8f6] p-1">
          {(['7d', '30d'] as Range[]).map(range => (
            <button key={range} type="button" onClick={() => setTimeRange(range)} aria-pressed={timeRange === range}
              className={timeRange === range
                ? 'rounded-lg bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#246046] shadow-sm'
                : 'rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-[#8b9d92] hover:text-[#366b51]'}>
              {range === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#eff2ef] bg-[#fbfcfb] px-3 py-4 sm:gap-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#91a298]"><Eye size={12} className="text-[#3b916a]" /> Views</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#234533]">{loading ? '—' : totals.views.toLocaleString()}</p>
        </div>
        <div className="min-w-0 border-l border-[#e7ece8] pl-3 sm:pl-5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#91a298]"><MousePointerClick size={12} className="text-[#b99452]" /> Calls</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#234533]">{loading ? '—' : totals.calls.toLocaleString()}</p>
        </div>
        <div className="min-w-0 border-l border-[#e7ece8] pl-3 sm:pl-5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#91a298]"><MessageCircle size={12} className="text-[#8064c4]" /> Leads</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#234533]">{loading ? '—' : totals.leads.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[255px] items-center justify-center text-[#54836d]">
          <Loader2 size={25} className="animate-spin" />
        </div>
      ) : error ? (
        <div role="alert" className="flex h-[255px] flex-col items-center justify-center gap-3 rounded-2xl bg-red-50 px-4 text-center">
          <p className="text-sm text-red-700">Unable to load analytics: {error}</p>
          <button type="button" onClick={() => setReload(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : !idsKey ? (
        <div className="flex h-[255px] flex-col items-center justify-center rounded-2xl bg-[#f8faf8] px-5 text-center">
          <BarChart3 size={26} className="text-[#a6b6aa]" />
          <p className="mt-3 text-sm font-semibold text-[#365847]">Your insights start with a listing</p>
          <p className="mt-1 text-xs text-[#94a499]">Register a business to start tracking activity.</p>
        </div>
      ) : (
        <div className="relative h-[255px] w-full min-w-0 sm:h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="vendorGreenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2b9870" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#2b9870" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="vendorGoldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cca15b" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#cca15b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e9f0eb" vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="date" tickLine={false} axisLine={false}
                tick={{ fontSize: 10, fill: '#96a59c' }} tickMargin={12}
                minTickGap={20}
                tickFormatter={value => new Date(String(value) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                tick={{ fontSize: 10, fill: '#96a59c' }} />
              <Tooltip
                labelFormatter={value => new Date(String(value) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                contentStyle={{ border: '1px solid #e1eae4', borderRadius: '12px', boxShadow: '0 18px 40px -25px rgba(0,0,0,.28)', fontSize: '12px' }}
              />
              <Area dataKey="views" name="Views" type="monotone" stroke="#29946b" strokeWidth={2.5} fill="url(#vendorGreenFill)" dot={false} activeDot={{ r: 4 }} />
              <Area dataKey="calls" name="Call clicks" type="monotone" stroke="#c69a55" strokeWidth={2} fill="url(#vendorGoldFill)" dot={false} activeDot={{ r: 4 }} />
              <Area dataKey="leads" name="Enquiries" type="monotone" stroke="#8064c4" strokeWidth={2} fillOpacity={0} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          {noEvents && (
            <div className="pointer-events-none absolute inset-x-4 bottom-10 flex justify-center">
              <p className="rounded-lg border border-[#e6ece8] bg-white/95 px-3 py-2 text-center text-[11px] text-[#8d9f94] shadow-sm">
                No recorded events in this period yet
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#eef2ee] pt-4 text-[11px] text-[#788b7d]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#29946b]" /> Views</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c69a55]" /> Call clicks</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8064c4]" /> Enquiries</span>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-[#a1afa5]">
        Shows tracked events for the selected period; historical profile totals may include activity not recorded here.
      </p>
    </div>
  );
}
