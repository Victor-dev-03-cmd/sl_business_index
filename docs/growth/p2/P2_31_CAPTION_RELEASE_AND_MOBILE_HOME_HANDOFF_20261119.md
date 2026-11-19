# SLBusinessIndex — Release Handoff and Mobile Home Reference (2026-11-19)

> **Purpose:** Close the completed GrowthOS/Caption work, record release evidence, and isolate the next public mobile-home design task. This is a handoff document, not a claim that authenticated end-to-end flows were manually exercised.

## Live production baseline (before mobile redesign)

- Repository: `Victor-dev-03-cmd/sl_business_index`.
- Production branch: `main`; merged release commit: `91976efae960a55786384bd12b181dfa98616972`.
- Release PR: [#119](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/119), merged 2026-11-18.
- Vercel production deployment: `dpl_6po1VamiPzzSBH7Mrukb7vXG2rgG`, **READY**, using this exact merge SHA.
- Verified alias: `www.slbusinessindex.com` assigned to the release deployment (do not presume apex `slbusinessindex.com` is equivalent without verification).
- Six QA-branch GitHub workflow families passed (Next.js build, P1 review-security, P1 integrated release, P2 marketing contracts/RLS, independent PostgreSQL billing, billing v2 SQL). Main merge build subsequently passed.
- Recent Vercel runtime-error query found no errors on selected marketing routes, but this is **not** equivalent to a signed-in successful Gemini request or cross-browser test.

## Current handoff — Marketing Studio

- P0 security/database foundation and P1 vendor foundation preceded P2 GrowthOS; this document records the **implemented** marketing scope, not a claim every P2 feature is publicly released.
- AI Poster Studio and Caption Lab are connected by an owner-scoped, short-lived poster handoff; saved PNGs use a private owner-controlled asset library. Caption Lab can edit generated three-angle captions; Save to Planner enforces the strict `marketing_campaign_brief_shape_v2` shape, verified business phone in CTA, and RLS/column-level INSERT permissions for `poster_asset_id`. Related permissions repaired without granting broad table write.
- Shared `lib/marketing/voice/slbi-voice-engine.ts` handles microphone permission, pause/resume, Opus capture preference with browser fallback, max size/time, and intentional audio retry. `lib/marketing/voice/slbi-gemini-transcription.ts` handles bounded Gemini 2.5 Flash transcription of Sri Lankan Tamil/Sinhala/English/Tanglish, with short server-side retries. Separate provider quota and authenticated owner/QA restrictions remain.
- 2026-11-18 UX fixes: Vendor compact top-right Sonner notifications; Caption Lab per-language failure isolation with failed-language-only explicit retry, preserving completed languages; working All Combined Quick Polish for populated languages; duplicate-safe local edits; clearing center/right content, tags, autosaved session draft, and consumed handoff after Save to Planner. A saved Planner draft only reopens after explicit click.
- **Outstanding manual QA:** Authenticated Sinhala/Tamil mixed-language failure and retry, exact quota/refund confirmation, real microphone on Chrome/Safari, full Planner save/reopen cycle on a real vendor account, and mobile-width interaction. Never call this 100% browser-verified without doing those checks.
- **Security boundary:** No anon database write, no weakened campaign constraints/RLS, no automated paid language retry, no automatic publishing, no provider keys in frontend.

## Public homepage redesign — next task (reference supplied 2026-11-19)

- Mobile-only design target: warm ivory small navbar with SLBI logo, bell/profile action; dark green-to-champagne cinematic hero; two-line “Discover better. Grow together.”; one clear search card with keyword, location and Search button; Explore near me and Browse categories; fixed compact translucent bottom dock.
- Bottom tabs from reference must be **real navigation/actions** using existing bundled Iconsax with visible SVG fallback: Home `/`, Search `/search`, Saved `/saved`, Notifications `/notifications`, Add business `/register-business`. If Saved/Notifications do not exist, build functioning owner-safe or clearly device-local versions; no dead buttons.
- Preserve desktop homepage and existing Search autocomplete, transliteration, area/town selection, geolocation permission, SSR/prefetch behavior, mobile keyboard/safe area, accessibility, and low-end-device performance.
- Implement on `feat/mobile-home-reference-20261119`; validate production-style build and navigation tests in one QA cycle, then release with exact commit/deployment receipt. Avoid unnecessary Vercel previews because of daily limits.
- After homepage completion, resume Vendor GrowthOS tools only on the owner's next request.

## Key files

- `app/HomePageClient.tsx`, `app/components/HeroSearch.tsx`, `app/components/Navbar.tsx`, `app/components/BrandIcon.tsx`, `app/RootClientLayout.tsx`.
- `app/vendor/marketing/captions/page.tsx`, `app/vendor/marketing/design/puter-lab/page.tsx`, `lib/ui/vendor-feedback.ts`, `lib/marketing/voice/`.
- More detailed earlier history: [Master Handoff](../SLBI_MASTER_IMPLEMENTATION_HANDOFF.md) and `docs/growth/p2/`.

## Release continuation protocol

Keep code, branch, PR and Vercel SHA in sync. On every production release check merge SHA, build status, actual public alias and runtime errors. Do not claim production success on the basis of GitHub merge alone.
