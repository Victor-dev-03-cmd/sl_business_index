# G1-03 — Owner-scoped Knowledge Resolver Contract (isolated, no live adapter)

Date: 2026-11-24 (Asia/Colombo). Candidate layered on draft [PR #168](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/168).

## Why G1 can progress while G0 remains open

Owner explicitly authorized **isolated read-only G1 code only**, not G0 acceptance or any live release. G0 Foundation acceptance remains **0/7** and GrowthOS master release **0/10**. Frozen main remains `9211f889e4a9e0ca8f7e4a5545d449c7118d23da`; do not merge this draft or authorize providers, billing, migrations, Vercel production, live G1 database reads or paid staging.

## G1-03 implementation

- `lib/growth/g1/knowledge-resolver-contract.ts` defines a mockable, dependency-injected **read-only orchestration contract**; it is **not an actual server adapter** and is not connected to any route, page, live database or marketing provider. No Supabase client or service-role key is imported.
- Exact owner-scoped SELECT allowlists for `businesses`, `social_brand_profiles` and `business_profile_content`; never select `*`, leads, reviews, private documents, guidelines, offers, credit/billing or credentials.
- Validates request UUID before any I/O. Requires a fresh authenticated identity provided by an adapter, then owned approved business, then at most two related scoped reads (brand and profile in parallel); does not read any related row for a non-owner, anonymous user, missing or pending listing.
- Returns the same `not_available` for unauthorized, missing and pre-authorization read failures. After business authorization, actual brand/profile source failure returns `source_unavailable` rather than fabricated `missing`. Missing optional records remain explicit `missing`.
- Secondary owner/business-id checks and output sanitization remain in G1-01/02 pure builder; public verified flag uses approved G0-17B business verification semantics. No shared cache or AI/model input.
- `tests/g1/knowledge-resolver-contract.test.mjs` uses **only in-memory synthetic adapters**, with vendor A/B, missing/pending business, identity failure, forged brand/profile, source errors, Tamil/Sinhala, exact select projections, privacy and no unnecessary reads.
- Dedicated G1 CI executes these tests. Since there is no concrete production reader or live adapter, tests are **contract evidence**, not proof of real Supabase RLS or browser integration.

## Explicitly deferred

- Real Next.js `getUser()` and user-RLS-bound adapter, live/isolated DB testing, SSR error/status mapping, pagination/rate limits, provider parity, E2E real A/B devices, safe PostgREST projection review. These require separate authorization and the current G0 security gates.
- Owner wallet policy: **manual admin-reviewed refunds only**, but existing runtime enforcement is not yet audited. No automatic wallet refunds/credits authorized.
- Marketing: only already approved providers at existing access boundaries. No new provider enabled.
- Desktop browser GPS: remains a blocker until fixed and physically retested. No waiver.
- G0-03 legacy anonymous view counter and review cache production cutover, migration provenance, consent, fresh encrypted backup + isolated restore + external physical-drive verification remain outstanding.

## Next chat handoff

```text
Continue SLBusinessIndex GrowthOS in Tamil, actual GitHub work. Repo Victor-dev-03-cmd/sl_business_index. G0 is NOT complete: foundation 0/7 accepted, GrowthOS master 0/10. Owner authorized only isolated read-only G1 code, not main merge or production G1 data reads, provider activation, live SQL, paid staging or release. Owner decisions at docs/growth/g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json: manual admin-reviewed wallet refunds only (enforcement unverified), existing approved Marketing providers only with unchanged access, desktop GPS blocks until physically fixed/retested. Check draft PR #168 and its exact CI, preserve draft status. G1-01/02 pure business knowledge builder allowlists multilingual owner-scoped facts. G1-03 adds lib/growth/g1/knowledge-resolver-contract.ts: injected read-only adapter contract, auth first, exact business owner/status check before brand/profile, no live DB connection, no service role; tests for owner A/B, missing/pending, forged rows, source outage, exact SELECT projections and no PII. Read docs/growth/G1_03_ISOLATED_OWNER_RESOLVER_20261124.md, G1_01 checkpoint, AGENTS.md, G0 ledger, release checklist. Do NOT merge G1 into main or deploy production. Next extend synthetic PostgREST RLS adapter proofs and return to G0 owner blockers (backup/restore/external copy, consent, verified view RPC, physical GPS QA). Report exact SHA/CI and keep handoff updated.
```
