# Growth Engine V1 — living release checklist

## 2026-11-23 — Real-Auth G0 security candidate (CI not yet run)
After workstation shutdown, encrypted archive persists locally but restored PGDATA was tmpfs and is not durable. Added GitHub Actions disposable P1 real Auth+PostgREST test extensions: exact staged G0 Lead/Review SQL, vendor A/B/anon/admin JWT negative tests, service-only replay/conflict, legacy mobile lead, cache-spoof and moderation, catalog ACL verification; new G0 harness on Bun 1.3.11. No live schema changes, wallet migration, paid branch, secrets, or production records. Await PR CI evidence and physical-device authenticated acceptance; fresh independent-passphrase archive plus second verified copy remain open.


## 2026-11-23 — owner isolated lead/review migration rehearsal PASS
Owner ran `bash docs/growth/g0/release/LOCAL_LEAD_REVIEW_REHEARSAL.sh` from exact repository HEAD e6125daecfc25d4ffd50667371c2b372c0477367. Terminal reported PASS forward deployment and zero review cache mismatch; PASS synthetic service-role lead replay and conflict rejection; PASS exact recovery; PASS guarded reapply and preserved source rows; PASS outer transaction rolled back; LOCAL_REHEARSAL_SUCCESS. Actual restored production-shaped logical archive, local isolated connection only. No live migration, no wallet migration, no provider spend. This is a scoped rehearsal pass, not endpoint/device/tenant/admin/concurrency or complete G0 acceptance. Fresh independent-passphrase backup and independently stored encrypted copy verification, live preflight and explicit scoped release/maintenance approval remain pending; wallet remains separate. See [operator checkpoint](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md).


## 2026-11-23 — restored database parity; isolated migration rehearsal next
Owner supplied restored aggregate and ACL evidence: 24 businesses/23 approved, 3 reviews, 15 leads, 47 migration records; 4/4 guarded RPC hashes/ownership/grants exactly match original live baseline; 8/8 inspected tables RLS on; 1 wallet, zero ledger mismatch/overcap; two original review-cache mismatches preserved. Logical recoverability of these inspected contracts confirmed. Next run [local lead/review rehearsal](g0/release/LOCAL_LEAD_REVIEW_REHEARSAL.sh) in existing offline container, not live. Script prepared, not yet executed. Fresh distinct-passphrase archive and separate encrypted copy, scoped production approval and remaining G0 gates still pending.


## 2026-11-23 — isolated logical restore succeeded; acceptance checks pending
Owner supplied `RESTORE_SUCCESS` from strict `pg_restore --single-transaction --exit-on-error` into a local Supabase PostgreSQL 17.6 container (`--network none`, zero published ports, cron off). No production connection or data writes; restore was from the recorded encrypted archive. See [manual backup checkpoint](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md). Restored aggregate, RLS, ACL/fingerprint and migration rehearsal checks remain pending; platform storage/Vault recovery and cluster role globals are not certified. No G0/G1 acceptance.


## 2026-11-23 — owner manual backup captured (restore pending)
Owner supplied terminal evidence of successful AES-256 encrypted PostgreSQL custom archive for project oofxhragafekazwjikae, 2026-11-22 19:11:29–19:15:15 UTC, 434906 bytes, checksum and archive decode PASS. Actual isolated restore NOT_RUN and release BLOCKED; second copy and separate encryption passphrase pending. See [manual backup checkpoint](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md). No production writes or G0/G1 acceptance.


## 2026-11-23 (Asia/Colombo) — PR #151 merged; backup operator gate remains open
Manual-backup source merged at `a7a210f9a70bc893a68f9ea682e0ecc569f6ccd5`; candidate `9dd216ba824a026731fa0e719656e94a9b0bd664` passed 4/4: Next.js 45053060744, independent PG billing 45053060725, billing V2 45053060762, G0 integrity 45053060632. Production `dpl_DQBpnP3Zov11woxefQopNxKwZPDP` READY with www.slbusinessindex.com alias, exact merge SHA; main workflow 45056063654 was in progress at inspection. No manual Preview or live SQL writes. Actual encrypted database dump and isolated recovery still not verified (owner-side execution needed). Read [manual backup checkpoint](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md) for fresh preflight and next prompt. G0 and G1 acceptance remain blocked; no added cloud spend.


## 2026-11-22 — G0 MANUAL BACKUP OPERATOR CHECKPOINT (latest)
Owner approved manual backup on Free plan only. Read [G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md). Branch `growth/g0-manual-backup-gate`: owner-only encrypted native archive helper and restore/evidence runbook; archive decode is not recovery. Live 47 migrations, 24 businesses, 2 cache mismatches, zero wallet mismatch/overcap; no live SQL writes. Actual backup/isolated restore pending, no paid upgrade or G1 integration. Next-chat prompt in checkpoint.

2026-11-22 | Owner confirmed **none of the 10 end-to-end release gates are complete**. All boxes intentionally unchecked. No percentage or completed status inferred from partially implemented components. Canonical scope: [execution handoff](GROWTH_ENGINE_EXECUTION_HANDOFF_V1_20261122.md); [master](SLBI_MASTER_IMPLEMENTATION_HANDOFF.md).

## Master release gates (0/10 accepted)
- [ ] Verified shared business knowledge consistent across all designated AI tools.
- [ ] GrowthScore evidence, coverage and explanations correct.
- [ ] AI Copilot executes only explicitly authorized actions with real results.
- [ ] Durable background automations run with retries and recovery.
- [ ] Existing CRM and Marketing Studio integration complete.
- [ ] Tamil, Sinhala and English evaluation passes agreed thresholds.
- [ ] Tenant isolation and negative security tests pass for the integrated engine.
- [ ] Credits, provider costs and refunds reconciled.
- [ ] Authenticated desktop/mobile end-to-end tests pass.
- [ ] Production observability, operational readiness and rollback verified.

## Sequential engineering checklist
Current position: [G0 manual backup operator checkpoint](G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md). Owner archive and isolated logical restore verified by supplied terminal evidence; scoped lead/review local rehearsal PASS. Fresh separate-passphrase backup, separate copy, negative auth/device gates and scoped maintenance approval remain open. Prior [G0 recovery rehearsal and backup gate](G0_06_RECOVERY_REHEARSAL_AND_BACKUP_GATE_20261122.md). PR #150 merged, 5/5 candidate workflows passed; exact recovery/reapply and retention passed on disposable data. Supabase Free plan: verified manual backup required before live release; remaining G0 acceptance not complete.
### G0 — Foundation
- [ ] G0-01 Reverify main SHA, live deployment/alias, CI, migration history, enabled flags/rollout, inventory route/DB/RPC/ownership.
- [ ] G0-02 Trace consent-aware growth events/leads and actual source-of-truth contracts; label legacy evidence, privacy and retention.
- [ ] G0-03 Map auth, role, RLS/grants/triggers, tenancy, entitlements; owner A/B/anon/expired-Pro and spoofing negative tests.
- [ ] G0-04 Audit wallet/billing source, payment verification, credits settlement/refund; blocked/capped provider state, QA exceptions.
- [ ] G0-05 Verify P2-37 remaining marketing blockers and real E2E test plan; no global switch.
- [ ] G0-06 UI component/design inventory and accessible responsive baseline; staged development/rollback plan.
- [ ] G0-07 Review evidence/blockers and approve G1 data contract.
### G1 — Business Knowledge
- [ ] G1-01 Map verified existing data, field visibility, owner and provenance; decide reusable/missing resources.
- [ ] G1-02 Design typed context and freshness/version/missing-data contract; propose minimal migration if needed.
- [ ] G1-03 Implement server-scoped read/context resolver and tests, integrate Poster/Caption without changing billing/output.
- [ ] G1-04 Validate isolation, unverified/stale fields, multilingual input and injection resistance; accept context.
### G2 — GrowthScore
- [ ] G2-01 Define observed-data score components, version, missingness, coverage and initial weights for review.
- [ ] G2-02 Implement deterministic scoring + evidence and tests; no paid-plan bias.
- [ ] G2-03 Implement prioritized action/reason codes and lifecycle; measured evidence, no fabricated outcomes.
- [ ] G2-04 Validate and accept score/readiness/empty UX.
### G3 — Command Center
- [ ] G3-01 Task flows, reference review, design tokens and wireframe; preserve wallet and existing routes.
- [ ] G3-02 Implement real owner metrics, score, prioritized tasks, business/date selectors, action links.
- [ ] G3-03 All loading/empty/error/disabled states, keyboard/mobile/language/contrast checks.
- [ ] G3-04 Exact build/visual/authenticated acceptance; no fake Copilot or demo data.
### G4 — Copilot
- [ ] G4-01 Define tool registry, typed proposals, read/write scopes, retention, approval and cost limits.
- [ ] G4-02 Implement grounded multilingual read-only assistant with evidence and abstention; voice review.
- [ ] G4-03 Add approved internal actions, idempotent execution, cancel, audit/receipt, permission enforcement.
- [ ] G4-04 Evaluate TA/SI/EN and adversarial inputs, safe budgeted provider acceptance.
### G5 — LeadIQ & Reputation
- [ ] G5-01 Extend existing leads and follow-ups with rules and evidence; validate attribution.
- [ ] G5-02 Existing review moderation/replies and score consistency, sentiment/complaint triage, draft replies.
- [ ] G5-03 Owner A/B, concurrency, escalation, outcome and existing CRM regression acceptance.
### G6 — Automation
- [ ] G6-01 Queue/scheduler option review, event/action contract and state machine, safe migrations.
- [ ] G6-02 Durable worker, lease, idempotency, bounded retries/dead letters, visibility and kill switch.
- [ ] G6-03 Internal triggers/reminders/drafts only; policy and approval checks at enqueue and execution.
- [ ] G6-04 Crash/replay/parallel jobs/expiry/revocation/budget tests; verify background execution.
### G7 — Marketing integration
- [ ] G7-01 Close P2-37 real authorized Poster/Caption/Planner acceptance, quota/asset integrity and language QA.
- [ ] G7-02 Brand context and exact campaign revision lifecycle; Planner/Calendar queue integration.
- [ ] G7-03 One official provider at a time: scopes, OAuth, KMS, refresh/revoke, signed webhook, consent/receipts.
- [ ] G7-04 Authorized cost-bounded publishing E2E, reconciliation, controlled per-app rollout decision.
### G8 — SEO and Market Intelligence
- [ ] G8-01 Evidence-based profile/website audits; verified ownership and SSRF-resistant requests.
- [ ] G8-02 Official authorized search performance connector and meaningful opportunities.
- [ ] G8-03 Aggregate regional/seasonal signals, minimum evidence threshold and privacy checks.
### G9 — Learning & final acceptance
- [ ] G9-01 Algorithm registry and representative evaluation datasets; explicit baselines, metrics, latency/cost targets.
- [ ] G9-02 Validate multilingual rules and recommendations; controlled experiments only with sufficient data.
- [ ] G9-03 Full integrated security/reliability/provider/cost/device regression and operational readiness.
- [ ] G9-04 Owner sign-off, exact commit/deployment/rollback and all ten master gates verified.

## Current checkpoint log
| Date | Evidence | Status | Next |
|---|---|---|---|
| 2026-11-22 | V1 Library PDF + newer Marketing handoff + GitHub route inventory + production read-only aggregate/rollout evidence; application SHA 299a3a3f00124a9a8b395a1bc19f95030c39e2fc READY, prior P2-37 142 tests pass | Planning approved; preliminary G0 evidence; no gate accepted | G0-01: reverify and build source-of-truth matrix |

| 2026-11-22 | [G0-01 evidence audit](G0_01_FOUNDATION_EVIDENCE_AUDIT_20261122.md) at de3e65eda2d38f195bacabed4e67eee86a8ebcbc; production ready, CI 2 failures, migration ID drift, live RLS/grants and event/lead provenance inventory, review-cache mismatch; no runtime changes | G0-01 in progress / blocked, all boxes unchecked | G0-01 CI remediation review and migration reconciliation |

| 2026-11-22 | [G0 continuation](G0_02_FOUNDATION_REMEDIATION_CHECKPOINT_20261122.md); PR #145 merged 8a41b542d02cb92ec3f0c14912259270162954b4, four workflows pass, 34/47 live SQL content matched, flags/lead RPC/retention and Neon staging evidence, UI reference pinned | G0-B01 test fix merged, G0 remains open, no gate accepted | Remaining G0-01 reconciliation then G0-02/03/04 etc. |

| 2026-11-22 | [G0 data integrity](G0_03_DATA_INTEGRITY_AND_MIGRATION_CHECKPOINT_20261122.md); PR #146 merged 51b93d24dfd65cf1cff0ca143f4dc21e5f730e71, 5/5 workflows pass, lead replay and concurrent review cache tests pass, 47-history manifest, wallet/job snapshot reconciled | Staged SQL not applied; no accepted gate | Reviewed release migration, remaining verification |

| 2026-11-22 | [Bun and wallet checkpoint](G0_04_BUN_PERFORMANCE_AND_WALLET_CHECKPOINT_20261122.md); PR #147/#148 both merged, 5/5 candidate workflows each, Bun build/runtime smoke and wallet boundary tests passed | Development tooling live in repo, existing runtime unchanged; SQL staged only; no accepted gate | Reviewed scoped DB release and remaining G0 acceptance |

| 2026-11-22 | [Guarded release checkpoint](G0_05_GUARDED_DATABASE_RELEASE_CHECKPOINT_20261122.md); PR #149 e4ca3c84ac7c36b966270915ceeaefc39d604dc3, 7/7 candidate workflows pass, 3/3 exact SQL domain jobs pass, G1 source map | API code merged; release package staged, live DB unchanged; no gate accepted | Scoped release approval, backup/staging, actual acceptance then G1 |

| 2026-11-22 | [Recovery rehearsal](G0_06_RECOVERY_REHEARSAL_AND_BACKUP_GATE_20261122.md); PR #150 f76b961d96d7c42e3e284eea859c7b043d68513e, 5/5 workflows, 3/3 recovery/guarded reapply and retention; Free plan, no verified backup | No live changes; no gate accepted | Verified manual backup and scoped release, remaining G0 checks |

| 2026-11-23 | PR #151 merged a7a210f9a70bc893a68f9ea682e0ecc569f6ccd5; 4/4 candidate CI, exact production READY; fresh RLS/RPC and review/wallet aggregate checks | Backup tooling merged, live archive/restore pending; no gate accepted | Owner evidence, scoped migrations and remaining G0 acceptance |

### Update protocol
Add dated checkpoint per work package: exact parent/commit/branch/PR, file paths, schema and migration status, CI commands and counts, app/provider flags, Vercel URL/id/state, owner A/B and device results, costs/approval, blockers and next earliest unchecked item. A checked box requires evidence scoped to that actual acceptance condition. If a regression invalidates a gate, reopen it with reason. No secret values, customer data, invented test outcomes or premature global release. Preserve old checkpoints.

Owner requirement: After each development/production milestone, persist and return a copyable next-chat prompt referencing exact evidence and next earliest unchecked task. Never imply all gates complete without acceptance.
