# Independent PostgreSQL Billing: Provisioning and Cutover

- Status: DEVELOPMENT ONLY; no external PostgreSQL has been provisioned.
- Supabase stays authoritative for Auth, Profiles, Businesses and Geolocation.
- New PostgreSQL stores Billing plans, orders, payments, subscriptions, receipts, credits and events.
- Never store passwords, Supabase session cookies or business coordinates in Billing PostgreSQL.

## Provisioning

1. Connect Neon or another managed PostgreSQL provider to ChatGPT.
2. Create a separate database instance. Use a direct TLS URL for migrations and
   a pooled TLS connection for Vercel functions. Store URLs as server-side secrets.
3. Execute database/postgres/billing/001_initial.sql against the NEW database,
   not Supabase. The migration deliberately seeds NO commercial pricing.
4. Create two restricted database roles (application and billing staff).
   App role needs EXECUTE on submit_request,account_snapshot,published_plans.
   Staff role needs EXECUTE on staff_action,staff_queue. Grant USAGE on
   billing schema to each, no direct table/sequence privileges.
5. Implement two separate Node-only server connections; never expose either
   database URL as NEXT_PUBLIC_*. Browser must use Next.js backend APIs.
6. Validate Supabase Auth with auth.getUser() on every request, and for staff
   operations query verified profiles.role (only admin/ceo) on Supabase.
   Do not accept user IDs or staff IDs from browser payloads.
7. Keep existing Supabase billing tables as read-only legacy until account
   mappings, historical reconciliation, invoices and entitlements are verified.
8. Final four-plan pricing and features must be approved before publishing.
   Current SQL tests use old numbers only as disposable fixtures.
9. Phase-in via feature flag, final Vercel Preview and authenticated E2E;
   never auto-activate paid plans from a submitted order.

## Manual billing safety

Statuses: submitted,reviewing,awaiting_payment,activated,rejected,cancelled.
Only independently reconciled bank transfers can enter activated.
Duplicate idempotency keys and normalized payment references are rejected.
Subscription replacement, payment, receipt, credit wallet and audit event
occur inside one PostgreSQL transaction. Receipts are not tax invoices.
Refunds, recurring autocharges, and provider-signed webhooks are NOT yet built.

## Open blockers

- Hosting provider not yet connected, so no real PostgreSQL deployed.
- Pricing specification of four new commercial plans remains unverified.
- Need secure backend drivers/API integrations and Vercel secret setup.
- Supabase cross-database RLS cannot be automatically inherited; server
  must verify account owner and role. No cross-DB SQL foreign key.
- Real payment verification requires an approved staff bank policy or provider.
- One final Preview and authenticated E2E required before production cutover.
