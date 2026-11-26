# Home Search GPS fallback hotfix — customer reported

**Date:** 2026-11-26 (Asia/Colombo)  
**Scope:** Home hero search and Nearby informative fallback only. **Connectors, Meta, Gmail, auth, Supabase SQL, credits, wallet and payments unchanged.**

## Customer report and root cause
- Signed-in/public Home Hero entered `thuni kadai`. Button remained "Finding GPS…" and then showed: **"Only an approximate location was available, so we did not guess your area. Enable Precise Location/GPS, or select a town."**
- `app/components/HeroSearch.tsx` uses `handleUseCurrentLocation(true, searchParams)` for a generic query; original Home `handleUseCurrentLocation` only called `router.push('/nearby?...')` in the successful precise GPS promise branch. Rejected/denied/coarse/unavailable/stalled geolocation showed an error toast and did NOT navigate. This was an accidental **hard dependency** on physical GPS for keyword search, stranding customers.
- Nearby **already supports search with no coordinates** using a clearly labeled Sri Lanka-wide default (no inferred user's location); query runs with `location.kind === 'default'`, `enabled: Boolean(normalizedSearch)`, and broad island-wide search radius. No Colombo IP guess needed.
- Explicit city/town queries already go straight to Nearby; existing exact GPS successful flow continues.

## Implemented candidate
1. `app/HomePageClient.tsx` adds a **shared navigation function** that always forwards the existing user search/filter query:
   - High-quality GPS fix: `lat`, `lng`, `radius=5000`, `source=gps` passed as before.
   - Denied/approximate/unavailable/timeout: drops all fake/unverified GPS coordinates and radius, adds `locationStatus=gps-unavailable`, navigates to `/nearby?q=...` for nationwide results. **No error toast blocking search**.
   - Home search geolocation request budget: first 4.8 sec, refinement 1.7 sec, **hard 7-sec deadline** for native browser callbacks that may never finish. Deadline navigates to Nearby and aborts request. Per-request abort + `navigated` guard prevent stale responses and double navigation.
   - Explicit `Explore near me` without keyword also navigates to Nearby area picker if GPS fails; does not claim the user is at the Sri Lanka midpoint.
2. `app/nearby/NearbyExplorer.tsx` shows a **neutral informational bar** only for `locationStatus=gps-unavailable` with a query/category. It states "GPS unavailable — showing matching businesses across Sri Lanka. Choose a town or use GPS to narrow results." Nearby search/map still avoid pretending default coordinates are the user's position.
3. Preserves exact selected city/town routing, valid GPS radius filtering, and user-triggered Nearby "Use my location"; no silent GPS bypass.

## Regression coverage
- Browser Playwright: fresh accurate GPS still obtains exact coordinates, denied GPS now navigates with original "Hospital" query and NO coordinates, coarse-only mock "thuni kadai" reaches Nearby, permanently stalled geolocation reaches Nearby within timeout, and explicit Colombo/Jaffna queries remain independent of device GPS.
- Unit source contract asserts data separation, preserved query, 7s deadline, island-wide search without GPS, and existing accurate GPS radius/map.
- Browser mock tests are NOT evidence of physical Android/iOS GPS sensor success; physical acceptance remains necessary.

## Release gate
- PR: pending
- Exact PR-head CI: pending
- Main merge: pending
- Vercel Production READY + exact main SHA/www alias: pending
- Physical desktop/iPhone/Android and real customer query: pending
- Customer communication should only claim "please retry" after merge/READY is verified, and never promise GPS works in a device that only provides coarse/denied location.

## Next-chat continuation prompt
Continue SLBusinessIndex in Tamil. Read full `docs/growth/HANDOFF_LATEST.md`, `docs/growth/HOME_SEARCH_GPS_FALLBACK_HOTFIX_20261126.md`, `AGENTS.md`. User's customer reported Home keyword searches stuck on "Finding GPS" then "Only an approximate location..." and could not reach Nearby; this is urgent production UX. Branch `fix/home-gps-search-nonblocking-20261126` changes Home to attempt precise GPS bounded by 7 seconds, but **always navigate with unchanged query** when denied/coarse/stalled, using explicit Sri Lanka-wide Nearby mode without invented GPS; shows honest Nearby bar. Browser and contract regressions added. Verify exact-head full CI; safely squash merge only if green; verify Vercel Production READY exact merged SHA and www alias; ask owner for physical signed-in/public desktop Chrome + Android Chrome + iOS Safari QA with `thuni kadai`, `Hospital`, explicit `Hotels in Colombo`. No SQL changes, no React UI restyling, preserve previous Connectors deployment. After READY prepare polite Tamil/English customer follow-up message "search is fixed, please retry"; do not claim physical GPS is guaranteed. 
