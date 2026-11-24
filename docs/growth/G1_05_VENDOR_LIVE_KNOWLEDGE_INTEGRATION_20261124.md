# SLBusinessIndex G1-05 — Live owner-scoped Knowledge Summary on three vendor pages
2026-11-24. Production target after exact CI and merge. **This change adds real user-facing UI and a read-only authenticated G1 API**, unlike previously shipped inert G1-01/04 library code.

## Exactly which pages change
1. `/vendor/my-businesses`: new **Business Knowledge** panel below listing allowance. Approved owned-business selector, fields and navigation to edit/gallery/Marketing.
2. `/vendor/gallery-services`: same panel below existing Gallery & Services editor. Reflects selected approved business; Refresh retrieves saved changes. Pending listings get a clearly stated "not published" notice.
3. `/vendor/marketing`: same panel after existing statistics and before Marketing App Store, scoped to owned and approved business. Does not change existing Basic/Pro app gating, provider connections, credits or campaign generation.
4. `/api/vendor/g1-knowledge?businessId=<UUID>`: new GET-only, no-store, cookie-scoped SSR `auth.getUser()` via existing owner read port; owned approved business checked before querying brand/profile. Brand/related rows owner-bound and response allowlisted. No customer data/brand offers/guidelines/gallery object paths forwarded. Status 404 without enumeration and 503 for source failures.

## Exact status semantics
- **LIVE G1 knowledge read-only panel** after successful Vercel exact-sha READY verification and signed-in vendor smoke. CI alone does not prove real vendor credentials; **real signed-in A/B QA is still pending**.
- **NOT LIVE: marketing AI auto-context, caption/poster prompt injection, social auto-publish, payments, provider connections, G1 write flows.** This phase only shows permitted business knowledge to its authenticated owner, including brand and service counts. No new migrations.
- **NOT APPLIED: G0 legacy anonymous view counter/review cache/lead migration candidates**. Independent new encrypted backup, isolated restore and verified separate external physical drive are not evidenced; do not run SQL blindly. G0 foundation still 0/7 accepted.
- Database SELECT-only catalog checked 2026-11-24: `public.businesses`, `public.social_brand_profiles`, `public.business_profile_content` all have RLS and required columns. RLS includes owners, and public-approved listing/profile policy; G1 explicitly binds owner_id, listing status and related business_id.

## Release checklist
- Run Node static API/page contract test and existing G1 Bun test suite.
- Confirm entire branch SHA CI green (Bun, TypeScript, Next, RLS/regression).
- Merge exactly tested SHA via squash into main. Verify Vercel `target=production`, `READY`, matching merge commit, alias `www.slbusinessindex.com`, `aliasError=null`.
- Real authenticated vendor testing can be performed by owner at the 3 paths; do not claim verified real sessions from synthetic CI.
- No production SQL migrations, new provider activation, payment changes or paid resources.

## Next chat handoff
```text
Continue SLBusinessIndex in Tamil. First check exact main and Vercel production SHA and G1-05 release status at docs/growth/G1_05_VENDOR_LIVE_KNOWLEDGE_INTEGRATION_20261124.md. G1-05 adds actual authenticated read-only GET /api/vendor/g1-knowledge and visible reusable Knowledge panel to My Businesses, Gallery & Services, Marketing Studio; approved business and getUser ownership gate, no AI auto-context. Verify real logged-in vendor A/B and mobile/desktop, check brand/gallery counts; fix bugs and deploy after green CI. The following are NOT complete: Marketing AI prompt context/autopost; G0 security migrations; real physical GPS; owner 7 G0 gate acceptance (still 0/7), encrypted backup/restore/external copy. Never run production SQL without separately verified recovery and scoped release approval. Manual admin-reviewed refunds only, marketing provider boundaries unchanged. Keep a single release branch and concise page-by-page production report.
```
