# P2-36 — Nearby mobile explorer card density and single navigation

Date: 2026-11-19

## User screenshots and request
The current Nearby mobile screenshot shows a very tall discovery summary, only one business card visibly usable in the small results viewport, and two stacked bottom navigation bars. The supplied reference shows a compact search/category area, clean business cards and only the Nearby-owned bottom tab bar (Map, Listings, Filters).

## Changes
- Exclude `/nearby` and its nested routes from `app/components/MobilePublicDock.tsx`. The five-button public dock remains unchanged everywhere else; Nearby continues using its existing three-button Map/Listings/Filters navigation.
- Compact mobile Nearby header (title, search controls, category chips) and remove redundant default-Colombo instruction banner on mobile. The district/town selector still displays the starting area and current-location button continues to work.
- Replace the multiple-row mobile discovery diagnostics with a single compact area/radius/filter-count/sort line. Preserve full Semantic V3 Beta status, explanatory copy, filter details and sorter in desktop Nearby.
- Make cards readable and denser: 70px logo (62px at <=359px), more compact spacing, single four-column action row with Map / Directions / Call / Profile. Preserve full business name/category/address/distance/rating and actual map, maps-directions, telephone, business profile actions. Buttons are shown only when their underlying action is valid, as before.
- Tighten the native Map/Listings/Filters bottom bar; keep touch targets >=57px and safe-area padding.
- No changes to discovery RPCs, ranking behavior, Supabase policies, global navbar on any other page, or desktop map split layout.
- Added `tests/nearbyMobileLayout.test.mjs` to Verify Next.js Build CI.

## Verification / release rules
CI: Next.js typecheck/build, Nearby mobile regression test, existing semantic V3 / hybrid tests, marketing security and billing gates.
Deployment: one QA Vercel preview exact SHA, production merge and exact SHA/alias verification if green.
Actual authenticated Samsung/iPhone screenshot-level E2E remains necessary to claim a guaranteed specific number of cards visible at every viewport.
