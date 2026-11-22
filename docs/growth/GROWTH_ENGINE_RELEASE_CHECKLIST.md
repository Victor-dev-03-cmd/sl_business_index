# Growth Engine V1 — living release checklist
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
Current position: [G0 Bun/wallet checkpoint](G0_04_BUN_PERFORMANCE_AND_WALLET_CHECKPOINT_20261122.md). Bun tooling merged and tested, wallet candidate merged and tested; review-only SQL not live. Finish reviewed migrations, actual integration and G0 acceptance; G1 not released.
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

### Update protocol
Add dated checkpoint per work package: exact parent/commit/branch/PR, file paths, schema and migration status, CI commands and counts, app/provider flags, Vercel URL/id/state, owner A/B and device results, costs/approval, blockers and next earliest unchecked item. A checked box requires evidence scoped to that actual acceptance condition. If a regression invalidates a gate, reopen it with reason. No secret values, customer data, invented test outcomes or premature global release. Preserve old checkpoints.

Owner requirement: After each development/production milestone, persist and return a copyable next-chat prompt referencing exact evidence and next earliest unchecked task. Never imply all gates complete without acceptance.
