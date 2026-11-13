/**
 * P1-02 business address checks used by BOTH registration and editing.
 * These are input-quality checks, not proof of ownership or a postal
 * geocoding guarantee. Admin review remains the authority for publication.
 */
export type BusinessMapPin = {
  lat: number;
  lng: number;
  address: string;
};

// Deliberately generous Sri Lanka regional envelope (including offshore
// islands). This is a plausibility filter, not a precise coastline polygon.
export function isPlausibleSriLankaPin(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 5.5 && lat <= 10.3 && lng >= 79.2 && lng <= 82.3;
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

const COORDINATES_ONLY = /^(?:\(?\s*)[+-]?\d{1,2}(?:\.\d+)?\s*[,;]\s*[+-]?\d{1,3}(?:\.\d+)?\s*\)?$/;
const EMPTY_PLACEHOLDERS = /^(?:n\/?a|none|unknown|not available|test|sri lanka|ශ්‍රී ලංකාව|இலங்கை)[.!]?$/i;

/**
 * Require a readable geocoded area and a vendor-supplied physical address.
 * A map marker / Find Me alone cannot locate a shop's actual entrance.
 * Never interpret a user's mobile GPS as evidence of ownership.
 */
export function validateBusinessLocation(
  pin: BusinessMapPin | null | undefined,
  physicalAddress: string,
  confirmed: boolean,
): string | null {
  const detailed = normalized(physicalAddress);
  if (!pin || !isPlausibleSriLankaPin(Number(pin.lat), Number(pin.lng))) {
    return 'Select a business map pin inside Sri Lanka using address search, Find Me or the map.';
  }
  const area = normalized(pin.address);
  if (area.length < 5 || COORDINATES_ONLY.test(area) || EMPTY_PLACEHOLDERS.test(area)) {
    return 'Select a readable Sri Lankan location. Coordinates alone are not a business address.';
  }
  if (detailed.length < 10 || detailed.length > 240 || !/\p{L}/u.test(detailed)
      || COORDINATES_ONLY.test(detailed) || EMPTY_PLACEHOLDERS.test(detailed)) {
    return 'Enter a real physical address (10–240 characters): shop/building, road or landmark and locality.';
  }
  if (!confirmed) {
    return 'Confirm that the map pin marks your actual business entrance and the physical address is correct.';
  }
  return null;
}
