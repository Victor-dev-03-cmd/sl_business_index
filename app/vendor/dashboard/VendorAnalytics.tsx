'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import IconsaxIcon from '../components/IconsaxIcon';
import { supabase } from '@/lib/supabaseClient';
import {
  ACTIVITY_MAX_EVENTS, ACTIVITY_PAGE_SIZE, groupActivityByUtcDay,
  type ActivityLog, type DailyActivity,
} from '@/lib/growth/activity-trend';

type Range = '7d' | '30d';

export default function VendorAnalytics({ businessIds, refreshKey = 0, embedded = false }: {
  businessIds: string[];
  refreshKey?: number;
  embedded?: boolean;
}) {
  const [data, setData] = useState<DailyActivity[]>([]);
  const [timeRange, setTimeRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [eventLimitReached, setEventLimitReached] = useState(false);
  const [recordedEventCount, setRecordedEventCount] = useState<number | null>(null);

  // Stable key avoids refetching when a parent renders with the same IDs.
  const idsKey = businessIds.join(',');

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      if (!idsKey) {
        setData([]);
        setLoading(false);
        setError('');
        setEventLimitReached(false);
        setRecordedEventCount(null);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const days = timeRange === '7d' ? 7 : 30;
        // Capture an upper bound so incoming events do not shift page offsets.
        const snapshot = new Date();
        const utcToday = Date.UTC(snapshot.getUTCFullYear(), snapshot.getUTCMonth(), snapshot.getUTCDate());
        const start = new Date(utcToday - (days - 1) * 86400000);
        const logs: ActivityLog[] = [];
        let exactCount: number | null = null;

        // PostgREST commonly caps a single SELECT response at 1,000 rows.
        // Page deterministically by timestamp + immutable ID. A large tenant
        // must use a reviewed server-side aggregate rather than a partial chart.
        for (let offset = 0; offset < ACTIVITY_MAX_EVENTS; offset += ACTIVITY_PAGE_SIZE) {
          if (cancelled) return;
          const { data: page, error: queryError, count } = await supabase
            .from('analytics_logs')
            .select('id,created_at,event_type', { count: offset === 0 ? 'exact' : undefined })
            .in('business_id', idsKey.split(','))
            .gte('created_at', start.toISOString())
            .lte('created_at', snapshot.toISOString())
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + ACTIVITY_PAGE_SIZE - 1);
          if (queryError) throw queryError;
          if (offset === 0) {
            exactCount = count;
            // Do not issue 20 page requests when the count already proves
            // this tenant needs a server-side aggregate for this time range.
            if (typeof count === 'number' && count > ACTIVITY_MAX_EVENTS) {
              if (!cancelled) {
                setEventLimitReached(true);
                setRecordedEventCount(count);
                setData([]);
              }
              return;
            }
          }
          logs.push(...((page || []) as ActivityLog[]));
          if ((page?.length || 0) < ACTIVITY_PAGE_SIZE) break;
        }

        const limited = exactCount !== null
          ? exactCount > logs.length
          : logs.length >= ACTIVITY_MAX_EVENTS;
        if (!cancelled) {
          setEventLimitReached(limited);
          setRecordedEventCount(exactCount);
          setData(limited ? [] : groupActivityByUtcDay(logs, days, snapshot));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Analytics could not be loaded.');
          setData([]);
          setEventLimitReached(false);
          setRecordedEventCount(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchActivity();
    return () => { cancelled = true; };
  }, [idsKey, timeRange, reload, refreshKey]);

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
    <div className={embedded ? 'min-w-0' : 'rounded-xl border border-[#EAE8E8] bg-white p-5 shadow-sm'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#8A8687]">
          <IconsaxIcon name="chart" size={16} color="#FF7900" />
          <span>Activity trend</span>
        </div>
        <div className="inline-flex rounded-lg border border-[#e4e9ed] bg-[#FFF6EF] p-0.5">
          {(['7d', '30d'] as Range[]).map(range => (
            <button key={range} type="button" onClick={() => setTimeRange(range)} aria-pressed={timeRange === range}
              className={timeRange === range
                ? 'rounded-md bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#29292D] shadow-sm'
                : 'rounded-md px-3.5 py-1.5 text-[11px] font-semibold text-[#87848B] hover:text-[#242429]'}>
              {range === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-[#eef1f2] bg-white px-3 py-3 sm:gap-4 sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#83919C]"><IconsaxIcon name="eye" size={13} color="#FF7900" /> Views</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#242427]">{loading || error || eventLimitReached ? '—' : totals.views.toLocaleString()}</p>
        </div>
        <div className="min-w-0 border-l border-[#F0EBE8] pl-3 sm:pl-5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#83919C]"><IconsaxIcon name="call" size={13} color="#28282D" /> Calls</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#242427]">{loading || error || eventLimitReached ? '—' : totals.calls.toLocaleString()}</p>
        </div>
        <div className="min-w-0 border-l border-[#F0EBE8] pl-3 sm:pl-5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#83919C]"><IconsaxIcon name="message-text" size={13} color="#C18A5B" /> Leads</div>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#242427]">{loading || error || eventLimitReached ? '—' : totals.leads.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[255px] items-center justify-center text-[#718594]">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#FFE0C5] border-t-[#FF7900]" />
        </div>
      ) : error ? (
        <div role="alert" className="flex h-[255px] flex-col items-center justify-center gap-3 rounded-2xl bg-red-50 px-4 text-center">
          <p className="text-sm text-red-700">Unable to load analytics: {error}</p>
          <button type="button" onClick={() => setReload(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700">
            <IconsaxIcon name="refresh" size={13} /> Retry
          </button>
        </div>
      ) : !idsKey ? (
        <div className="flex h-[255px] flex-col items-center justify-center rounded-2xl bg-[#fff9f4] px-5 text-center">
          <IconsaxIcon name="chart" size={26} color="#B6B1AD" />
          <p className="mt-3 text-sm font-semibold text-[#333235]">Your insights start with a listing</p>
          <p className="mt-1 text-xs text-[#8C8988]">Register a business to start tracking activity.</p>
        </div>
      ) : eventLimitReached ? (
        <div role="status" className="flex h-[255px] flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 text-center">
          <IconsaxIcon name="chart" size={25} color="#9A6700" />
          <p className="text-sm font-bold text-[#4A3821]">Activity trend unavailable for this volume</p>
          <p className="max-w-md text-xs leading-5 text-[#755B35]">
            {recordedEventCount === null ? 'At least ' : ''}{(recordedEventCount ?? ACTIVITY_MAX_EVENTS).toLocaleString()} recorded events in this period.
            A partial chart could be misleading, so no incomplete totals are shown.
          </p>
          {timeRange === '30d' && (
            <button type="button" onClick={() => setTimeRange('7d')} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-[#4A3821]">
              Try 7 days
            </button>
          )}
        </div>
      ) : (
        <div className="relative h-[230px] w-full min-w-0 sm:h-[255px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="vendorOrangeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF7900" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#FF7900" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="vendorInkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#28282D" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#28282D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F0EBE8" vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="date" tickLine={false} axisLine={false}
                tick={{ fontSize: 10, fill: '#99969A' }} tickMargin={12}
                minTickGap={20}
                tickFormatter={value => new Date(String(value) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                tick={{ fontSize: 10, fill: '#99969A' }} />
              <Tooltip
                labelFormatter={value => new Date(String(value) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                contentStyle={{ border: '1px solid #EAE8E8', borderRadius: '9px', boxShadow: '0 18px 40px -25px rgba(0,0,0,.28)', fontSize: '12px' }}
              />
              <Area dataKey="views" name="Views" type="monotone" stroke="#FF7900" strokeWidth={3} fill="url(#vendorOrangeFill)" dot={false} activeDot={{ r: 4 }} />
              <Area dataKey="calls" name="Call clicks" type="monotone" stroke="#28282D" strokeWidth={2.3} fill="url(#vendorInkFill)" dot={false} activeDot={{ r: 4 }} />
              <Area dataKey="leads" name="Enquiries" type="monotone" stroke="#C18A5B" strokeWidth={2} fillOpacity={0} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          {noEvents && (
            <div className="pointer-events-none absolute inset-x-4 bottom-10 flex justify-center">
              <p className="rounded-lg border border-[#e6ece8] bg-white/95 px-3 py-2 text-center text-[11px] text-[#8F8782] shadow-sm">
                No recorded events in this period yet
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#eef2ee] pt-4 text-[11px] text-[#788b7d]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#FF7900]" /> Views</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#28282D]" /> Call clicks</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#C18A5B]" /> Enquiries</span>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-[#9A9698]">
        Shows recorded events by UTC day, not unique visitors or verified sales. All-time profile counters may include earlier activity. Dashboard Refresh also reloads this chart.
      </p>
    </div>
  );
}
