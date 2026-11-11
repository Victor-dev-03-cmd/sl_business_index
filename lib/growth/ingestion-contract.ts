/**
 * Growth Intelligence ingestion contract.
 * No query text, coordinates, personal profiles or arbitrary metadata admitted.
 */
export const GROWTH_ALLOWED_EVENTS = ['view', 'call_click', 'location_click'] as const;
export type GrowthAllowedEvent = typeof GROWTH_ALLOWED_EVENTS[number];
export const GROWTH_ALLOWED_CHANNELS = [
  'business_detail', 'nearby_search', 'home_featured',
  'category_browse', 'mobile_detail', 'direct', 'unknown',
] as const;
export type GrowthChannel = typeof GROWTH_ALLOWED_CHANNELS[number];

export type GrowthEventPayload = {
  businessId: string;
  eventType: GrowthAllowedEvent;
  eventId: string | null;
  channel: GrowthChannel;
};
export type GrowthValidation = {ok:true;value:GrowthEventPayload} | {ok:false;reason:string};

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const events: ReadonlySet<string> = new Set(GROWTH_ALLOWED_EVENTS);
const channels: ReadonlySet<string> = new Set(GROWTH_ALLOWED_CHANNELS);

export function validateGrowthEvent(payload: unknown): GrowthValidation {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {ok:false,reason:'invalid-json-shape'};
  const row = payload as Record<string,unknown>;
  const businessId = row.business_id;
  const eventType = row.event_type;
  if (typeof businessId !== 'string' || !uuid.test(businessId)) return {ok:false,reason:'invalid-business-id'};
  if (typeof eventType !== 'string' || !events.has(eventType)) return {ok:false,reason:'invalid-event-type'};
  const channel = row.channel ?? 'business_detail';
  if (typeof channel !== 'string' || !channels.has(channel)) return {ok:false,reason:'invalid-channel'};
  const eventId = row.event_id ?? null;
  if (eventId !== null && (typeof eventId !== 'string' || !uuid.test(eventId))) return {ok:false,reason:'invalid-event-id'};
  // Deliberately ignore legacy city/metadata fields rather than persisting them.
  return {ok:true,value:{
    businessId, eventType:eventType as GrowthAllowedEvent,
    eventId:eventId as string|null, channel:channel as GrowthChannel,
  }};
}

export function isSameOrigin(requestUrl: string, origin: string|null): boolean {
  if (!origin) return false;
  try {
    const canonical = new URL(requestUrl);
    const supplied = new URL(origin);
    return (canonical.protocol === 'https:' || canonical.hostname === 'localhost') &&
      supplied.origin === canonical.origin;
  } catch { return false; }
}

export function isPrivacyOptOut(headers: {get(name:string): string|null}): boolean {
  return headers.get('sec-gpc') === '1' || headers.get('dnt') === '1';
}
