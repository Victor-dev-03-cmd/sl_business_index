/**
 * One-shot, consent-based browser geolocation used by Home and Nearby.
 * No IP geolocation, hidden city fallback, cookies or persisted coordinates.
 * Only accuracy-qualified fixes can drive a radius search.
 */
export type LocationFailureCode =
  | 'insecure' | 'unsupported' | 'permission-denied' | 'unavailable'
  | 'timeout' | 'inaccurate' | 'invalid' | 'cancelled';

export class LocationFailure extends Error {
  constructor(public readonly code: LocationFailureCode, message: string) {
    super(message);
    this.name = 'LocationFailure';
  }
}

export type PreciseFix = {
  lat: number;
  lng: number;
  accuracyMeters: number;
  timestamp: number;
};
type MinimalGeo = Pick<Geolocation, 'getCurrentPosition'> &
  Partial<Pick<Geolocation, 'watchPosition' | 'clearWatch'>>;
type RequestOptions = {
  geolocation?: MinimalGeo;
  secureContext?: boolean;
  signal?: AbortSignal;
  initialTimeoutMs?: number;
  refinementTimeoutMs?: number;
};
export const MAX_NEARBY_GPS_ACCURACY_METERS = 2000;

export function locationFailureMessage(code: LocationFailureCode): string {
  switch (code) {
    case 'insecure':
      return 'Location needs a secure HTTPS page. Open www.slbusinessindex.com in your browser.';
    case 'unsupported':
      return 'This browser cannot access location. Try your browser Location settings, or choose a town.';
    case 'permission-denied':
      return 'Location permission is blocked. Allow Location for this website in browser settings, enable phone Location Services and Precise Location, then retry.';
    case 'unavailable':
      return 'The device could not determine your location. Turn on phone Location Services and Wi-Fi, move to an open area, then retry.';
    case 'timeout':
      return 'GPS took too long. Keep Location Services on, move to an open area and tap Use my location again.';
    case 'inaccurate':
      return 'Only an approximate location was available, so we did not guess your area. Enable Precise Location/GPS, or select a town.';
    case 'invalid':
      return 'The browser returned an invalid or outdated location. Please try GPS again or select a town.';
    case 'cancelled':
      return 'Location request cancelled.';
  }
}

function problem(code: LocationFailureCode): LocationFailure {
  return new LocationFailure(code, locationFailureMessage(code));
}

export function validatedFix(position: Pick<GeolocationPosition, 'coords' | 'timestamp'>): PreciseFix | null {
  const {latitude: lat, longitude: lng, accuracy} = position.coords;
  const age = Date.now() - position.timestamp;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180 ||
      (lat === 0 && lng === 0) || !Number.isFinite(accuracy) || accuracy < 0 ||
      !Number.isFinite(position.timestamp) || age > 120_000 || age < -30_000) return null;
  return {lat, lng, accuracyMeters: accuracy, timestamp: position.timestamp};
}

function errorCode(error: GeolocationPositionError): LocationFailureCode {
  if (error.code === 1) return 'permission-denied';
  if (error.code === 3) return 'timeout';
  return 'unavailable';
}

export function requestPreciseLocation(options: RequestOptions = {}): Promise<PreciseFix> {
  const secureContext = options.secureContext ?? (typeof window === 'undefined' ? true : window.isSecureContext);
  const geolocation = options.geolocation ?? (typeof navigator === 'undefined' ? undefined : navigator.geolocation);
  if (!secureContext) return Promise.reject(problem('insecure'));
  if (!geolocation?.getCurrentPosition) return Promise.reject(problem('unsupported'));
  if (options.signal?.aborted) return Promise.reject(problem('cancelled'));

  const firstTimeout = options.initialTimeoutMs ?? 18_000;
  const refinementTimeout = options.refinementTimeoutMs ?? 8_000;
  return new Promise<PreciseFix>((resolve, reject) => {
    let finished = false;
    let watching = false;
    let watchId: number | null = null;
    let refinementTimer: ReturnType<typeof setTimeout> | null = null;
    const overallTimer = setTimeout(() => finish(problem('timeout')), firstTimeout + refinementTimeout + 4000);
    const cleanup = () => {
      clearTimeout(overallTimer);
      if (refinementTimer) clearTimeout(refinementTimer);
      if (watchId !== null) geolocation.clearWatch?.(watchId);
      options.signal?.removeEventListener('abort', abort);
    };
    function finish(result: LocationFailure | PreciseFix) {
      if (finished) return;
      finished = true;
      cleanup();
      if (result instanceof LocationFailure) reject(result);
      else resolve(result);
    }
    function abort() { finish(problem('cancelled')); }
    options.signal?.addEventListener('abort', abort, {once: true});

    const onFix = (position: GeolocationPosition) => {
      if (finished) return;
      const fix = validatedFix(position);
      if (fix && fix.accuracyMeters <= MAX_NEARBY_GPS_ACCURACY_METERS) {
        finish(fix);
        return;
      }
      // An IP/Wi-Fi city-centre approximation is not a valid nearby origin.
      // Ask the device briefly for a more accurate GPS position.
      if (!watching) {
        watching = true;
        if (!geolocation.watchPosition || !geolocation.clearWatch) {
          finish(problem(fix ? 'inaccurate' : 'invalid'));
          return;
        }
        refinementTimer = setTimeout(() => finish(problem(fix ? 'inaccurate' : 'invalid')), refinementTimeout);
        try {
          const id = geolocation.watchPosition(
            onFix,
            error => {
              if (error.code === 1) finish(problem('permission-denied'));
              // Temporary receiver errors are allowed until the bounded refinement deadline.
            },
            {enableHighAccuracy: true, maximumAge: 0, timeout: refinementTimeout},
          );
          watchId = id;
          if (finished) geolocation.clearWatch(id);
        } catch {
          finish(problem(fix ? 'inaccurate' : 'unavailable'));
        }
      }
    };
    try {
      geolocation.getCurrentPosition(
        onFix,
        error => finish(problem(errorCode(error))),
        {enableHighAccuracy: true, maximumAge: 0, timeout: firstTimeout},
      );
    } catch {
      finish(problem('unavailable'));
    }
  });
}


export function locationError(error: unknown): LocationFailure {
  return error instanceof LocationFailure ? error : problem('unavailable');
}
