# Public Industries Ribbon — Narrow-Laptop Horizontal Scroll Fix

**Date:** 2026-11-26 (Sri Lanka)  
**Reported by:** SLBI owner, based on real registered customer laptop UI feedback  
**Scope:** Public desktop category *industry ribbon* only (`app/components/Navbar.tsx`). No GrowthOS, providers, location/search, DB, auth, vendor pages, category URLs or menu restructuring.

## Complaint and exact root cause
- On narrow laptop displays the lower public navigation bar lists Industries and eight industry groups: Manpower Services, Care & Lifestyle, Professional & Finance, Construction & Industrial, Technical & Electronics, Events, Food & Leisure, Travel & Transport, Retail & Others.
- The original `<nav aria-label="Business industries">` already had `overflow-x-auto`, but it also hid scrollbars with `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` and had **no visible overflow affordance** or scroll-arrow controls. That makes rightmost groups appear missing to mouse users even though DOM buttons exist.
- CategorySubNavbar is the separately opened industry mega-menu; preserve its hover, click, focus, Escape and onClose behavior.

## Implementation
- Added a nav DOM ref and dynamic overflow detection from `scrollWidth - clientWidth` (not viewport guessing); tracks whether more content is hidden left/right. Observe `ResizeObserver`, native scroll, window resize, and webfont-ready size changes. Listener and observer cleanup on unmount.
- Added *only when overflowing* small overlay left/right arrow buttons with explicit English aria-labels. Disabled at the corresponding boundary; focus-visible ring and touch target ~36px. Buttons scroll by ~65% of visible width, respect reduced-motion settings. Rail gets side padding while arrows exist so first/last words are not obscured. If full width fits, no arrows or unnecessary padding.
- Mouse vertical wheel over the strip moves it horizontally **only when it can move**. At both horizontal boundaries, normal page scrolling is preserved. Native two-finger horizontal touchpad scrolling and touch swipes still work. Buttons and category tabs preserve keyboard focus/click interaction.
- The ribbon stays under its original `lg:block` breakpoint. Clicking a hovered/focused tab now reliably **keeps** its mega menu open (previous toggle immediately closed it when hover had already selected the tab); Escape, outside pointer, tab change and built-in Close remain. No changes to mobile dock, original top navbar, category/group list, registration, search, geo or CategorySubNavbar implementation.

## Regression tests
- `tests/publicMobileHomeReference.test.mjs`: source contract checks arrow presence, dynamic measurement, bounded wheel scrolling, reduced motion and unchanged mobile/header linkage. Included by `verify-nextjs.yml` normal CI.
- `tests/g0/browser/industry-ribbon-scroll.spec.mjs`: isolated desktop-width Chromium/WebKit tests for overflow at 1024px, arrow-controlled ability to reveal and click `Retail & Others` (mega menu opens), horizontal wheel at 1100px and no document-level horizontal overflow. This test file triggers G0-09 browser workflow under `tests/g0/browser/**`.
- Browser tests use fake/public backend and headless viewport emulation, NOT a real customer laptop. Manual actual laptop check at 1024/1280/1366 and browser zoom remains pending.

## Release status (fill after verification)
- PR: pending
- Exact PR-head CI: pending
- Main merge: pending
- Vercel production READY at merged SHA + `www.slbusinessindex.com` alias: pending
- Real customer or owner's laptop QA: pending

## Next-chat continuation (copy and paste)
Continue SLBusinessIndex in Tamil. Read GitHub main `docs/growth/HANDOFF_LATEST.md`, `docs/growth/PUBLIC_INDUSTRY_RIBBON_SCROLL_20261126.md` and `AGENTS.md`. User reports that on small laptop, the public top navigation's lower Industries ribbon hides the final groups (especially `Retail & Others`) because horizontal scrolling is invisible. Branch `fix/desktop-industry-ribbon-scroll-20261126` preserves existing menu/links and adds responsive arrows, wheel-to-horizontal native scrolling bounded at edges, touchpad/swipe support, overflow detection and browser + source regressions. Verify exact PR-head complete GitHub CI (especially G0-09 browser and Next.js build), fix failures, merge only green. Verify exact Vercel READY merged-main SHA and `www.slbusinessindex.com` alias. Need actual signed-in/public laptop visual acceptance before declaring a physical-device fix. Keep previous Home GPS hotfix + all connectors untouched, no DB/SQL, feature unlock or provider action; update HANDOFF_LATEST for any follow-up PR.
