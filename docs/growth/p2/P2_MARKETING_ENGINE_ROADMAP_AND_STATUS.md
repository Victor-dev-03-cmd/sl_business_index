# SLBI GrowthOS — Phase 2 Marketing Engine delivery ledger

**Baseline:** `SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf` (10 November 2026). Preserve its 11 architecture pillars and six independent engines: Discovery, Growth, Marketing, Security, Revenue, Learning. This file is a **separate implementation-status ledger**, not a rewrite of the owner's approved roadmap.

**Phase:** Marketing Studio & GrowthOS Tools / P2-01–P2-10  
**Current source:** `main` (PR #68 squash-merged 2026-11-14). Original P2 branch remains historical.  
**Existing production:** The Discovery/GeoRank/nearby/hybrid search work is separate. Do **not** rebuild it as part of Marketing. Marketing already has an owner-aware campaign brief, manual multilingual copy drafting, simple text-based PNG export, owner-scoped campaign records and a **planning-only** date calendar. The current `/vendor/growth` page reads the wallet and audit ledger; its AI credit actions remain disabled unless separately enabled through reviewed backend logic.

## Shared Marketing Engine contract

```
Approved business record + verified vendor identity (Supabase Auth / RLS)
  └─ P2-01 Brand Profile (tone, audience, logo, colors, languages, offers, guidelines)
      └─ Structured creative brief (approved business facts only)
          ├─ P2-02 Caption provider (human-reviewed, 3 languages)
          ├─ P2-03 Original poster image + editable typography
          └─ P2-04 Template/editor canvas + export
              └─ P2-05 Campaign state + revision/approval history
                  └─ P2-06 Durable queue (not a client-side date)
                      ├─ P2-07 Authorized Facebook/Instagram provider
                      └─ P2-09 Consent-verified email provider

Growth Engine: P2-08 verified-domain SEO intelligence
Revenue Engine: P2-10 trusted credit reservation, metering, reconciliation
Learning Engine: algorithm evaluation and future campaign suggestions
Cross-cutting: RLS • audit • consent • rate limits • cost caps • rollback
```

Marketing and Discovery may exchange **only** approved business facts and authorized aggregate insights. Do not use identifiable search histories for covert targeting.

## Status and acceptance gates

| ID | Module | Baseline before P2 | First acceptance criteria |
|---|---|---|---|
| P2-01 | Business Brand Profile | No persisted brand table | Per-business profile; logo derived from owned business; palettes, offers, tone, audience, language & guidelines; strict owner-only RLS |
| P2-02 | AI Caption Generator | Manual template drafts in 3 languages | Provider-backed business-aware drafts; explicit model/cost disclosure; human edit/approval; no invented claims |
| P2-03 | AI Poster Studio | Basic client PNG, not AI | Original image variants with editable name/price/date/phone layers; reviewed claims |
| P2-04 | Design Editor | No advanced editor | Layout JSON/template versioning, square 1080²/portrait 1080×1350/story 1080×1920, uploads, export, font checks |
| P2-05 | Campaign Library | Owner-scoped drafts in marketing_campaigns | Versioned revisions, approval state, immutable audit and truthful publish history |
| P2-06 | Content Calendar | Planning-only dates | Persistent queue with scheduled, leased, sent/failed state; retry/idempotency; failed-job recovery |
| P2-07 | Social Publishing | No verified provider access | Official Meta authorization, scoped OAuth, encrypted credentials, permissions and provider review |
| P2-08 | SEO Intelligence | Growth core context, no verified-domain audits here | Proof of domain control, safe passive technical checks, schema/metadata, evidence-based guidance |
| P2-09 | Email Marketing | Compliance information only | Purpose-bound opt-in consent, suppression, unsubscribe, mail authentication, bounce/complaint handling |
| P2-10 | Usage Credits | Existing foundation wallet/ledger | Trusted per-job quota, cost ceiling, idempotent reservations/deductions, reversal/audit; **no new billing plan names/prices invented** |

## Build order — dependency-first, no false release claims

1. **P2-01 foundation**: independent Marketing brand contract, server-side ownership, staged RLS SQL, an accessible editor inside the existing marketing workspace. Reuse business `logo_url`; no new unreviewed public storage bucket.
2. **P2-10 backend prerequisites** before a paid model request: provider budget, hard rate/quota checks, trusted ledger idempotency. Do not enable or charge AI credits in a prototype.
3. **P2-02 → P2-03 → P2-04:** provider selection only after cost/permissions approval, variation review and editable text-layer design (never rely on image model for phone numbers/prices).
4. **P2-05 → P2-06:** approved campaign states, real job leasing and retry tests. Existing planned dates are not queued jobs.
5. **P2-07 and P2-09:** only after official provider access, user consent, scopes and deliverability tests.
6. **P2-08:** growth/SEO service surfaced in Marketing workspace, without impersonating Google indexing results.

## P2-01 change boundary / current implementation

**Implemented in development branch:**
- Reusable `lib/marketing/brand-profile.ts` contract, validating English/Tamil/Sinhala and bounded palettes/offers.
- `app/api/marketing/brand-profile/route.ts` using Supabase SSR getUser, business-owner scoping and same-origin PUT.
- `app/vendor/marketing/brand` editor and link from existing Marketing Studio homepage.
- **Staging-only** `docs/growth/p2/P2_01_SOCIAL_BRAND_PROFILES_STAGING_ONLY.sql`, private RLS and limited column grants.
- Docker Postgres tenant-isolation tests, Node contract tests, and full Next.js build pipeline.

**Not enabled:** AI generation, actual social publishing, SMTP, paid credits, domain scans, background scheduling, provider accounts, or live Supabase brand-profile migration.

## Production readiness checklist

- [ ] All GitHub Node 24 typecheck/Next build + Postgres Docker A/B negative RLS tests green at exact SHA
- [ ] Owner-confirmed schema and migration sequence, no destructive operations
- [ ] Real owned-vendor SSR auth browser walkthrough on preview and mobile viewport
- [ ] Apply versioned migration with rollback/recovery and owner data audit
- [ ] Owner approval for production promotion, verify Vercel READY and runtime logs
- [ ] P2-01 marked production only after migration and actual save/read browser testing

**Governance:** Versioning the roadmap or changing subscription costs, collecting marketing contacts, buying provider credits, activating sending or scheduling requires a separate approved decision. No Supabase paid staging branch is needed for disposable Docker testing.

## Follow-on development checkpoint — P2-02, P2-04, P2-10 (November 13, 2026)

**P2-02 — AI Caption Lab (feature-gated):** `/vendor/marketing/captions`, `/api/marketing/caption`, and `lib/marketing/caption-contract.ts` were added. Authenticated owner business + saved Brand Profile data form a constrained creative brief. English/Tamil/Sinhala selection is explicit. The server rejects untrusted owner/model/credit fields, uses a current Groq Chat Completions model rather than a deprecated model, caps provider response tokens/time, and creates **private, pending-human-review** drafts. Vendors can edit and approve/reject their own draft, without claiming social publishing. **Live provider calls remain OFF** until both `SLBI_MARKETING_AI_ENABLED=true` and `growth_credit_actions.ai_social_draft.is_enabled=true` are deliberately approved with provider costs and real-JWT acceptance.

**P2-04 — Editable Poster Studio (local exports):** `/vendor/marketing/design`, original editorial/spotlight/offset/minimal layouts, independent draggable typography layers for business name/headline/price/date/CTA/phone, real PNG export at square (1080×1080), portrait (1080×1350), story (1080×1920), optional local PNG/JPEG/WebP background artwork and versioned JSON project import/export. The working editor is **not** yet server-persisted and its templates are **not** AI generated. The upload stays local to the browser; JSON preserves typography/layout, not uploaded artwork bytes.

**P2-10 — AI credit risk controls (disposable Docker):** `docs/growth/p2/P2_02_P2_10_AI_CREDIT_RESERVATIONS_STAGING_ONLY.sql` introduces immutable server-assigned job ownership, per-owner/1-day max 6 reservations, platform max 50 per UTC day, existing plan-defined credit pricing, row-locked debit, idempotency key handling, atomic draft-completion, compensation refund and append-only credit ledger. Real actions remain disabled pending release gates. Docker tests intentionally enable one action in **throwaway Postgres only**; this does not change production billing or plan prices. Before actual provider rollout, add durable stale-reservation reconciliation and capture provider billing metrics; document a small approved provider-cost budget.

**Existing Marketing campaign continuity:** The old `marketing_campaigns` record and `posted` status remain unchanged; it is not verified evidence of provider-published content. P2-05 **owner-scoped SQL revision/audit migration has now been staged and tested in Docker**, but its UI/API and immutable provider-receipt verification are **not yet released**. P2-06 durable schedule worker is still **NOT IMPLEMENTED**. The old calendar remains planning-only. Meta token presence in an environment does **not** establish official per-vendor OAuth authorization.

### Updated acceptance / release status

- [x] New P2-01 Brand Profile editor, owner API, independent Docker RLS and contract tests
- [x] P2-02 AI caption route and manual approval UI, disabled-by-default provider budget and private draft schema/tests
- [x] P2-04 local editable typography, original templates and full-res PNG/JSON export
- [x] P2-10 transactional backend credit reservations, compensation and daily limits tested in Docker
- [ ] Real Supabase migration for social_brand_profiles and marketing AI private tables (currently **not applied**)
- [ ] Live owner JWT save/reload/edit tests; provider model output tests with an approved cost ceiling
- [ ] P2-03 AI-generated original artwork and editable overlays
- [ ] P2-04 persistent designs and revision history, approved asset storage
- [x] P2-05 revision-history SQL and security regression in Docker; existing historical `posted` state preserved
- [ ] P2-05 publishing history, verified receipts and moderation audit
- [ ] P2-06 durable scheduled queue and retry/recovery worker
- [ ] P2-07 official provider OAuth and page-scoped Facebook/Instagram publishing
- [ ] P2-08 verified-domain SEO audits
- [ ] P2-09 opt-in email audiences, unsubscribe/suppression and authorized sending
- [ ] P2-10 production idempotency / provider-cost monitoring and approval

**Production remains unchanged until these checks pass for their respective release units.** No AI credits have been activated or spent, and no new paid Supabase staging project is required for disposable Docker testing.

## 2026-11-14 — P2-07 one-time state claim security increment

Staging-only SQL function `slbi_claim_marketing_oauth_intent` is added in P2 development commit `0920367`, with disposable PostgreSQL 17 owner A/B, replay, expired-Pro, exact callback, PKCE and unauthorized-role negative tests wired into CI. This is **not** real provider authorization: Supabase production schema is unchanged, and provider app registration, KMS-backed PKCE/token encryption, trusted API handlers, provider-specific account choice, revocation and authenticated live browser tests remain open. Marketing first → Growth next → SEO last; Discovery unchanged.

## 2026-11-14 — Owner-requested P2-07 continuation: secure OAuth Start/Callback

Source-of-truth Library PDF v1.0 (19 pages) reviewed in full alongside editable Markdown, tracker, decision log, GitHub handoff and current P2 source. Preserve 11 pillars, six engines and untouched Discovery. New preview-only Google `openid email gmail.send` provider flow now has same-origin SSR owner/verified-Pro Start API, exact redirect callback, atomic one-time state, PKCE, encrypted tokens and 5/hour per-vendor initiation limits; fake provider/tenant A-B tests added. See `P2_07_OAUTH_IMPLEMENTATION_SECURITY_HANDOFF.md` and `IMPLEMENTATION_STATUS_LIVE.md` for **exact CI SHA, preview/migration/prod gates and blockers**. No Google account actually connected; SQL only disposable PostgreSQL, no production feature changes or paid external actions.

## 2026-11-14 — Consolidated main source / preserve legacy Basic campaigns

Owner approved merging reviewed P2 source after P1/P2 audit. Code `c2326c5` passed 7/7 GitHub workflow families and exact-sha Vercel Preview READY; PR #68 squash-merged as `main` SHA `852da22`. **This was source integration, not live provider rollout or Supabase P2 migration.** An audit found live `growth_entitlements` empty: legacy manual `/vendor/marketing/campaigns` is now correctly available to signed-in Basic business owners, while advanced agents/connectors/automation, brand/caption/design premium routes stay verified Pro. Staging P2-05 SQL now preserves Basic owner drafted/scheduled writes and prevents fake posted/approved claims. All pending tasks require server/DB/real-browser acceptance separately. Official Google test OAuth, KMS and provider revocation not live. Marketing → Growth → SEO; Discovery unchanged.

## 2026-11-14 — Owner-requested Marketing Studio App Store UI gate

Marketing Studio is the one Tools-menu entry and visually uses a charcoal banner + orange branding. An embedded 12-card first-party marketing app marketplace (10 verified-Pro routes, 2 Included existing workspaces) replaced the old six shortcut panel and duplicate Marketing Engine topbar entry. Search/category filters, Iconsax vector icons, status labels, honest Pro gating and unique deep links verified by Node regressions; old Engine home URLs redirect Studio without dropping module deep routes. Feature code SHA `0d6b525`, six CI workflow families PASS and exact Vercel Preview READY `dpl_8GVzX64Zd7rdTGwapNH8H8KtuKdj`; [PR #69](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/69) merged main `715fb2b`. No live Supabase migration/provider account, paid credit, mail or social publishing was enabled. Premium modules that are still only catalogue/foundation remain labelled accurately. Full release acceptance and remaining P2 steps are tracked in `IMPLEMENTATION_STATUS_LIVE.md`.

## 2026-11-14 — Performance and P2-07 consent UI milestone

PR #70 safely integrated skeleton-first vendor launch and Marketing app/workspace loaders, parallel owner business/verified-Pro reads and reduced client-side prefetch; source `cbf395e` passed six GitHub workflows including P2 OAuth + owner PostgreSQL security, Preview READY `dpl_6NfYfWSuUXtFvdPh1UzaFrYK3uwm`; source squash-merged `main` `dc15c7b`. Chromium local static visual fixture desktop/mobile overflow and reduced-motion PASS, **not actual authenticated app E2E or a measured performance score**. Google Mail preview-only business-selected Connect UI is added behind the original secure OAuth start path; on current production with no live P2 OAuth tables or verified Pro entitlement it remains disabled. Other adapters remain catalogue-only. Pending managed KMS, schema migration, live browser negative tests, verified provider accounts, token revoke, owner consent, provider receipts and authorized sending. Discovery untouched; Marketing then Growth then SEO.

## 2026-11-14 — P2-07 local disconnect + pending branches gate

PR #71 source `d7f199ae` six CI families PASS, Preview READY; squash-merged main `cb26f6a`, Vercel Production READY on `www.slbusinessindex.com`. New preview-only local Google connection disconnect deletes SLBI ciphertext and pending OAuth intents, with Basic/cross-vendor/expired-Pro Docker coverage. Provider remote OAuth permission is **not** revoked and no live P2 SQL or KMS/env secrets were changed. Five old diverged draft PRs are not safe to merge as a batch; see `P2_BRANCH_AUDIT_20261114.md`. Next work: generation-bound callback/store race guard, staging migrations, KMS + provider-side revoke, then actual vendor OAuth and Marketing workflow acceptance.

## 2026-11-14 — P2-07 callback/disconnect race guard source milestone

PR #72 (feature `56ee239`, merged main `4b9cf4d`) passed 6/6 source-SHA CI checks and Vercel exact Preview READY; merged Production `dpl_41aYCX8pqaeifiwsE8ZgnVht6Sgr` READY on `www.slbusinessindex.com`. Staging-only `P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql` now requires a consumed, unrevoked, unused claimed OAuth intent ID at the time of encrypted credential store, locks against concurrent Disconnect and invalidates even already-claimed pending callbacks after local cleanup. Superseded unbound service-role store grant removed; Docker PostgreSQL owner/Basic/cross-tenant/replay/secret-purge tests green. **No production P2 migrations or provider OAuth activation**. Historical draft PRs #34/#30/#27/#9/#7 remain unmerged pending targeted re-review. Next: isolated reversible P2 DB migration and Pro ownership acceptance, KMS-backed tokens and remote revoke/refresh, real Google consent/browser QA, then other Marketing/ Growth/ SEO.

## 2026-11-14 — Global launch baseline done; integrations deliberately Coming Soon

PR #73 source `a6094afe` (5/5 workflows including P2 7-job exact production SQL Docker validation), merged `12d0add2`, Preview READY `dpl_A6KE1nRMmSbK2V793EuxrHid9Kr3`, Vercel Production READY `dpl_3XQP5DUcG51cMwAUuD96kH7mSDxN` with verified `www.slbusinessindex.com` alias and main CI success. Live Supabase P2 migration **`20261114104216 p2_marketing_global_foundation_coming_soon_v1`** applied successfully (12 Coming Soon app rollout rows; 5 new RLS tables; 0 connected tokens; 0 current verified Pro). Marketing Studio now reads server-verified rollout statuses and shows all 12 as Coming Soon; existing Basic tools untouched. Database foundation is live, but OAuth/sending/autopost/AI billable actions and real provider integrations remain OFF. Next: P2-05 campaign policy repair, provider registration and managed KMS, verified Pro, browser Auth acceptance and audited stepwise app releases. `docs/growth/p2/P2_MARKETING_ROLLOUT_RUNBOOK_20261114.md`.

## 2026-11-14 — #10 Content Calendar implementation candidate

Owner prioritized first-party app #10 Content Calendar. A real owner-scoped campaign calendar was staged: server Auth + RLS + Pro layout, date grid Asia/Colombo, day details, business/search filters, upcoming plans and draft lists. It is read-only; no outbound scheduling worker, OAuth token, provider receipt, Pro billing grant, production migration or rollout flag change. See `docs/growth/p2/P2_06_CONTENT_CALENDAR_STAGE_20261114.md` and living GitHub issue #74. No Vercel preview created for this candidate. Blockers: existing P2-05 insecure campaign status writes, verified Pro test user, exact-SHA CI+E2E. Owner's BOC Merchant LankaQR must wait for branch registration; Payments.lk checkout remains pending.
