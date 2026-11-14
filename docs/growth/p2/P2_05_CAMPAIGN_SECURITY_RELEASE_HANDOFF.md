# Campaign Planner P2-05 — release candidate, not installed

## 2026-11-14 — VERIFIED P2-05 CAMPAIGN PLANNER BACKEND SECURITY PRODUCTION RELEASE (LATEST)
- **App #1 Campaign Planner manual backend security:** [PR #77](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/77) merged (squash) to GitHub main **`23f880d28ecc2cf6a506848e85f99f1cfa9d190a`** from tested PR SHA `81fa5effd30273db709f0566fac3b4c165584c9b`.
- **Exact candidate was tested:** 5/5 CI workflow families SUCCESS at PR SHA, including exact P2-05 production candidate SQL on disposable Postgres 17, synthetic Basic and Pro owner A/B, forged status denial, revision audits, P1/billing regressions, TS and Next production build. Main merge SHA Verify Next.js Build **SUCCESS** (`43600015574`).
- **Live Supabase production migration APPLIED:** `20261114132728 p2_campaign_planner_owner_rls_revision_audit_v1` in project `oofxhragafekazwjikae`. Preflight met. After apply: one historic `posted` record preserved, zero revisions yet (no new post-migration edits), owner-only authenticated read/insert/update, no anonymous SELECT, no client DELETE, no `business_id` reassignment, no direct revision insert. Existing `posted` is NOT provider publication proof. Existing manual Basic Campaign Planner remains a direct route; paid Pro is not required to save manual drafts.
- **Vercel Production READY:** deployment `dpl_5BMFQotacYvpCKDQZE49Qqt1FssW`, source `23f880d28ecc2cf6a506848e85f99f1cfa9d190a`, alias `www.slbusinessindex.com` verified. **NO manually-created Vercel Preview**. Doc-only update may trigger its own automatic Git production deploy; distinguish code release SHA from latest doc SHA.
- **Not 100% of every marketing feature:** Real signed-in vendor Chromium E2E was not available; external publishing, approval workflow, background queue, durable scheduling and provider-delivery receipts are NOT live. **12/12 Studio marketplace app flags still `coming_soon`**; no promotion of Campaign Planner tile to `live` yet. Original Basic direct route is not disabled. Next: App #10 Content Calendar from single staged source `de258220fcb8ceda73efeff2c161dd77f39b3dca`, compile/CI/owner A/B + authenticated browser before release, and preserve no-auto-post semantics.
- **Handoff tracker:** [Issue #76](https://github.com/Victor-dev-03-cmd/sl_business_index/issues/76). BOC merchant LankaQR still pending branch visit; Payments.lk sandbox only; WEBXPAY excluded. Admin redesign/pricing deferred. **Avoid repetitive preview deployments**.

**Original candidate-stage note (historical):** The following section described the pre-release candidate before the production migration and CI verified above. Do not treat it as the current release status.

## Why first
Campaign Planner is an existing Basic tool and the data foundation for Content Calendar, Automation and Social Publishing. Live \`marketing_campaigns\` has a legacy owner \`FOR ALL\` policy permitting untrusted owner-set \`posted\` statuses and potentially DELETE. There is one historical \`posted\` row, which is not proof of provider publishing. Existing source only creates \`drafted\` or \`scheduled\` records.

## Prepared source
- \`docs/growth/p2/P2_05_CAMPAIGN_SECURITY_PRODUCTION_CANDIDATE.sql\` copied from the previously Docker-tested staging policy/revisions migration with added preflight/live-policy-expectation and atomic postflight privilege checks.
- \`tests/p2CampaignReleaseCandidate.test.mjs\` verifies source contract. Not enough to prove PostgreSQL auth semantics.
- Existing disposable Docker verification scripts: \`tests/p2-campaign/bootstrap.sql\`, \`tests/p2-campaign/verify.sql\` plus \`.github/workflows/p2-marketing-brand-foundation.yml\`.
- Do NOT run \`apply_migration\` or enable a Studio app until exact candidate SQL passes disposable PostgreSQL 17 tests and authenticated browser Basic owner-A/owner-B check; then obtain approved deployment window.

## Preconditions
- Recheck live policy list, columns, role grants, current production data and migration list. Migration intentionally refuses to run if unexpected live policies, existing revisions or missing source tables are found.
- The candidate uses a transaction with lock/statement timeouts and postflight checks; it does not edit any campaign record, purge a row or mark an item published.
- Verify grant SELECT/INSERT/UPDATE but not DELETE/TRUNCATE for authenticated, no anon reads and no owner reassignment; all revisions have RLS owner read and audit writer trigger. Historical posted rows stay owner-readable but cannot be client-mutated.
- The current marketplace rollout remains \`coming_soon\` for all 12 apps. Existing Basic Campaign Planner direct path must remain accessible.

## Release proof still missing
1. Exact candidate applied to clean synthetic PG17 DB and existing P2-05 owner A/B/expired-Pro tests; run alongside P1 and P2 RLS regression.
2. Node test, TypeScript + Next build, browser-authenticated Basic owner save/read and unauthorized posted/edit/delete denial.
3. Approved scoped Supabase versioned migration, post-migration runtime read checks and database security advisors.
4. One deliberate Vercel production release **only if source code needs deployment**, without repetitive previews; actual migration alone does not require a rebuild of unaffected frontend assets.
5. Update AGENTS.md, Master Handoff, P2 Live Ledger and twelve-app handoff with exact migration, GitHub SHA and deployment outcome when genuinely completed.

Never confuse staged SQL with production security improvement.
