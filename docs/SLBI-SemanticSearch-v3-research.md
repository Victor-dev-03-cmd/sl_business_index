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
