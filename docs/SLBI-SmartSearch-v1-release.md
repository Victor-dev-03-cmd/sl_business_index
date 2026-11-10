# SLBI SmartSearch v1.0.0 — implementation record

Roadmap: **SLBI Growth & Security OS Master Roadmap v1.0, Section 3A**.
Owner: SLBI Discovery Engine. Rollout: code review → database additive RPC → Preview → production after verification.

## Search architecture
1. `resolveSmartSearch` interprets optional Sri Lankan town, named category and curated Tamil/Sinhala/English aliases. User text is normalized, not sent to an LLM.
2. PostgreSQL RPC `get_nearby_businesses_v2` combines PostGIS radius filtering, existing GIN FTS vectors and trigram fuzzy matching. It retrieves only approved listings and retains old RPC v1.
3. Result evidence: `exact_service` vs `category_related`. Related categories must **never** imply a store sells biryani, pizza, medical services, etc. without confirming listing text.
4. An initial town search (e.g., 3 km) progressively expands to 10, 20, 30 and 50 km only if there are no results. A search with no explicitly selected town/GPS can expand to the island as a last resort. Show the radius expansion visibly.
5. GeoRank v1.1 combines backend match evidence, relevance, proximity and profile quality. Freshness and availability contribute only when genuine data exists.

## Frontend compatibility
- Homepage and Nearby import the same `lib/discovery/smartSearch.ts` resolver. Category suggestion selection passes the exact `category` URL parameter.
- Search textbox has extra usable width and controlled padding; title/voice input no longer squeeze typed text.
- Location access remains opt-in; no GPS collection without user interaction.
- Nearby v2 handles product keywords and explicit category filtering independently.
- A missing v2 RPC falls back to old v1 for rollback resilience. Production must apply v2 RPC before rollout.

## Storage, security and observability
- No new external Elasticsearch cluster or separate paid search subscription.
- RPC is SECURITY INVOKER and gated by approved-business predicate and existing RLS.
- No long-lived search query or precise location history is stored by SmartSearch.
- Existing in-memory aggregate diagnostics remain in place. Add user-consent-governed analytics only after review.
- No changes to billing, auth, vendor workflows or commercial prices.

## Evidence and acceptance
- `node --experimental-strip-types --test tests/smartSearch.test.mjs tests/searchEvaluation.test.mjs tests/geoRank.test.mjs`.
- End-to-end examples: Jaffna Clothings → Clothing & Brands and ~20 km expansion; Jaffna Foods → Food & Dining; Biryani / Burger / Pizza → Food & Dining related if unverified; Colombo medical; Tamil/Sinhala food/healthcare aliases; town-only searches; no-result cases.
- Validate SQL with read-only `select * from public.get_nearby_businesses_v2(...)` after additive migration.
- Quality metrics: Precision@10, nDCG@10 on a manually judged multilingual query dataset. Search p95 under 300 ms **is a target, not a claimed measurement**.
- All CI checks and Vercel Preview READY; visual/interaction QA on narrow desktop/mobile; then production deployment.

## Future extensions (not claimed as implemented)
True BM25 scoring, multilingual embeddings, reciprocal rank fusion (RRF), H3 regional analytics, learning-to-rank and Elasticsearch/OpenSearch are benchmark-driven future milestones. Current PostgreSQL `ts_rank_cd` is **not BM25**.

## Rollback
1. Revert the frontend commit / redeploy the previous healthy release.
2. Existing `get_nearby_businesses` RPC remains intact and can serve as fallback.
3. Optional additive v2 RPC can be left unused (or removed after review); there are no destructive schema/data migrations.
