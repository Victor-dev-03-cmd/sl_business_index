# SLBI Marketing Engine | LIVE IMPLEMENTATION STATUS

**Latest 12-app execution matrix (2026-11-14):** [Marketing Studio 12-App Execution Handoff](MARKETING_STUDIO_12_APP_EXECUTION_HANDOFF_20261114.md). Source-only Calendar and Billing staging, P2-05/Pro gates, owner BOC branch pending. Nothing newly live.

## 2026-11-14 — LATEST OWNER HANDOFF: Billing QR + Marketing Studio App #10

**Cross-chat contract:** Update GitHub AGENTS.md + master handoff + live ledger after each meaningful completed milestone. At the start of each new chat read their latest main versions. Record exact SHA, CI, production status, blockers, next actions. Do not imply background/asynchronous work beyond an active chat turn.

**Deployment limit:** User requests no repetitive Vercel Preview deployments due to daily quota. Use source-only staging and CI/local verification first; deploy only when a reviewed feature is approved. Documentation changes must not silently turn on any app, gateway or paid features.

**Billing decision:** Approved payment channels are **BOC Flex/SmartPay Merchant LankaQR** and **Payments.lk ONLY**; WEBXPAY excluded. User personally contacted BOC hotline and attempted SmartPay merchant enrollment three times; final Enroll button did not respond. BOC advised SmartPay or nearest branch. Owner plans visiting BOC branch **Monday 2026-11-16** to register and obtain merchant LankaQR. Owner will share QR PNG/JPG/WebP after approval. A personal/P2P QR is not a verified Merchant LankaQR. Never request banking login, OTP, secret credentials or full account details. A static QR is not automatic transaction verification. Bank settlement must be independently reconciled before activating paid entitlements.

**Billing code is STAGED ONLY:** Detached/non-branch commit [371857bf402e342aec439517976b0946fae81166](https://github.com/Victor-dev-03-cmd/sl_business_index/commit/371857bf402e342aec439517976b0946fae81166) contains owner-authenticated read-only BOC QR options, awaiting_payment / server-confirmed quote gate, existing vendor Billing request confirmation UI, Payments.lk sandbox adapter and handoff guide. Not merged, not CI build-tested, not deployed; no online checkout, live payment or bank account connected. Payments.lk merchant approval, official API/keys/webhook verification and single billing authority still required. See staged docs/growth/p2/BOC_LANKAQR_PAYMENTS_LK_BILLING_HANDOFF.md. Final Basic/Plus/Pro pricing and Admin Dashboard redesign deferred pending owner decisions.

**Marketing Studio app #10:** The 10th of 12 marketplace cards is Content Calendar (ID content-calendar). Current production page is informational only. Detached/non-branch source commit [de258220fcb8ceda73efeff2c161dd77f39b3dca](https://github.com/Victor-dev-03-cmd/sl_business_index/commit/de258220fcb8ceda73efeff2c161dd77f39b3dca) stages read-only owner-scoped monthly grid, Colombo timezone, owned-business filter and real saved campaign planning records. Not merged, not CI build-tested, not live. No worker, auto-post, mail sending, provider receipts or scheduling side effects.

**Live database verified 2026-11-14:** marketing_studio_app_rollouts has 12/12 coming_soon; ZERO apps promoted live. Existing Basic Campaign Planner /vendor/marketing/campaigns and Leads CRM /vendor/leads remain independently accessible. Do not set any marketplace app to live without individually passing tested release gates. 10 premium apps should be delivered incrementally; never claim 10 live merely because UI foundations exist. Pro entitlements, provider access, managed KMS and production verified billing remain gating dependencies.

**Next chat / next steps:**
1. Inspect latest GitHub main SHA; read this handoff, master context, P2 live ledger and marketing rollout runbook. Check Supabase and Vercel status independently.
2. Owner obtains and supplies *merchant-approved* BOC QR; check actual Merchant LankaQR classification, store QR image as approved asset, wire into existing pending Billing request confirmation only after owner quote staff approval; no screenshot-based verification.
3. Review and run tests / Next build for staged Content Calendar detached commit against current main, improve date-window/pagination and actual two-tenant browser/pro-entitlement tests; preserve planning-only status. Avoid preview deployments.
4. Complete legacy P2-05 campaign RLS hardening in tested versioned migration before any durable P2-06 scheduler/publish flow. Protect historical posted row and Basic owner planning.
5. Integrate Payments.lk only after approved merchant credentials, official current API docs, immutable server-issued order, signed webhook, idempotency, bank reconciliation and authorization tests; do not take live payments without review.
6. Deliver the remaining Premium Marketing Studio apps one at a time with provider permissions, spending controls, real E2E and release gates; finally update docs with committed SHA, passing CI and real deployment/migration evidence.
Last status review: 2026-11-14 | Timezone Asia/Colombo
This is the canonical, update-in-place state record across ChatGPT chats.
Canonical cross-chat handoff: docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md on GitHub main
Companion architecture: docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md
Current code branch: main (P2 PR #68 merged 2026-11-14)
Historic development branch: phase2/marketing-engine-foundation-p2-01-20261113
Merged pull request: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68

## Current milestone
**Phase 2 Marketing Engine, owner-directed redesign and first-party connector architecture**.
Owner has approved broad development, NOT blanket third-party permissions, paid API fees or unsupervised external sends.
Owner's current priority sequence: Discovery existing; **Marketing now**; Growth after; SEO after Growth.
Product refinement: Marketing Studio must become an overview-only page, and Marketing Engine its own main workspace. Pro-only AI Customer Calls & Messages Agent and plug-and-play social/email connectors.

## Verified starting point (2026-11-13)
- Main: ffb9c14aebd658e7bbc662811d60defa49e175bd (P1 production release). Recheck every subsequent chat.
- Prior P2 branch head: 5088e0d7589c0f28f5bf4041a051635bb3d263b3; draft PR #68; CI 6/6 passed at that head; Vercel Preview READY.
- Previous P2 Preview: https://sl-business-index-qucjrvgnl-victor-dev-03-cmds-projects.vercel.app (preview, not production).
- Verified earlier Supabase public schema lacks P2 social_brand_profiles, marketing_ai_daily_limits, marketing_credit_jobs, marketing_ai_drafts and marketing_campaign_revisions.
- Current billing catalog includes Basic, Professional (UI nickname Pro) and Enterprise, and backend Growth Credits. The existing verified growth_entitlements were empty as audited; verify live before further changes.
- P2 live AI credit action switches ai_social_draft, ai_email_draft, seo_basic_audit were disabled. GROQ_API_KEY exists in Vercel secrets, but no production AI spending approved.
- No actual Facebook/Instagram/WhatsApp OAuth connection flow, no official social publishing, no Gmail/Outlook plug-in, no voice-call routing, no bulk email or durable marketing queue implemented at this checkpoint.
- Docker PostgreSQL owner-isolation, AI reservation/refund, campaign revision history tests passed; real vendor browser e2e for new P2 database actions not verified.
- No paid Supabase staging branch, no production P2 migration or P2 deploy performed.

## Implementation matrix — precise labels
| Module | Phase | State | Evidence / remaining |
|---|---|---|---|
| Discovery Engine | pre-P2 | EXISTING PRODUCTION | Multilingual/nearby discovery; no duplicate work |
| Marketing Studio Overview | P2 UX | CODED + 7/7 CI + VERCEL PREVIEW | Server-rendered overview-only KPIs and navigation; full manual campaign work preserved in /campaigns |
| Marketing Engine main page | P2 UX | CODED + 7/7 CI + VERCEL PREVIEW | Separate /vendor/marketing-engine landing, five Pro module routes, topbar navigation |
| Business Brand Profile | P2-01 | CODED + CI + PREVIEW | UI/API/RLS draft; Supabase P2 schema not live, save e2e pending |
| AI Caption Generator | P2-02 | CODED + CI + PREVIEW / DISABLED | Provider/gating drafted; no AI credits enabled or real provider e2e |
| AI Poster (generated background) | P2-03 | NOT IMPLEMENTED | Official/authorized provider and budget first |
| Editable Poster Studio | P2-04 | CODED + CI + PREVIEW | Four original templates, layers, PNG/JSON; no cloud project persistence |
| Campaign Library revision | P2-05 | SQL CODED + DOCKER TESTED | No production migration or revised UI/receipts |
| Durable Content Calendar | P2-06 | NOT IMPLEMENTED | Existing calendar = planning only |
| Official Social Connectors | P2-07 | GOOGLE START/CALLBACK CODED + DOCKER/CI VERIFICATION PENDING, PREVIEW-ONLY | Preview-only Google OAuth Start/Callback, verified OIDC UserInfo, encrypted token store, 5/hour start rate limit; no actual provider consent/live schema/KMS/real OAuth verified |
| SEO Intelligence | P2-08 | DEFERRED | Full SEO phase after Growth; shared schema only for now |
| Email Marketing | P2-09 | ARCHITECTURE APPROVED | Gmail/Graph OAuth, consent/suppression pending |
| Usage Credits | P2-10 | SQL CODED + DOCKER TESTED / DISABLED | Atomic reservation/refund, limits; live gates pending |
| Calls & Messages AI Agent | P2 OWNER ADDITION | RULE-BASED DEMO CODED | Local trilingual classifier, review/escalation; no inbound webhooks or telephony yet |
| Leads & workflow integration | P2 OWNER ADDITION | REUSE EXISTING CRM | Connect approved agent events to leads |
| Server-side Pro entitlement gate | CROSS-CUTTING | SOURCE MERGED / LIVE ENTITLEMENTS 0 | Pro/Enterprise gates on connectors, agents and premium APIs; **legacy manual campaigns intentionally Basic-accessible**; P2-05 owner RLS revision SQL is staging-only |

## Where to pick up in next chat
1. Check latest SHA of branch and PR #68. Read both this status and the master context document.
2. COMPLETED IN DEV BRANCH (verify CI): Split /vendor/marketing overview-only, preserve existing drafting at /vendor/marketing/campaigns, add /vendor/marketing-engine and five separate module routes.
3. PARTIAL: provider registry, disconnected-state UI, OAuth preview-only start/callback and server Pro checks are coded. Legacy manual campaign drafts remain Basic-accessible; premium connector and agent access is Pro-only. NEXT: reviewed versioned live migration with rollback, real test-account OAuth, managed KMS, revoke and browser acceptance.
4. Add Pro-only business Calls & Messages AI Agent admin UI and human-in-the-loop rule engine on existing Leads CRM.
5. Complete P2-05/06 durable campaign, approvals and provider receipts.
6. Implement official Meta onboarding, Google/Microsoft OAuth; send only with user/provider approval.
7. Update this status with exact CI/deployment SHA, tested readiness and blockers after EACH milestone.

## Audit rules
- Every new PR must update this file when implementation status changes.
- No “DONE” without checkable evidence; distinguish production from preview.
- No private API keys in docs, GitHub history or handoff PDF.
- Do not conflate a Facebook OAuth personal login with ability to control personal profile.
- No personal WhatsApp or Instagram consumer accounts via unofficial automation.
- Never re-enable disabled chargeable AI jobs without budget/approval.
- Preserve P1 production and existing Discovery Engine.

## 2026-11-13 — Marketing Studio / Engine split (step 1, awaiting CI/Preview acceptance)

**Code changes (P2 branch, no production change):**
- Replaced /vendor/marketing with SSR overview-only, genuine business/campaign/draft/planning counts and explicit plan status; no campaign composer embedded.
- Preserved the full old manual composer, branded PNG export and planning UI at /vendor/marketing/campaigns; legacy regression test reads the new route.
- Created /vendor/marketing-engine with five separate Pro module pages: social, email, agent, connections and automation. Product docs describe the limits honestly; no fake OAuth connection buttons or fake publishing.
- Registered twelve potential official social, mail, messaging and voice provider adapters in lib/marketing/engine-registry.ts, all planned/research, not connected.
- Added verified Pro/Enterprise check via server Supabase getUser + trusted growth_entitlements (expires_at + verified_at + payment_reference). Pro-only RSC layouts protect brand, captions, design, campaigns and engine module pages; Brand Profile and Caption APIs have additional server-side entitlement guards.
- Added English/Tamil/Sinhala local deterministic customer enquiry classification and human escalation; no outbound replies, call forwarding, NN model, user data persistence or API charges.
- Vendor top navigation has separate Studio and Engine links; correct active-route matching.
- New tests/p2MarketingEngineShell.test.mjs covering plan expiry, tenant access integration contract, no fake sends, route split and multilingual rules. Included in P2 release gate workflow.

**Not complete:** live OAuth, actual API account connection, production Supabase P2 schema, Pro-entitlement checks at *legacy direct browser Supabase marketing_campaigns writes*, paid AI calls, phone/WhatsApp messaging, email sending, scheduling worker, provider receipts. An updated P2-05 staging-only campaign RLS now checks verified Pro on direct INSERT/UPDATE, and the synthetic Basic/expired Pro negative tests pass. The LIVE production DB has NOT received this migration, so production direct writes remain under old behavior until versioned rollout. No live business owner browser E2E has been performed for P2.

**Latest verified Step 1 application checkpoint:** Source SHA `ac1f1e565245976517531f4cba99cf9ba236d576`, seven relevant GitHub workflows PASS (P1 + P2 + billing checks), Vercel Preview READY (deployment `dpl_4gLbEqmaywHtnJFxABfYqYNcUdL9`): https://sl-business-index-l5wrpi17z-victor-dev-03-cmds-projects.vercel.app . Latest staged security branch commit `d74e8015174bc0e0a99f881e1de981ad905d0f86`: Docker Basic/expired Pro campaign RLS tests PASS; final full build must be checked at its own HEAD. Preview is not production, and authenticated browser acceptance on real paid account is not yet complete.

## 2026-11-13 — Step 1 acceptance and staged legacy campaign RLS

- Marketing Studio and Engine UI commit: `ac1f1e565245976517531f4cba99cf9ba236d576`, GitHub 7/7 workflows green. Same code Vercel Preview `dpl_4gLbEqmaywHtnJFxABfYqYNcUdL9` READY.
- Current P2 branch has a later **SQL/docs-only** change: `d74e8015174bc0e0a99f881e1de981ad905d0f86`. This stages Pro entitlement in the P2-05 campaign RLS policy, synthetic verified Pro A / Basic B / expired Pro tests. Docker campaign + credit + RLS + contract jobs green; full optimized build may still be running at time of writing.
- No real social/media/mail account was connected, no provider token exchanged, no AI credits deducted, no live P2 schema applied, no production deployment and no modification to existing Discovery engine.
- Next implementation step: first-party provider adapter contract, OAuth state/PKCE and encrypted credential design. Start with Meta Facebook Pages + eligible Instagram Professional as provider-approved scope permits; after that WhatsApp Business and Google/Microsoft mail. Expose explicit consent and account-type requirements.

## 2026-11-13 — Standalone URL alignment (AGENTS.md/main architecture)

- Main AGENTS.md and the canonical master handoff prefer `/vendor/marketing-engine`, separate from `/vendor/marketing`. Standalone URL and child routes are now implemented on P2 branch: social/email/agent/connections/automation/leads/calendar/campaigns. Existing `/vendor/marketing/engine` implementation routes remain backward compatible but navigation now points to the standalone URL.
- All new standalone premium child routes use a verified server-side Pro layout; existing /vendor/marketing/brand|captions|design|campaigns remain protected.
- **Verified standalone route checkpoint:** exact application SHA `be841597d1d773e643fbac6cbe65d41e5943c092` — all 7 GitHub workflow families passed; Vercel Preview `dpl_C9MDRpHiWo3T6GBrUCRTpu81TJie` READY at https://sl-business-index-5iilmobeo-victor-dev-03-cmds-projects.vercel.app (target Preview, NOT production). Real paid-vendor browser acceptance and live P2 migrations remain pending. UI modules display planned/disconnected providers truthfully.
- Required next-chat reads: `AGENTS.md` and `docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md` on main; then this P2 branch ledger and `docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md`.

## 2026-11-13 — Step 2 first-party OAuth connector infrastructure (development candidate)

New files:
- `lib/marketing/oauth-provider-contract.ts`: five official account-type adapter contracts (managed Facebook Page, eligible Instagram Professional, WhatsApp Business, Google/Microsoft mail); CSPRNG state, HMAC digest, PKCE S256, exact HTTPS callback URL requirement, typed action/capability gate. **Pure primitives, not real OAuth API calls.**
- `docs/growth/p2/P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql`: OAuth intents, one-time consumption field, owner-scoped connection metadata, isolated service-role-only encrypted-token vault, Pro-only read policy. This is a **staging-only draft**; no production migration.
- `tests/p2OAuthConnectors.test.mjs`, `tests/p2-oauth/verify.sql` and the P2 GitHub workflow: state randomness/replay/expiry/redirect/PKCE and PostgreSQL 17 Basic/expired Pro/token-secret denial.
- Official OAuth provider login, provider consent screen, callback, token exchange, refresh and revoke **NOT IMPLEMENTED**. Connect buttons intentionally disabled; no real provider account attached.

Safety design decisions: user and business Pro eligibility must be verified again when starting OAuth AND consuming one-time state, and immediately before using any token; verified Page/Professional/mail account rather than Facebook personal profile; encrypt credentials via managed KMS/vault, no plaintext in browser/PostgREST. Follow RFC 9700, including exact redirect URI and PKCE S256 where provider supports it. Provider-specific endpoints/scopes must be reviewed against the selected official API before enabling.

Release gates still open: GitHub contract + Docker + production build at exact SHA, protected provider app registrations, transactional one-time state consumption, KMS wiring, same-origin Pro start endpoint, audited callback and revoke, browser authenticated negative tests, preview and production approvals. **No real OAuth, external sends, payment charges, P2 production migration or P2 main merge.**

### Step 2 exact-SHA acceptance — 2026-11-13
- Verified code SHA: `000c75fc04ad1c2bd81e753961a1b677b763e164`.
- GitHub Actions: **7/7 workflow runs passed** at that exact SHA, including new Node OAuth/PKCE tests, disposable PostgreSQL OAuth token-vault RLS tests, existing P1/P2 checks, billing tests and optimized Next.js build.
- Vercel Preview: `dpl_DAkD9z9UzMz23WdBLcNXn96T1TmD`, **READY**, non-production: https://sl-business-index-63s5hfc6e-victor-dev-03-cmds-projects.vercel.app . The preview has no live OAuth Connect operation and no new live database migration.
- Do not promote production or enable Connect. Next: verified provider app settings and encrypted credential KMS, transactional callback state consumption, scoped token exchange and disconnect with positive/negative browser acceptance tests.

## 2026-11-14 — P2-07 atomic OAuth intent consumption (code candidate, no live migration)

- **Verified implementation commit:** `0920367b55a6f53963bd3b9191d8de44e3186182` on `phase2/marketing-engine-foundation-p2-01-20261113`; draft PR #68 remains unmerged to `main`.
- **Changed files:** `docs/growth/p2/P2_07_OAUTH_INTENT_CLAIM_STAGING_ONLY.sql`; `tests/p2-oauth/claim-verify.sql`; `.github/workflows/p2-marketing-brand-foundation.yml`.
- **What now exists (staging only):** privileged one-time `slbi_claim_marketing_oauth_intent` database function atomically marks an unexpired state consumed; checks exact HMAC digest, trusted owner/business/provider/redirect, verified current Professional/Enterprise entitlement, and required PKCE ciphertext for Google/Microsoft. PostgreSQL function EXECUTE explicitly denied to anon/authenticated, granted only to service_role. No provider tokens are stored or exchanged by this function.
- **Negative evidence:** PostgreSQL 17 GitHub Docker `docker-oauth-connector-security` job in workflow run [43528095587](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43528095587) passed SQL privilege denial, Basic owner B, expired Pro, wrong owner/redirect, expired intent, missing required PKCE and replay scenarios. Existing P2 brand, AI credits, campaign approvals and Node contracts also passed in that workflow's completed jobs. **Accepted at the exact application SHA `0920367`: 7/7 distinct GitHub workflow families PASSED, including Next.js optimized build, TypeScript, P1 integrated/security checks, both billing checks and the P2 Docker/contract suite (P2 also ran twice, both PASS).** [P2 CI run](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43528095587) · [Next.js build](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43528095660) · [P1 integration gate](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43528095701). Subsequent documentation-only commits have their own separately tracked CI status.
- **Live Supabase (read-only verified 2026-11-14):** project `oofxhragafekazwjikae` ACTIVE_HEALTHY; `public` exposes only legacy `marketing_campaigns` and `growth_entitlements` from the relevant table search, not P2 OAuth intent/connection/vault tables. P2 migration **NOT APPLIED**. `ai_social_draft`, `ai_email_draft`, `seo_basic_audit` remain disabled.
- **Vercel:** production `main` deployment `dpl_G1jRvpJh72GGyDDNTd1H4D9k5te2` READY at `e6221ff`; last verified P2 preview `dpl_DAkD9z9UzMz23WdBLcNXn96T1TmD` READY at `000c75f`. No new preview for code commit `0920367` was confirmed at the checkpoint. Do not call this a production release or real vendor acceptance.
- **Next unfinished implementation:** trusted same-origin OAuth start handler with SSR `auth.getUser()`, owned business + verified Pro guard; secure state and encrypted PKCE persistence; server callback with exact provider/redirect and CSRF checks, one-time claim via service role, token exchange ONLY after official app setup, KMS, provider account verification and human authorization. Then tested disconnect/revoke, event signature/replay handling, and cross-vendor browser E2E. No paid provider actions or external sends authorized.
- **Release boundary:** No GitHub PR merge, live Supabase DDL, Vercel production promotion, provider OAuth account connection, AI costs, outbound messages, posting or Discovery changes in this step.

## 2026-11-14 — P2-07 secure Google OAuth Start & Callback (implementation, no live integration)

**Full roadmap study:** Read the 19-page Library `SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf` plus editable `SLBI_Growth_OS_Master_Roadmap_v1.0.md`, Library `WORKSPACE_README.md`, `DECISION_LOG.md`, `IMPLEMENTATION_TRACKER.md`; compared with main `SLBI_MASTER_IMPLEMENTATION_HANDOFF.md`, P2 context, actual source and staged SQL. All 11 pillars and six architectural engines preserved; original PDF not overwritten. Detailed permanent handoff: [P2-07 architecture and PDF study](P2_07_OAUTH_IMPLEMENTATION_SECURITY_HANDOFF.md).

**New code commits:** `6bc9ce9` preview-only Google OAuth start and encryption; `1a7d905` callback + atomic verified account store; `81bd906` Node 24 import fix; `07f3481` trusted 5/hour atomic start limit; `f271294` new RPC contract assertion. Development branch and draft PR #68 only; production main untouched.

**Routes:** `POST /api/marketing/oauth/google_mail/start`, `GET /api/marketing/oauth/google_mail/callback`. Authenticated SSR owner, verified Professional/Enterprise, exact origin/redirect, HMAC state, PKCE S256 and AES-256-GCM preview envelope; revalidated paid entitlement/ownership, Google UserInfo and Google send scope, encrypted access+refresh token one-transaction store. No external emails or posts implemented. Production fails closed; no KMS claim.

**Staged-only database:** `P2_07_OAUTH_START_RATE_LIMIT_STAGING_ONLY.sql`, `P2_07_OAUTH_CONNECTION_STORE_STAGING_ONLY.sql` with existing `P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql` and `P2_07_OAUTH_INTENT_CLAIM_STAGING_ONLY.sql`. None of these have been applied to live Supabase. New Docker tests cover permission-denial, Basic/expired Pro/cross-owner, replay, hourly initiation quota and atomic encrypted vault.

**CI ACCEPTED:** Exact application source SHA `f271294931644dea5ae46d9b1f241897df0f6531`: **7/7 distinct GitHub workflow families passed**, including Node OAuth flow/contract tests, TypeScript and optimized Next.js build, P1 regression/security gates, independent billing/SQL checks and the [P2 PostgreSQL 17 Docker job](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43530529585). Docker covered one-time state, account-token atomic storage, Basic/expired-Pro/cross-vendor denials and 5/hour rate limit. Earlier failed commits `6bc9ce9` and `07f3481` were diagnosed/fixed (TypeScript Node import path, obsolete direct-write assertion). **No new Vercel Preview at `f271294` was confirmed**, and no real account consent/browser acceptance has been performed.

**External blockers / next:** Google OAuth app registration and allowed callback; managed KMS and key rotation; preview schema release in approved testing environment; actual vendor-authenticated E2E; consent UI; refresh/revoke/disconnect; provider verification; production security sign-off. No provider account was connected, no paid credits or automated mail sent, no live DB writes or production deployments performed. Marketing first → Growth → SEO; Discovery unchanged.

## 2026-11-14 — OWNER-APPROVED P1/P2 SOURCE CONSOLIDATION INTO MAIN (LATEST)

- **GitHub:** Audited `main` at `e6221ff4e3151fb916b0408080bc25e2cf4a0873` against open P2 draft PR #68. 130 development commits / 72 changed files; four main-only commits added AGENTS.md and canonical handoff, with no overlapping source conflicts. Marked PR ready and squash-merged P2 at `852da229728ec4141b8f3ac3df3015c9dbbd99d2`. Source now lives on **main** rather than only the old branch. PR is merged/closed, not still draft; historical claims above refer to earlier timestamps.
- **Pre-merge code acceptance:** `c2326c5c09ee7e99e5fdda5149c09f6d73e857ee` passed **7/7 distinct GitHub workflow families** plus second P2 trigger, including Node 24, TypeScript/optimized Next.js build, P1 security/overview/integrated, independent billing SQL, disposable PostgreSQL 17 brand/credit/campaign OAuth owner negative tests. [P2 CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43576367475) · [Next.js](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43576367515). Exact Vercel **Preview READY** `dpl_H7GVfPcp5xsDsnXhXLuVDK6RRJdR`: https://sl-business-index-jfuwe4ru3-victor-dev-03-cmds-projects.vercel.app. No authenticated paid-vendor browser E2E completed.
- **Regression caught and fixed before source merge:** Live `growth_entitlements` had **zero rows** on read-only audit. The P2 draft had placed an unintended Pro gate around the existing manual Campaign Workspace. Commit `c2326c5` restores Basic-owner access to `/vendor/marketing/campaigns`; revises *staging-only* P2-05 RLS to permit owner-only drafted/scheduled manual work (not forged approved/posted), keeps revision history and Pro-only new agents/connectors/AI. Docker Basic B owner creation, cross-vendor denial and spoofed publish/approval negative tests passed. P1 marketing drafts/PNG/planning remain; no direct stored record rewrite.
- **Live Supabase (read-only):** public `marketing_campaigns`, `growth_entitlements`, `growth_credit_actions` exist; **P2 brand, OAuth intents, connection vault and P2 AI/revisions tables absent**. Zero verified active Pro entitlement grants and three AI/SEO actions disabled. No production SQL or schema migration applied.
- **Vercel:** Merging into main initiated production deployment `dpl_H1SMxuPuVBZefC2Ck3iNnSEVqgxC` at merge SHA `852da22`, status BUILDING at ledger write; recheck exact later main SHA and READY before claiming new production source served. No new paid envs or OAuth flags were set.
- **Product status:** Marketing Studio overview-only, standalone Engine, Pro-only agents/connectors, Google start/callback **preview-gated**; without approved provider credentials/KMS/migrations they fail closed. P2 advanced backend functions and real email/social/voice are still incomplete. Growth and SEO follow Marketing, Discovery unchanged.
- **Next gate:** verify main production deployment and runtime smoke, P2 migration/entitlement acceptance (review/rollback/test accounts), Google test-account consent, KMS and revoke, real owner/browser negative E2E. Never call staged source, a GitHub merge or a Preview READY a completed production integration.

## 2026-11-14 — PR #69 Marketing Studio App Marketplace integration (LATEST UX)

- **Approved architecture:** Dashboard Tools has only **Marketing Studio**. It is the embedded SLBI first-party App Store: overview KPIs, fully visible charcoal/black `#1D1D20` banner and orange CTA, responsive 12 app cards with Iconsax/Lucide vector fallback, browser-side search and filter by Content/Channels/AI & automation/Plugins/Customers. Each card opens its unique real route, not the same homepage. Premium/Included and current implementation state are separate, truthful UI attributes.
- **Detailed source:** `lib/marketing/studio-apps.ts`, `app/vendor/marketing/components/MarketingAppStore.tsx`, `app/vendor/marketing/page.tsx`; one Tools menu entry in `app/vendor/layout.tsx`; both old root landing pages redirect Studio but Pro child pages remain. No changes to Discovery, Supabase live DB or paid features.
- **Access:** 10 Pro-only app destinations (social/email/voice/automation/plugins/posters/captions/brand/calendar/marketing leads), 2 existing Included apps (manual campaign planner, Leads CRM). Server-side `MarketingProOnly` guard remains authoritative for premium modules. Basic manual campaigns and old owner data remain available. All provider integrations still explicitly planned/foundation and **no external mail, phone, social post or OAuth account connection occurred**.
- **Tests:** New `tests/marketingStudioAppStore.test.mjs` validates 12 unique app routes, query/category filtering, Pro policies, single Tools entry and legacy root redirects. Existing P1/P2 brand, poster, marketing contracts, vendor portal tests updated without deleting protections. Source SHA `0d6b525d953f263a30e9948fcadff77d7013e8a7` **6/6 workflow families PASS** including Docker PG17 owner/RLS/security and Next.js optimized build. [P2 CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43578213457) · [Next build](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43578213428). Vercel Preview exact SHA `dpl_8GVzX64Zd7rdTGwapNH8H8KtuKdj` READY: https://sl-business-index-3gxvugp6b-victor-dev-03-cmds-projects.vercel.app/vendor/marketing .
- **GitHub:** [PR #69](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/69) merged main at `715fb2b3b2950a77c6249e012208beed3d01e7ae` (squash). Automatic Vercel production build started `dpl_GhG8eRzFwtBYJvcXkgJRMMxJdYD7`, **BUILDING at initial handoff**; verify final status against most recent main and production aliases. An exact source Preview READY is NOT itself production acceptance.
- **Next:** finish production build smoke; P2-07 Google OAuth consent/KMS/revoke with versioned migration and valid Pro test owners; campaign publishing receipts, scheduling worker and opt-in mail after approval. Marketing → Growth → SEO. Never re-add duplicate Engine topnav link.

## 2026-11-14 — P2-07 Google Connect UI / skeleton-first vendor performance (LATEST)

- **PR/source:** [#70](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/70) merged to `main` at `dc15c7b58797a2e67aa3a7349101b2104c74f323`; exact tested branch source `cbf395ea39b54b855913335f0f3286ee7122ea50`. **6/6 GitHub workflow families green**, with P1 overview/integration, Next TypeScript + optimized build, P2 brand/campaign/AI credit and OAuth tenant/replay/ownership Docker Postgres, billing SQL. [P2 CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43581145554). Vercel Preview `dpl_6NfYfWSuUXtFvdPh1UzaFrYK3uwm` READY at same branch SHA. Merge's Vercel production `dpl_BVn1A9Lgp29gApHyVEbEjfMXhfxP` BUILDING at record write; recheck before claiming READY.
- **UX:** Initial vendor spinner replaced by `VendorBootSkeleton`; ten marketing/dashboard loading boundaries use `MarketingRouteSkeleton`; all skeletons accessible, reduced-motion-safe and sized to minimize content shift. Studio parallelizes independent SSR owner/Pro checks, defers search filtering and avoids many simultaneous link prefetches. This improves perceived speed path; no real production LCP/INP/TBT measurement has been collected.
- **Provider:** New `GoogleMailPreviewConnect` displays business selector and calls existing secured OAuth start POST only when Preview environment config, owner and private connection schema are verified by server. When absent (including all current Production), the button is disabled and other connectors remain planned. Connector summaries are owner-scoped and contain **no access/refresh tokens**. Do not equate UI with activated Google OAuth. No live P2 Supabase migration, Pro entitlement seed, KMS, provider registration, refresh/revoke or sending.
- **Chromium:** Local Playwright/Chromium static skeleton fixture checked responsive desktop/mobile geometry (1440/390), no overflow, screen-reader busy marker and reduced motion. Could not run signed-in real app E2E or collect trustworthy deployment performance measurements due container network restriction.
- **Next:** production status recheck; P2 versioned isolated database migration and authentic owner A/Basic B Pro billing acceptance; real provider Google OAuth app/consent, managed KMS, refresh/disconnect/revocation and browser E2E; P2-05/06/09 publishing approval/worker/opt-in. Marketing → Growth → SEO; Discovery unchanged.

## 2026-11-14 — Branch triage, P2-07 local disconnect (LATEST)

- **PR/CI:** [#71](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/71) merged to `main` at `cb26f6a0a28dff885f843d922e1097065fa7644c` (feature source `d7f199ae7ba721fb76d3936a58663126fe4fe044`). Source **6/6 workflow families passed** including P2 OAuth/Postgres RLS, token-purge/expired-Pro/cross-tenant negative tests, P1 security, billing and Next.js. [P2 CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43583415076). Feature Vercel Preview `dpl_Ag1SCt8VG1BzqzjQZEbN8sVjUmif` READY; merge source Production `dpl_GgaedofWMCk6YQbPUh7XqxXdSNiA` READY with `www.slbusinessindex.com` alias.
- **Code:** `docs/growth/p2/P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY.sql`, `app/api/marketing/oauth/google_mail/disconnect/route.ts`, updated `GoogleMailPreviewConnect.tsx`, owner-scoped connection read, `tests/p2-oauth/disconnect-verify.sql`, `tests/p2OAuthDisconnect.test.mjs`, expanded P2 Docker workflow. Explicit user confirmation before removal; service-role-only SQL atomically marks local connection revoked, purges ciphertext and invalidates unclaimed OAuth intents; does not leak tokens. Expired Pro can delete its stored credential even though new connections require current Pro. All requests disabled in Production by `VERCEL_ENV==='preview'`.
- **No provider-side revocation:** Google grant remains until the user revokes in Google account security (or future officially authorized server revoke). No managed KMS or refresh; a claimed callback racing with disconnect still requires a generation-bound store guard before live provider activation. Do not claim remote revoke, real connection, browser E2E or email delivery.
- **Live DB read-only:** OAuth intent/connection/secret tables **ABSENT**, verified active Pro grants **0**, `marketing_campaigns` old owner `FOR ALL` policy present, allowing forged status. Staged RLS migration NOT live. No direct SQL was run to modify Supabase.
- **Pending branch audit:** #34, #30, #27, #9, #7 are **open draft diverged** historic staging/research/billing and must not be bulk merged. Prior #68–#70 already merged. See `P2_BRANCH_AUDIT_20261114.md`. Next prioritized claimed-callback race, reversible migration acceptance, Google provider KMS/revoke/refresh, real vendor browser, then Marketing campaigns, Growth, SEO.

## 2026-11-14 — PR #72 callback/disconnect atomicity (LATEST)

- **Released source:** [PR #72](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/72) merged to main `4b9cf4d06d275367200c9108848563a96800ad2a`, feature SHA `56ee2397c98af065cb1ba3ba5dbac84a2239361b`. **6/6 feature CI workflow families PASS** including Docker Postgres 17 P2 owner/tenant/replay/callback-vs-disconnect, P1, billing, Next.js. Exact feature Preview READY `dpl_H56d1T5aEEiGTh5cLXMzaksbFVep`. Exact merge Production READY `dpl_41aYCX8pqaeifiwsE8ZgnVht6Sgr` on verified `www.slbusinessindex.com`.
- **Race prevented in staged SQL:** `P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql` blocks previously claimed, subsequently disconnected OAuth callback credential replay via `invalidated_at`, `stored_at`, row lock and shared owner advisory lock. Previous unbound store service_role EXECUTE is revoked. Callback passes server-claimed intent UUID; test `tests/p2-oauth/callback-disconnect-race-verify.sql` checks exact connection ciphertext purge, replay, cross-owner/Basic and unclaimed denial. This is code-level staged coverage only: **no Supabase production schema write, real Pro test vendor, Google consent, email, external provider revoke or token refresh**.
- **Pending PR triage remains** five historic open drafts #34, #30, #27, #9, #7; none safe to merge wholesale because highly diverged. Original #68–#71 source already on main.
- **Next:** isolated Supabase migration/rollback plan, verified Pro issuance, KMS/refresh/provider-side revocation, actual Google test app and authenticated multi-tenant browser E2E; harden live campaign-status RLS before trusted publish. Continue Marketing → Growth → SEO; Discovery untouched.

## 2026-11-14 — P2 global marketing foundation applied to LIVE Supabase (LATEST)

- **Database migration applied successfully:** project `oofxhragafekazwjikae`, version `20261114104216`, name `p2_marketing_global_foundation_coming_soon_v1`. Source `docs/growth/p2/P2_MARKETING_GLOBAL_BASELINE_PRODUCTION.sql` **34,474 bytes**, rehearsed verbatim in PostgreSQL 17 disposable CI with owner/role negative checks before apply.
- **Exact live post-migration evidence:** `marketing_studio_app_rollouts` **12/12 = coming_soon**; `social_brand_profiles` 0, `marketing_oauth_intents` 0, `marketing_connections` 0, `marketing_connection_secrets` 0; verified active Pro 0; legacy `marketing_campaigns` count remains 1, historical `posted` flag not proof of delivery. New five tables all RLS enabled; vendor may SELECT rollout rows, cannot UPDATE/INSERT/DELETE and cannot SELECT vaulted tokens/intents; legacy unbound store EXECUTE unavailable to service_role. New private vault tables intentionally have RLS with no browser policies.
- **Code/deployment:** [PR #73](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/73) exact feature `a6094afe3518e5c32a31c7a68b09e401efdb35bc` **5/5 workflow families green**; P2 Docker **7/7** incl. exact production baseline, Node contract, RLS, auth replay, AI credit, campaign. Feature Preview READY `dpl_A6KE1nRMmSbK2V793EuxrHid9Kr3`. Squash-merged source `main` `12d0add2f99b7fdf8936b1042e581c291a4bdeb3`; GitHub main CI success, Vercel Production `dpl_3XQP5DUcG51cMwAUuD96kH7mSDxN` READY; `www.slbusinessindex.com` alias verified.
- **User-facing:** all 12 Marketplace app cards deliberately show **Coming Soon** and cannot navigate from the store until trusted DB rollout `launch_status='live'`. Both previously available Basic tools remain accessible through original vendor routes. Pro/tool shells are not external integrations. No provider credentials, paid AI spend, external email, social posts, calling, webhook or background automation launched. No KMS or provider-side token revoke, real OAuth callback in signed-in browser, provider developer registration or Pro billing linkage.
- **Advisors:** existing `public.spatial_ref_sys` RLS-disabled PostGIS table was the only ERROR finding (unrelated to this migration); vault/intents no-policy INFO is intentionally deny-all for untrusted roles. Runbook: `docs/growth/p2/P2_MARKETING_ROLLOUT_RUNBOOK_20261114.md`.
- **Next security:** **P2-05** legacy `marketing_campaigns` forged `posted` policy separately version/migrate, preserving one historical row and existing Basic drafted/scheduled creation; then billing verified Pro grants, KMS and provider callback/revoke/refresh and real authenticated Chromium tests. No Discovery reimplementation; Marketing then Growth then SEO.
