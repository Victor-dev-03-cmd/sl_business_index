# Independent PostgreSQL Billing Foundation

Status: staged SQL and CI, NOT a live PostgreSQL instance.

Supabase remains authoritative for Auth, Profiles, Business ownership, PostGIS and existing storage.
Independent PostgreSQL owns new Billing after a reviewed cutover. The browser must never access database credentials.

## Provisioning
Connect a PostgreSQL provider (Neon or a managed PostgreSQL server), authorize its costs and create a staging database.
Only backend environment variables can contain BILLING_DATABASE_URL. Enable TLS and connection pooling for Vercel.

## Release blockers
Four approved commercial plans/prices are unknown; plans/prices intentionally empty.
Verified activation atomically provisions plan-configured feature entitlements and monthly AI credits. These remain staging-only and require server-side enforcement, renewal/reset jobs and authenticated E2E before launch.
No payment gateway, verified provider webhook, refunds, recurring renewals, authenticated E2E or legal tax invoices have been implemented.
This migration must NOT run against the existing Supabase production database.
Existing Supabase subscription rows remain authoritative until migration and reconciliation.

CI runs with an ephemeral PostgreSQL 17 instance and synthetic payment records.
