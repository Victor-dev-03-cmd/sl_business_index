# Campaign Planner P2-05 — release candidate, not installed
As of 2026-11-14, this is **NOT deployed, NOT applied to live Supabase, NOT a completed CI release**.

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
