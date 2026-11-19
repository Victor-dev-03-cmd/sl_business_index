# P2-34 — Permanent mobile dock stabilization after cross-browser screen recording

**Date:** 2026-11-19  
**Baseline production:** `main` `4295ff56c8777573d9a9beece5a456e89fbc1faa` (PR #122)  
**Branch:** `fix/mobile-dock-body-portal-20261119`.

## User evidence

The user reports the same mobile bottom-bar bug on Samsung Chrome, Vivo Chrome and desktop Chrome mobile emulation. The uploaded 7.4-second, 464×899 VP8 screencast `Screencast from 2026-11-19 14-18-20.webm` shows:
- At the beginning the homepage renders but the bottom five-icon dock does not appear.
- After scrolling downward into Browse Categories the dock becomes visible, right-edge clipped.
- Previous attempts to move it before `<main>`, increase `z-index` and modify side insets did not reliably address it across browsers.

## Underlying layout investigation

- `app/globals.css` sets `html { scrollbar-gutter: stable; }` globally. A real headless Chromium geometry fixture reproducing that rule showed an **asymmetric horizontal offset** for a fixed navigation element when scrollbar space is reserved. At 280px width, its left inset was 4.5px while the right inset was 19.5px.
- Keeping `scrollbar-gutter: stable` on desktop but overriding it to `auto` below 640px produces symmetric 12px insets in Chromium at 280, 320, 360, 375, 390, 414, 430, and 440px.
- Fixed children can acquire an unexpected containing block if ancestor wrappers set transforms, filters or containment; merely moving within the same React layout is not a guaranteed isolation.

## Fix

1. `app/components/MobilePublicDock.tsx` portals the nav to `document.body` through `createPortal` during the first React hydration layout effect. Removes dependence on page wrapper stacking/clip/streaming boundaries. No mount/scroll/focus visibility toggles.
2. Explicit `width: min(420px, calc(100vw - 24px))`, `left:0`, `right:0`, `margin-inline:auto`, `transform:none`, fixed bottom with safe-area padding and high z-index, preserving five equal Iconsax tab cells and their exact Explore / Categories / Nearby / Business News / About order.
3. `app/globals.css` sets `scrollbar-gutter:auto` **on mobile only**, avoiding reserved desktop scrollbar width in a narrow viewport.
4. Root layout remains single nav before main and footer-spacer after Footer (already implemented PR #122); other pages, vendor dashboard and desktop typography/navigation untouched.

## QA

- Chromium fixture using `/usr/bin/chromium` and Playwright: 280–600px widths, fixed dock alignment equal on left and right, no last icon overflow, and identical first/after-scroll `getBoundingClientRect()`. This fixture is not a screenshot of the live production React app.
- `tests/publicMobileHomeReference.test.mjs` updated with source guards for body portal, explicit viewport width and mobile scrollbar override; the GitHub Next.js CI and remaining safety, billing, marketing gates must pass.
- Deploy only one Vercel QA preview for exact SHA; verify READY. Then merge and confirm production exact SHA/alias; do not claim actual Samsung/Vivo browser E2E without opening the site on those devices.

## Handoff

No new user permissions or device location requested. After release, validate the live homepage immediately on load, after scrolling, and with the mobile keyboard open. If the visual bug persists, capture the actual `getBoundingClientRect()` and `visualViewport` values from the affected browser rather than applying speculative CSS edits.
