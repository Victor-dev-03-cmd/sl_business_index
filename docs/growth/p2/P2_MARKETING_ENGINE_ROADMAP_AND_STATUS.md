# SLBI GrowthOS — Phase 2 Marketing Engine delivery ledger

**Baseline:** `SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf` (10 November 2026). Preserve its 11 architecture pillars and six independent engines: Discovery, Growth, Marketing, Security, Revenue, Learning. This file is a **separate implementation-status ledger**, not a rewrite of the owner's approved roadmap.

**Phase:** Marketing Studio & GrowthOS Tools / P2-01–P2-10  
**Branch:** `phase2/marketing-engine-foundation-p2-01-20261113`  
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
