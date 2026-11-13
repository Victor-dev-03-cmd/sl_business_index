/**
 * The GPS/map position and locality/address are different data.
 * Google reverse-geocoding can return ZERO_RESULTS, REQUEST_DENIED or
 * quota failures even when the marker has valid coordinates.
 * Never invent a locality from raw coordinates; require vendor attribution.
 */
export const SRI_LANKAN_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
] as const;

const COORDINATES_ONLY = /^[+-]?\d{1,2}(?:\.\d+)?\s*[,;]\s*[+-]?\d{1,3}(?:\.\d+)?$/;
const INVALID_AREA = /^(?:n\/?a|none|unknown|sri lanka|test|not available|இலங்கை|ශ්‍රී ලංකාව)$/i;

export function isReadableBusinessArea(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const address = raw.replace(/\s+/g, ' ').trim();
  return address.length >= 5 && address.length <= 240
    && /\p{L}/u.test(address)
    && !COORDINATES_ONLY.test(address)
    && !INVALID_AREA.test(address);
}

/** Composes vendor-confirmed locality text; it is not an externally verified geocode. */
export function buildVendorEnteredArea(
  localityRaw: unknown,
  districtRaw: unknown,
): string | null {
  if (typeof localityRaw !== 'string' || typeof districtRaw !== 'string') return null;
  const locality = localityRaw.replace(/\s+/g, ' ').trim();
  if (locality.length < 2 || locality.length > 100 || !/\p{L}/u.test(locality)
      || COORDINATES_ONLY.test(locality) || INVALID_AREA.test(locality)
      || !SRI_LANKAN_DISTRICTS.some(district => district === districtRaw)) {
    return null;
  }
  const result = locality + ', ' + districtRaw + ' District, Sri Lanka';
  return isReadableBusinessArea(result) ? result : null;
}

export type BrowserPositionError = { code: number };
export function describeGeolocationFailure(error: BrowserPositionError): string {
  switch (error.code) {
    case 1: return 'Location access was denied. Allow location for this site in your browser settings, or pin your shop manually.';
    case 2: return 'Your device could not determine its location. On desktop, choose your shop entrance directly on the map.';
    case 3: return 'Location lookup timed out. Try again, or choose your business entrance directly on the map.';
    default: return 'Location is unavailable. You can set a precise map pin and enter the town/district manually.';
  }
}
