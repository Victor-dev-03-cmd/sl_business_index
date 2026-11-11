# SLBI secure growth activation — controlled QA runbook
**Scope:** Secure anonymous enquiries, privacy-preserving analytics, private verification documents, role/tenant protections, and the new vendor studios.
**Status:** REVIEW / CODE READY, data layer NOT activated. Never represent enabled in live marketing claims until verified.

## Current production and exact blockers (11 November 2026)
- Vercel production release `21af76659526c8f447f3cf029672effcf6a383d5` contains gated route handlers and the Vendor Portal.
- Vercel environment does **not** yet define `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `GROWTH_RATE_LIMIT_SECRET`, `SLBI_SECURE_LEADS_ENABLED`, `GROWTH_EVENT_INGESTION_ENABLED`, `NEXT_PUBLIC_SECURE_LEADS_ENABLED`, `NEXT_PUBLIC_VERIFICATION_PRIVATE_READY`. They intentionally evaluate OFF.
- Current production storage bucket `verification-docs` is PUBLIC, with broad authenticated uploads. Existing public leads/analytics INSERT policies remain.
- Supabase main project has no development branch. An isolated branch requires cost confirmation; quoted branch cost `$0.01344/hour` (≈`$0.32256/day`, when kept running). Do not create without user accepting that amount.
- Supabase connector exposes publishable keys only, not a suitable backend secret. Do not copy a publishable/anon key into the server's privileged credential slot, ask user to paste credentials in chat, or put secret keys in `NEXT_PUBLIC_*`.
- Mobile compatibility for legacy direct anonymous lead inserts needs an explicit release decision before removing public INSERT grants.

## Staged SQL inventory
1. `SECURE_EVENT_INGESTION_REVIEW_ONLY.sql`: server-only, service-role RPC, hourly HMAC rate buckets, allowlisted event types/channels, dedupe and direct-browser INSERT revocation.
2. `SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql`: Turnstile-verified leads, atomic idempotency receipts, per-person/listing and per-listing rate limits, cleanup routine; revocation of legacy direct INSERT must remain deferred until mobile migrations.
3. `VENDOR_SETTINGS_PRIVACY_REVIEW_ONLY.sql`: owner-scoped preferences, private verification-doc bucket with signed URL viewers and strict upload path.
4. `PRIVILEGE_ESCALATION_GUARD_REVIEW_ONLY.sql`: additive role/verification/business-audit protections; **must** be reconciled against existing `increment_business_views` RPC and auth triggers before application (an overbroad UPDATE guard may block legitimate counters).
5. `MARKETING_QR_OWNERSHIP_REVIEW_ONLY.sql`: promotions tenant-bound RLS, upload file size/MIME caps, unique assigned managed QR per business, approved listing requirement.

## Execution order after paid QA-branch consent
1. Create isolated Supabase development branch. Verify Supabase functions, extensions, enum `qr_status`, baseline RLS/storage policies/constraints.
2. Convert the reviewed SQL into generated numbered migrations via a checked-out local Supabase CLI; apply dependency order with the existing migration history. Never overwrite existing guard functions blindly.
3. Run anon/authenticated/vendor-A/vendor-B/admin role-matrix tests for read/write, profile/verification escalation, upload signed URLs, QR assignment, marketing campaign save, lead form submission, analytics dedupe, rate limiting and deliberate invalid events.
4. Confirm existing mobile clients can use the new secure leads API, or preserve their public INSERT policy until an approved mobile update. Do not claim the public leads table is bot-proof while the policy remains.
5. Verify Turnstile Siteverify host/action binding with real server-side credentials and test low-volume abusive traffic. Exercise error handling without writing PII or raw client IP to logs.
6. Verify private bucket by checking anonymous public URL denial and vendor/admin signed previews for *existing* and *new* documents. Validate admin approval flows and allowlisted storage paths.
7. Add an explicit retention schedule for ephemeral rate buckets and idempotency receipts; verify it cannot purge CRM data.
8. Configure protected Vercel Production variables **directly in Vercel UI**: `SUPABASE_SECRET_KEY` (or legacy service role), independently generated 32+-byte `GROWTH_RATE_LIMIT_SECRET`. No secrets in source or chat.
9. Apply the reviewed migration and check advisors. Enable server features first, exercise staging/controlled production requests, then expose matching `NEXT_PUBLIC_*` client flags with a new deployment.
10. Run authenticated vendor/admin browser, responsive settings, marketing, QR and lead flows. Verify rollback commit and reverse migration impact before declaring finished.

## Immediate safe release rules
- UI redesign code can be tested and released separately **only with feature flags OFF**, no new public-policy changes.
- Never enable ingestion with missing secrets or missing RPC functions: fail closed.
- Do not flip bucket private until every legacy viewer uses signed URLs.
- The QR request API works under existing owner-scoped RLS; owner approval and origin validation are server-enforced. A future unique index closes the remaining concurrency race.
- Do not count clicks as conversions; do not infer consent from CRM email addresses; do not call planned posts 'sent'.
