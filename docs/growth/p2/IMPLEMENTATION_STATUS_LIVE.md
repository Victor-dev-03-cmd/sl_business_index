# SLBI Marketing Engine | LIVE IMPLEMENTATION STATUS
Last status review: 2026-11-14 | Timezone Asia/Colombo
This is the canonical, update-in-place state record across ChatGPT chats.
Canonical cross-chat handoff: docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md on GitHub main
Companion architecture: docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md
Code branch: phase2/marketing-engine-foundation-p2-01-20261113
Pull request: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68
Production branch: main

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
| Server-side Pro entitlement gate | CROSS-CUTTING | CODED + SECURITY TESTED; LIVE MIGRATION PENDING | Server page and API Pro checks; direct campaign write RLS upgraded in staging-only P2-05 migration, Docker Basic/expired Pro negative tests pass |

## Where to pick up in next chat
1. Check latest SHA of branch and PR #68. Read both this status and the master context document.
2. COMPLETED IN DEV BRANCH (verify CI): Split /vendor/marketing overview-only, preserve existing drafting at /vendor/marketing/campaigns, add /vendor/marketing-engine and five separate module routes.
3. PARTIAL: registry/disconnected-state UI, SSR/API Pro checks and legacy campaign Pro RLS staging migration coded; Docker tenant isolation, Basic/expired Pro write denial pass. NEXT: reviewed versioned live migration with rollback + provider OAuth adapters, exact redirect/state, signed webhooks, encrypted token storage/revocation.
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

**CI:** Exact SHA `81bd906` earlier 7/7 workflow families PASS (before rate-limit). Exact code+test SHA `f271294`: CI results must be re-queried before declaring accepted; prior failures on `6bc9ce9` and `07f3481` were diagnosed as Node test import and obsolete test assertion respectively. No new Vercel preview or actual provider account consent E2E confirmed here yet.

**External blockers / next:** Google OAuth app registration and allowed callback; managed KMS and key rotation; preview schema release in approved testing environment; actual vendor-authenticated E2E; consent UI; refresh/revoke/disconnect; provider verification; production security sign-off. No provider account was connected, no paid credits or automated mail sent, no live DB writes or production deployments performed. Marketing first → Growth → SEO; Discovery unchanged.
