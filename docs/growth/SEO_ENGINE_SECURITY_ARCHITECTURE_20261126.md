# SLBI SEO Engine — Foundation + Secure NeuroGrowth Research

**Date:** 2026-11-26 (Asia/Colombo)
**Owner decision:** Preserve ongoing NeuroGrowth training, pause provider-dependent WhatsApp/Meta launches until business registration/provider verification. Prioritize SEO for newly approved SLBI businesses and future opt-in customer-owned domains. Do not assume Meta approval is needed for website SEO: they are separate ecosystems.

## 1. Evidence from main (audit before changes)
- `app/sitemap.ts` already queried approved businesses but advertised non-www (`https://slbusinessindex.com`) URLs, used synthetic every-request last-modified timestamps, included nonexistent `/testimonials`, and had no explicit refresh budget.
- `app/business/[slug]/page.tsx` had no canonical and emitted LocalBusiness JSON-LD for any business record visible to SSR, including owner-visible non-approved records; included cached rating/review count despite existing unsolved public review-cache parity drift.
- `app/robots.ts` advertised a non-www sitemap and gave a second special rule allowing various bots the whole site including app paths. Robots is NOT authorization.
- Existing detail pages already support SEO titles, descriptions, OG and LocalBusiness; the work is hardening, consistency, actual approved-listing discoverability, not a new guarantee of indexing.
- The actual production domain is `https://www.slbusinessindex.com`.

## 2. Phase SEO-00: code in this candidate
1. Pure `lib/seo/public-business.ts`: canonical `https://www.slbusinessindex.com/business/{slug-or-id}`, deterministic factual titles/descriptions, approved-only LocalBusiness JSON-LD, optional coordinates only if valid, optional HTTPS image and sanitized phone, no fabricated ratings/opening hours/external domain claims.
2. Public listing metadata uses consistent absolute canonical, useful profile details and OG. Owner-visible **pending/rejected/suspended** business records receive `robots noindex,nofollow` and **no JSON-LD**; missing pages also noindex. The pre-existing server RLS remains the access-control authority.
3. `app/sitemap.ts` advertises only `status=approved` public listing URLs and canonical www; explicit `revalidate=300` offers automatic discovery of newly approved/updated listings upon sitemap refresh (within roughly 5 minutes under normal cache behavior). No fake Google Indexing API call or invented submission success; approval event + sitemap refresh is an **indexing discovery process, not a guaranteed Google index**.
4. `robots.ts` references matching www sitemap, normal crawl exclusions for auth, vendor/admin and API; no special bot broad-allow override. Auth + RLS must continue to protect private routes.
5. Source and pure helper tests in `tests/seoApprovedListingFoundation.test.mjs` are wired to `.github/workflows/verify-nextjs.yml`. Synthetic approved/rejected/pending, schema poisoning, numeric legacy IDs, canonical sitemap and no privileged writes.
6. **No SQL/DDL, production user mutations, Search Console OAuth, external domain verification, paid AI training or provider activation.**

## 3. NeuroGrowth in Deepnote — READ-ONLY research
- Existing Deepnote project **NeuroGrowth ML-02 — SLBI Growth Engine** contains ML-02..ML-06 training notebooks: synthetic action ranking, split evaluation, neural comparisons, robustness bootstrap and consent/observable outcomes.
- Created **NeuroGrowth ML-08 — Secure Dashboard & SEO Intent Research**, notebook `73164bafbcd34e9e873962f3198e5dfc` in same project. New **detached read-only-storage** run `8c0d292a-2bde-45b9-87e6-bacb5beb6669` SUCCESS.
- 288 synthetic multilingual EN/TA/SI prompts, business intent family-disjoint split **216 training / 72 holdout**, character n-gram TF-IDF + balanced LogisticRegression vs majority baseline; **accuracy 0.6806, macro-F1 0.6587, majority macro-F1 0.10**. Forbidden recall 0.667; SEO class recall 0.222: **too poor for any production safety decisions.** This is not real-world accuracy, LLM fine-tuning or customer data training.
- Nine synthetic hard-gate examples pass; they are design checks ONLY and do not substitute for Supabase RLS/API permissions. Strict no key/PII/customer records, no live database integration. Existing ML-02..ML-06 untouched.

## 4. Dashboard Security Matrix — AI proposals are not authorization
| Area | AI permitted after verified Auth + owner_id + RLS | Changes/limits |
|---|---|---|
| Overview/GrowthScore | Read own approved business summary with field allowlist | Never leak global dashboard metrics |
| My Businesses / Gallery & Services | Read only selected owned listing and public approved facts | Edit/upload/delete require authenticated owner, explicit review, backend validation & audit |
| Enquiries / Leads CRM | Read owner-only minimal necessary fields after consent and masking | Never train on phone/email/content; export/contact/send needs explicit permission, retention controls |
| Reviews & Reputation | Read public approved moderated reviews and own replies | Reply/update/delete needs exact-action approval, no fake reviews or spam |
| Marketing Studio / Campaign Planner | Draft/preview own captions or SEO proposals | Publishing, WhatsApp, email and calls are gated by verified provider + recipient consent + owner approval + receipts |
| Billing / Subscription / Wallet | Read own plan/usage only | No AI refunds, payments, fee bypass, subscription mutation; manual admin review only |
| Settings / Account / Passkeys | Read safe non-secret preferences | Never touch credentials, device sessions, MFA, RLS or auth as AI actions |
| SEO Engine (future vendor page) | Audit only the **approved public listing**; draft suggested title, copy and schema based on evidenced fields | No external site connect/edit until domain proof, separately granted OAuth/CMS access and exact draft approval |
| Admin / Platform data | **DENY** for vendor AI, regardless of natural-language model prediction | Never accept client-supplied user ID or `role` claim, ignore injected instructions |
| Other businesses | Public approved profile details only, just like anonymous visitors | Never read other owner’s leads, campaigns, billing, analytics or private drafts |

**Server path for any future action:** authenticated `getUser()` → selected business `owner_id = auth.uid()` AND `status=approved` → strict RLS and data minimization → per-tool allowlist/cost limits → exact-action approval and consent → verified provider/domain capability → idempotent action receipt → revocation/retention audit. The model's classifier and confidence score never grant permissions. A request to ignore these rules is denied independent of model output.

## 5. SEO Engine — phased automated workflow
**SEO-00 (this PR, low risk):** public approved business page canonical/indexability/structured data, public sitemap refresh and tests.

**SEO-01 (next):** owner-facing `SEO Overview` for every approved business: business-name searches, consistent NAP, title/description preview, LocalBusiness checks, service/region keyword suggestions; Sinhala/Tamil/English drafts; no invented categories/services/reviews; explain Google indexing not yet verified. Add field provenance and before/after owner preview. Optional approved business public SEO health metrics, not fabricated ranking.

**SEO-02 (after API consent):** official Google Search Console property for `www.slbusinessindex.com` (verified by site owner), submit/check sitemap using supported Search Console mechanisms, monitor impressions/clicks/indexing diagnostics per URL; exact owner-permission scopes. Search Console API does **not** guarantee indexing. The separate Google Indexing API is restricted to JobPosting or BroadcastEvent video pages and MUST NOT be used to spam ordinary business listing URLs.

**SEO-03 (own domain):** business owner enters domain; backend normalizes HTTPS hostname, forbids IP/private-network/localhost and redirect SSRF, generates high-entropy one-time domain verification challenge; owner adds an SLBI-specific DNS TXT/hosted file, server verifies DNS/host over safe resolver, binds to exact owner/business/domain + expiry and rechecks regularly; only then create a website SEO connector. Domain ownership proof ≠ write permission to website or Search Console. For automated edits, separately obtain minimum-scope CMS/platform OAuth or owner-approved script/patch; scoped encrypted tokens, audit/revoke, host pinning and rate limits. Never request raw CMS admin password.

**SEO-04 (owner-controlled actions):** safe proposed schema, metadata, sitemap and content changes for own website; owner previews and approves each site change or a narrowly scoped explicit automation policy. External site gets its **own self-canonical URL**; SLBI listing stays canonical to itself; link only verified site. Allow a **visible opt-in "Powered by SLBI" on-site badge/footer**, not a fabricated Google search-result label. Search engines choose actual title/snippet; SLBI cannot force branding underneath the owner's URL. Do not create paid backlink/link-exchange spam.

**SEO-05 (AI research to production only after evidence):** human-reviewed and consented source data, de-identified feature/label tracking, truthful multilingual content, evaluation against deterministic rules/Google Search Console, a held-out business/time set, hallucination/error reporting and shadow mode; no opaque Google rank promises or scaled low-value AI pages.

## 6. SEO verification and communication
Google official documentation:
- Build a sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- LocalBusiness: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Canonicals: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Search Console ownership DNS TXT: https://support.google.com/webmasters/answer/9008080
- Search Console sitemap submit: https://developers.google.com/webmaster-tools/v1/sitemaps/submit
- Indexing API restrictions: https://developers.google.com/search/apis/indexing-api/v3/using-api
- Avoid scaled AI spam: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content/

**Do not guarantee Google first position, crawl date, actual index inclusion or "Powered by" search-result appearance.** This is an SEO product and software capability roadmap, not direct control over Google algorithms.

## 7. Release gate and next-chat handoff
- GitHub PR and exact head CI: pending
- Squash merge to main: pending
- Vercel production READY exact SHA plus www alias: pending
- Actual public live view-source canonical, robots/sitemap and owner/non-owner physical QA: pending
- Deepnote ML-08: **SUCCESS** (metrics listed above), no production model promotion, no live permissions.

**Next chat prompt:** Continue SLBusinessIndex GrowthOS in Tamil. Read `docs/growth/HANDOFF_LATEST.md`, `docs/growth/SEO_ENGINE_SECURITY_ARCHITECTURE_20261126.md`, `AGENTS.md`, and actual main code. Owner paused Meta-dependent WhatsApp business onboarding pending sole-proprietorship verification; preserve NeuroGrowth training and prioritize SEO Engine. SEO-00 adds approved-only canonical self URLs, factual LocalBusiness schema, nonapproved noindex, www sitemap revalidation 300s and safe robots, tests in Verify Next.js Build. Deepnote ML-08 synthetic trilingual research SUCCEEDED 216/72 with accuracy 0.6806; safety recall too weak, never authorize from model. Release only after exact-head 16+/16 green, main squash and Vercel READY same SHA/www. Next SEO-01 should be simple owner SEO health page with no fake rankings. Own domain SEO requires actual owner DNS/HTML proof, separate CMS/Search Console authorization, no SSRF, backend RLS and per-action approval; opt-in site footer badge only. Never use Google Indexing API for directory listing pages, fabricate Google results or promise top rank. Preserve prior Connectors/home GPS fix, no production SQL migrations/provider activation and no real user data training.