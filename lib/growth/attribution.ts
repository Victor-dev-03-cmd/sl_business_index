/**
 * SLBI Growth Intelligence v1 — read-only, privacy-minimized attribution core.
 *
 * Deliberately compatible with existing public.analytics_logs and public.leads.
 * These counters describe recorded interactions, NOT unique visitors, verified
 * inquiries, paid customers, conversions, or revenue. Nothing here sends events.
 *
 * Ingestion, server-side rate limits, consent, RLS and vendor ownership checks
 * must be implemented and tested separately before a customer-facing rollout.
 */
export const EXISTING_DISCOVERY_EVENTS = [
  "view",
  "location_click",
  "call_click",
  "lead_form_submit",
] as const;

export type DiscoveryEventType = (typeof EXISTING_DISCOVERY_EVENTS)[number];
export type DiscoveryLog = {
  event_type: string | null;
  business_id?: string | null;
};
export type CrmLead = {
  id: string;
  business_id?: string | null;
  status?: string | null;
  source?: string | null;
};

export type GrowthMetricsSnapshot = {
  listingViewEvents: number;
  callClickEvents: number;
  locationClickEvents: number;
  leadFormSubmitEvents: number;
  otherEventCount: number;
  crmLeadRecords: number;
  crmMarkedConverted: number;
  leadsFromWebDetail: number;
  leadsFromMobileDetail: number;
  leadsFromOtherSources: number;
  verifiedSales: null;
  verifiedRevenue: null;
  uniqueVisitors: null;
};

const webDetail = "business detail page";
const mobileDetail = "mobile app - business details";

export function classifyLeadOrigin(source: string | null | undefined): "web_detail" | "mobile_detail" | "other" {
  const normalized = String(source ?? "").trim().toLocaleLowerCase();
  if (normalized === webDetail) return "web_detail";
  if (normalized === mobileDetail) return "mobile_detail";
  return "other";
}

/**
 * Count events and CRM leads independently. Event counts are not lead IDs:
 * summing lead_form_submit logs with CRM lead rows would double count.
 */
export function summarizeGrowthMetrics(
  logs: readonly DiscoveryLog[],
  leads: readonly CrmLead[],
): GrowthMetricsSnapshot {
  const result: GrowthMetricsSnapshot = {
    listingViewEvents: 0,
    callClickEvents: 0,
    locationClickEvents: 0,
    leadFormSubmitEvents: 0,
    otherEventCount: 0,
    crmLeadRecords: 0,
    crmMarkedConverted: 0,
    leadsFromWebDetail: 0,
    leadsFromMobileDetail: 0,
    leadsFromOtherSources: 0,
    verifiedSales: null,
    verifiedRevenue: null,
    uniqueVisitors: null,
  };
  for (const row of logs) {
    switch (row.event_type) {
      case "view": result.listingViewEvents++; break;
      case "call_click": result.callClickEvents++; break;
      case "location_click": result.locationClickEvents++; break;
      case "lead_form_submit": result.leadFormSubmitEvents++; break;
      default: result.otherEventCount++; break;
    }
  }
  const counted = new Set<string>();
  for (const lead of leads) {
    // A CRM row has a stable database ID; do not count repeated joins twice.
    if (!lead.id || counted.has(lead.id)) continue;
    counted.add(lead.id);
    result.crmLeadRecords++;
    if (String(lead.status ?? "").toLowerCase() === "converted") result.crmMarkedConverted++;
    switch (classifyLeadOrigin(lead.source)) {
      case "web_detail": result.leadsFromWebDetail++; break;
      case "mobile_detail": result.leadsFromMobileDetail++; break;
      default: result.leadsFromOtherSources++; break;
    }
  }
  return result;
}

/** Release requirements for *real* event collection, not already satisfied. */
export const GROWTH_INGESTION_RELEASE_GATES = Object.freeze([
  "verified approved business and vendor ownership checks",
  "server-side allowlisted event types and event-to-business validation",
  "bounded event rate, idempotency and bot/abuse protection",
  "no raw search text, precise GPS, visitor IP or fingerprint in analytics events",
  "consent-aware measurement and retention/deletion policy",
  "vendor-only aggregated reporting with RLS and query-budget limits",
  "verified lead-source attribution without treating clicks as sales",
] as const);
