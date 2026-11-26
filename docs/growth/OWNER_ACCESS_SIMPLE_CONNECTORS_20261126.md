# Owner-only Studio access + simple Connectors

**Date:** 2026-11-26 (Asia/Colombo)
**User decision:** Stop adding complex planning UX to Connectors. The twelve Marketing Studio apps are distinct tools. Plugin & App Connectors must be: grid -> choose an app -> see simple requirements -> connect only when the official integration is truly enabled. Remove AI prompt box from the WhatsApp setup path. The approved owner account should see all 12 workspace routes and **no PRO badges**, but only for its exact signed-in email.

## Read-only evidence
- Production Supabase read-only verification: **exactly one** `growth_entitlements.payment_reference = SLBI_INTERNAL_QA_NO_PAYMENT_20261114` row; it belongs to the confirmed Auth identity for the exact owner email. No SQL writes or Auth changes.
- Existing `lib/marketing/pro-access-server.ts` gates all premium server layouts and most marketing APIs using verified entitlements. Existing `lib/marketing/poster-review-access-server.ts` already recognizes that trusted internal QA marker for two private tiles.
- All twelve Marketing Studio apps have distinct routes; some were hidden by a global `marketing_studio_app_rollouts` Coming Soon flag even for approved QA. This release does **NOT** alter the global rollout table or release flags.

## Candidate changes in branch
1. `lib/marketing/owner-studio-identity.ts` checks exact canonical Auth email, real confirmed email timestamp, UUID, and non-anonymous status. **Only use with server-side Supabase `auth.getUser()` identity.**
2. `getMarketingAccessForUser` checks the existing trusted DB QA marker (RLS-limited by the authenticated UUID), re-fetches the real Supabase Auth user, verifies matching userId plus exact confirmed owner identity. This one account gets `allowed:true, ownerStudioAccess:true, plan:null, reason:owner_access`. Other accounts still require verified, unexpired Professional/Enterprise entitlement and server API checks. No global Pro removal or arbitrary email from HTTP bodies.
3. Marketing Studio shows all 12 openable routes, no Pro badge or upsell for this verified owner; unreleased functions are still honestly labeled in development. Other vendors retain normal release gating.
4. The Marketing Studio hero routes to **Plugin & App Connectors**, not the Growth Operator prompt page.
5. New `ConnectorGrid.tsx`: a concise, responsive app grid for the twelve official adapter candidates, with one-at-a-time requirements. No prompt, fake provider connection, token storage, auto-send, or unfounded app access. Existing Gmail OAuth preview only stays behind an explicit Preview configuration and cannot be activated in production.
6. WhatsApp detail at `/vendor/marketing/whatsapp` becomes a simple ownership-aware setup requirements page: approved listing, owned WhatsApp Business phone, official Meta Tech Provider/App review and per-vendor secure signup. **Connect is disabled**, accurately, until official onboarding is implemented/approved. No Meta sandbox shared number is linked to the vendor. The old WA-04 operator and WA-03 UI code remains in repo for legacy/testing but is NOT embedded in Connectors.
7. Remove unrelated Marketing Engine module tabs and internal P2/Pro text from the Connectors page; preserve shared module nav on other pages.
8. Update source contract tests and add owner/tenant no-fake-connection tests.

## Scope and limitations
- This does **not** enable unbuilt features, paid AI credits, provider permissions, Gmail production OAuth, vendor WhatsApp phone linking, social publication, calls, AI auto-response or marketing sends. A workspace route can open yet still show planned/foundation functionality. No production SQL, migration, token changes or providers.
- This grant applies to marketing tool access **only**; it is not an admin privilege, billing bypass, role mutation or broader RLS bypass. Maintain client RLS business/owner separation.
- Previously exposed Meta credentials should be rotated outside chat/screenshots when safe.
- Existing GPS, G0, consent, backup and physical device QA blockers stay unresolved.

## Verification and release status
- Exact-head CI: pending
- PR merge: pending
- Vercel READY and www exact commit: pending
- Real signed-in owner/mobile QA: pending

## Acceptance checklist
- Sign in as the exact confirmed owner with existing approved QA grant: all 12 tiles have normal Open buttons; no PRO badges, no billing CTA on Marketing Studio. Other vendors have unchanged Pro and release gating.
- Click Plugin & App Connectors: immediate grid, WhatsApp -> a simple setup page with *no prompt*, Gmail/Facebook/etc -> compact requirements, no fake Connect success.
- Production Gmail, Facebook, Instagram and WhatsApp: never claim connected unless a provider verified link exists. OAuth Preview remains Preview only.
- Verify all CI and exact Vercel READY before claiming production; test owner + another Basic vendor on real browser.

## Next-chat prompt
Continue SLBusinessIndex GrowthOS in Tamil. Read docs/growth/HANDOFF_LATEST.md, AGENTS.md and docs/growth/OWNER_ACCESS_SIMPLE_CONNECTORS_20261126.md. Owner explicitly ordered ONLY two fixes: remove PRO badges/open all 12 Studio routes for the **existing confirmed owner QA identity** with its exact trusted grant, and simplify Connectors into an app grid with app-specific setup instead of a confusing AI request prompt. Inspect branch fix/owner-access-simple-connectors-20261126, run full exact-head GitHub Actions CI and resolve failures. Merge only after all-green. Verify Vercel READY matching merged main SHA and www.slbusinessindex.com alias. No claim that WhatsApp/Meta/Facebook/Gmail can connect until official onboarding OAuth is actually enabled and provider approval granted. Do not alter other subscribers' entitlement or production SQL; keep G0 blockers, privacy, Meta webhook safeguards and true separate consent/approval.
