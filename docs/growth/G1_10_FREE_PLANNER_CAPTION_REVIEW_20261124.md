# G1-10 — Free Campaign Planner: Live Caption Review
Date: 2026-11-24, Asia/Colombo. **RELEASE CANDIDATE** until exact full CI, main merge and Vercel production READY are checked.

## Page and visible change
`/vendor/marketing/campaigns` → Live Caption Preview shows a small, translated English/Tamil/Sinhala review panel: live Unicode-aware character count, business/message/CTA checks, promotion-specific optional terms reminder, and plain-language guidance. This is **advisory only**: no claims of factual accuracy, legal compliance, platform publishing success or approval. The existing Share caption manually button now uses the same explicit G1-08 length/title limits as its helper, and still allows a CTA-only draft exactly as before. Vendor-written text is never overwritten.

## Boundaries
No database/schema/migration/RLS change; no extra API call, AI generation, paid credit, OAuth, provider activation, auto-publishing or draft persistence change. Free/Basic campaign save/edit/schedule/archive, poster PNG export sizes, multilingual starters and G1 owner-scoped business facts remain as shipped. Desktop GPS, real vendor A/B and device QA remain outstanding.

## Code and tests
`lib/marketing/campaign-readiness.ts` pure client-side review; `lib/marketing/campaign-manual-share.ts` exports existing hard cap constants; `lib/marketing/campaign-language.ts` translations; `app/vendor/marketing/campaigns/page.tsx` review panel; `tests/p2CampaignPlannerCaptionReview.test.mjs` regression and Unicode tests added to Next.js workflow.

## Release protocol
Merge only after all GitHub exact-head required workflows are green; Vercel production READY exact merged SHA with `www.slbusinessindex.com` alias, `aliasError=null`. Record verified release SHA/deployment in the merged PR description. Physical signed-in checks are **NOT_RUN** until independently performed; CI and Vercel READY are not proof of signed-in UI/browser success.

G1-10 is explicitly based on merged G1-09 PR #173 (reliable Preview and Saved Library copy); both copy paths and new review must remain present. Release PR #174.
