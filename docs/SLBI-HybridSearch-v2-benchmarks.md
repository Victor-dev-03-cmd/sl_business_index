# SLBI HybridSearch v2.0.0 — Release & benchmark record

## Decision — November 11, 2026
- Target: improve Tamil/Sinhala/English discovery quality with **candidate-stage BM25 + GeoRank + RRF**.
- Deliberate non-goal: **no embedding model or vector similarity is deployed**. A model-backed semantic search requires tested multilingual embeddings and indexed vectors. pgvector is available in Supabase but not yet installed/configured; no undocumented model credentials or fabricated embeddings are used.
- Elasticsearch server and ParadeDB are **not** provisioned. PostgreSQL FTS/pg_trgm/PostGIS RPC v2 remains the secured candidate retriever.

## Pipeline
1. Homepage and Nearby use shared SmartSearch v1 category/place intent. Curated Sinhala/Tamil product names are normalized only when explicitly mapped. Selected location and adaptive radius remain unchanged.
2. Supabase RPC v2 supplies up to 250 approved business candidates within a selected radius using PostGIS, lexical matching, and structured category hints, respecting existing RLS.
3. BM25 formula with k1=1.2 / b=.75 scores **candidate documents** for the canonical query; business name tokens are tripled, category tokens doubled, description once for disclosed field weights. This is BM25 over a candidate shortlist and is **not** a PostgreSQL BM25 index or global corpus ranking.
4. GeoRank v1.1 independently ranks candidates for relevance, proximity and quality.
5. Reciprocal Rank Fusion (RRF k=60) combines BM25 and GeoRank scores. For product-specific queries verified description/name matching outranks category-only suggestions. Category-related listings still display "service unconfirmed" in UI.
6. Geo-only browsing or candidate batches without distinct lexical matches use the original GeoRank order. No added database round trips, external API calls, or new UI jank.

## Benchmark and quality gate
- \`tests/hybridSearch.test.mjs\` verifies BM25 formula behavior, Unicode tokenization, fusion, exact service safeguards, deterministic results and non-mutation.
- \`tests/hybridBenchmark.mjs\` evaluates 168 synthetic English/Tamil/Sinhala search cases across 7 categories and three location wordings. Measures macro nDCG@3, Precision@3, Top-1 accuracy, local p95 ranking time, compared with production GeoRank baseline.
- These are **synthetic category-level tests**, not real-user evidence. A future independent set of 100–200 manually judged live queries should include misspellings, no-hit scenarios and genuine per-business relevance before introducing semantic embeddings.
- Release only when ranking non-regression gates, TypeScript, Next.js build, route smoke and Billing/SQL CI pass; Vercel Preview READY.

## Operational constraints
- Approved listings as of evaluation: 22; zero listings currently have a positive customer rating. Avoid learned ranker deployment or simulated customer signals.
- No user query/GPS history stored by this module. Existing in-memory aggregate latency diagnostics remain.
- No changes to business data, auth, vendor, billing, or subscription pricing.
- New ranker is pure TypeScript and can be rolled back to GeoRank by replacing one conditional call; SQL migration not required.
- Nearby Studio/Classic map visual refresh from PR #23 is included in the same release branch, preserving original Leaflet behaviors and other routes.

## Following evidence
1. Collect privacy-safe search-quality samples / human relevance judgments and measure nDCG@10, P@10, zero-result rate and p95 SQL latency.
2. Evaluate a verified Sinhala/Tamil multilingual embedding model in an isolated offline study, using real embeddings on both indexed businesses and query text. Model/embedding dimension and governance must match.
3. Only if that benchmark is better, enable pgvector + semantic candidate retrieval and RRF lexical/semantic fusion. BM25 server-side indexing and H3 can be reconsidered when corpus and traffic justify operational cost.

## Rollback
- Revert the frontend hybrid ranker to the existing \`sortGeoRank\` call, or redeploy the previous healthy production SHA.
- No new stored records or destructive migrations to roll back.
