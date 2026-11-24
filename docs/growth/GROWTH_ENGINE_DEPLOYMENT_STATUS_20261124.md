> **G1-05 release candidate update, 2026-11-24:** The G1-01…04 *code-only* state below is historical. G1-05 adds actual user-facing read-only Knowledge Summary to My Businesses, Gallery & Services, Marketing Studio, with an authenticated owner-scoped GET endpoint; it is **not automatically live until exact Vercel READY confirmed**. Marketing AI/auto-post is not wired. No G0 production SQL. See [G1-05 details](G1_05_VENDOR_LIVE_KNOWLEDGE_INTEGRATION_20261124.md).

# SLBusinessIndex — What is actually LIVE vs code-only
Date: 2026-11-24 | Owner-approved deployment policy, supersedes earlier G1 draft-only restriction.

## How to understand the status
- **LIVE FEATURE**: linked to a working page/API or production feature with live behavior verified.
- **DEPLOYED CODE ONLY**: library/test/docs present in Vercel production source build, **not connected** to a website page/API, so visitors see no new G1 feature.
- **NOT DEPLOYED / BLOCKED**: migration, provider activation, page wiring or owner/physical QA still awaiting separate gate.

## Current release scope: draft G1 PR #168
| Product location | What changed | Intended outcome after green CI + merge |
| --- | --- | --- |
| `app/business/[slug]` Business Details | Blue verified badge fix from PR #166 | Already LIVE in production before this release |
| Vendor Dashboard → My Business | No visible page change; G1 knowledge type/verification from already-scoped data is coded in `lib/growth/g1` | **DEPLOYED CODE ONLY** after merge, *not* active business-data reads |
| Vendor Dashboard → Gallery & Services | No page change; service labels and image counts sanitized in pure G1 module | **DEPLOYED CODE ONLY** after merge, no new gallery API |
| Vendor Dashboard → Marketing Studio | No page change; G1 offers/guidelines withheld, no provider call | **NOT CONNECTED** to G1, existing Marketing stays as before |
| G1-01/02, G1-03, G1-04 backend | Pure context builder, injected mock owner-scoped resolver and mock SSR PostgREST-shape read port, 24 synthetic tests | Code-only; no active SSR client, new endpoint, SQL or AI output |
| Review cache / verified view counter | G0 candidate SQL reviewed, *not installed* | **NOT DEPLOYED** to production database |
| Wallet refunds | Owner policy manual admin-review only, runtime enforcement remains unverified | **NO RELEASE / NOT CLAIMED IMPLEMENTED** |
| Desktop browser GPS | Known broken on user's desktop; real physical retest required | **BLOCKING G0-06** |

## Explicit owner release update
2026-11-24 user requests all *finished, safely shippable* code changes be merged to main and published on Vercel after tests; avoid lingering merged branches. This **supersedes the earlier no-main-merge/no-production-code rule only for the inert G1-01…04 source modules and future independently safe, tested code**. It does **not** grant a live G1 database/API integration, SQL writes/migrations, provider expansion, paid staging/resources, wallet automated refunds, untested feature exposure or G0 7/7 acceptance.

## Release verification checklist
1. Exact PR head 16/16 checks green, including TypeScript/Next.js build, Bun and Postgres integrity.
2. Promote draft #168 to ready; squash merge **only after full CI**. New main SHA must match merge output.
3. Confirm Vercel production deployment **READY** for exact merge SHA, aliases include `www.slbusinessindex.com`, no alias error.
4. If Vercel not READY, state *deployment not finished*; never invent success.
5. GitHub connector does not expose branch deletion. Mark merged branches historical; do not create more branches needlessly.
6. **G0 remains 0/7 owner-accepted**, full GrowthOS master 0/10.

## Next task
Actual vendor/My Business and Marketing Studio integration requires separate live SSR auth/RLS acceptance and G0 security gates; do not claim the modules work as a public-facing feature until explicitly wired and tested. Prefer release tracking by page/status rather than counting branch commits.

## Reusable next-chat prompt
```text
Continue SLBusinessIndex in Tamil. I want finished safe work deployed and verified in production, no many unmerged branches. Check docs/growth/GROWTH_ENGINE_DEPLOYMENT_STATUS_20261124.md, AGENTS.md, latest main GitHub SHA and Vercel production exact SHA and alias. G1 PR #168 ships read-only inert code, not connected to My Business, Gallery & Services or Marketing Studio page, and must not be described as live G1 feature. Earlier owner restriction on merging G1 code is superseded for tested inert code only. NEVER deploy unapproved SQL/migrations, enable providers, automatic wallet refunds/credits, paid resources or live G1 DB reads/API without separate permission. G0 foundation 0/7 accepted, master 0/10. Desktop GPS physical retest required. Work on the next needed user-visible feature with clear page, change, testing and production status; no more than one feature/release branch at a time; verify after deploy.
```
