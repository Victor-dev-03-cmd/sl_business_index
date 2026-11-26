# SEO-04 — Two real ownership methods (DNS TXT + HTTPS File)

**Owner decision, 2026-11-27:** Customers who bought their own domain should use the already-live DNS TXT proof. Customers with free hosted subdomains such as `laxsan-dev.vercel.app` must be supported without forcing domain purchases or attempting to edit `vercel.app` DNS. They must still deploy their own file to prove control.

## User experience
1. Vendor Dashboard → SEO Engine → Your own website → choose owned business.
2. Enter `yourbusiness.lk` or `laxsan-dev.vercel.app`; `*.vercel.app` automatically selects **HTTPS File Verification** and Vercel provider.
3. Choose:
   - **DNS TXT** for a custom domain: add `_slbi-verify.{hostname}` with the unique `slbi-verify=<random>` value, then Verify DNS.
   - **HTTPS File Verification** for Vercel free domains and websites you can deploy: create `public/.well-known/slbi-verification.txt` in a Next.js/Vercel repo containing ONLY the unique `slbi-verify=<random>` value, deploy, open `https://{hostname}/.well-known/slbi-verification.txt` and click Verify HTTPS File.
4. The server checks the exact proof and saves verified status with a 30-day expiry. Both methods share the existing Start/Verify/Disconnect workflow, per-business owner scoping and real database receipts. This does **not** write to the customer website.

## Architecture and security
- New additive Supabase migration: `verification_method text not null default 'dns_txt'` constrained to `dns_txt` or `http_file`. Existing claims remain DNS TXT, owner RLS/read-only client grants unchanged.
- Start: authenticated `auth.getUser()`, owner-bound businesses RLS, same-origin and exact JSON fields, rate-limited, crypto-random 48-hex challenge. If method=DNS and hostname is `*.vercel.app`, `*.netlify.app` or `*.pages.dev` return a helpful error, not a misleading DNS instruction. No claiming `vercel.app` apex or SLBI platform domain. Switching proof methods rotates token, clears any old verified status.
- HTTPS proof: server-only Node HTTPS GET to **one fixed path** `/.well-known/slbi-verification.txt` on a validated hostname, port 443. No user-supplied URL/port/path/headers; no URL redirects; must be HTTP 200, plain text or octet stream, body <=512 bytes and EXACT expected token. Resolve IPv4 A addresses first; reject any local/metadata/private/shared/multicast/test/reserved addresses and pin a vetted public IP to the TLS socket. Preserve hostname SNI/verified certificate. Avoid DNS rebinding, SSRF, unbounded fetch, redirect to internal infrastructure or HTML challenge pages. IPv6-only endpoints fail safely pending further reviewed support.
- Atomic database throttle before any DNS/HTTPS lookup, 30-sec retry, 6.5-second bounded network call, no write permissions from frontend, no cross-tenant access. 30-day proof validity and explicit Disconnect.
- Client shows clear factual states. The issued file token is a public proof, not an API secret. It must remain owned by SLBI account/domain and should not be copied to untrusted websites.
- Search Console ownership, automated CMS edits, Google indexing, Google ranking or an optional “Powered by SLBI” website badge **are NOT granted by DNS or file verification**. Separate owner authorization and scoped CMS/Search Console connector is required for actual external-site SEO editing.

## Release gates
- GitHub PR exact-head CI (Next.js/Bun, SEO domain security, G0/G1/P1/P2): pending
- Additive database migration and read-only RLS/grant audit: pending
- Main merge, exact Vercel Production READY SHA and www alias: pending
- Unauthenticated route denial: pending
- Owner authentication and physical `laxsan-dev.vercel.app` file deployment + end-to-end Verify HTTP: pending; do not claim someone has linked their site without the actual file.

## Reference and next chat
- Prior actual deployed DNS ledger: `docs/growth/SEO_03_LIVE_DOMAIN_AND_VENDOR_NAV_20261127.md`
- Vercel docs: `public` static files become public deployment assets; `/.well-known` cannot be rewritten/redirected, so use a real static file. Vercel's free `vercel.app` domain does not give tenants DNS TXT access.
- Google docs: a proof method does NOT affect crawler ranking, while authentic public content, crawl access and a valid sitemap support discoverability.

**Next chat:** Continue SLBI in Tamil. Read GitHub main `docs/growth/HANDOFF_LATEST.md` and `docs/growth/SEO_04_DUAL_DOMAIN_OWNERSHIP_20261127.md`. Owner approved two actual domain verification methods. Branch `feat/seo-http-file-verification-20261127` extends existing RLS owner-only SEO domain table with constrained method and server HTTPS proof at fixed public .well-known path, DNS rebinding SSRF protection, bounded content and no redirects. UI supports DNS for custom domains and HTTP file for Vercel free subdomains. Require exact-head CI full pass, apply additive migration, verify RLS, merge and Production READY SHA/www. No fake Google Search Console, CMS edits or rank guarantees. Real customer file test remains owner action; don't claim until verified. Update HANDOFF_LATEST for follow-ups.
