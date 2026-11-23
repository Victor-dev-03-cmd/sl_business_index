# G0-08 — release safety and separate encrypted backup copy (2026-11-23)
Status: **candidate testing / production migration BLOCKED**. No new paid Supabase branches, no production SQL writes, no additional provider costs, no Vercel Preview intentionally triggered.

## Prior verified evidence
PR #152 merged `00b223f77ab9ff56d460ef958b71f40cac65927c` after six PR checks PASS including real ephemeral Auth JWT, P1 owner A/B/admin, service-only Lead replay, legacy anonymous mobile compatibility, Review score anti-spoof and admin moderation. This was disposable GitHub Docker, not actual customer browser/device acceptance.
Owner's archived encrypted production dump was checksum-verified and restored into a network-isolated temporary local Supabase PG17.6 instance; data contract snapshot 24 businesses (23 approved), 3 reviews, 15 leads, 47 migration records, 1 wallet, 0 wallet drift, 2 review-cache mismatches, four protected RPC hashes unchanged. Forward → exact recovery → guarded reapply and rollback PASS. PC shutdown caused RAM/tmpfs restored database loss; original ciphertext archive persisted on owner disk.

## Implemented in PR candidate
- `scripts/g0/verify-independent-backup-copy.sh`: never decrypts or reads plaintext. `--copy SOURCE MOUNT_ROOT` requires owner terminal, mounted distinct filesystem, distinguishable physical parent drive, private owner-only folder, source evidence matching SHA-256 and size, verifies ciphertext on destination, fails closed on unsafe/symlinked paths and refuses overwrite. `--verify SOURCE COPY_DIR` verifies source and copy hashes/evidence/permissions but intentionally **does not claim** physically independent storage. No credentials, GPG password or data in CI.
- `tests/g0/backup-copy.test.mjs`: synthetic fixture and negative cases (corruption, evidence mismatch, unsafe permissions, symlink, unmounted target). Test data is not a real archive or customer records; CI cannot prove a physical external-device copy.
- `.github/workflows/g0-foundation-integrity.yml`: separate Bun 1.3.11 backup-copy-contract job, triggered on script changes; existing lead, review, billing test jobs remain unchanged.
- `docs/growth/g0/release/PRE_RELEASE_READ_ONLY.sql`: frozen contract, SELECT-only six checks. No PII output. RPC hash/owner/search_path/grants; 14 RLS tables; existing 2 review-cache mismatches and absence of G0 cache triggers; wallet 0 drift/overcap; legacy anon lead insert grant/policy; 47 migration-history entries. Any BLOCKED requires review; even six PASS never authorizes migration.

## Live read-only execution
Supabase production project ref `oofxhragafekazwjikae`, 2026-11-23: six pre-release SQL checks returned PASS using actual RPC catalog signatures and frozen baseline. This is observation-only; no schema or data mutation.
Earlier incorrect guessed marketing refund RPC signatures would have caused a false negative, detected and corrected by inspecting live catalog: both marketing refund RPCs accept one uuid argument. Preflight now matches 4 actual name/hash/ACL definitions.

## Operator follow-up — not yet performed
1. Keep original encrypted source archive; do not delete it. **Do not reuse Ubuntu login/root password** for the new archive. At the next agreed release window run the existing `scripts/g0/manual-db-backup.sh` on owner trusted workstation with a new independent strong GPG passphrase and verify fresh archive via actual isolated restoration; retain GPG passphrase separately from computer password.
2. Connect owner-controlled encrypted external storage with a POSIX-permissions filesystem (e.g. ext4). From the repo updated main:
   ```bash
   bash scripts/g0/verify-independent-backup-copy.sh --copy "$HOME/slbi-private-backups/REPLACE_WITH_FRESH_ARCHIVE_DIRECTORY" "/path/to/externally-mounted-root"
   ```
   Must check actual physical drive and permissions. Confirm COPY interactively. Output `COPY_VERIFIED_SEPARATE_PHYSICAL_DRIVE` required. Never share archive or password or upload to cloud/repo/chat. `--verify` alone only verifies copy bytes.
3. Actual authenticated owner/vendor A/B, admin, mobile/desktop and Cloudflare Turnstile provider tests must be conducted without unapproved sends/spend; capture redacted PASS/FAIL only.
4. Immediately before scoped release rerun the preflight against production and compare hashes/counts, refresh live-shape and CI SHA; obtain **explicit** owner approval for exact Lead and Review migration bodies, maintenance window and rollback method. Wallet downgrade/refund policy separately approved. No blind migration history replay. Storage files, managed platform roles and Vault key recovery remain outside the logical dump's guaranteed scope.

## Gate status and safety
- Candidate operator code/CI readiness: pending PR CI and review.
- Owner real external separate verified copy: **NOT_DONE**.
- Owner fresh independent-passphrase backup: **NOT_DONE**.
- Real device/admin/Turnstile end-to-end acceptance: **NOT_DONE**.
- Live Lead/Review migrations: **NOT_APPLIED**. Wallet migration: **NOT_APPROVED**.
- Ten master acceptance gates: **0/10**. G1: **NOT_STARTED**.

## Next chat prompt
```text
Continue SLBusinessIndex GrowthOS V1, Tamil. Repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_08_RELEASE_SAFETY_AND_BACKUP_COPY_20261123.md, G0_07_MANUAL_BACKUP_OPERATOR_CHECKPOINT_20261122.md, and GROWTH_ENGINE_RELEASE_CHECKLIST.md. Last main f72df2d. PR #152 real Auth/PostgREST (Bun 1.3.11) merged 00b223f after 6/6 CI, live schema untouched. Owner produced encrypted GPG production backup SHA256 8b114ef50bac1d4d76dc0efb604a1e625eb93237150da9f27ab511d476553b99, restored offline and successfully rehearsed lead/review forward/recovery/reapply; PC shutdown invalidated temporary Docker PGDATA but encrypted source persists. New PR branch growth/g0-backup-copy-release-preflight-20261123 adds scripts/g0/verify-independent-backup-copy.sh (--copy external mounted separate physical drive; --verify bytes), synthetic Bun tests/CI and docs/growth/g0/release/PRE_RELEASE_READ_ONLY.sql. Direct production read-only check yielded 6/6 PASS: 4 RPC fingerprints/ACL, 14 RLS tables, frozen 47 history, 2 known review mismatches, 0 wallet drift, legacy anonymous lead grant/policy. Check this PR's exact CI and merge if all green; if failures fix on PR, never production DB. Next user workstation action: new manual encrypted backup with separate strong GPG passphrase, verify isolated recovery and second separately stored copy using helper; never request archive/password in chat. Owner authenticated device/admin QA and explicit scoped lead/review release window still required. No unapproved live DDL, wallet financial semantics separate, no G1 until G0 acceptance; all master release gates stay unchecked. Every milestone update handoffs and give copyable next-chat prompt.
```
