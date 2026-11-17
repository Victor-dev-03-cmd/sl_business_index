# P2-28 — Caption Lab Generate CTA Spacing & Real Gemini Readiness

**Date:** 2026-11-17 (Asia/Colombo).  
**Feature branch:** `fix/p2-caption-cta-spacing-gemini-readiness-20261117`.  
**Status at code authoring:** source and tests staged; verify exact GitHub CI, PR merge and Vercel READY before marking release.

## User request

Owner approved the existing Caption Lab but reported the bottom of the **Generate Caption Variations** button is visually jammed against the following credits/help/quick suggestions sections. Wants comfortable independent spacing like the finished Poster Studio, and confirmation that Generate really uses **Gemini** and Growth Credits. Mentions possible separate image search or another provider (ChatGPT/FLUX); do not silently replace poster image sources or purchase a new API.

## Current production configuration checked 2026-11-17

- Existing `POST /api/marketing/caption` `mode:'three_angles'` actually calls the server-side Gemini `GEMINI_POSTER_MODEL:generateContent` endpoint using a structured JSON response schema and parsing validation, returning distinct Hook, Story, Short variations per requested language. Does NOT call Gemini merely because the UI renders or business changes.
- Vercel production variable **`SLBI_MARKETING_AI_ENABLED=true`** and `GEMINI_API_KEY` exists as a **Sensitive Production** credential. Secret value was not viewed.
- Production Supabase `growth_credit_actions`: `ai_social_draft` is `is_enabled=true`, `credit_cost=2` as read-only query. No changes to prices, balance, quota, flag, key or vendor entitlements.
- Backend also requires signed-in user, verified Pro and **internal owner-QA**, owned business, a usable Social Brand Profile with selected language, and a transactional credit reservation. Failures route through refund reconciliation; do not claim generation is always available to every Pro subscriber.
- Provider output still requires owner review; no publish action. User authorizes code/UI fixes and inspection, not an automatic additional chargeable Gemini or image inference request.

## UI / code change

- Give primary Generate CTA **16px top breathing room** (`mt-4`) after brief/mic/transcript, preserve a minimum 44px touch target and visible keyboard focus.
- Give credits/Info row independent **12px top margin**, its own neutral `#F9FAFB` surface with inset `px-3 py-2.5` and wrap-safe horizontal/vertical gaps. Label `Gemini AI · N languages · 3 variations each · Credits on Generate` (never represent an unverified model output as already generated).
- Make the following Quick brief suggestions an independent **12px-spaced** rounded block with comfortable padding; slightly enlarge collapsed optional Offer terms & CTA padding. Keep existing section ordering and compact layout.
- Clarify Info: one actual Gemini request and server-side reservation per selected language; separate voice/brief quota on explicit Send; internal QA/Brand Profile requirements. Credits are dynamic in backend and are **not** hardcoded in the UI, even though the current DB unit price is 2.
- Preserve Poster Studio’s two-hour private IndexedDB handoff, fresh owner checks and local upload. Do **not** introduce ChatGPT/FLUX image calls, remote search/scraping, unlicensed images, paid fallback or uncontrolled request costs.

## Change files and release gate

- `app/vendor/marketing/captions/page.tsx` (spacing and truthful model/billing microcopy).
- `tests/p2CaptionGenerateCtaSpacing.test.mjs` (new integration/gap contracts).
- `.github/workflows/p2-marketing-brand-foundation.yml` (P2 CI regression).
- This handoff, `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` and `docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md`.

Run exact branch-head CI, TypeScript/Next production, P2 owner-isolation RLS, transactional credits/refunds, OAuth, P1 and Billing V2 / Independent PostgreSQL. Then guard-merge PR and verify exact Vercel deployment READY + `www.slbusinessindex.com` alias before production claims.

## Known limits / next human QA

- Actual signed-in **Generate Caption Variations** in Tamil/Sinhala/English is not yet end-to-end tested here with Gemini; that would reserve actual credits and make a provider request, so owner should test deliberately.
- A caption-appropriate licensed-photo search/selection workflow is a separate future product decision; for now users can attach a browser-local image or select a recent Studio design. No ChatGPT image API key or external search connection has been added.
- After owner tests, record: layout at mobile/desktop widths, generated 3-angle JSON integrity, branded data/offer factual accuracy, credit balance debit/refund, content preview and planner draft persistence. Document exactly what succeeded or failed in this living handoff.
