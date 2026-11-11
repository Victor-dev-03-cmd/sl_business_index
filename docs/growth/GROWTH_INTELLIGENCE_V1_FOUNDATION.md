# SLBI Growth Intelligence & Lead Attribution — v1 Foundation

**Status:** Development branch only. Not approved or activated in production.
**Previous live release:** `5a4611702ecb0b2289967bc495bb049a03ab0e13`
**Release agreement:** Complete development, security, integration tests and one final reviewed production release. Do not merge this branch yet.

## Discovery handoff: Semantic V3 Beta always ON

- Nearby Explorer automatically evaluates opt-in-only E5 beta ranking as **enabled** on every `best-match` search; no user toggle, URL opt-in, local storage, or manual activation.
- A static badge shows `Semantic V3 Beta · ON` and indicates whether true E5 re-ranking or legacy V2/GeoRank fallback is in effect.
- 22 approved businesses, 384-D genuine E5 vectors, six canonical intents in the pinned beta model. These are not unrestricted multilingual arbitrary-query embeddings.
- Unknown queries, missing/stale business snapshot, geo-only browsing, and non-best-match sort modes keep the legacy rankings. No business visibility or service evidence bypass.
- The general `SEMANTIC_ROLLOUT` quality gate remains disabled; human business-level search judgments are incomplete.

## Existing live resources — verified read-only 2026-11-11

Reuse these, rather than creating duplicate lead collections:

| Public table | Already present | Notes |
|---|---:|---|
| `analytics_logs` | 484 event rows | 414 `view`, 34 `location_click`, 23 `call_click`, 13 `lead_form_submit` |
| `leads` | 15 CRM rows | 13 `Business Detail Page`; 2 `Mobile App - Business Details` |
| `businesses` | 22 approved | Ownership via `businesses.owner_id`; private/rejected listing data must not enter aggregate recommendations |

The `leads` data includes a `converted` CRM status. It is **not** payment verification or confirmed revenue. `analytics_logs.lead_form_submit` and `leads` records are **different evidence classes** and must not be added together.

### Security blockers observed

Existing RLS policies named `Anyone can insert logs` and `Anyone can insert leads` permit inserts with `WITH CHECK (true)` for the `public` role. This is not bot resistance, customer authentication, approved-business validation, idempotency, or ownership verification. Therefore historical logs are **untrusted interaction counts**, not proof of unique visitors, authentic leads, or conversions.

**Do not enable new tracking on the public client or automatically monetize counts until an authenticated/anonymous-safe, rate-limited server ingestion design and RLS revisions are reviewed.** Do not disable legacy lead forms while designing the replacement.

## Defined metrics and attribution semantics

`lib/growth/attribution.ts` provides a read-only pure function, without database writes or browser telemetry.

- **Exposure:** listing `view` *events*, not unique humans.
- **Engagement:** `call_click`, `location_click` *events*, not verified contacts.
- **Enquiry signal:** `lead_form_submit` *events*, not guaranteed unique CRM records.
- **CRM:** distinct `leads.id` records, source and stage (`new`, `contacted`, `converted`, `lost`) as explicitly reported by vendors.
- **Verified sales/revenue/unique visitors:** `null` until properly instrumented and independently confirmed.

Attribution channels should eventually be allowlisted: `home_featured`, `nearby_search`, `category_browse`, `business_detail`, `mobile_detail`, `direct`, `unknown`. Bind attribution to an approved listing and only include channels supported by server-verified evidence. Do not invent a path for legacy leads.

## Next implementation gates

1. **Audit:** map actual calls that write `analytics_logs` and `leads` and the vendor CRM stage permissions. Check that legacy auth, RLS and lead forms still work.
2. **Event contract:** add allowlisted fields only (`event_id`, `business_id`, `event_type`, `channel`); server assigns timestamp and validates listing approval/ownership as appropriate. No raw GPS, raw search strings, visitor IP or fingerprint retained in event rows.
3. **Ingestion:** design bounded server-side endpoint with bot/rate controls, event deduplication, payload limits, consent/retention policy, and RLS service-role isolation. Do not expose a service key to the browser.
4. **Attribution:** connect explicitly recorded web/mobile discovery source to an inquiry when genuinely present, without fabricating visit sequences or conversion revenue.
5. **Vendor reporting:** aggregated events and CRM lead counts for owned businesses, RLS isolation (vendor A cannot view vendor B), delayed/throttled refresh, useful empty states and export safeguards.
6. **Evaluation:** test malicious inserts, tampered business IDs, spam, duplicated events, no-consent behavior, anonymous read restrictions, and the difference between clicks, leads and completed sales.
7. **Release:** GitHub CI, TypeScript, Next.js build, SQL migration/RLS tests in staging, authenticated owner/vendor journeys, optional preview if affordable, **one final production deploy** and rollback proof.

## Explicitly deferred

Live collection pipeline, new tables/migrations, payment or subscription changes, user fingerprinting, unverified recommendation personalization and semantic default for arbitrary queries.

This file documents a real start to Growth Intelligence without claiming the module is already implemented or deployed.
