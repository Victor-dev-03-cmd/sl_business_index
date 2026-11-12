# SLBI P0 Security & Database Foundation — staging release packet

**State: BLOCKED — Supabase Pro staging prerequisite. No production approval.**
Production baseline: GitHub main at 6ad1764545a627a891d0c17f8170879b586d2b88 (2026-11-12).

## Environment blocker
The user explicitly authorized Supabase branch cost of **US$0.01344/hour**. Supabase
accepted cost confirmation, but branch creation returned **PaymentRequiredException:
Branching is supported only on the Pro plan or above**. The paid staging
branch WAS NOT created. Do not interpret cost confirmation as an active branch.

No production SQL or Vercel build/deployment is authorized until isolated
Supabase-compatible staging is available and the gates below pass. Supabase
branch activation may require the account owner to upgrade to Pro; that
separate plan decision has not been authorized.

## Security inventory (read-only confirmed)
- Businesses: 22 approved, 1 pending, 1 rejected; "Temporary Public View" SELECT
  USING (true) coexists with explicit approved, owner and staff policies.
- Profiles: "Profiles viewable by all" SELECT USING(true), exposing sensitive
  columns if role grants allow. Requires separate sanitized-public-profile
  strategy and contact/profile UI regression tests; NOT fixed by this packet.
- Verifications: vendor "ALL" policy allows update/delete before review; staff
  has separate ALL policy; existing after-status triggers must keep working.
- Existing BEFORE guards: protect_business_approval and
  prevent_profile_role_escalation must remain installed.
- Leads and analytics_logs: legacy anonymous INSERT must not be revoked until
  web and legacy mobile call paths are cut over to tested server-only RPCs.
- Existing Secure Leads/Event ingestion Next.js endpoints are disabled by
  absent server-only privileged credentials and environment flags.
- Wallet: growth_wallet_status(), ledger, and related credit tables missing
  from production; existing GitHub SQL is pending staging validation.

## Prepared materials
- P0_SECURITY_STAGE_REVIEW_ONLY.sql: limited policy fix + secondary guards.
- P0_SECURITY_STAGE_ASSERTIONS.sql: schema/policy assertions plus role test matrix.
- P0_GUARD_CONTINGENCY_STAGING_ONLY.sql: uninstalls new triggers without reopening
  known broad public read or vendor-update grants.

These materials are deliberately NOT placed in supabase/migrations. DO NOT
auto-apply on any environment. After verified staging tests, migrate via a
proper numbered migration with full release approval.

## Implementation order and gates
1. Create approved isolated Supabase staging with Auth, Storage, RLS, extensions,
   functions and realistic synthetic test users. **Pro plan currently blocks it.**
2. Back up source schema (not just data), inspect object grants and function
   ownership. Run P0_SECURITY_STAGE_REVIEW_ONLY.sql only on staging.
3. Verify anon/vendor A/vendor B/admin including signup, listing updates,
   business status, review approvals, signed verification uploads, view counter.
4. Run the existing reviewed ingestion proposals:
   docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql and
   docs/growth/SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql, adjusting only after
   transaction-safe tests and confirmed service-role use.
5. Test Turnstile hostname/action, no-consent, limit breaches, duplicate UUID,
   unapproved IDs, cross-vendor read/edits, rate buckets, RPC execution grants
   and DNT/GPC. Validate legacy Expo/mobile compatibility before disabling
   "Anyone can insert leads" policy. Never enable server flags prematurely.
6. Rehearse supabase/migrations/20261110010000_growth_os_credit_foundation.sql
   on staging; synthetic users and verified entitlements only. Test monthly
   grant, repeated status, concurrent status, idempotent debit, disabled action,
   upgrade/downgrade, UTC month rollover, unauthorized plan allocation,
   per-vendor separation and trigger interaction. Paid billing remains OFF.
7. Review privacy/consent and retention. Check Supabase security advisors
   (including publicly-executable SECURITY DEFINER RPCs), missing indexes and
   protected storage files. The public profiles SELECT policy needs an explicit
   safe replacement plan before declaring P0 complete.
8. Validate Next.js and test suite using one final source commit and CI.
   One staging-bound preview at most if required; do not spend Vercel previews
   on migration authoring. Perform real browser and mobile acceptance tests.
9. Only after written approval of all gates: back up production; execute
   reviewed migrations in dependency order, verify authorization, configure
   server-only key/flags, then ONE production Vercel deployment. Observe logs,
   repeat role checks, and roll back on any data leakage / business regression.

## Explicit NO-GO items
- Missing isolated Supabase test environment (current blocker).
- Public all-profiles read remains unmitigated.
- Missing server-only Supabase privileged key.
- Unverified mobile-to-secure-leads cutover.
- Unrehearsed wallet RPC including concurrency and month boundaries.
- No authenticated Vendor A/B/admin and negative tests.
- No reproducible browser and production smoke tests.
- Rollback not demonstrably tested.

**Important:** Static assertions cannot certify 100% security or workflow
correctness. This packet does not claim release readiness.
