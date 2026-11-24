# G1-04 — Isolated Supabase-shaped read-only integration tests
Date: 2026-11-24. GitHub draft PR #168, G1 branch only.

## Pages and impact (plain explanation)
**No visible page has been changed in G1-04.** The future affected pages are Vendor Dashboard → My Business (source of owned-business facts), Gallery & Services (source of service names and image counts), and Marketing Studio (future consumer). Their current UI/behavior stays unchanged. No new route or UI switch exists.

## Code now implemented
- `lib/growth/g1/isolated-ssr-read-adapter.ts` supplies a structurally typed, injectable Supabase-js v2 / PostgREST-shaped read port. This **does not instantiate any Supabase client** or talk to any database.
- The first operation is `auth.getUser()` (never `getSession`). Next: `businesses` SELECT of exact allowed columns with `id`, `owner_id` and `status='approved'`. Only after owner/approved check may brand and profile queries run, using exact `business_id` and where available `owner_id` filters.
- Data is validated for minimum row shape, errors sanitized; the G1-03 resolver rechecks owner/business/profile join and the G1-01/02 builder removes private columns.
- `tests/g1/isolated-ssr-read-adapter.test.mjs` simulates Supabase query filtering and projection in memory. A/B cross-tenant denial, anonymous, pending, optional null vs error, read-only scope and private data excluded.
- Dedicated G1 CI runs these alongside G1-01/02/03 tests. All are **synthetic contract tests** — not authenticated real Supabase RLS tests. No service-role, migration, webhook, provider, analytics or credit operation.

## Auth guidance
Existing Next.js uses cookie-bound `@supabase/ssr` from `lib/supabase/server`; the G1-04 module is **not wired to it**. Before a future real integration, owner must approve scope and G0 authentication/release gates must be reviewed. Supabase JS v2 `getUser()` and `.select().eq(...).maybeSingle()` were checked against vendor docs. A mock with correct method names alone cannot prove physical browser auth, RLS, or live schema parity.

## Owner limits unchanged
Only isolated read-only development approved. **DO NOT MERGE draft PR #168 into main** (main push auto-deploys Vercel). No live G1 database read, migration, paid staging, new provider, main merge or production release. Wallet manual admin-reviewed refunds only (runtime enforcement unverified), existing approved Marketing providers and unchanged boundaries, desktop GPS remains a blocking physical retest. G0 foundation 0/7 owner accepted, master GrowthOS 0/10.

## Next steps
1. Audit actual My Business and Gallery & Services source columns and review any shape drift on a *nonproduction* fixture.
2. Expand G1-04 isolated Postgres owner-A/B/anon tests and SSR contract validation without production access.
3. Independently complete G0 backup/restore/external-drive, consent and real desktop GPS QA gates. Only after separate authorization consider wiring to live user-scoped SSR client or Vendor/Marketing UI.

## Next-chat prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil with connected GitHub. Repo Victor-dev-03-cmd/sl_business_index. Draft G1 PR #168 is isolated read-only only; verify head SHA, exact 16/16 CI and do NOT merge to main or create production deployment. Read docs/growth/G1_04_ISOLATED_POSTGREST_INTEGRATION_20261124.md, docs/growth/G1_03_ISOLATED_OWNER_RESOLVER_20261124.md, docs/growth/g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json, AGENTS.md and release checklist. G1-04 code lib/growth/g1/isolated-ssr-read-adapter.ts is a mockable PostgREST-shaped adapter (not real Supabase client/route): getUser first, then SELECT narrowly scoped approved owned business, then related brand/profile; synthetic in-memory owner A/B, anon, source outage and private data tests. No UI pages changed or provider integrations. Next add disposable DB RLS regression and continue owner-gated G0 exit: 0/7 accepted, master GrowthOS 0/10. Desktop GPS remains blocker, wallet refunds manual admin-reviewed only (runtime unaudited), Marketing existing providers only. No live SQL, paid resources, preview churn or main merge.
```
