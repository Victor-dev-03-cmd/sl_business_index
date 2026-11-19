# P2-33 — Mobile bottom dock: fixed first paint and viewport anchoring

**Date:** 2026-11-19  
**Scope:** Public mobile navbar only; preserve five established navigation routes and desktop/vendor UI.  
**Baseline:** Production PR #121 / main commit `8484cbf27335cf13070400b9bbb96ff031e9cbf5`.

## User report and reproduction evidence

The user supplied a mobile screenshot showing the five-icon dock over the Browse Categories section and reported that the dock only appears or aligns after scrolling. This is a mobile experience bug: the navigation must be present **at a stable screen-bottom position on initial load and throughout scrolling**, not dynamically introduced by focus/scroll changes.

## Implementation

- `app/RootClientLayout.tsx`: render `<MobilePublicDock />` immediately after the public Navbar, **before** the potentially streamed homepage `<main>`. Retain the footer clearance as a separate `<MobilePublicDock role="spacer" />` after Footer to avoid obscuring last-page content.
- `app/components/MobilePublicDock.tsx`: server-render the fixed dock in the first React tree, without client-state, focus listeners, scroll listeners or mount-time portals. Previously, focus on search fields could hide the dock and blur on scrolling could reveal it.
- Replace `left:50%` plus `translateX(-50%)` with equal **left and right safe-area-aware insets** (minimum 12 px), auto horizontal margins, `maxWidth:440px`, `width:auto`. Keep five equal grid columns, 56px targets and a 66px high bar.
- Preserve exactly **Explore / Categories / Nearby / Business News / About**, bundled Iconsax glyphs and fallback icons. No extra navigation buttons, no database/migration changes.

## Verification requirements

- `tests/publicMobileHomeReference.test.mjs` asserts the dock is located in Root layout before `<main>` and footer clearance after Footer; no client mount/scroll/focus dependencies; symmetrical safe-area insets, no translate centering, exact five routes, and 280–600px geometry.
- Require GitHub Next.js production build and existing review/security/marketing/billing contracts, one Vercel QA build and exact-SHA production deployment.
- An authenticated real phone/Chrome or Safari screenshot on first load and after scroll remains necessary to claim pixel-perfect behavior; source assertions are not a substitute for device QA.

## Release receipt
To be recorded in the associated PR after CI and deployment.
