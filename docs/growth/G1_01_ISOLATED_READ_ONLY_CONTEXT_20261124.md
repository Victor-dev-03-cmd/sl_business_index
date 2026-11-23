# G1-01/02 — Isolated Business Knowledge Core (owner-scoped read-only code)
Date: 2026-11-24 (Asia/Colombo). Source baseline main `9211f889e4a9e0ca8f7e4a5545d449c7118d23da`.

## Exact owner decisions received
See [machine-readable scope](../g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json). The owner authorized **separate, read-only G1 engineering only**; NO merge to `main`, production deployment, production G1 data access, SQL/migration, provider activation or paid resource. Wallet refunds require manual admin review and must not automatically issue credits/refunds; **existing enforcement remains unaudited**, so this is a policy, not a claimed runtime remediation. Marketing can use only existing approved providers with unchanged access boundaries; no new enablement. Desktop GPS remains a **blocker until fixed and physically retested**, not a waived exception.

## Isolated implementation
- `lib/growth/g1/read-only-knowledge.ts` builds a pure, deterministic G1 preview from already fetched/authorized inputs; **it does not fetch from Supabase or call an API**.
- Caller contract requires fresh SSR `auth.getUser()`, `businesses.id` and `owner_id` equality, user-scoped Supabase RLS client, and approved business BEFORE providing inputs. Implementation applies a second owner/business/profile/brand join check and returns indistinguishable `not_available` denial for missing/nonowned/unapproved data.
- Allowlisted source fields: listing name/category/description/business-level verified metadata (the validated G0-17B rule), brand name/slogan/primary color/tone/languages and public profile services and **image count only**. Brand offers and guidelines are explicitly withheld; this is NOT an authorization to make marketing claims. No customer leads, email, raw reviews, private docs, phone, gallery URLs/paths, owners, analytics, secret keys, raw user prompts, or arbitrary record properties are forwarded.
- Every field has provenance, `vendor_asserted`/`verified_metadata`/`missing`/`withheld`, and source timestamp only when a parseable source timestamp exists; unknown timestamps remain null. Tamil and Sinhala text preserved if bounded; suspicious markup is rejected. Stored values **remain untrusted** and must never become model system instructions.
- Inputs are bounded by existing Brand Profiles / Gallery Services limits. **No new route, button, server resolver, provider interaction, credit deduction, schema or migration.**
- `tests/g1/read-only-knowledge.test.mjs`: synthetic owner A/B and forged related records, unapproved business, missing sources, privacy/offer/secret exclusion, invalid timestamps, malicious markup and multilingual preservation.
- `tests/g1/owner-decisions.test.mjs`: G0 still 0/7 and separate master 0/10, no implicit production authorizations, manual-refund policy, marketing provider limitations and real-GPS blocker.
- Dedicated GitHub Actions `g1-isolated-readonly.yml` runs tests and is purposefully not a deploy workflow.

## Production and phase boundary
This is a *draft, isolated G1 code candidate*, not a production change. Do not merge draft PR without a **new, explicit owner release approval** and outstanding G0 gate acceptance/exception dispositions. A Vercel Git integration may still auto-generate a branch Preview; this is not production activation; do not use or promote it, and avoid preview churn.

**G0 owner gate acceptance 0/7; GrowthOS master release 0/10.** Separate authorization to begin code does not resolve G0-01 migration provenance, G0-02 consent, G0-03 insecure legacy anonymous counter, G0-04 financial enforcement, G0-05 provider E2E, G0-06 physical GPS, G0-07 backup/restore/external copy and final signoff.

## Next staged engineering
1. Compare pure output against actual owner-scoped SELECT projections without executing G1 production queries; use an authorized disposable database/test mock to prove A/B RLS.
2. Write **separate** authenticated server-only resolver on isolated branch once the projection and error contracts are reviewed. No route/production wiring, provider or subscriptions, no service-role bypass.
3. Perform real device acceptance and independent backup before any approved production database change. The pending review-cache and verified view-counter SQL release bodies remain **unapplied**.

## Next-chat handoff prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil. Repo Victor-dev-03-cmd/sl_business_index. G0 owner decisions (2026-11-24): approve isolated read-only G1 CODE ONLY; no main merge, production release, G1 live database access, migrations, provider activation or paid resources; wallet refunds manual admin-reviewed only, no automatic refunds/credits (enforcement unverified); Marketing only existing approved providers and unchanged access boundaries; desktop browser GPS remains blocker until fixed and physical retest. These are scoped decisions, NOT G0 acceptance: G0 exit still 0/7, full GrowthOS master release 0/10. Read AGENTS.md, docs/growth/g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json, docs/growth/G1_01_ISOLATED_READ_ONLY_CONTEXT_20261124.md, docs/growth/g0/G1_KNOWLEDGE_CONTEXT_PROPOSAL.md, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json, and docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md. Inspect draft G1 PR and exact CI; DO NOT MERGE into main. G1 code candidate builds pure owner-scoped allowlisted context (listing + brand + services/image count), strips unsafe markup, keeps Tamil/Sinhala and provenance, excludes offers/guidelines and private data; does not call DB/provider/AI and is not connected to app. Continue isolated contract tests and G0 security/backup/GPS evidence; preserve prior PR #167 G0-18 review SQL candidate and PR #166 blue tick shipped in production. No G1 production activation.
```
