# 2026-11-14 — Pending branch / PR audit and release disposition

**Repository:** `Victor-dev-03-cmd/sl_business_index`.
**Evidence:** GitHub open PR list and 67+ branch listing (2026-11-14), exact `compare main...branch` on the five open draft PR heads plus recent completed P1/P2 and vendor-map branches, exact SHA Vercel and GitHub Actions. This is a *triage*, not permission to merge old drafts automatically. Squash-merged branches often appear "diverged" (ahead/behind) even when their contents have been integrated.

## Open drafts — none automatically production-approved

| PR | Source branch | Comparison to main at audit | Decision |
|---|---|---|---|
| [#34](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/34) | `feature/growth-security-rehearsal-20261111` | 2 ahead / 183 behind, only CI and test SQL | Keep research/staging draft; no automatic merge |
| [#30](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/30) | `feature/secure-growth-and-vendor-studios-20261111` | 19 ahead / 184 behind, old vendor Marketing, QR, settings and security SQL | Stale overlapping UX, manual diff and security re-review required; do not regress current Studio |
| [#27](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/27) | `feat/semanticsearch-v3-research-evaluation-20261111` | 2 ahead / 187 behind; research models/admin + migrations | Discovery is frozen; research draft not a production release |
| [#9](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/9) | `feature/hybrid-postgresql-billing-foundation` | 26 ahead / 205 behind; based on old security branch, includes auth/billing | Historic billing draft; requires independent finance gate, no blind merge |
| [#7](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/7) | `security/supabase-auth-protected-routes` | 21 ahead / 205 behind; old auth and billing | Historic protected-route draft; unsafe to cherry-pick without current regression audit |

**Other historical branches:** `phase2/marketing-engine-foundation-p2-01-20261113` source merged through PR #68; `feature/marketing-studio-app-hub-20261114` through PR #69; `feature/p2-07-google-connect-skeleton-performance-20261114` through PR #70; `feature/p2-07-credential-purge-disconnect-20261114` through PR #71. Their branches may still exist after squash merging; do not merge again. `release/p1-vendor-integration-20261113` is 0 ahead / 12 behind; `maintenance/stable-packages-20261113` is 0 ahead / 108 behind. On `fix/vendor-map-gps-area-fallback-20261113`, the main and branch `lib/businessPinFallback.ts` blob SHA match: no repeat merge of that source required. `feature/p1-vendor-workflows-20261113` is 3 ahead/112 behind, old overlapping edit code. Older design/fix branches remain branch-history snapshots requiring per-change content comparison before any new PR.

## Current safe production milestone

- [PR #71](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/71) **MERGED** `cb26f6a0a28dff885f843d922e1097065fa7644c`, source `d7f199ae7ba721fb76d3936a58663126fe4fe044`: all **6/6 feature-source GitHub workflow families PASSED** including independent billing, P1 review security, P1 integration, P2 Postgres OAuth tenant/credential purge, Next.js optimized production build. Exact-SHA Preview `dpl_Ag1SCt8VG1BzqzjQZEbN8sVjUmif` READY; Vercel merge-source Production `dpl_GgaedofWMCk6YQbPUh7XqxXdSNiA` READY, alias `www.slbusinessindex.com` verified. The extra documentation-only follow-up commit will require its own CI/deploy verification.
- SQL `docs/growth/p2/P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY.sql` is **STAGING/DISPOSABLE ONLY** and was NOT run against live Supabase. Current live OAuth intents/connections/secret tables ABSENT; verified Pro entitlements ZERO.
- API disconnect explicitly deletes SLBI encrypted token ciphertext and invalidates pending unclaimed state only when a verified owner can access a properly configured Preview. **Remote Google OAuth grant is NOT revoked.** Do not describe full Google lifecycle as complete.
- Live `marketing_campaigns` retains `"Vendors manage own campaigns" FOR ALL TO public` with owner check only, which permits owner-forged `posted` status. Staging P2-05 migration restricts it but has NOT been applied live. This is a pending security review/release gate before trusted publication claims.

## Mandatory release method for every future change

1. Start a fresh branch from most recent `main` (unless small docs-only follow-up is independently reviewed).
2. Distinguish research, staging-only SQL, preview-disabled functionality and actual live functionality.
3. Run Node, TypeScript, Next optimized build, owner/tenant/RLS/billing/security jobs; do not release a failing SHA.
4. Inspect exact source-SHA GitHub Actions and Preview READY; then squash merge reviewed PR with expected HEAD lease.
5. Verify latest **merge SHA** GitHub CI, Vercel Production READY and exact `www.slbusinessindex.com` alias (no assumption about bare/root domain).
6. Append accurate outcome in master implementation handoff and P2 live ledger with explicit live/staging/provider states. If docs-only main commit is created, verify its own production deployment.
7. Require separate scoped approval/rollback for production schema migrations, provider scopes, real customer sends, spending and secret/managed KMS changes. No all-branch blind merge.

## 2026-11-14 — Follow-up branch audit at PR #72

- PR #72 new OAuth claimed-callback-vs-disconnect safeguard **squash merged** to main `4b9cf4d06d275367200c9108848563a96800ad2a` after 6/6 source-SHA CI and exact-SHA Preview READY; Production `dpl_41aYCX8pqaeifiwsE8ZgnVht6Sgr` READY alias `www.slbusinessindex.com`.
- Still open: draft #34 (two old CI/SQL test commits), #30 (old overlapping Marketing/QR/settings), #27 (Discovery research), #9/#7 (old auth/billing). No change in disposition: **do not blindly merge old experimental or conflicting branches**. Their high ahead/behind counts include historical changes already superseded or implemented; prepare new targeted PRs from main for valid additions.
- OAuth staged SQL `P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql` closes credential resurrection after already-claimed state; not live migration. Remaining work: isolated schema release and rollback, verified Pro, managed KMS, provider-side revoke and refresh, real OAuth/browser consent. Live campaign-status spoofing policy still pending review.
