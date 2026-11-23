# G0-14 — Verified public SECURITY DEFINER bodies & semantic catalog lineage
2026-11-23 Asia/Colombo | Repo baseline: `9fc677da75d99ab402f9790cdd975eae1c679ffc`. **Evidence-only, production SELECT-only. G0-01 and G0-03 OPEN.**

## Directly read live SQL function definitions
| Routine | Actual authorization/data behavior | Decision |
|---|---|---|
| `public.get_nearby_businesses(float8,float8,text,float8,text)` | Anonymous EXECUTE; SECURITY DEFINER; no pinned `search_path`. Returns selected fields from `public.businesses` with explicit `status='approved'`, joins `public.profiles` for `verification_status`, PostGIS radius and search/category filter. Calls PostGIS and trigram functions unqualified. | Intended anonymous search path, **REVIEW_REQUIRED**: pin qualified references safely in disposable integration and validate high/negative radius, information exposure, input and performance limits. Never blanket revoke Nearby. |
| `public.get_global_search_suggestions(text,int)` | Anonymous EXECUTE; definer; unpinned path; filters approved businesses, uses trigram/LIKE, returns location fields; LIMIT uses caller-supplied integer. | **REVIEW_REQUIRED**: bound requested limit and text sizes, validate read exposure and safe pinned `search_path` on isolated test database before production approval. |
| `public.increment_business_views(uuid)` | Anonymous EXECUTE; definer; unpinned path; increments `public.businesses.views` for **any matching business id**, without checking status, request identity, throttling, replay or caller authorization inside SQL body. | **HIGH-PRIORITY INTEGRITY/ABUSE REVIEW**, not proof of exploitation. Audit request-path edge throttling, consider server-verified/idempotent design; don't disable working views or patch production without release/rollback approval. |

The current source text was read, not inferred from routine names. Unqualified `st_distance`, `similarity`, operators and other references need explicit regression evaluation when pinning path; setting `search_path=''` blindly could break these public endpoints. No anonymous invocation against production, no user record changes.

## Correcting earlier G0-13 object naming
A prior guessed schema `slbi_growth_internal` for semantic research produced false absences. Actual live objects:
- `slbi_search_internal.business_embeddings`: RLS enabled; `embedding` vector, `embedding_dimensions` integer, `search_embedding_supported_dimensions` check constraint exists; current constraint MD5 `44675b30a3b735feaadf111bde1a9648`.
- `slbi_search_lab.business_embeddings`: RLS enabled; vector field and `slbi_embedding_dimensions` constraint MD5 `79308578d0f53aaf9113eddefce03a7c`.
- `slbi_search_lab.relevance_judgments`, `public.search_evaluation_cases` and `public.search_relevance_reviews` all exist with RLS on. Evaluation cases include `validation_status`, `validated_by` and `validated_at` columns.
- `public.vendor_notification_preferences` RLS enabled, owner SELECT/INSERT/UPDATE policies each use auth.uid-based `user_id` checks.
- `verification-docs` bucket is **private**, max size **10,485,760 bytes**; current vendor upload policy requires path segments user UUID / owned business ID / filename and rejects a fourth segment. RLS/policy definitions alone are not end-to-end tests.

These observations **narrow** evidence for earlier historical records `semantic_v3_research_foundation`, `semantic_v3_native_review`, `semantic_v3_multimodel_dimensions`, `vendor_notification_preferences_owner_scoped_v1` and `private_verification_documents_owner_path_v1` / `fix_verification_upload_business_owner_path_v2`; **do not** reclassify any to exact SQL-content-match or full effective-object parity. Full constraints, grants, revised definitions and initial baseline provenance still need review.

## Machine-replayable safe audit
[SELECT-only SQL snapshot](g0/exit/G0_14_PUBLIC_RPC_AND_SEMANTIC_CATALOG_READ_ONLY.sql) returns names, metadata, hashes and column lists only. No schema/data mutations, no raw private/customer records. Run only under read-only authorization and preserve source snapshot times; results are point-in-time.

## Gate truth and next steps
- G0-01: 47 live records (34 exact SQL matches, 13 historical catalog evidence), 88 unmatched repository SQL files; **OPEN**. A historical file is never an automatic pending migration.
- G0-03: 3 anon-executable definer endpoints require safe regression/throttle/path review. Real A/B/admin and malformed input negatives not run.
- G0-02 consent/lead retention, G0-04 wallet refund financial policy, G0-05 marketing providers, G0-06 physical-device acceptance, G0-07 G1 contract/owner approval remain OPEN. Two review cache mismatches unresolved; desktop browser GPS known issue (phone reportedly works).
- Separate fresh independent-passphrase GPG backup, isolated restore and verified external physical copy remain owner-side evidence requirements. **No production DDL/DML, migration replay, paid service/preview or G1 integration performed.** Foundation 0/7; whole GrowthOS 0/10.

## Next-chat prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil. Main GitHub repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_14_PUBLIC_RPC_SEMANTIC_CATALOG_20261123.md, docs/growth/G0_13_LIVE_CATALOG_RISK_TRIAGE_20261123.md, docs/growth/g0/MIGRATION_PROVENANCE_20261122.json, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json and docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md. Verify latest PR exact CI before merge. G0-14 live read-only SQL body review: 3 anon-callable SECURITY DEFINER routines have unpinned search_path; two are approved-business search APIs; increment_business_views(uuid) can increment arbitrary business views without in-function auth/status/rate limit (do not infer abuse). Actual Semantic V3 tables in slbi_search_internal / slbi_search_lab, evaluation in public, vector constraints and RLS verified; private verification bucket and owner preferences verified. This narrows historical evidence, does not prove exact migration equivalence. G0 0/7, master 0/10, G1 blocked; 88 repo SQL and 13 historical cases unresolved. Prior 2 cache mismatches and desktop GPS issue unresolved. Next implement disposable negative/function regressions and complete migration provenance; no production writes, paid branches, migrations or provider calls. Fresh GPG backup/isolate restore/external copy and independent Lead/Review/wallet approval remain pending. Update GitHub handoff/checklist and next prompt after milestone.
```
