# SLBusinessIndex — Marketing Studio Global App Rollout Runbook

## 2026-11-14 — VERIFIED P2-05 CAMPAIGN PLANNER BACKEND SECURITY PRODUCTION RELEASE (LATEST)
- **App #1 Campaign Planner manual backend security:** [PR #77](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/77) merged (squash) to GitHub main **`23f880d28ecc2cf6a506848e85f99f1cfa9d190a`** from tested PR SHA `81fa5effd30273db709f0566fac3b4c165584c9b`.
- **Exact candidate was tested:** 5/5 CI workflow families SUCCESS at PR SHA, including exact P2-05 production candidate SQL on disposable Postgres 17, synthetic Basic and Pro owner A/B, forged status denial, revision audits, P1/billing regressions, TS and Next production build. Main merge SHA Verify Next.js Build **SUCCESS** (`43600015574`).
- **Live Supabase production migration APPLIED:** `20261114132728 p2_campaign_planner_owner_rls_revision_audit_v1` in project `oofxhragafekazwjikae`. Preflight met. After apply: one historic `posted` record preserved, zero revisions yet (no new post-migration edits), owner-only authenticated read/insert/update, no anonymous SELECT, no client DELETE, no `business_id` reassignment, no direct revision insert. Existing `posted` is NOT provider publication proof. Existing manual Basic Campaign Planner remains a direct route; paid Pro is not required to save manual drafts.
- **Vercel Production READY:** deployment `dpl_5BMFQotacYvpCKDQZE49Qqt1FssW`, source `23f880d28ecc2cf6a506848e85f99f1cfa9d190a`, alias `www.slbusinessindex.com` verified. **NO manually-created Vercel Preview**. Doc-only update may trigger its own automatic Git production deploy; distinguish code release SHA from latest doc SHA.
- **Not 100% of every marketing feature:** Real signed-in vendor Chromium E2E was not available; external publishing, approval workflow, background queue, durable scheduling and provider-delivery receipts are NOT live. **12/12 Studio marketplace app flags still `coming_soon`**; no promotion of Campaign Planner tile to `live` yet. Original Basic direct route is not disabled. Next: App #10 Content Calendar from single staged source `de258220fcb8ceda73efeff2c161dd77f39b3dca`, compile/CI/owner A/B + authenticated browser before release, and preserve no-auto-post semantics.
- **Handoff tracker:** [Issue #76](https://github.com/Victor-dev-03-cmd/sl_business_index/issues/76). BOC merchant LankaQR still pending branch visit; Payments.lk sandbox only; WEBXPAY excluded. Admin redesign/pricing deferred. **Avoid repetitive preview deployments**.


## 2026-11-14 — LATEST OWNER HANDOFF: Billing QR + Marketing Studio App #10

**Cross-chat contract:** Update GitHub AGENTS.md + master handoff + live ledger after each meaningful completed milestone. At the start of each new chat read their latest main versions. Record exact SHA, CI, production status, blockers, next actions. Do not imply background/asynchronous work beyond an active chat turn.

**Deployment limit:** User requests no repetitive Vercel Preview deployments due to daily quota. Use source-only staging and CI/local verification first; deploy only when a reviewed feature is approved. Documentation changes must not silently turn on any app, gateway or paid features.

**Billing decision:** Approved payment channels are **BOC Flex/SmartPay Merchant LankaQR** and **Payments.lk ONLY**; WEBXPAY excluded. User personally contacted BOC hotline and attempted SmartPay merchant enrollment three times; final Enroll button did not respond. BOC advised SmartPay or nearest branch. Owner plans visiting BOC branch **Monday 2026-11-16** to register and obtain merchant LankaQR. Owner will share QR PNG/JPG/WebP after approval. A personal/P2P QR is not a verified Merchant LankaQR. Never request banking login, OTP, secret credentials or full account details. A static QR is not automatic transaction verification. Bank settlement must be independently reconciled before activating paid entitlements.

**Billing code is STAGED ONLY:** Detached/non-branch commit [371857bf402e342aec439517976b0946fae81166](https://github.com/Victor-dev-03-cmd/sl_business_index/commit/371857bf402e342aec439517976b0946fae81166) contains owner-authenticated read-only BOC QR options, awaiting_payment / server-confirmed quote gate, existing vendor Billing request confirmation UI, Payments.lk sandbox adapter and handoff guide. Not merged, not CI build-tested, not deployed; no online checkout, live payment or bank account connected. Payments.lk merchant approval, official API/keys/webhook verification and single billing authority still required. See staged docs/growth/p2/BOC_LANKAQR_PAYMENTS_LK_BILLING_HANDOFF.md. Final Basic/Plus/Pro pricing and Admin Dashboard redesign deferred pending owner decisions.

**Marketing Studio app #10:** The 10th of 12 marketplace cards is Content Calendar (ID content-calendar). Current production page is informational only. Detached/non-branch source commit [de258220fcb8ceda73efeff2c161dd77f39b3dca](https://github.com/Victor-dev-03-cmd/sl_business_index/commit/de258220fcb8ceda73efeff2c161dd77f39b3dca) stages read-only owner-scoped monthly grid, Colombo timezone, owned-business filter and real saved campaign planning records. Not merged, not CI build-tested, not live. No worker, auto-post, mail sending, provider receipts or scheduling side effects.

**Live database verified 2026-11-14:** marketing_studio_app_rollouts has 12/12 coming_soon; ZERO apps promoted live. Existing Basic Campaign Planner /vendor/marketing/campaigns and Leads CRM /vendor/leads remain independently accessible. Do not set any marketplace app to live without individually passing tested release gates. 10 premium apps should be delivered incrementally; never claim 10 live merely because UI foundations exist. Pro entitlements, provider access, managed KMS and production verified billing remain gating dependencies.

**Next chat / next steps:**
1. Inspect latest GitHub main SHA; read this handoff, master context, P2 live ledger and marketing rollout runbook. Check Supabase and Vercel status independently.
2. Owner obtains and supplies *merchant-approved* BOC QR; check actual Merchant LankaQR classification, store QR image as approved asset, wire into existing pending Billing request confirmation only after owner quote staff approval; no screenshot-based verification.
3. Review and run tests / Next build for staged Content Calendar detached commit against current main, improve date-window/pagination and actual two-tenant browser/pro-entitlement tests; preserve planning-only status. Avoid preview deployments.
4. Complete legacy P2-05 campaign RLS hardening in tested versioned migration before any durable P2-06 scheduler/publish flow. Protect historical posted row and Basic owner planning.
5. Integrate Payments.lk only after approved merchant credentials, official current API docs, immutable server-issued order, signed webhook, idempotency, bank reconciliation and authorization tests; do not take live payments without review.
6. Deliver the remaining Premium Marketing Studio apps one at a time with provider permissions, spending controls, real E2E and release gates; finally update docs with committed SHA, passing CI and real deployment/migration evidence.
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
