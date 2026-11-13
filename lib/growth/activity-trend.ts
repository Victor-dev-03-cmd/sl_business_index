/**
 * P1-01 Vendor Overview: activity is an event counter, never a unique visitor
 * or a verified customer conversion metric.
 *
 * Use one UTC calendar-day definition across the dashboard chart and tests.
 */
export const ACTIVITY_PAGE_SIZE = 500;
export const ACTIVITY_MAX_EVENTS = 10_000;

export type ActivityLog = {
  id: string;
  created_at: string | null;
  event_type: string | null;
};

export type DailyActivity = {
  date: string;
  views: number;
  calls: number;
  leads: number;
};

/**
 * Input is already owner-scoped by the querying RLS policy. This function
 * intentionally uses only recorded events; absent dates are zero-filled.
 * A Set of event IDs prevents overlap between paginated queries from
 * inflating counters if rows are shifted during a refresh.
 */
export function groupActivityByUtcDay(
  logs: readonly ActivityLog[],
  days: number,
  referenceTime: Date,
): DailyActivity[] {
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    throw new RangeError('Activity window must contain between 1 and 366 days.');
  }
  const today = Date.UTC(
    referenceTime.getUTCFullYear(),
    referenceTime.getUTCMonth(),
    referenceTime.getUTCDate(),
  );
  const buckets = new Map<string, DailyActivity>();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today - offset * 86400000).toISOString().slice(0, 10);
    buckets.set(date, { date, views: 0, calls: 0, leads: 0 });
  }

  const seenIds = new Set<string>();
  for (const log of logs) {
    if (!log.id || seenIds.has(log.id)) continue;
    seenIds.add(log.id);
    const day = buckets.get(log.created_at?.slice(0, 10) || '');
    if (!day) continue;
    if (log.event_type === 'view') day.views++;
    else if (log.event_type === 'call_click') day.calls++;
    else if (log.event_type === 'lead_form_submit') day.leads++;
  }
  return [...buckets.values()];
}
