# SEO-01 — One Easy Owner SEO Engine (Unverified Ordinary Businesses Included)

**Decision:** On 2026-11-27, owner clarified SLBI SEO must behave like one easy AI Engine, not a set of confusing tools. ALL registered business owners should be able to prepare SEO, regardless of Pro subscription or blue business-verified badge. Once an SLBI listing is approved/published, its real profile URL becomes eligible for public SEO and automatic sitemap discovery. Pending/rejected/suspended records remain private, never shipped to Google merely because an owner requested SEO.

## Source-backed constraints
- Existing code: `app/sitemap.ts` publishes `businesses.status = 'approved'`; `app/business/[slug]/page.tsx` marks other statuses noindex; `lib/seo/public-business.ts` produces canonical `https://www.slbusinessindex.com/business/{slug-or-id}` and approved-only schema. **`is_verified` is a separate optional badge**, NOT equivalent to `status='approved'`.
- Google's docs: Sitemap and periodic discovery can help crawling but cannot guarantee indexing/first position. Ordinary business detail URLs are not eligible for the Google Indexing API, which is restricted to JobPosting and livestream event content. Search Console requires ownership verification and Google determines snippets.
- Deepnote NeuroGrowth ML-08 research is **synthetic-only** with 68.06% held-out accuracy and weak forbidden/SEO recall. The UI currently uses **transparent deterministic checklist rules**, NOT a live trained model or Google APIs.

## Implemented SEO-01 (read-only, all paid/free accounts)
1. `/vendor/seo` server page does fresh `supabase.auth.getUser()`, then RLS `businesses.select(...).eq('owner_id',user.id)` only. Fails closed on query error; no service-role, tenant IDs from the browser, subscription/Pro checks or verified-badge gate.
2. Accessible **SEO Engine** primary topbar link and compact navigation, also in Cmd/Ctrl+K Quick Actions. Orange/black/white layout consistent with owner portal; no extra prompt required.
3. **My SLBI Profile**: choose owned business; Published vs Awaiting Review status distinct from blue Verified badge. Read-only profile completeness 0–100 (NEVER a Google SEO/rank score), factual checklist with direct Edit Business link, factual Google snippet preview, copy/open PUBLIC profile only when approved; sitemap eligibility explained; true Google indexing status displayed as **unknown, not connected**. Search discovery flow: submit → approve → automatic sitemap refresh → Google decides crawl/index.
4. **My own website**: domain entry and provider pick (GoDaddy, Namecheap, Cloudflare, Hostinger, Other), then three human-readable instructions with provider-specific navigation (GoDaddy / Namecheap / Cloudflare / Hostinger / Other). Presently **GUIDE PREVIEW ONLY** — no live TXT challenge, account proof, permanent domain binding, remote fetch or write, Search Console connection, real CMS editor, or misleading Connected badge. Owner's stored website_url can prefill guide but is NEVER treated as ownership proof. Switch business resets in-memory domain inputs. No password requested.
5. Optional **Powered by SLBI badge preview**, not an external-site mutation or Google-result markup.
6. `lib/seo/owner-readiness.ts` pure preparation scorer and safe display-only domain hostname parser. No external network calls. Ordinary approved business can score and be published even with `is_verified=false`; pending can prepare but remains nonpublic.
7. Fixed legacy SEO-00 description fallback `verified public listing` to just `public business listing`, avoiding false verification claims. `app/sitemap.ts` now deduplicates categories after slug normalization; a live prior audit found duplicate event-planner category URL.
8. Tests: `tests/seoVendorEngineReadiness.test.mjs` in Verify Next.js CI, plus existing SEO-00 tests. No DB migrations, paid models, Meta/Gmail/calls/provider actions or hosted Search Console credentials.

## Planned AI SEO Engine phases (NOT activated)
- **SEO-02**: Google Search Console verification for the SLBI site. Submit sitemap ONCE then check indexing/CTR/impressions and errors on supported APIs; auto-refresh local sitemap on legitimate publishing. No continuous spam submits or ranking guarantee.
- **SEO-03**: optional customer-owned domain onboarding: friendly 3-step UI; official high-entropy per-business/owner/domain token, DNS TXT or HTTPS file proof, secure resolver/SSRF protections and revalidation; encrypted credentials, explicit owner approval, CMS integration separate from domain proof. Logged state per domain in isolated server owner/RLS ledger requires separately approved database migration/security review before activation. User chooses which website platform; show screenshot-appropriate instructions as verified provider patterns. Never request domain registrar password.
- **SEO-04**: optional SEO edits with explicit review receipt and audit; generate factual title/description/FAQ/service structured data only from owner-approved claims; exact-item owner approval + version conflict; own website remains self-canonical. Opt-in Powered by SLBI website footer badge only; search result presentation not controlled by SLBI.
- **SEO-05**: integrate a safe, separately validated multilingual AI recommendation layer once sufficient labeled, consented data exist; model outputs remain suggestions not grants. RLS/authorization always server-side, no other vendor data, no bulk AI spam, no inaccurate revenue/ranking claims.

## Privacy/security gates
- Vendor cannot read other tenants' private leads/marketing/email/credentials; owner ID always derived from server Auth UID.
- A published business is NOT necessarily blue-badge verified, and SEO must not claim otherwise.
- Read-only SEO does not change payment/subscription; no free bypass because it has no paid entitlement gate.
- New domain or Search Console write actions require independent verified ownership, consent, scoped OAuth, auditing and revocation. Client domain parsing is merely form hygiene, NEVER SSRF/network authentication protection.
- CI tests are source/pure validation; a real logged-in customer browser/phone QA check remains necessary.

## Release gate
- PR: pending
- Exact-head CI: pending
- Main merge: pending
- Vercel READY exact main SHA & www alias: pending
- Real owner/BASIC account, approved ordinary, pending and disconnected domain visual acceptance: pending

## Next-chat prompt
Continue SLBusinessIndex in Tamil. Review actual GitHub main `docs/growth/HANDOFF_LATEST.md`, `docs/growth/SEO_01_EASY_OWNER_ENGINE_20261127.md`, `docs/growth/SEO_ENGINE_SECURITY_ARCHITECTURE_20261126.md`, and code. Owner demands one simple SEO AI Engine: no Pro requirement or verified badge; approved ordinary listing becomes public with dynamic sitemap while pending owners can prepare. SEO-01 branch `feat/vendor-seo-engine-guided-workspace-20261127` adds RLS owner-only `/vendor/seo`, primary link and command search, human SEO checklist/search preview/auto-sitemap explanation, domain provider wizard GUIDE ONLY and optional site credit preview; source tests; dedup sitemap; no external connection or Google Indexing API. Verify CI full green before merge. Then verify READY exact SHA, www alias and ideally live published ordinary page and sitemap. Continue SEO-02 Search Console and SEO-03 domain connector ONLY with separately approved server verification, RLS and audited owner consent. Preserve SEO-00, GPS, Navbar and WhatsApp connectors; don't claim live AI trained, actual Google indexing or customer domain linked.
