# SLBI P0 Security & Database Foundation — staging release packet

**State: CLOUD TESTS PASSED; PRODUCTION RELEASE STILL BLOCKED BY CONFIGURATION/CUTOVER.**
Conditional production approval was given by the owner, explicitly subject to ALL release gates passing. Do not deploy early.
Production baseline: GitHub main at 6ad1764545a627a891d0c17f8170879b586d2b88 (2026-11-12).

## 2026-11-12 cloud CI update — no PC or Vercel required

- **Completed:** GitHub Actions [run 43273869937](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43273869937) succeeded 4/4 jobs on temporary PostgreSQL 17 Docker containers. Synthetic RLS role matrix, private profiles, lead/event RPC validation, wallet transaction tests and source contracts passed.
- **Confirmed defect repaired only in review SQL:** lead RPC previously accepted NULL message (due SQL three-valued logic). The staged SQL now checks nullable fields explicitly; negative tests pass.
- **Not production complete:** public direct lead INSERT is kept for legacy mobile compatibility; separate secure API needs service-role secret and flags. Real hosted Supabase Auth/Storage and protected object download tests have not been done.
- **Alternative staging discovery:** Supabase organization has one project; connector quote for creating a separate project is **US$0/month** (base project creation quote, not a promise of unlimited free usage). A distinct project could support realistic hosted Auth/Storage tests without Pro branching, but must be explicitly approved in the intended organization before creation.
- **Release hold:** do NOT apply any prepared review SQL or credit migrations to production. No main merge / Vercel deploy until hosted staging authorization and negative test matrix pass.

## Verified Cloud Acceptance Evidence — 12 November 2026

- **PostgreSQL 17 / Docker:** [4/4 jobs passed in run 43278879798](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43278879798): owner/staff/anon RLS, staged profiles privacy, business/verification guards, secure Leads + Analytics RPC permissions, rate/duplicate tests, and Growth Wallet accounting with synthetic fixtures.
- **Actual Supabase API stack:** [Auth / Storage / PostgREST passed in run 43278880130](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43278880130). Real JWT sign-ins for Admin, Vendor A/B, Customer; account signup; no anonymous profile PII; owner profile update; no privilege escalation; approved-only business listing; cross-vendor isolation; verified-owner submission/staff decision; owner-only private file upload/signed URL; cross-owner upload/signing denied. This ran in a temporary Github Actions container, **not the production Supabase project**.
- Full-stack CI also verifies local CLI reachability without Pro branching or local PC installation.
- **No production SQL, GitHub main merge or Vercel deployment performed by this work.**

### Remaining hard NO-GO release gates
1. Production Vercel project has NO `SUPABASE_SECRET_KEY` nor `SUPABASE_SERVICE_ROLE_KEY`; secure event/lead ingestion functions cannot be activated. Configure securely in Vercel without placing the credential into GitHub, client bundles, or chat.
2. Production Vercel has neither `GROWTH_EVENT_INGESTION_ENABLED`, `SLBI_SECURE_LEADS_ENABLED`, nor `NEXT_PUBLIC_SECURE_LEADS_ENABLED`; changing flags requires a coordinated release, not an ad-hoc update.
3. Legacy anonymous direct `leads` INSERT must stay functional for old clients until mobile compatibility is verified and cut over. Removing it now can lose enquiries; leaving it indefinitely undermines abuse protection.
4. Cloud synthetic tests do not certify all production-specific Auth triggers, private storage policies, live signup, consumer UI, or third-party Cloudflare Turnstile Siteverify. A controlled real-environment smoke and rollback rehearsal remain required.
5. Production Supabase advisor lists multiple public-executable `SECURITY DEFINER` functions. Categorize intentional public read RPCs, trigger-only functions, chat creation privileges, and potentially abuse-prone counters before declaring all security gates green.
6. Release migration still resides in REVIEW-ONLY files; no numbered migration has been applied to production. A predeployment backup and ordered idempotent migration bundle are still needed.

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
- Profiles: "Profiles viewable by all" SELECT USING(true). Production anon
  role has SELECT on private email, phone and push_token columns. The staged
  P0_PROFILE_PRIVACY_STAGE_REVIEW_ONLY.sql proposes owner/staff-only SELECT,
  revoke anonymous access and non-exposed staff authorization. Requires admin,
  auth signup, Navbar, chat/reviews and mobile E2E before applying.
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
- P0_PROFILE_PRIVACY_STAGE_REVIEW_ONLY.sql: proposed private-profile RLS and
  staff helper in an unexposed schema, with separate assertions/contingency.

These materials are deliberately NOT placed in supabase/migrations. DO NOT
auto-apply on any environment. After verified staging tests, migrate via a
proper numbered migration with full release approval.

## Implementation order and gates
1. Create approved isolated Supabase staging with Auth, Storage, RLS, extensions,
   functions and realistic synthetic test users. **Supabase branching requires
   Pro, even when hourly compute cost is explicitly approved.** Cost lookup
   for a separate NEW project currently returns US$0/month; creation of that
   alternative requires separate explicit permission and quota confirmation.
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
- Public all-profiles read remains unmitigated (stage-only candidate ready).
- Missing server-only Supabase privileged key.
- Unverified mobile-to-secure-leads cutover.
- Unrehearsed wallet RPC including concurrency and month boundaries.
- No authenticated Vendor A/B/admin and negative tests.
- No reproducible browser and production smoke tests.
- Rollback not demonstrably tested.

**Important:** Static assertions cannot certify 100% security or workflow
correctness. This packet does not claim release readiness.
