# SLBI SemanticSearch v3 — Research & Production Gate

**Status:** Evaluation + private vector foundation only; semantic retrieval OFF.
**Model candidate:** \`intfloat/multilingual-e5-small\` (384-dim, MIT). Its published language list and benchmark scores are *not* proof of Sri Lankan Tamil / Sinhala search relevance. The Supabase embedded \`gte-small\` model is English-oriented and not used as a multilingual production model.

## 1. Objective
Meaning-aware business discovery in English, Tamil, Sinhala, Thanglish and Singlish while preserving:
- Approved-business candidate visibility, PostGIS radius and explicit GPS consent.
- Exact business/service evidence (e.g. Car Wash != Mechanical Car Repair).
- Current SmartSearch / HybridSearch v2.0 default as rollback/fallback.
- No stored visitor query history or precise visitor location telemetry.

## 2. What is implemented in the research branch
- PostgreSQL vector extension \`extensions.vector\`, private schema \`slbi_search_internal\` with \`business_embeddings\` table. Vector rows keyed by \`business_id + model_id\`; no public grants; no approximate index at 22 approved listings.
- \`public.search_evaluation_cases\` seeded from 280 real **curated dictionary** phrases, covering five languages/literacies. These are **taxonomy intent labels**, marked \`awaiting_native_review\` — NOT human-judged real-user relevance.
- \`public.search_relevance_reviews\` for a native-speaking admin/CEO to grade a real public business on a query from 0 (irrelevant) through 3 (exact).
- \`/admin/search-intelligence\`: admin-only corpus, per-language review coverage and business relevance review workflow. Database RLS enforces access independently.
- \`semanticFusionV3.ts\`: model-ID checked, candidate-scoped, evidence-first RRF fusion; OFF by default. It cannot inject unapproved or off-radius businesses; no external inference call is made.
- \`scripts/benchmark_multilingual_embeddings.py\`: real offline multilingual E5 inference runner (requires a local model download, \`sentence-transformers\` and a human-reviewed dataset). It will not invent scores or mark the model release-ready from synthetic labels.

## 3. Research evaluation procedure
1. Have Tamil/Sinhala/English native speakers review the 280 query intents and disambiguate local spellings/places. Consider adding genuine new user phrases only with appropriate consent.
2. For >=100 separately reviewed queries, collect relevance grades for multiple approved businesses (including irrelevant competitors). Ensure language balance; current corpus is insufficient for every local dialect.
3. Run the existing production HybridSearch v2 ranking for each query with its intended town/radius, saving the candidate order as \`baseline_ids\` in a **private, admin-generated JSON export**.
4. Assemble the offline JSON fixture:
   \`\`\`json
   {
     "businesses": [{"id": "approved-public-uuid", "text": "Business Name. Category. Description."}],
     "queries": [
       {
         "query": "යාපනයේ කාර් රෙපෙයාර් කරන තැන්",
         "relevance": {"approved-public-uuid": 3},
         "baseline_ids": ["approved-public-uuid"]
       }
     ]
   }
   \`\`\`
5. Run \`python scripts/benchmark_multilingual_embeddings.py --dataset /private/data.json --report /private/e5-results.json\`. Only use the same model for queries and passages, normalize vectors, preserve the E5 \`query:\`/\`passage:\` prefixes. **Never commit review files containing user account IDs, GPS or private customer data.**
6. Compare per-language nDCG@10, Precision@10, Recall@10, no-result rate and p95 retrieval latency against real HybridSearch v2. Synthetic 168-query tests are a regression check, not a substitute.
7. Reject any model that reduces Tamil/Sinhala per-language relevance, confuses related category with exact service, or breaches the measured latency/cost limits. Observe errors and expose a kill switch.

## 4. Promotion requirements
Semantic v3 is deliberately **not promoted** until:
- At least 100 independently reviewed business relevance cases, balanced across Tamil/Sinhala/English; grades checked for disagreement.
- Same-model query and business embeddings populated and versioned for all eligible approved businesses, updated on edits/rejections.
- A secure query-embedding inference endpoint is implemented and load-tested; no API secret shipped to browsers.
- Hybrid lexical/vector retrieval has measured non-regression on **per-language** relevance and validated p95 latency and cost.
- Canary traffic and one-step rollback are ready.

## 5. Security
- Public users have no access to private vectors or evaluator tables.
- Admin evaluation tables are RLS-protected, with read/write scoped to admin/CEO and review author IDs.
- No direct production link from reviewed grades to live ranking: the evaluator cannot poison public search.
- A user query or precise current GPS is never stored in the vector foundation.
- Embedding text is derived only from approved, public business descriptions; never from private profile, billing, or authentication records.

## 6. Technical tradeoffs
Current Supabase built-in \`gte-small\` is English-oriented; it is **not** a reliable replacement for native-script Sinhala/Tamil embeddings without controlled validation. A multilingual model may run in a dedicated inference service or offline batch; do not embed a 400+ MB model into a latency-sensitive Next.js frontend. With only 22 approved listings, brute-force vector similarity is sufficient; HNSW and a paid Elasticsearch cluster are premature.
