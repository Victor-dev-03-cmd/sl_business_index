# G1-07 — Free Campaign Planner uses owner-scoped Business Knowledge

Date: 2026-11-24 (Asia/Colombo). Release candidate. Owner requests successful safe changes deployed to main / Vercel and a full GitHub handoff after each change.

## User-facing change
`/vendor/marketing/campaigns` has a small **Saved business facts** card for the selected *approved* business. Via the already deployed GET-only `/api/vendor/g1-knowledge`, the browser reads its own RLS/SSR-authenticated brand name, saved service names, gallery image count and verified-listing flag. A service chip fills **only an empty** message field using a static editable Tamil, Sinhala or English sentence. The vendor must review/save/share manually. Switching businesses aborts the prior request. The Planner remains usable if facts cannot be fetched.

## Files and tests
- `app/vendor/marketing/campaigns/G1PlannerFacts.tsx` — read-only UI; no-store cookie fetch, AbortController, approved-only, non-blocking failures.
- `lib/marketing/g1-planner-facts.ts` — strict business ID, G1 schema/usage checks; allowlists only 4 fields; rejects invalid service/brand/count; manual multilingual neutral sentence.
- `app/vendor/marketing/campaigns/page.tsx` — integration with selected business and no-overwrite message callback.
- `tests/p2CampaignPlannerG1Facts.test.mjs` — synthetic owner A/B, malformed contexts, privacy and unchanged save/export flow. `verify-nextjs.yml` runs this alongside other tests.
- `docs/growth/HANDOFF_LATEST.md` — **permanent, living handoff** containing verified prior production, this candidate, pending tasks, release discipline and copy-paste next-chat prompt.

## Not authorized / not claimed
No AI prompt injection, automated campaigns, provider permission changes, paid credits, G0 production SQL, wallet changes or paid staging. Previous Free/Basic access remains unchanged. This is human-reviewed manual copy, not proof of an offer. No independently completed vendor A/B physical-device QA from CI.

G0 foundation owner accepted 0/7, entire GrowthOS release 0/10. Production security cutovers require fresh independent encrypted archive, isolated restore and verified physical external copy plus separately scoped owner release/rollback approval. Desktop browser GPS physical retest remains a blocker.

**Release evidence:** see PR #171 release description after exact CI, squash merge SHA and Vercel READY/alias have been verified. Do not mark this candidate live before that.
