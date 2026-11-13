# SLBI Marketing Engine | LIVE IMPLEMENTATION STATUS
Last status review: 2026-11-13 | Timezone Asia/Colombo
This is the canonical, update-in-place state record across ChatGPT chats.
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
| Marketing Studio Overview | P2 UX | CODED / CI IN PROGRESS | Server-rendered overview-only KPIs and navigation; previous campaign tools preserved in /campaigns |
| Marketing Engine main page | P2 UX | CODED / CI IN PROGRESS | Separate /vendor/marketing/engine landing, 5 module routes, topbar navigation |
| Business Brand Profile | P2-01 | CODED + CI + PREVIEW | UI/API/RLS draft; Supabase P2 schema not live, save e2e pending |
| AI Caption Generator | P2-02 | CODED + CI + PREVIEW / DISABLED | Provider/gating drafted; no AI credits enabled or real provider e2e |
| AI Poster (generated background) | P2-03 | NOT IMPLEMENTED | Official/authorized provider and budget first |
| Editable Poster Studio | P2-04 | CODED + CI + PREVIEW | Four original templates, layers, PNG/JSON; no cloud project persistence |
| Campaign Library revision | P2-05 | SQL CODED + DOCKER TESTED | No production migration or revised UI/receipts |
| Durable Content Calendar | P2-06 | NOT IMPLEMENTED | Existing calendar = planning only |
| Official Social Connectors | P2-07 | CATALOGUE CODED / NOT AUTHORIZED | 12 providers shown as planned/research; real Meta OAuth and scopes still pending |
| SEO Intelligence | P2-08 | DEFERRED | Full SEO phase after Growth; shared schema only for now |
| Email Marketing | P2-09 | ARCHITECTURE APPROVED | Gmail/Graph OAuth, consent/suppression pending |
| Usage Credits | P2-10 | SQL CODED + DOCKER TESTED / DISABLED | Atomic reservation/refund, limits; live gates pending |
| Calls & Messages AI Agent | P2 OWNER ADDITION | RULE-BASED DEMO CODED | Local trilingual classifier, review/escalation; no inbound webhooks or telephony yet |
| Leads & workflow integration | P2 OWNER ADDITION | REUSE EXISTING CRM | Connect approved agent events to leads |
| Server-side Pro entitlement gate | CROSS-CUTTING | PARTLY CODED / CI IN PROGRESS | Verified SSR Pro layout on new pages and Brand/Caption API; legacy direct Supabase campaign writes need DB-level entitlement guard |

## Where to pick up in next chat
1. Check latest SHA of branch and PR #68. Read both this status and the master context document.
2. COMPLETED IN DEV BRANCH (verify CI): Split /vendor/marketing overview-only, preserve existing drafting at /vendor/marketing/campaigns, add /vendor/marketing/engine and five separate module routes.
3. PARTIAL: registry/disconnected-state UI and SSR/API Pro checks coded. NEXT: versioned migration enforcing Pro on legacy direct campaign writes; implement provider OAuth adapters, exact redirect/state, signed webhooks, token encryption/revocation.
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
- Created /vendor/marketing/engine with five separate Pro module pages: social, email, agent, connections and automation. Product docs describe the limits honestly; no fake OAuth connection buttons or fake publishing.
- Registered twelve potential official social, mail, messaging and voice provider adapters in lib/marketing/engine-registry.ts, all planned/research, not connected.
- Added verified Pro/Enterprise check via server Supabase getUser + trusted growth_entitlements (expires_at + verified_at + payment_reference). Pro-only RSC layouts protect brand, captions, design, campaigns and engine module pages; Brand Profile and Caption APIs have additional server-side entitlement guards.
- Added English/Tamil/Sinhala local deterministic customer enquiry classification and human escalation; no outbound replies, call forwarding, NN model, user data persistence or API charges.
- Vendor top navigation has separate Studio and Engine links; correct active-route matching.
- New tests/p2MarketingEngineShell.test.mjs covering plan expiry, tenant access integration contract, no fake sends, route split and multilingual rules. Included in P2 release gate workflow.

**Not complete:** live OAuth, actual API account connection, production Supabase P2 schema, Pro-entitlement checks at *legacy direct browser Supabase marketing_campaigns writes*, paid AI calls, phone/WhatsApp messaging, email sending, scheduling worker, provider receipts. Until legacy campaign RLS is changed, direct API writes do not inherit the page-only Pro boundary; this needs a versioned audited migration before any production release. No live business owner browser E2E has been performed for P2.

**Latest verification:** Awaiting exact HEAD CI and latest Preview build status. Do not promote to Production until CI green, security regression reviewed, verified entitlement and user-browser flows completed.
