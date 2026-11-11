# SLBI Growth Intelligence & Lead Attribution — v1 Foundation

**Status:** Development branch only; reporting UI and fail-closed ingestion code staged. Not approved or activated in production.
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

## Implemented on the draft branch (not deployed)

- Owner-scoped `/vendor/insights` with event/lead cards, last 7/30/90 day trends, business-level drilldown and recorded CRM lead origins. It queries existing RLS-protected `analytics_logs`, `leads`, and `businesses`, and shows a warning for capped datasets.
- Iconsax navigation from vendor sidebar, dashboard and Growth OS. No new analytics data is fabricated; no raw GPS/visitor identity is displayed.
- Missing `/api/analytics/log` route added, but it returns no-op until `GROWTH_EVENT_INGESTION_ENABLED=true`. It validates same-origin, DNT/GPC opt-out, approved business/type/channel, strict request size, trusted Vercel-proxy client IP and HMAC-hashed hourly rate limiting. No raw client IP, search text or coordinates are written.
- `docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql` proposes atomic hourly limits, service-role-only invoker RPC and revocation of anonymous direct analytics INSERT. It has **NOT** been applied to any database and is intentionally not in the deployed migration directory.
- Existing business detail event requests use opaque random event IDs and a fixed, evidence-based channel; legacy city and freeform metadata are no longer submitted.
- New tests `growthIngestion.test.mjs` cover malformed/forged inputs, origin/privacy boundaries, SQL permissions, and vendor-owned querying.

## Open blockers for production activation

1. Supabase server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` not configured in current Vercel project environment; a new secret must be provisioned and protected.
2. Separate `GROWTH_RATE_LIMIT_SECRET` and private `GROWTH_EVENT_INGESTION_ENABLED` not configured. Do not create/enabled them before migration/approval.
3. Promote the reviewed SQL to a properly generated migration, apply in a staging project, validate grants/RLS/abuse limits, and plan 48-hour bucket retention cleanup.
4. Existing `leads` public INSERT policy remains wide open. Mobile app and web legacy lead submissions must migrate safely before it can be revoked. Existing lead-form `lead_form_submit` telemetry is intentionally not ingested as an ordinary anonymous click.
5. The future `/vendor/insights` reporting page requires authenticated vendor acceptance and live visual checks; regression CI alone does not verify browser UX.
6. Review privacy/consent notice and conduct production release checklist. One final controlled deploy only after all prerequisites pass.

This file records delivered development work and explicit remaining gates; it does not claim Growth Intelligence is already deployed or that event ingestion is live.


## Vendor Portal premium redesign, security and lead workflow — 2026-11-11

Draft PR #29 now covers the full owner workspace route inventory:
`/vendor/dashboard`, `my-businesses`, `leads`, `reviews`,
`insights`, `growth`, `marketing`, `qr-code`, `billing`,
and `settings`. The redesign uses a single dark-forest/ivory style system,
desktop and mobile navigation, an accessible search palette (Ctrl/⌘+K), 10
real route actions, premium dashboard launchpad, and updated headers and
consistent cards across primary vendor pages.

- Settings is genuinely connected to Profile/Local SEO and password-update
  mutations, with user-scoped ownership and error/disabled handling.
- Notification preference toggles persist only **after** a reviewed
  `vendor_notification_preferences` migration; the UI discloses when storage
  is unavailable and never claims messages are already dispatched.
- Private verification document upload was initially disabled while the
  live `verification-docs` bucket was public; the bucket is now private in production. New clients and admin can
  use short-lived signed preview URLs, but the bucket privacy migration must
  be coordinated and tested against existing stored documents.
- Marketing UI removes invented impression counts and unverified "published to
  network" wording; saved campaigns and history are shown as records, not
  independently verified external campaigns. QR Studio similarly avoids
  unsupported scan-tracking promises.
- Web enquiry form now supports explicit consent and Cloudflare Turnstile +
  `/api/leads/submit` when coordinated secure-leads flags are enabled.
  Otherwise it intentionally keeps the legacy Supabase form for the
  still-shipping mobile compatibility window. Server-side RPC and rate
  limits are staged in
  `docs/growth/SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql`, not deployed.
- Static contract regressions in `tests/growthSecureLeads.test.mjs` and
  `tests/vendorPortalRelease.test.mjs` protect consent, disabled flags,
  role boundaries, navigation, settings and no fabricated statistics.

### High-priority data-security verification and release blockers

Live grants allow broad authenticated UPDATE, so **RLS alone** is not a
sufficient column-level authorization mechanism. Deeper read-only inspection
confirmed important existing BEFORE triggers: `growth_prevent_profile_role_escalation`
already protects direct `profiles.role` changes and
`growth_protect_business_approval` already protects business approval,
ownership, verified flags and badge status. Do **not** remove or duplicate
these working protections.

However, `profiles.verification_status`, computed business engagement/audit
columns and vendor mutation of existing `verifications` review rows need
separate explicit checks; the existing AFTER verification trigger may already
reject some self-approval attempts via the business guard. Additive,
non-overwriting safeguards are staged in
`docs/growth/PRIVILEGE_ESCALATION_GUARD_REVIEW_ONLY.sql`. Their compatibility
with signup, view-counter RPC, vendor forms and admin approvals is **untested**
until staged in an isolated project. Treat the gaps as security risks
requiring verification, not as a confirmed successful privilege exploit.

### Final release gate — NOT CLEARED

- Apply and verify necessary SQL **on an isolated test database first**.
  Supabase currently has no existing development branches. Creating one may
  incur compute charges and requires cost authorization.
- Complete RLS, signed URL and anti-abuse tests in that environment.
- Supply protected service-side Supabase credentials and independent HMAC
  secret; activate feature flags only after data-layer validation.
- Audit mobile-web leads compatibility (including anonymous inserts) before
  revoking the legacy `Anyone can insert leads` policy.
- Conduct actual authenticated vendor/admin browser/device testing for the
  responsive dashboard, uploads, forms, QR, preferences, invoice paths,
  social campaigns and analytics.
- Confirm all GitHub CI jobs green **on the final exact commit**, document a
  rollback plan and perform the single approved production deployment.

The 2026-11-11 Vendor Portal UI and bounded Nearby V3 beta were deployed separately. New Marketing/QR refinements are in PR #31 and are not yet deployed.


## Security rollout facts verified on 2026-11-11 (new sprint)

- Applied additive owner-RLS `vendor_notification_preferences_owner_scoped_v1` migration on production; checked `relrowsecurity=true` and the owner-scoped SELECT / INSERT / UPDATE policies. Preference toggles can now persist, although delivery integrations must still honor them separately.
- Applied `private_verification_documents_owner_path_v1`: `verification-docs` is now **private** (not public), 10 existing objects retained with owners, 10 MiB JPG/PNG/PDF limit; future insert path requires authenticated `user_uuid/business_uuid` ownership. Previously stored public URL references in five verification rows must be displayed only via authenticated short-lived signed URLs. Anonymous access should be tested over HTTP and vendor/admin preview journeys verified.
- Configured Vercel production `NEXT_PUBLIC_VERIFICATION_PRIVATE_READY=true` for the next build and created server-only sensitive `GROWTH_RATE_LIMIT_SECRET`. The existing production deployment requires a new build to read the public feature flag.
- Supabase development branch creation is gated by a disclosed charge of **US$0.01344/hour** and requires the owner's explicit agreement to this amount. The attempted branch creation was refused by the API without a cost confirmation ID. No paid branch was created.
- Supabase server-only privileged key remains absent from the Vercel production environment; secure leads and analytics ingestion stay **disabled**, and legacy mobile direct-lead submission compatibility prevents premature revocation of public INSERT policy.
- PR #31 replaces old canvas-era Marketing Studio with GrowthOS brief/campaign library/consent-first email UX, adds professional QR presets/export controls, and fixes Settings grid/radius. Do not attribute generated AI, true social publishing or scan metrics unless integrated.
