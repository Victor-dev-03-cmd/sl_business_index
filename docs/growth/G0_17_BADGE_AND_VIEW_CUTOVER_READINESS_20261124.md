# G0-17 — Blue verified badge and fail-closed view-counter staging readiness
Date: 2026-11-24, Asia/Colombo. Baseline `d44e117dba43f74641a36a72e570e6372c0a0355`.

**G0 owner gates remain 0/7; GrowthOS master acceptance remains 0/10. This is a UI and configuration-readiness candidate, not an authorized production cutover.**

## Verified Business UI
- Canonical `app/components/VerifiedBadge.tsx` now renders a 24×24 blue seal (#1685F5) with high-contrast white tick (#FFFFFF), accessible as decorative SVG next to readable verification text. Shared component update keeps badge visual consistent wherever it is reused.
- `app/business/[slug]/BusinessDetailsClient.tsx` uses an adequately sized icon beside **Verified Business**, while the **Registration provided** (not yet verified) row uses `Building2`, not a shield. The preexisting *approved + can_show_badge* gate is unchanged; do not imply an unverified business is verified.
- `tests/business/verified-business-badge.test.mjs` checks the SVG fill/check, no remaining ShieldCheck on detail, approved/flag gate, and distinct registration icon.

## G0-17 staging configuration readiness implementation
- Added `lib/growth/view-counter-mode.ts` mode contract: `legacy` when both flags disabled (default), `verified` when BOTH flags exactly 'true', `mismatch` if they disagree. `app/api/analytics/log/route.ts` now returns 503 `view-counter-config-mismatch` for a **view** event when client build-time and server flags disagree rather than recording an ambiguous counter event. Other event types continue preexisting flow. A config error fails closed for view accounting; do not claim a flag is a database authorization boundary.
- `scripts/g0/view-counter-staging-preflight.ts` reports only mode, missing config descriptions and explicit `live_database_acl_verified:false`/`owner_cutover_approved:false`; it does **not** print HMAC/service secrets. For verified mode it requires ingestion enabled, server credential, URL, 32+ character HMAC secret and expected Vercel proxy environment. CLI is config evidence, not a real Vercel network/trust probe.
- `tests/g0/view-counter-mode.test.mjs` tests both-flags-off, both-on, all mismatches, unknown values. GitHub Actions `backup-copy-contract` job runs these plus the badge regression and default-mode preflight.
- `docs/growth/g0/exit/G0_17_VIEW_COUNTER_CUTOVER_PREFLIGHT_READ_ONLY.sql` is metadata-only: checks new/old RPC roles, security invoker/pinned path, analytics and quota tables, and RLS without writing customer rows.

## Actual production catalog preflight (read-only)
Executed the G0-17 preflight against `SL_Business_Index` catalog with **SELECT only**; observed:
- `slbi_record_verified_business_view` **NOT INSTALLED** (therefore no service EXECUTE; security-invoker and pinned-path checks null).
- Legacy `increment_business_views(uuid)` **anonymous and authenticated EXECUTE still true**.
- Existing `slbi_record_growth_event` installed; `analytics_logs` and `growth_event_rate_limits` present, RLS enabled on both.
- This is a **production CUTOVER BLOCKER**, not an approval to apply SQL. Feature flags not enabled; no new production DB migration or DML performed.

## Release sequence — cannot auto-accept
1. **G0-17 code-only CI:** require badge/Next build, G0 existing PG17 `view_counter` and anti-abuse regression, Bun flag contract PASS. Keep no-cost preview limit in mind.
2. **Authorized isolated staging:** prepare independent fresh encrypted GPG backup, restore, external physical copy and consent/retention signoff; apply reviewed additive view counter SQL **only in authorized staging**, run catalog preflight, confirm invoker, pinned path, correct ACLs, owner A/B and anonymous scenarios including 8 concurrent idempotent views. Staging project/branch billing not authorized by this PR.
3. **Coordinated staging bundle:** both private `G0_VERIFIED_VIEW_COUNT_ENABLED=true` and public build-time `NEXT_PUBLIC_G0_VERIFIED_VIEW_COUNT_ENABLED=true`, with `GROWTH_EVENT_INGESTION_ENABLED=true` only after verified prerequisites; compare fail-closed unmatched flags. Owner review required before production.
4. **Production release under separate owner approval:** migrations must be formal/versioned and attributable, independent backup evidence captured; deploy matched server/client build and apply legacy RPC grant revoke (separate `VIEW_COUNT_CUTOVER_BODY.sql`) in an approved window. Verify anon/auth EXECUTE false and service RPC true; cached old clients will fail closed on obsolete calls. **Do not re-grant legacy anon permissions as casual rollback.**
5. Preserve remaining G0-01 88 unmatched source SQL/13 historic, G0-02 consent, G0-03 remaining SEARCH DEFINER routines, G0-04 wallet, G0-05 Marketing, G0-06 actual Android/iOS/desktop GPS QA, G0-07 owner G1 contract. Two review cache mismatches are unresolved.

No provider token activation, paid branch, SQL migration or Vercel deployment in this checkpoint.

## Next chat — copy this
```text
Continue SLBusinessIndex GrowthOS in Tamil. GitHub repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_17_BADGE_AND_VIEW_CUTOVER_READINESS_20261124.md, docs/growth/G0_16_VERIFIED_VIEW_COUNTER_CANDIDATE_20261123.md, docs/growth/g0/exit/G0_17_VIEW_COUNTER_CUTOVER_PREFLIGHT_READ_ONLY.sql, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json, docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md. First verify latest G0-17 PR status and exact main commit; do not assume merge without CI. G0-17 replaces Business Details shield with blue verified seal containing white tick and distinct building icon for unverified registration; existing approved+can_show_badge gate unchanged. Adds getViewCounterMode (legacy/verified/mismatch), 503 fail-closed for mismatched view flags in /api/analytics/log, synthetic Bun flags test, node badge UI test, secret-redacting staging preflight CLI, read-only catalog SQL and CI integration. Actual production read-only preflight: slbi_record_verified_business_view NOT INSTALLED; legacy increment_business_views anonymous+authenticated EXECUTE TRUE; existing event ingestion installed, rate tables RLS enabled. No production SQL or flags enabled, no staging paid resources; this is NOT an applied security fix. G0 foundation 0/7 and GrowthOS master 0/10 accepted, G1 not started. Fresh independently encrypted backup, isolated restore, verified external physical copy, consent, device tests and owner permission are pending. Two review cache mismatches and desktop GPS issue remain. Next finish G0-17 staging authorization/negative tests/CI, then continue G0-01 migration provenance and G0-02 consent. Keep AGENTS/checklist/next prompt updated and report exact merge status. Do not silently apply migrations or activate providers.
```
