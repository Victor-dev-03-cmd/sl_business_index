# Billing V2 — Feature Gating, Data Model and Verification

The manual settlement workflow is staged on the draft GitHub PR and **NOT ACTIVE** until the migration and authorized tests pass. The existing live Billing enquiry flow remains unchanged.

## Enable only after staging

1. Review and test `docs/release/BILLING_V2_SCHEMA_DRAFT.sql` on an isolated Supabase database branch. Convert it to a proper migration using the Supabase CLI; do not silently run against production.
2. Verify `billing_requests` and `billing_request_events` RLS isolation with real Admin, CEO, Vendor, Customer and anonymous sessions.
3. Test duplicate request submission (idempotent same ID), 3/day per-user throttle, same plan different billing cycle, active plan protection, disabled plan, invalid cycle, cross-account request read and staff-action impersonation.
4. Test legal transitions: submitted → reviewing → awaiting_payment → activated only after a human verifies independent bank settlement. All others must fail safely.
5. Prove the account's previous active subscription is cancelled, only one new active subscription exists, invoice row is written once, expiry is set and audit event is immutable. Prove rollback is atomic on any mid-transaction error.
6. Enable **both** `BILLING_V2_ENABLED=true` and `NEXT_PUBLIC_BILLING_V2_ENABLED=true` in the **Preview environment only**. Rebuild Preview ONCE after Vercel quota permits; test Admin Billing Workflow and Vendor Billing end to end.
7. After pricing decisions, signed payment gateway setup (or approved manual settlement policy), verified functionality, security review and financial sign-off, merge and set production environment variables **after** migration verification.

## Current scope

Subscription requests and staff-verified manual settlements are modelled. Payment provider callbacks, recurring charges, chargebacks/refunds, add-on/credit/domain purchase catalogues, invoice tax compliance and the user's unverified four plan budgets are not yet implemented. Do not advertise automatic checkout or assume historical `paid` invoice rows prove real payment.

## Security notes

- All write access to `billing_requests` is via constrained SECURITY DEFINER functions with explicit `auth.uid()`, database admin role checks and REVOKE/GRANT.
- The draft also addresses missing admin invoice read and missing `app_settings` RLS.
- Never provide service-role credentials to a browser.
- All PII audit notes must avoid storing card numbers, access tokens, passwords or unnecessary personal data.
