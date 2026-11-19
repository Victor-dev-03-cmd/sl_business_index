# P2-35 — Mobile Home Overflow and Compact Hero Fix

**Date:** November 19, 2026  
**Scope:** Homepage only, mobile viewport <=767px.  
**Previous production:** `main` `0fd152e1aad267fc604c8b080085d3d7cf3c9de2` (PR #123).  
**Branch:** `fix/mobile-home-hero-overflow-20261119`.

## User evidence

Two screenshots compared directly: the same bottom public dock is centered correctly on the Categories page but shifted about 33px to the right/clipped on Home. User requests modifying **only the mobile homepage**, possibly by reducing the glass search card size, and preserving the other pages.

## Root cause: decorative mobile map overflow

`app/home-mobile.css` placed the Sri Lanka gold outline at `.slbi-home-mobile-map { right:-65px; width:205px }`. Its parent homepage hero had no horizontal paint clipping. This decorative element expanded the Chromium **layout/visual viewport** of a 390px mobile page to 455px. The globally fixed dock consequently centered about **32.5px too far right**. Other pages lack this overflowing element and already work.

Independent headless Chromium reproduction (390px device, mobile viewport meta):
- **Before**: `window.innerWidth = 455`, dock left edge `44.5px` instead of `12px`.
- **After**: `window.innerWidth = 390`, dock side insets both `12px`; remains fixed when scrolling.
- Follow-up fixture of new CSS tested 280, 320, 360, 375, 390, 414, 430, 480 and 600px. `documentElement.scrollWidth === innerWidth === deviceWidth`; each tab inside bar; nav unchanged after scrolling.

## Implemented changes

1. Add `slbi-home-root` class **only** to `HomePageClient` root. Mobile CSS `overflow-x:clip` on Home root and Hero keeps decorative backgrounds from widening the document. Clip avoids introducing a new vertical scroll container.
2. Move decorative mobile-only Sri Lanka map to `right:0` (instead of `-65px`), resize 205 → 160px and cap at 42% width. The gold silhouette remains subtle and entirely inside the mobile viewport.
3. Compact the **mobile-only** hero: remove forced `100svh` minimum height, reduce top and bottom padding and large text/card gaps; shrink glass card padding, input vertical spacing and submit button min-height while maintaining >=44px touch targets. No mobile homepage form functionality removed.
4. All adjustments live inside `@media (max-width:767px)` in `app/home-mobile.css`. **No code changes to global navbar, Categories, Nearby, About, Business News, desktop or Vendor Dashboard**.
5. Extend the existing `tests/publicMobileHomeReference.test.mjs` (already run by Verify Next.js Build) to guard Home-only clipping, the map `right:0`, compact card, valid 46px submit touch target and unchanged public dock.

## QA and release gates

- Run all current branch CI workflows and Next.js production build.
- Use exactly one QA Vercel preview if possible. Verify exact SHA READY; merge PR; verify Vercel production READY, `www.slbusinessindex.com` alias and main CI.
- Isolated Chromium geometry is a reproduction and targeted validation, **not** a screenshot from the deployed live site. Manual real device confirmation remains appropriate.
