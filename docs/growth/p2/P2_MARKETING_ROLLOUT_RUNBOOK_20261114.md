# SLBusinessIndex — Marketing Studio Global App Rollout Runbook
2026-11-14 | Phase P2 | Owner-approved Production DB foundation

## Verified current environment
- Supabase project `oofxhragafekazwjikae`, migration `20261114104216 p2_marketing_global_foundation_coming_soon_v1` (applied).
- GitHub source PR #73, merge commit `12d0add2f99b7fdf8936b1042e581c291a4bdeb3`.
- 12 first-party apps registered in `public.marketing_studio_app_rollouts`, all `coming_soon`. No real provider connected; no paid AI spend or email sends.
- Vendor can read these flags through RLS but cannot write them. Only trusted server/service workflow can change rollout.
- OAuth production start remains hard-disabled by `getGooglePreviewConfig()` requiring `VERCEL_ENV='preview'`. A database object is NOT permission to activate OAuth or external messaging.

## Per-app release gates (repeat for each one of 12)
1. Implement feature in a branch based on current `main`; do not merge old draft branches wholesale. Finish accessible skeleton/empty state and separate unit + security contracts.
2. Enforce owner isolation on DB/API, verified server Pro only for premium apps, CSRF/origin/rate limits and audit trail. Verify with real Auth owner A / owner B / expired Pro, plus Docker tenant tests.
3. For third-party integrations, obtain vendor-initiated official provider OAuth consent, app review, verified scopes, managed KMS vault + rotation and cancellation/revoke/disconnect. Add suppression/opt-in/opt-out for outbound marketing. Never request personal social account passwords.
4. Turn `launch_status` from `coming_soon` to `preview` through a reviewed server-side migration; this is not a public launch and the marketplace remains non-clickable for preview.
5. Verify exact code SHA CI (Node, TypeScript, Next build, RLS, billing and all dependent security jobs), Vercel Preview READY, real Chromium signed-in mobile/desktop acceptance and cost controls.
6. On signed-off global release only, set `launch_status='live'` via a reviewed trusted migration, with an `approved_at` timestamp and the deployed code ready. Vendor marketplace then exposes **Open** link. Database flag does NOT override independent server Pro/account/consent checks.
7. After merging to main, verify Vercel Production READY exact source SHA, the `www.slbusinessindex.com` alias and live app authorization tests. Append exact result to AGENTS, Master Handoff and P2 Live Ledger.

## Rapid rollback
- Roll back the affected app's `launch_status` to `coming_soon` through trusted migration, and remove route/action access by server-side feature gate as appropriate.
- Stop outgoing jobs/queues immediately; preserve evidence, real provider receipts, and never erase unrelated customer data.
- If provider access was issued, revoke with the provider as well as purging local ciphertext; revoking local tokens alone does not revoke Google/Meta grants.
- Database baseline is additive. Do not run an automatic DROP TABLE rollback after data is created; use tested backup/restore or approved dependency-aware corrections.

## Historical legacy constraints
- Existing Basic campaign planner `/vendor/marketing/campaigns` and leads CRM `/vendor/leads` remain accessible outside Coming Soon catalogue, not deleted.
- One historical `marketing_campaigns.status='posted'` is NOT an external provider receipt. Legacy owner ALL policy remains and must be hardened in a separate P2-05 reviewed migration preserving draft/schedule writes and existing rows.
- No production P2 AI credits/paid provider consumption enabled. Verified Pro entitlements currently 0.
- Supabase Security Advisor informational no-policy on secrets/intents is intentional deny-by-default; existing spatial_ref_sys advisory is unrelated.

## App list
1. Campaign Planner
2. Poster Design Studio
3. AI Caption Lab
4. Business Brand Kit
5. Social Media Marketing
6. Email Marketing
7. Calls & Messages Agent
8. Marketing Automations
9. Plugin & App Connectors
10. Content Calendar
11. Marketing Leads
12. Leads CRM

Order remains Marketing → Growth → SEO. Do not reimplement Discovery.

## 2026-11-14 owner priority: App #10

Content Calendar staged implementation (SSR real owned records, Colombo month grid and filters) is **NOT a public launch**. Read `P2_06_CONTENT_CALENDAR_STAGE_20261114.md` and [living handoff issue #74](https://github.com/Victor-dev-03-cmd/sl_business_index/issues/74). Keep `content-calendar='coming_soon'` in production until exact-SHA CI, secure P2-05 policy, verified Pro billing and authenticated browser acceptance. No provider auto-post or paid jobs. Minimize repeated Vercel previews.
