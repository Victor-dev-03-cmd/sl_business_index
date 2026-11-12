/**
 * Human-readable public business location, shared across homepage, nearby and map cards.
 * Coordinates are geographic metadata, not a street address. Never reverse-geocode
 * or fabricate an address when the business did not provide one.
 */
export type BusinessAddressFields = {
  detailed_address?: string | null;
  address?: string | null;
  city?: string | null;
};

export function isCoordinateAddress(value: string): boolean {
  const cleaned = value.trim()
    .replace(/^\(|\)$/g, "")
    .replace(/\b(?:latitude|longitude|lat|lng|lon)\s*[:=]\s*/gi, "")
    .trim();
  const match = cleaned.match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return false;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function getBusinessDisplayAddress(
  business: BusinessAddressFields,
  fallback = "Sri Lanka",
): string {
  for (const candidate of [business.detailed_address, business.address, business.city]) {
    if (typeof candidate !== "string") continue;
    const readable = candidate.replace(/\s+/g, " ").trim();
    if (readable && !isCoordinateAddress(readable)) return readable;
  }
  return fallback;
}
