# G0-15 — Disposable anonymous public RPC negative tests and view integrity evidence
Date: 2026-11-23 Asia/Colombo | baseline main `7cbed75dcf5cdc972ba89fed32968176ff2c01f3`.

**Status: candidate test implementation; G0-01/G0-03 OPEN; foundation 0/7 and master release 0/10.**

## Scope and execution boundary
- Added [isolated PostgreSQL regression](../../tests/g0/public_rpc_negative.sql) and a new `public_rpc` matrix domain in [G0 Foundation CI](../../.github/workflows/g0-foundation-integrity.yml). Existing lead/review/billing jobs are preserved; no new paid runner/branch/provider or production database writes.
- The fixture reconstructs the **production-observed function bodies** for `get_global_search_suggestions(text,integer)` and `increment_business_views(uuid)` on synthetic rows in a disposable PostgreSQL 17 CI service. It does **not** execute the production database functions, import customer data, or recreate full Supabase Auth/PostgREST or PostGIS Nearby. Source-body behavior can drift; rerun [read-only catalog evidence](g0/exit/G0_14_PUBLIC_RPC_AND_SEMANTIC_CATALOG_READ_ONLY.sql) to detect changes.
- Reproduces minimal PostgreSQL roles `anon` and `authenticated` and RLS permitting approved-business reads; grants no direct UPDATE on `businesses`. These are role-fixture checks, **not actual Supabase JWT or owner A/B signed-in E2E**.

## Exact assertions
1. Anonymous `get_global_search_suggestions('jaffna',50)` returns exactly 12 **approved** fixture listings and never the 13th **pending** listing, despite SECURITY DEFINER bypass of table RLS.
2. The caller-provided suggestion limit of `1` returns one row, whereas caller limit `50` returns all 12; the live observed body has **no independently enforced maximum**. There is no claim that this is exploited or sufficient to prove DoS.
3. Both role fixtures lack direct UPDATE privilege. The exact observed `increment_business_views(uuid)` SECURITY DEFINER body nevertheless accepts an anonymous call and increments a **pending business owned by another fixture tenant** twice. **This deliberately expected result is a *known-risk reproducer*, not a security success.**
4. Authenticated fixture can read suggestions with limit 2; no privilege escalation conclusion from a fixture.

## Security interpretation
- This reproducer confirms that PostgreSQL object ACL/RLS on `businesses` alone cannot protect a privileged mutating RPC when its function body skips authorization and approval checks. Production DB code review in G0-14 separately observed identical behavioral structure. **No real-world attacker activity established.**
- Do not simply revoke `increment_business_views` EXECUTE or alter Search/Nearby without mapping the currently deployed view counter caller(s), feature compatibility, abuse throttle, and expected anonymous discovery semantics.
- Proposed safe engineering path: trace actual UI/API event ingress and credits/read contracts, document server-side provenance and rate budget; prototype a guarded/idempotent invocation with deterministic duplicate/other-tenant/pending/anonymous tests on **disposable Postgres**, including rollback. Any production change needs *separate exact SQL, owner release approval and backup*.
- Search/Nearby public functions use unpinned `search_path`; a later isolated pinned-path test must include PostGIS, pg_trgm and their operator/function namespace qualifications. Current test intentionally does not certify Nearby.

## Migration provenance/other G0 blockers
The 47 live / 34 exact / 13 catalog-evidence and 115 repo / 27 content match / 88 unmatched counts **do not change**. Current source-body fixture and test are not evidence that any historical SQL file ran. No migrations replayed; no history rows edited.
Two approved-review caches still mismatched. Lead/Review production migration and wallet refund/settlement policy are separate approval decisions. Fresh independent-password GPG archive, isolated restore from that archive and verified external physical-drive copy still needed. Owner-reported mobile GPS works and desktop browser GPS remains unreliable; actual D01–D10 physical and signed-in QA pending. Do not infer foundation or G1 acceptance from green CI.

## Acceptance and evidence to capture
1. PR final head, 4-domain G0 CI (lead/review/billing/public_rpc), backup-copy contract, plus Next.js/P1/Billing workflows. Document actual counts and failure details; never assert PASS until observed.
2. Independently inspect `public_rpc` job logs confirming expected baseline output, not just aggregate success.
3. If checks green, merge docs/test/workflow through standard PR; no production migration.
4. Next G0-15b: code-path trace actual `increment_business_views` invoker and client protection; then implement disposable-only hardening candidates and a safe migration review package. Continue remaining provenance and consent evidence without premature G0 gate signoff.

## Next-chat prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil. Repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_15_PUBLIC_RPC_NEGATIVE_TESTS_20261123.md, docs/growth/G0_14_PUBLIC_RPC_SEMANTIC_CATALOG_20261123.md, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json and Growth Engine checklist. G0-15 adds isolated Postgres17 synthetic anon/auth role checks in tests/g0/public_rpc_negative.sql and public_rpc CI matrix, reproducing approved-only suggestions, caller-supplied high limit and anonymous SECURITY DEFINER increment of pending other-tenant business views without direct table UPDATE. PASS of this known-risk test is NOT security acceptance; no live RPC invocation or customer-data write. Verify exact latest PR CI and merge only green. Next trace actual UI/server view-counter caller, approve a safe guarded/idempotent design in disposable database including negative tests; preserve Nearby/Search. 47 live migration records (34 exact,13 historical), 88 repo SQL remain unresolved. G0 foundation 0/7, master GrowthOS 0/10; 2 review-cache mismatches, desktop browser GPS, fresh independently encrypted GPG backup/isolated restore/verified physical-drive copy, consent/marketing/wallet/device/owner approval gates remain OPEN. No production SQL, paid resource, provider call or G1 engineering without separate approval. Update handoff/checklist and next-chat prompt after milestone.
```
