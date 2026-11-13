import { summarizeGrowthMetrics, type CrmLead, type DiscoveryLog } from './attribution';

/**
 * Exactly equal rolling windows measured at one fixed snapshot time.
 * The same "now" bounds every database query to avoid future-dated events.
 */
export type InsightPeriodDays = 7 | 30 | 90;
export type GrowthWindow = {
  days: InsightPeriodDays;
  previousStart: string;
  currentStart: string;
  snapshotEnd: string;
};
const DAY_MS = 86_400_000;

export function createGrowthWindows(days: InsightPeriodDays, now = new Date()): GrowthWindow {
  if (![7, 30, 90].includes(days) || !Number.isFinite(now.getTime())) {
    throw new Error('Invalid growth reporting period');
  }
  const end = now.getTime();
  return {
    days,
    previousStart: new Date(end - 2 * days * DAY_MS).toISOString(),
    currentStart: new Date(end - days * DAY_MS).toISOString(),
    snapshotEnd: now.toISOString(),
  };
}

export type ComparedMetric = {
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
  label: string;
};

/** A zero previous value has NO mathematically meaningful growth percentage. */
export function compareRecordedCounts(current: number, previous: number): ComparedMetric {
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(previous) || previous < 0) {
    throw new Error('Invalid growth metric count');
  }
  const delta = current - previous;
  const percent = previous > 0 ? (delta / previous) * 100 : null;
  const label = previous === 0
    ? (current ? 'New activity · no previous baseline' : 'No recorded activity')
    : delta === 0 ? 'No change vs previous period'
    : (delta > 0 ? '+' : '') + percent!.toFixed(1) + '% vs previous period';
  return { current, previous, delta, percent, label };
}

export function compareGrowthSnapshots(
  events: readonly DiscoveryLog[],
  leads: readonly CrmLead[],
  previousEvents: readonly DiscoveryLog[],
  previousLeads: readonly CrmLead[],
) {
  const current = summarizeGrowthMetrics(events, leads);
  const previous = summarizeGrowthMetrics(previousEvents, previousLeads);
  return {
    listingViewEvents: compareRecordedCounts(current.listingViewEvents, previous.listingViewEvents),
    callClickEvents: compareRecordedCounts(current.callClickEvents, previous.callClickEvents),
    locationClickEvents: compareRecordedCounts(current.locationClickEvents, previous.locationClickEvents),
    crmLeadRecords: compareRecordedCounts(current.crmLeadRecords, previous.crmLeadRecords),
  };
}

export const INSIGHT_BATCH_SIZE = 500;
export const INSIGHT_MAX_ROWS = 10000;
