# G0-18 — Public review-cache parity and isolated release-body repair
Date: 2026-11-24 (Asia/Colombo). Baseline `2e9e020a6dfb69472ac8c025629c832f9848da32`.

**Status:** G0-03 review-cache release candidate improved in GitHub; *NOT applied to production*. Foundation **0/7** owner-accepted, master **0/10**. G1 remains blocked until G0 exit acceptance.

## Current live problem — production SELECT only
Ran [G0-18 aggregation](g0/exit/G0_18_REVIEW_CACHE_PUBLIC_CONTRACT_READ_ONLY.sql) on production database with **no writes**:
- 24 business rows; **2 stale** `businesses.rating/reviews_count` caches.
- Both stale rows are *false zeroes*: one cache 0/0 vs one public-approved five-star review, another cache 0/0 vs two public-approved five-star reviews. No business IDs, names or reviewer records exported in the published audit.
- **0 moderation-flag conflicts**: `is_approved` and `moderation_status` agree in observed rows. **0 inflated caches**.
- **0 enabled `slbi_growth_review_cache_refresh` triggers and 0 enabled `slbi_growth_review_cache_guard` triggers**; `slbi_growth_internal` private schema absent. The approved review cache repair has not been activated in production.
- `public.reviews` and `public.businesses` RLS **both enabled**. Zero triggers in this snapshot does not imply that no application-level cache handling exists, only that the planned G0 triggers are absent.

## Actual issue in previously reviewed candidate SQL
The public Business Details page filters published reviews with **both** `is_approved IS TRUE` **and** `moderation_status='approved'`. The previously drafted `REVIEW_FORWARD_BODY.sql` calculated averages with *only* `is_approved` and its trigger watched only `business_id,rating,is_approved`. That candidate could drift from public review semantics if historical inconsistent rows or moderation-only transitions occur. These are defensive gaps in a *not-yet-applied* release body, not an observed live exploit.

## Changes now implemented in source (disposable/approval-gated)
1. `docs/growth/g0/release/REVIEW_FORWARD_BODY.sql` — still an **APPROVAL-REQUIRED** prospective migration body. Added `moderation_status` schema preflight and fail-closed check for inconsistent `is_approved`/moderation states, aligned canonical business cache trigger, refresh conditions, backfill and postflight with *both* public-approved flags. Changed review trigger to watch `moderation_status` changes as well. No production DDL/DML executed.
2. `tests/g0/review_public_contract.sql` — PostgreSQL 17 synthetic negative tests. Temporarily disable moderation audit and drop fixture consistency constraint **inside a transaction rolled back at the end** to represent historical invalid rows; assert no public count for `true/pending` and `false/approved`, verify moderation-status-only updates refresh caches, and assert fixture original guard/constraint restored. **Never execute on production**.
3. `.github/workflows/g0-foundation-integrity.yml` — runs this new negative suite in the existing review integrity matrix after concurrent cache checks. Existing Lead, Billing, public RPC, View Counter, backup, Next.js checks remain.
4. `docs/growth/g0/exit/G0_18_REVIEW_CACHE_PUBLIC_CONTRACT_READ_ONLY.sql` — reproducible *aggregated, zero-PII* live stale-cache and trigger audit, no rows or IDs.
5. Updates to `AGENTS.md` and Growth Engine checklist keep fresh handoff and gate evidence explicit.

## Release sequencing and owner acceptance blockers
- Review-cache repair can make stale business rating/count match approved reviews, but requires **separate exact production migration approval** after backup, independent-passphrase encryption, actual isolated restore, verified other physical-drive copy, staging replay and rollback evidence. Do not casually run `REVIEW_FORWARD_BODY.sql` on production; it was authored as a transaction BODY for a generated versioned migration with preflight/recovery contract.
- Existing per-review `slbi_reviews_moderation_consistent` constraint and moderation audit must remain. Do not remove or disable them in live DB because disposable tests deliberately simulate corrupted fixtures.
- Never blindly update all businesses: the planned approved migration backfills *only inconsistent rows*, subject to exact schema fingerprint and owner approval.
- Real signed-in vendor A/B/admin production acceptance, user device tests, pending/private review isolation, G0 lead consent, legacy anon view counter revocation and search SECURITY DEFINER triage remain separate G0 blockers.
- **Do not infer G0 or G1 signoff from a green CI or SELECT-only audit**. 47 frozen live history entries (34 matched, 13 historical catalog evidence) and 88 unmatched repo SQL remain to classify; no migration replay.

## Next-chat copy/paste prompt
```text
Continue SLBusinessIndex GrowthOS G0 in Tamil and implement with connected GitHub/Supabase/Vercel. First verify main SHA, latest G0-18 PR merge and exact-head CI. Read AGENTS.md, docs/growth/G0_18_REVIEW_CACHE_PUBLIC_PARITY_20261124.md, docs/growth/g0/exit/G0_18_REVIEW_CACHE_PUBLIC_CONTRACT_READ_ONLY.sql, docs/growth/g0/release/REVIEW_FORWARD_BODY.sql, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json and docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md. G0-18 live SELECT-only: 24 businesses, 2 stale review caches both false-zero vs public approved reviews (one has 1 five-star and another has 2 five-star), 0 moderation-flag conflicts, 0 planned review cache refresh/guard triggers, RLS enabled, no prod writes. Source repair candidate aligns cache with is_approved=true AND moderation_status=approved in aggregation, refresh, backfill and verification, watches moderation_status change and preflights inconsistent flags. Isolated PG17 synthetic negative test reproduces wrong flags with transaction rollback and ensures constraints/audit return. This candidate is NOT applied production. Owner-gated backup, physical copy, restore, staging + exact live migration approval and device testing remain OPEN. G0 foundation 0/7 owner accepted; whole GrowthOS master 0/10; G1 blocked until G0 exit acceptance. Next prioritize another safe owner-exit blocker: G0-01 migration file provenance or G0-02 consent/lead, plus real owner QA evidence, without DB writes, paid resources, providers, feature flags or G1 implementation. Update handoff/checklist and report exact PR SHA and CI. Do not ask me to repeat history.
```
