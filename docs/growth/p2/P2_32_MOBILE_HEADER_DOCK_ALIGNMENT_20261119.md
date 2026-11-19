# SLBusinessIndex — Mobile Header / Bottom Dock Refinement Handoff

**Date:** 2026-11-19  
**Branch:** `fix/mobile-header-dock-alignment-20261119`  
**Baseline:** Mobile home reference rollout PR #120 / main `80ef8d3992bf34caf46b76fd9e2dd728a623a4bd`.

## User references and explicit requirements

Two mobile screenshots: first shows the released site on a narrow device and a visibly clipped fifth bottom icon / centered search actions; second shows the intended mobile composition with a two-line personalized welcome header, a compact left-aligned search-actions area and five equally spaced mobile icons. The user explicitly mandated the **real public navigation order** `Explore → Categories → Nearby → Business News → About` and no additional bottom tabs.

## Implementation

1. **Fixed mobile dock clipping / alignment** — `app/components/MobilePublicDock.tsx` now renders only the requested five existing public routes: `/`, `/category`, `/nearby`, `/business-news`, `/about`. Iconsax icon names match existing desktop menu, with visible Lucide fallback via `BrandIcon`. Five equal CSS-grid columns, identical 23px glyph slots, 56px touchable tab height, and a fixed center-relative container `width: calc(100vw - 24px)`, `max-width:440px` prevent horizontal clipping at narrow widths. Uses `env(safe-area-inset-bottom)`, hides while input keyboard active, and never mounts on vendor/admin/auth screens.
2. **Mobile-only personalized greeting** — `app/components/MobileGreeting.tsx` receives real username/full name/email from the existing Navbar session/profile. Phone-width logo is hidden; tablets/desktop retain original logo. When logged out the header says `Hello, Explorer`, rather than inventing a personal name. `lib/ui/mobile-daypart.ts` chooses Morning/Afternoon/Evening/Night and emoji using the visitor's **browser-local hour**, refreshes on visible tab and every minute. SSR initially shows a neutral “Good day” before hydration to prevent mismatch.
3. **Search card actions** — existing SmartSearch, GPS, area selector, voice input and submitted route are untouched. The `Explore near me` and `Browse categories` buttons use phone-width `flex-col items-start`, left-anchored child alignment, while desktop retains horizontal actions. Styling is restricted to mobile in `app/home-mobile.css`.
4. **Regression tests** — `tests/publicMobileHomeReference.test.mjs` now checks exactly five ordered routes and icons, fixed safe-width docking at 280–600px, account greeting/dayparts, mobile-only logo visibility, and search actions alignment. Existing saved/notifications functionality remains available via real links elsewhere and is not deleted.

## Acceptance gates

- GitHub Actions CI: Next.js TypeScript/build, mobile navigation tests and existing marketing/security/billing gates.
- One Vercel QA preview, exact SHA verified. If tests pass, release by merging PR and verify Vercel production exact SHA READY and `www.slbusinessindex.com` alias.
- Signed-in browser testing at 320, 360, 375, 390, 430px widths, RTL/long user names, keyboard, safe area and landscape is still valuable; automated structural tests are not pixel-perfect mobile-device verification.
- Desktop homepage and Vendor GrowthOS are out of scope.
