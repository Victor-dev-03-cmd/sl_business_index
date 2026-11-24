# G1-06 — Free Campaign Planner and primary Gallery Navigation
Date: 2026-11-24 (Asia/Colombo)

## User-visible pages
- `/vendor/marketing/campaigns`: Free/Basic Campaign Planner now opens straight to Create/Edit, has slim header and statistics, horizontal section tabs instead of a fixed 220px left sidebar, wider editing and sticky preview, three-step readiness status, selected business category/location and Gallery shortcut, and two optional safe starter messages per campaign objective in English, Tamil and Sinhala. Suggestions only populate an empty form when the user clicks one. No provider/AI, credits or fabricated promotions.
- `/vendor` topbar: Gallery & Services is immediately after My Businesses in primary desktop and compact mobile navigation, no longer buried in Tools. Compact navigation is shown on viewports narrower than 1600px to prevent crowded topbar collisions.
- **Preserved:** free plan without Pro, owner-scoped save/edit/duplicate/archive, manual planned date, text/copy, four exact PNG format exports, vendor selected language, palette, and no auto-posting. No migrations, provider, credits, finance or access-control changes.

## Verification and release boundary
- New `tests/p2CampaignPlannerFreeUX.test.mjs` validates navigation visibility, responsive tab/editor markers, manual-only multilingual examples, no paid gating or fabricated discount and retention of actions; it runs inside `verify-nextjs.yml` prior to TypeScript/build. Full existing CI remains required.
- Merge one feature branch only after every check succeeds and verify Vercel production deployment READY at the exact merged main SHA, alias www.slbusinessindex.com, alias error null.
- Signed-in desktop/mobile visual QA must be done after production; CI proves structure/build, not actual pixel-perfect user sessions.
- G0 production security SQL still blocked pending fresh independent encrypted backup, isolated restore test, separate verified physical external drive copy and scoped release/rollback approval. G0 0/7 owner accepted.

## Next chat handoff
```text
SLBusinessIndex / Tamil. Check latest merged PR for G1-06 Campaign Planner free UI refresh and direct Gallery navigation; check exact CI SHA and Vercel READY alias. Read docs/growth/G1_06_FREE_CAMPAIGN_PLANNER_UI_20261124.md. User wanted basic/free Campaign Planner made cleaner and more valuable without Pro; now horizontal tabs, bigger editor/live preview, readiness and editable bilingual/trilingual short message starters, and Gallery & Services directly visible in top desktop/mobile nav instead of Tools. Don't delete manual save/edit/plan or four PNG sizes. If actual logged-in mobile/desktop bug, fix and deploy. No G0 production security SQL without evidence and scoped owner approval.
```
