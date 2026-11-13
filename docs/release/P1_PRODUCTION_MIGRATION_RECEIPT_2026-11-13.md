# P1 release migration receipt — 2026-11-13

The owner chose GitHub Actions Docker acceptance rather than a paid Supabase
branch. Real Supabase Auth/PostgREST JWT + PostGIS tests passed in disposable
GitHub Docker on release candidate `055c00895980ed13c93b85a79e5185015119db9f`.
Live production schema compatibility was checked using read-only SQL.

Four P1 migrations were applied to the existing Production Supabase project
using its migration API (transactional changes), with exact database-assigned
versions tracked below:

1. `20261113091046_p1_public_api_truncate_lockdown.sql`
2. `20261113091124_p1_vendor_lead_followups_and_review_owner_rls.sql`
3. `20261113091146_p1_review_moderation_pending_staff_audit.sql`
4. `20261113091207_p1_business_physical_address_postgis_guard.sql`

Post-migration read-only verification: 24 business records, 15 leads,
2 lead notes, 484 analytics events, 2 reviews and 0 review replies preserved.
Two historical published reviews remained published; the review moderation
audit trigger and uniqueness index were installed; 3 follow-up policies exist.
API-role TRUNCATE grants on current application tables: **0**.

These exact SQL migration files use the actual versions in the production
migration history, to prevent re-application through future migrations.
No customer PII was copied into GitHub test fixtures.

**Note**: Database migration success is not the same as site deployment.
The application must still be merged into `main`, deployed to Vercel
Production, `SLBI_REVIEW_MODERATION_READY=true` configured for Production,
and production route/security smoke checks completed.
