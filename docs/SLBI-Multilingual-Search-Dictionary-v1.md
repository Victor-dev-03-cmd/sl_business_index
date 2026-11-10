# SLBI Multilingual Search Dictionary v1

## Purpose and scope
This is a reviewed, public-read-only terminology dataset to improve Sri Lankan business search in Tamil, Sinhala, English, Thanglish, Singlish and mixed-script input. It extends the existing SmartSearch v1 resolver and HybridSearch v2 without a new model, billing dependency, or external data service.

## Database schema
Migration version: `20261110214148_slbi_multilingual_search_dictionary_v1.sql`.

Table: `public.search_dictionary`

- `alias`, `alias_normalized`, `language` (`en`, `ta`, `si`, `ta-Latn`, `si-Latn`, `mixed`)
- `alias_kind`: `location`, `category`, `service`
- `intent_key`, `canonical_query`, `categories`, `specific_service`, `town_name`
- `confidence`, `source`, `review_status` (`draft`, `approved`, `rejected`), `is_active`
- timestamp audit fields; unique normalized alias and kind.

The initial 679 candidate mappings were curated from common spelling and transliteration variants. They have **not** been manually judged by native-language raters for every district or service. "Approved" here means eligible for the controlled initial lexicon, not empirically validated accuracy.

## Public access
RLS is enabled. Only approved and active aliases are readable by `anon` or `authenticated`. No INSERT, UPDATE or DELETE permissions are granted to these roles. The browser fetches a bounded approved subset and React Query caches it for six hours, reusing it across Homepage and Nearby.

No user query, IP, precise location history, or identity is added to this table. Adding an alias is an administrator/database-maintenance operation, not a visitor write.

## Matching
- Match whole multiword phrases, longest match first. Split place alias (e.g. `යාපනයේ` → known Jaffna coordinates) from service alias (e.g. `කාර් රෙපෙයාර්` → `car repair`).
- Place coordinates always come from the existing `SL_TOWNS` dataset. Never infer a geolocation from dictionary spelling alone.
- A specific-service match only improves *retrieval*. SQL v2 still distinguishes `exact_service` from `category_related`; car wash must not be labeled a confirmed mechanic.
- If dictionary loading fails or a variant is missing, the built-in static SmartSearch continues to work.
- Unknown terms remain lexical queries; do not auto-map them to potentially unrelated services.

## Adding a new slang/spelling variant safely
1. Check the actual intended place or service with a local-language reviewer. Avoid ambiguous single-letter or generic word aliases.
2. Add to the appropriate `alias_kind` with a real canonical term and existing category names. Use `review_status='draft'` initially.
3. Verify offline regression tests in `tests/searchDictionary.test.mjs`, including false matches and exact-service labeling.
4. Approve from a trusted database administrator after review. Check the public-read RLS policy and then run Preview smoke tests.

Example: `'karthik motor service'` must **not** be globally aliased to car repair if it is a specific business name; aliases represent language concepts, not company identities.

## Validation
- SQL dry-run: 679 rows, including 332 Tamil/Sinhala/mixed-script native-text aliases.
- Real database `SET LOCAL ROLE anon` read verified.
- GitHub CI executes parser regression tests, 168-case synthetic HybridSearch benchmark, TypeScript, Next.js build, route smoke, Billing SQL checks.
- Review the actual browser network timing and generated React Query cache. Larger future dictionaries should use compact server-hosted shards/versioned distribution rather than growing the initial payload indefinitely.

## Roadmap
Next-stage research: 200+ manually labelled real-world search judgments, phonetic/transliteration candidate ranking, measured spelling-edit distance, semantic embeddings only after tested model-backed vectors and a measurable relevance improvement. True BM25 candidate ranking exists independently; this dictionary is **not** a trained language model.
