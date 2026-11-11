# SLBI SemanticSearch v3 — Research and production gate

## Verified current state
- Supabase pgvector extension 0.8.0 is enabled in the extensions schema.
- There are 22 approved businesses. Their categories provide only preliminary relevance labels, not individual verified services.
- Migration 20261111073419_slbi_semantic_v3_private_research_lab was successfully applied. The slbi_search_lab schema is private, RLS is enabled, and both its vectors and human judgments are empty.
- Existing earlier SemanticSearch-related migrations also appear in migration history. Inspect these before expanding further.

## Implemented research
- Stratified 240-query dataset from approved aliases: 48 each English, Tamil, Sinhala, Thanglish and Singlish. Relevant IDs are weak category-proxy labels ONLY, not human-validated business-level judgments.
- Offline model evaluator scripts/benchmark-semantic-v3.py uses real SentenceTransformer embeddings (default intfloat/multilingual-e5-small) and E5 prefixes, if dependencies and model downloads are available. It reports dimensions, per-language nDCG@10, P@10, average inference time. **It has not been run in this session**: no model weights/download access or relevant installed packages.
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
