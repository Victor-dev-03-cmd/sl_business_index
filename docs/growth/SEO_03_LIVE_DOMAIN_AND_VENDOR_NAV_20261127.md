# SEO-03 Live Domain Proof + Vendor Topbar Collision Fix — 2026-11-27

## Owner priority
Owner rejected preview-only SEO UI and reported overlapping vendor topbar menus. Requested professional Inter typography, restrained font weight, workable domain input, Vercel DNS provider and a real production ownership verification flow. Owner is open to a sidebar in place of overcrowded topbar menus.

## Source audit
- Vendor `app/vendor/layout.tsx` centered seven primary entries plus Tools/Account **absolutely at left-1/2**, ignoring the occupied width of logo, notifications, account, and quick-actions. That could collide at laptop/desktop widths.
- SEO-01 `SeoEngineWorkspace.tsx` was only a domain guide; no persistence or actual TXT resolution. Production `public` schema has no SEO domain connection table (read-only check).
- Vercel Production has an existing `SUPABASE_SERVICE_ROLE_KEY` secret (key *presence only* verified, value was never decrypted/exposed); service-only route can connect with publishable Auth used separately for ownership verification.
- Actual Inter next/font variable `--font-inter` already loaded in root layout.
- Vercel current documentation: Domains → select a domain → DNS Records; **only** if Vercel hosts DNS. When the website is deployed on Vercel but the domain's nameservers are elsewhere (e.g., Cloudflare), DNS changes must be made at the authoritative DNS host.
  https://vercel.com/docs/domains/managing-dns-records
  https://vercel.com/docs/domains/set-up-custom-domain

## Implementation
1. **Navigation shell**: tiny fixed-height flex topbar with brand, Overview, SEO Engine, My Businesses, search/quick actions, notification and account. **No absolute centered menu.** All other tools appear in a user-collapsible 226px → 70px desktop side menu, and an accessible Escape-dismissible mobile drawer, grouped Workspace / Growth / Account. All routes preserved and all items available. Orange/black/white only, native Inter and normal font weights.
2. **SEO page**: redesigned compact real-work sections (profile selector, live owner-approved listing status, factual profile completion checks, actual SEO metadata snippet, direct Edit Business; Google indexing correctly unmeasured without Search Console). `SeoDomainConnector` presents a real external-domain proof flow rather than a demonstration or fake badge.
3. **Database migration** `supabase/migrations/20261127060000_seo_domain_connections_owner_rls.sql`: new `public.seo_domain_connections` with unique business/domain, hashed? *No*—unguessable random challenge visible only to owner, creation/verification expiry/last_checked timestamps, owner and business IDs, status verified/pending constraints. Clients have **SELECT only** and owner+business RLS; no authenticated insert/update/delete grants. Server service key never sent to browser. Changes only create a dedicated new table and grants/RLS; no alterations to existing business rows/payments/subscriptions/Meta.
4. **Live endpoint** `POST /api/vendor/seo/domain`, actions `start`, `verify`, `disconnect`:
   - JSON only, same-origin, 1400-byte limit, fresh server Supabase `auth.getUser()`, deny anonymous, exact RLS-owned selected business; no arbitrary owner IDs accepted. No Pro or Verified badge gate. Server-only service-key lookup and writes after authorization, fail-closed if unavailable.
   - Start creates a cryptographically random per-owner/business/hostname challenge stored under `_slbi-verify.{hostname}` as DNS TXT value `slbi-verify=<48-hex>`. Hostname strict public-domain parser, blacklist internal/reserved and SLBI's own hostname, UNIQUE host/business protection.
   - Verify resolves **TXT only** on fixed host through Node.js DNS. No HTTP fetch, proxy, arbitrary port, redirects or IP SSRF. Fail-closed on absent/timeout/error, throttle 30s via last_checked_at. On exact TXT match, mark `verified`, record timestamps and 30-day expiration.
   - Disconnect deletes the owner/business proof row after confirmation. Does not remove external DNS TXT, alter registrar settings or affect the owner's website.
5. **Vercel** included with GoDaddy/Namecheap/Cloudflare/Hostinger/Other and provider-specific DNS navigation. Dynamic full record name and value are copyable. User never shares registrar login; record is not presented until server returns the real value.
6. Security + UI source tests updated; new `tests/seoDomainProductionSecurity.test.mjs` wired to Verify Next.js CI. User should retest at 1024–1920 desktop and Android/iOS after release.

## Important product boundary
Real DNS verification only proves that an authenticated SLBI owner can edit TXT under that domain. **It does not transfer DNS/domain, grant Google Search Console access, verify Google indexing or allow SLBI to edit site metadata.** For real external website optimization, follow-on opt-in CMS or Search Console OAuth with scoped permissions, redirect/SSRF defenses, explicit diff preview and action audit is required; do not fake a connection beyond confirmed DNS ownership or ranking outcomes.

**No Meta WhatsApp changes, no paid plan bypass, no Google Indexing API for business pages, no AI training on real customer records.**

## Release checklist
- PR exact-head CI: pending
- Production DB migration application+RLS/grant validation: pending
- GitHub main merge: pending
- Vercel READY matching merge SHA and www alias: pending
- Live unauthed read protection and status checks: pending
- Authenticated owner cross-account RLS, real customer DNS record and physical laptop tests: pending; MUST NOT claim physical DNS proof or external-site edits without actual owner TXT
- HANDOFF_LATEST updated in same PR

## Next-chat
Continue SLBusinessIndex in Tamil. Read main `docs/growth/HANDOFF_LATEST.md` and `docs/growth/SEO_03_LIVE_DOMAIN_AND_VENDOR_NAV_20261127.md`. Owner demanded no preview-only SEO and fixed overlapping dashboard topbar. PR candidate `fix/vendor-nav-seo-live-domain-20261127` rewrites navigation as flex topbar + collapsible sidebar/mobile drawer and redesigns vendor SEO in Inter with real DNS TXT domain proof flow, backend RLS owner check, Node TXT resolver, rate limits/expiry, persisted status, Vercel provider guide. Require full exact-head CI green and review SQL; apply additive `seo_domain_connections` migration with RLS SELECT-only to authenticated if permitted, verify DB policy and grants, merge to main, Vercel READY matching SHA/www and unauthenticated route denial. Real signed-in account/domain test and browser QA still required; don't claim verified until someone adds actual TXT. No Google site edits or Search Console OAuth yet. Preserve owner-only dashboards, no Meta/Wallet/credits changes.
