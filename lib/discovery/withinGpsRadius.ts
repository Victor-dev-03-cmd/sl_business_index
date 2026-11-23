/**
 * Client-side defence in depth for radius searches from a consented GPS fix.
 * The SQL RPC must apply ST_DWithin too. No out-of-radius semantic/lexical
 * matches or businesses without map coordinates enter the GPS list or map.
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const deg = Math.PI / 180;
  const dLat = (lat2 - lat1) * deg;
  const dLng = (lng2 - lng1) * deg;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * deg) * Math.cos(lat2 * deg) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function withinGpsRadius(
  userLat: number,
  userLng: number,
  radiusMeters: number,
  latitude: unknown,
  longitude: unknown,
): boolean {
  if (typeof latitude !== 'number' && typeof latitude !== 'string') return false;
  if (typeof longitude !== 'number' && typeof longitude !== 'string') return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (![userLat, userLng, radiusMeters, lat, lng].every(Number.isFinite)
    || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180
    || lat < -90 || lat > 90 || lng < -180 || lng > 180
    || radiusMeters <= 0 || (lat === 0 && lng === 0)) return false;
  return haversineMeters(userLat, userLng, lat, lng) <= radiusMeters;
}
