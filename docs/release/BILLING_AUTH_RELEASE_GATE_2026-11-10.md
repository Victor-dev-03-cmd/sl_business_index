# SLBI Billing & Auth — Consolidated Preview Release Gate

**Date:** 2026-11-10. **GitHub source:** `security/supabase-auth-protected-routes` (draft PR #7). **Production:** `main` intentionally untouched until verification.

## Verified audit

- Last production SHA: `20f90f15f0e081357a2b3202975dc31e4d5af05d`, Premium Vendor Billing.
- One draft auth PR: #7. Initial preview commits failed TypeScript (SSR cookie adapters); subsequent typed fixes have not passed a full build.
- Vercel Preview deployment quota HTTP 402 `api-deployments-free-per-day`. Numerous independent commits triggered builds. **This branch now opts out of auto preview builds in `vercel.json`.** Remove this branch-specific opt-out ONLY for the single validated preview deployment.
- Existing Supabase billing catalogue: Basic (LKR 0), Professional (LKR 2,500/mo, 25,000/year), Enterprise (LKR 7,500/mo, 75,000/year). **These are LEGACY prices**, not the unverified 4-category final budget.
- 28 `active` subscription records: all monthly Basic with no renewal timestamp; 26 invoice rows have `paid` DB status. None of these counts alone prove independent settlement.
- `subscription_plans` currently lacks a `features` column. Admin plan CRUD previously sent `features` and rendered `plan.features.map`, causing failed writes and potential runtime errors.
- `invoices` SELECT RLS has owner access but no admin read policy. The admin invoice query can return no global records even when historical rows exist.
- `app_settings` is exposed without RLS (Supabase security advisor). Audit site settings dependencies before applying a restrictive policy.
- Vendor upgrade POST currently writes an enquiry to `contact_submissions`; no payment is collected, verified or settled; no automatic paid activation exists. Admin inbox currently supports reading and replying, not status progression.

## Fixes staged in PR branch (not deployed)

- Next.js 16 SSR auth + protected role checks, OAuth internal redirect validation, session cache invalidation from PR #7.
- Admin plan save now persists actual schema columns, validates amounts, percentage and listing limits, safely handles missing feature arrays, and surfaces errors to staff.
- Vendors can request a different billing cycle for the same named plan; expired `renews_at` subscription records no longer appear as current entitlements in the billing presentation.
- Backend upgrade eligibility checks requested plan **and** billing cycle.
- Preview auto-deploy pause prevents a new Vercel deploy for every branch commit.

## Blocking requirements before a one-time production release

1. Recover/approve the exact four new commercial plans, price levels, feature entitlements and budgets. Do not guess rates or overwrite historical plans without migration.
2. Build a dedicated account-owned billing request/order ledger with statuses, audited admin review, duplicate request throttling and legal payment evidence.
3. Integrate an authorized payment provider with independently verified signed callbacks **or** a documented manual bank settlement approval mechanism. Never activate on browser confirmation.
4. Implement verified activation, transactional invoice/receipt records, renewal/expiry/cancellation/refund handling and server-side benefit enforcement; grandfather legacy subscriptions safely.
5. Fix admin invoice RLS and app_settings exposure, test all role and tenant restrictions, review database migrations, and preserve backup/rollback procedures.
6. Run one final successful Preview build (including TypeScript), authenticated Admin/Vendor/Customer E2E, RLS and billing negative tests.
7. Only after these gates pass, merge reviewed PR to `main` ONCE and verify production READY at the exact merged SHA.

## Release/preview control

Vercel official configuration: `git.deploymentEnabled` per branch in `vercel.json`.
See https://vercel.com/docs/project-configuration/git-configuration .
Disable it for the feature branch during iterative work; remove branch rule in the final commit to generate one Preview when the Vercel quota allows. Production `main` stays enabled because it is unspecified.

**Important**: An ignored build step may still count toward deployment limits; branch `deploymentEnabled:false` is used to prevent automatic creation.

## Scope truth

This PR is not yet a finished paid checkout; do not label it production-ready based on build alone. Do not promote or merge while any financial, authorization or end-to-end acceptance gate is unmet.
