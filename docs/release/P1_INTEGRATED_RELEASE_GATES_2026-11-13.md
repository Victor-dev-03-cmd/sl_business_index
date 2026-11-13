# SLBusinessIndex — P1 integrated release acceptance checklist (2026-11-13)

> **Status: Preview-only. Production is blocked.** This is a review and testing
> checklist, not permission to run SQL against live Supabase or promote Vercel.

## Exact release candidate

- GitHub branch: `release/p1-vendor-integration-20261113`
- Draft PR: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/64
- Includes P1-01 Overview, P1-02 location & detailed address, P1-03 lead follow-ups,
  P1-04 reviews, P1-05 insights, Next.js 16.4.6/React 19.3.1/Tailwind 4.3.5.
- Review security integration: PR #66, with server-controlled pending reviews,
  Admin/CEO moderation queue, and PostgreSQL RLS/column grants/audit checks.
- No paid Supabase branch was created or approved. Production data unchanged.

## Read-only live review preflight (2026-11-13)

| Check | Count/status |
| --- | --- |
| Reviews | 2 |
| Existing published reviews | 2 |
| NULL approval values | 0 |
| NULL author IDs | 0 |
| Duplicate (business_id, user_id) pairs | 0 |
| Duplicate reply parent IDs | 0 |
| Review replies | 0 |
| Admin accounts | 2 |
| Anonymous TRUNCATE on reviews/replies | **YES — production risk** |
| Authenticated review approval field INSERT | **YES — production risk** |

These totals describe the audit snapshot, not a future guarantee. Repeat immediately
before applying a versioned migration. No customer names, comments or emails were
retrieved.

## Release gates — do not skip

1. **Isolated staging approval.** Ask the owner to explicitly confirm any
   additional paid Supabase development-branch compute, or select an approved
   cost-free ephemeral Postgres staging environment. Never copy production
   customer contact details into public test systems.
2. **Staging migrations.** Convert the reviewed SQL drafts into *ordered*,
   versioned Supabase migrations and apply ONLY to a staging copy:
   - `docs/growth/p1/P1_VENDOR_DATA_GUARDS_STAGING_ONLY.sql`
   - `docs/growth/p1/P1_REVIEW_MODERATION_LOCKDOWN_STAGING_ONLY.sql`
   - `docs/growth/p1/P1_BUSINESS_LOCATION_GUARD_REVIEW_ONLY.sql`
   - Check all existing row counts, duplicate review pairs, PostGIS location,
     RLS grants, admin roles and mobile compatibility first.
3. **Review trust boundary.** Confirm browser can only submit a pending review
   using `POST /api/reviews/submit`, not direct public INSERT approval. Verify
   signed-in customer can read own pending review, another customer cannot.
   Admin/CEO can list/approve/reject with trustworthy actor/time, not forge it.
4. **Multi-tenant.** Real Supabase Auth JWT Vendor A/B test for listings,
   lead notes, follow-ups, review replies, status updates, and cross-vendor
   isolation. Anonymous user cannot TRUNCATE, read private pending items, or
   modify either tenant's CRM.
5. **Public consumers.** Login, signup, register/edit business, location pin,
   nearby listing map, Tamil/Sinhala search, existing anonymous mobile enquiry
   submission, billing/Neon, and admin queue with a real browser and mobile GPS.
6. **Exact integrated build.** All GitHub contract, TypeScript, Next.js production
   build, disposable Postgres RLS, PostGIS tests pass at one git SHA;
   Vercel Preview READY at that same git SHA.
7. **Only then production.** Resolve any remaining issues, retain DB rollback
   snapshot/restore options, roll out approved migrations in verified order,
   configure `SLBI_REVIEW_MODERATION_READY=true` only when DB is ready,
   merge the release candidate into main, deploy via Vercel Production,
   run authenticated + public smoke tests, inspect logs and rollback if needed.

## Current expected behavior

- **Before migration/flag:** New review submission and staff approval routes
  intentionally return unavailable. Existing public approved review display
  should keep functioning under the current production schema.
- **After approved migration/flag:** All new reviews are private/pending.
  No browser or user JWT may publish itself. Staff moderation is explicit,
  audited and subject to database RLS.
- **No automatic AI approval, customer SMS, or email delivery.** CRM reminders
  are in-app only; they require the independently reviewed follow-up table.

## Known blockers at this checkpoint

- Staging approval/real-JWT and authenticated browser acceptance not complete.
- Review security and follow-up SQL files are **not applied to live Supabase**.
- Live tables have excessive privileges, including RLS-unprotected TRUNCATE.
- No production release has occurred and `main` must remain unchanged.
