# SLBI SemanticSearch v3 — Research and production gate

## Verified current state
- Supabase pgvector extension 0.8.0 is enabled in the extensions schema.
- There are 22 approved businesses. Their categories provide only preliminary relevance labels, not individual verified services.
- Migration 20261111073419_slbi_semantic_v3_private_research_lab was successfully applied. The slbi_search_lab schema is private, RLS is enabled, and both its vectors and human judgments are empty.
- Existing earlier SemanticSearch-related migrations also appear in migration history. Inspect these before expanding further.

## Implemented research
- Stratified 240-query dataset from approved aliases: 48 each English, Tamil, Sinhala, Thanglish and Singlish. Relevant IDs are weak category-proxy labels ONLY, not human-validated business-level judgments.
- Offline model evaluator scripts/benchmark-semantic-v3.py uses real SentenceTransformer embeddings (default intfloat/multilingual-e5-small) and E5 prefixes, if dependencies and model downloads are available. It reports dimensions, per-language nDCG@10, P@10, average inference time. **It was executed** in GitHub Actions with pinned model revision 614241f622f53c4eeff9890bdc4f31cfecc418b3; see measured results below. These are proxy-label results, not human evaluation.
- Pure, versioned semantic rank fusion in lib/discovery/semanticSearchV3.ts, with closed feature flag and strict model/version/coverage/relevance/latency gates.
- Automated research tests and private, approved-business-only vector tables and RPC. No vectors have been fabricated, and no anonymous vector API has been added.

## What must happen before production semantic activation
1. Choose and pin an embedding model demonstrably suitable for native Tamil AND Sinhala. Supabase's built-in gte-small is documented, but its quality for these languages is unverified here.
2. Generate genuine embeddings for both approved business descriptions and user search queries with the EXACT SAME model revision; index at least 95% of approved listings, and keep vectors updated on listing changes.
3. Independently native-speaker review at least 100 real query/business relevance judgments with negatives and dialect examples. The 240 category proxies do not count.
4. Demonstrate >=0.02 absolute nDCG@10 improvement over HybridSearch v2, query embedding p95 <=350ms and safety non-regression before enabling.
5. Implement secure server-side inference, timeouts, rate limits, pricing safeguards, staged canary, fallback to HybridSearch v2, and live browser QA.
6. Only then enable the semantic rollout flag, confirm Preview/CI, deploy production and retain rollback SHA.

## Honest state
SemanticSearch v3 research infrastructure is prepared but no working, validated multilingual embedding retrieval is deployed. Production remains the known-good HybridSearch v2 plus typo and phonetic corrections. This is intentional: no false relevance claims, no API cost surprise, no unverified ranking changes.

## Verified real-model experiments — 2026-11-11

GitHub Actions model run 42981367529 executed 240 queries and compared raw multilingual input to canonical intent normalized via the SLBI dictionary. Exact model: intfloat/multilingual-e5-small, revision 614241f622f53c4eeff9890bdc4f31cfecc418b3, 384-D.

| Language | Raw nDCG@10 | Canonical nDCG@10 |
|---|---:|---:|
| English | 0.6550 | 0.9799 |
| Tamil | 0.7647 | 1.0000 |
| Sinhala | 0.7272 | 0.9626 |
| Thanglish | 0.3775 | 0.9526 |
| Singlish | 0.3250 | 0.9806 |

**Critical limitations:** labels are *category proxy*, not independently graded user-business relevance; only 22 approved businesses; model inference timing is CPU batch benchmark, not live serverless p95; high scores do not prove service/product availability. A zero-result query still needs existing lexical fallback. The model alone performs poorly on romanized input; the dictionary canonical bridge is essential in this fixture.

GitHub Actions pinned-model export run 42981863789 created 22 actual 384-D normalized embedding vectors for approved business name+category snapshot, with content hashes and exact model revision. Artifact held for private-lab indexing experiments, **not** a production serving index. Full service descriptions, incremental indexing, human relevance judgments, a secure same-model query inference endpoint, rate limits, canary and p95 checks remain incomplete.

**Release policy:** no automatic semantic promotion. The production search continues to use approved SmartSearch + HybridSearch v2 until quality and operational checks pass.


## Production opt-in experiment: SemanticSearch v3 E5 Beta

Explicit owner request on 2026-11-11: make V3 available in production for direct observation, without replacing the safe default ranking.

- Entry point: `/nearby?v3=1&q=education`; use the "Semantic V3 Beta" ON/OFF toggle to compare. Other supported canonical intents: `clothing`, `food`, `repair`, `shopping`, `travel`.
- This is **not** general inference: the pinned multilingual E5 model generated both 22 business name/category vectors and six canonical query vectors in GitHub Actions. Compact 8-bit quantization reduces bandwidth and introduces minor numerical approximation.
- Query normalization uses reviewed SLBI dictionary; only exact canonicalized, known intents can use beta vectors. Arbitrary queries, stale listing snapshots, fewer than two candidates, or unknown IDs automatically return the untouched HybridSearch v2 baseline. No model runs or paid calls occur on visitors' devices.
- Re-ranking is strictly limited to already approved, geo-filtered SQL candidates. Exact service evidence takes priority over cosine ranking. All other sort modes continue unchanged.
- This opt-in beta **does not satisfy** the independent native-language quality gate. The 240 evaluation samples collapse to six distinct canonical intents, and labels are category proxies, not business-level human judgments. nDCG gains here must not be marketed as real-world accuracy.
- Default stays V2 until 100+ independently judged query/business examples, full description embedding refresh, arbitrary-query inference, latency, abuse/cost controls and non-regression are verified.
- One release only after GitHub CI, TypeScript, Next.js build and Vercel production checks pass; preserve the last known-good production SHA for rollback.

This is an experimental field trial, not a completed SemanticSearch v3 default release.


## Next planned release — V3 Beta permanently enabled (development only)

**Not yet merged or deployed.** The owner requested that Nearby search require no `v3=1` URL and no manual toggle. See draft PR and `docs/growth/GROWTH_INTELLIGENCE_V1_FOUNDATION.md`.

- In the pending Nearby implementation, E5 Beta is enabled automatically for `best-match` queries.
- The UI shows a non-interactive `Semantic V3 Beta · ON` label and discloses whether actual E5 re-ranking or a V2/GeoRank fallback is active.
- Exact supported model queries are still only the six pinned canonical intents. No arbitrary query embeddings or new service assertions are invented; eligible results are restricted to approved database candidates.
- Sorting by distance/rating/name, geo-only discovery and unsupported searches retain existing non-semantic rankings.
- The separate general SemanticSearch v3 activation contract and human-judgment gate remain disabled; only the bounded E5 beta is automatically attempted.
- **Deployment is deliberately withheld** until the linked Growth Intelligence & Lead Attribution implementation and all applicable integration/security checks are completed.

The previous section records the *currently deployed* opt-in beta, not the new unmerged default-on design.
