# SLBusinessIndex — MASTER IMPLEMENTATION & CHAT HANDOFF

> **Source of truth for future ChatGPT sessions.** Read this file before making design, billing, AI, GitHub, database, or deployment changes. Update it at each completed milestone, with evidence. **Do not claim any feature is production-ready merely because its code compiles or a preview deploys.**
>
> **Document version:** 1.0 · **Created:** 2026-11-13 (Asia/Colombo) · **Project:** https://slbusinessindex.com · **Repository:** https://github.com/Victor-dev-03-cmd/sl_business_index

## 0. Executive handoff / புதிய Chat-க்கு முக்கியமான குறிப்புகள்

**User vision (Tamil):** SLBusinessIndex-க்குள் ஒரு சொந்த enterprise-grade Marketing Engine உருவாக்க வேண்டும். ChatGPT connectors போல **Connect Facebook / Instagram / WhatsApp / Gmail / Outlook** போன்ற official OAuth/API integrations வேண்டும். Business owners தங்கள் account-ஐ முதல் முறை authorize செய்து இணைப்பார்கள். ஒரே இடத்தில் content, customer enquiries, calls, messages, lead follow-ups, emails, campaigns, scheduling மற்றும் analytics நடத்த வேண்டும். செலவு குறைக்க **own algorithms + lightweight machine learning/neural networks + prompt engineering + selective LLM fallback** பயன்படுத்த வேண்டும். Existing Discovery/Search Engine-ஐ மீண்டும் உருவாக்கக்கூடாது. Chat மாறினாலும் இந்த architecture மற்றும் project status தொடர வேண்டும்.

**Committed development sequence:** 
1. **Discovery Engine:** existing/implemented work; regression-protect it.
2. **Marketing Engine:** **CURRENT PRIORITY**; complete and verify the connector-based customer communications + marketing system.
3. **Growth Engine:** later, after Marketing is operational; do not start a parallel major redesign now.
4. **SEO Engine / SEO specialization:** after Growth, as requested. Original GrowthOS v1 architecture lists *six* engines (Discovery, Growth, Marketing, Security, Revenue, Learning); preserve that taxonomy until user approves whether SEO becomes a seventh engine or a separate Growth/Marketing specialization.
5. Security, Revenue and Learning are shared cross-cutting foundations and remain protected throughout.

**Core IA decision:** \`/vendor/marketing\` = **Marketing Studio overview/dashboard only**. A separate \`/vendor/marketing-engine\` = **Marketing Engine operating workspace**, with modules for Social Media, Email, Calls & Messages Agent, Leads/Automation, Plugin Connections, Content Calendar and Campaign Library. Existing \`/vendor/marketing/brand\`, \`/captions\`, and \`/design\` route code is retained and linked or migrated carefully; do not delete existing code before regression testing.

**Commercial decision:** Marketing automation is **Pro-tier**, backed by real verified entitlements. Current database calls this tier **Professional** (UI may say “Pro”) and also has **Enterprise**; Basic is not authorized for connected automation. A visual lock is not security. Every provider OAuth callback, credential read, send, publish, reply, job enqueue, AI action and credit reservation must enforce the server-side entitlement and owner business. Do not mistake an unverified subscription request for payment approval; use verified server-side entitlement/settlement.

**Budget decision:** Start with free/open-source algorithms and modest infrastructure, but **third-party platform message fees, API access reviews, cloud hosting, and model inference may still cost money**. Never incur a new paid bill, buy API credits, turn on mass email or automatic outward messaging without a separate explicit, scoped approval.

## 1. Confirmed baseline — NOT guesses

- Stack: **Next.js + Tailwind** on Vercel; **Supabase** for authentication, business data and RLS; **Neon PostgreSQL** used for billing foundation; GitHub repository \`Victor-dev-03-cmd/sl_business_index\`.
- Original GrowthOS v1 reference: **SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf** in the user's Library. Read when available; keep the six-engine taxonomy unless explicitly revised.
- **P1 production:** GitHub \`main\` SHA \`ffb9c14aebd658e7bbc662811d60defa49e175bd\` was verified on 2026-11-13. Vendor address/GPS/manual pin fixes are on production; P1 release gates previously passed. **Re-query main**; this SHA is historical evidence, not an assertion it can never change.
- **P2 work in progress:** branch \`phase2/marketing-engine-foundation-p2-01-20261113\`, draft PR **#68**: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68 . Last checked P2 SHA \`5088e0d7589c0f28f5bf4041a051635bb3d263b3\` on 2026-11-13. CI **6/6 workflow families passed** at that SHA. Vercel **Preview READY** at https://sl-business-index-qucjrvgnl-victor-dev-03-cmds-projects.vercel.app . **P2 is NOT merged to main or production**.
- **Supabase live schema check 2026-11-13:** no live tables named \`social_brand_profiles\`, \`marketing_ai_daily_limits\`, \`marketing_credit_jobs\`, \`marketing_ai_drafts\`, or \`marketing_campaign_revisions\`. P2 SQL files remain **staging/disposable-Docker-only proposals** and have NOT been applied live. Never describe preview Brand Profile persistence or model calls as live.
- **P2 AI action switches:** \`growth_credit_actions\` in live Supabase has \`ai_social_draft\`, \`ai_email_draft\`, \`seo_basic_audit\` all **is_enabled=false** at the check. Existing provider secret name \`GROQ_API_KEY\` was present in Vercel environment list, but **DO NOT read or print its value**. The model generation endpoint is separately gated by \`SLBI_MARKETING_AI_ENABLED\`; no verified live generation.
- **Verified product tiers at the check:** \`Basic\`, \`Professional\`, \`Enterprise\`. No active \`growth_entitlements\` Professional/Enterprise records at that moment. The label “Pro” means the existing Professional tier, **not a fabricated new plan or price**.
- Existing \`marketing_campaigns\` has a legacy \`posted\` status row, but **that is not third-party provider proof of publication**. New publishing requires real provider receipt, status and audit.

## 2. User experience and route map

| Route / workspace | What users should see | Access |
|---|---|---|
| \`/vendor/marketing\` | Studio overview only: KPIs, latest campaigns, connections, insights, navigation | Signed-in vendors; locked previews for Basic |
| \`/vendor/marketing-engine\` | Actual Marketing Engine dashboard/workspace | Verified Pro/Enterprise |
| \`/vendor/marketing-engine/social\` | Authorized social accounts, composer, original posters, draft/review/publish | Verified Pro + provider scopes |
| \`/vendor/marketing-engine/email\` | Mailbox connectors, inbox triage, opt-in campaigns, approval and schedules | Verified Pro + mailbox permission |
| \`/vendor/marketing-engine/agent\` | Customer Calls & Messages AI agent, switch on/off, human takeover | Verified Pro + eligible provider |
| \`/vendor/marketing-engine/connections\` | Plug-and-play connection registry, account chooser, scopes, health, disconnect | Verified Pro |
| \`/vendor/marketing-engine/leads\` | Unified leads, conversation context, customer follow-ups | Verified Pro automation; existing leads continue unaffected |
| \`/vendor/marketing-engine/calendar\` | True queued jobs, published receipts, retries, failed deliveries | Verified Pro |
| \`/vendor/marketing-engine/campaigns\` | Drafts, versions, approval, real provider receipts and history | Verified Pro |
| \`/vendor/marketing/brand\` etc. | Existing P2 draft editor/caption/design routes; retain until migrated | Existing preview-only during development |
| \`/vendor/growth\` | Existing GrowthOS credit wallet reporting; not the customer calls agent | Existing access; entitlement checks before mutations |

**Information architecture warning:** Do not rename the existing Growth credit wallet “Calls & Credits” or silently reinterpret billing ledger. The user's “Calls & Messages” requirement is a **different AI customer support feature**. Show call/message volume, handoffs and operating costs in the agent UI; keep credit accounting in Revenue/Growth billing.

## 3. Plugin / connector architecture (build our own; do not collect passwords)

A “plugin” means an **internal provider adapter** implementing an interface. Users see “Connect” in SLBI. SLBI redirects them to the provider's **official OAuth/business authorization** page; after signed callback it securely stores authorized scopes and the selected business asset. Provider user passwords never pass through SLBI.

**Flow:**
\`Owner + Pro entitlement → Connect → OAuth state/PKCE (where supported) → provider consent → secure callback → token exchange → encrypted token storage → select Facebook Page / IG Professional Account / WhatsApp Business phone / mailbox → verify capability & webhook → enable individual actions → revoke/refresh/reconnect controls\`.

**Shared adapter interface (design target, not implemented yet):**
\`getAuthUrl, handleCallback, listAccounts, getCapabilities, subscribeWebhook, validateWebhook, receiveEvent, createDraft, publishApproved, sendConsentedReply, getDeliveryStatus, disconnect\`.
All methods require authenticated owner/business, specific provider scopes, idempotency, and durable audit.

**Priority matrix — provider permissions are external dependencies, not guaranteed by us:**

| Connector | Initial supported action | Reality / constraints |
|---|---|---|
| **Facebook Pages** | Publish approved text/media to selected business Page; optional comments/Messenger later | Facebook Login can authenticate a *person* so they can authorize their **Page**. General personal-profile automated posting is **not supported** via current Graph publishing APIs. No password/browser-session automation workaround. |
| **Instagram Professional** | Image/reel publishing, metrics, eligible messaging | Business/Creator account and official Instagram permissions required. Consumer Instagram account cannot simply be controlled via professional publishing API. |
| **WhatsApp Business Cloud API** | Inbound customer messages and policy-compliant replies/templates | Requires eligible Business Platform phone/account/onboarding and webhooks. WhatsApp personal account login, personal chats, or Status-feed posting are **not interchangeable** with Cloud API. Provider/conversation charges may apply. |
| **Messenger / Instagram DM** | Inbox, permitted service replies, escalation | App review, Page/professional linkage and allowed messaging windows/consent apply. |
| **Gmail** | OAuth, draft replies, approved sending | \`gmail.send\` is narrower than full Gmail access. Reading/inbox actions require additional sensitive/restricted scopes and possible verification. Avoid \`https://mail.google.com/\` full access unless genuinely required. Gmail is not a substitute for compliant bulk mail infrastructure. |
| **Microsoft Outlook / M365** | OAuth, delegated \`Mail.Send\`, approved replies | Microsoft Graph; reading/scheduling demands separate scopes/consent. No silent organization-wide access. |
| **Marketing email delivery** | Verified-domain opt-in mailing, unsubscribe, bounce webhooks | Dedicated provider can be connected later; SPF/DKIM/DMARC and unsubscribe/suppression required. |
| **Voice / calls** | Inbound call routing, transcription where consented, business-hours rules, human transfer | Twilio or another supported telephony provider; phone numbers and voice minutes are unlikely to be free. Availability/calling compliance must be checked for Sri Lanka. |
| **LinkedIn, TikTok, YouTube** | Future adapters only where approved API scope permits it | No arbitrary unrestricted access; research provider-specific posting limits first. |

**Provider references:** https://developers.facebook.com/docs/graph-api/overview ; https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api ; https://developers.facebook.com/documentation/business-messaging/whatsapp/overview ; https://developers.google.com/workspace/gmail/api/auth/scopes ; https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0 ; https://developers.google.com/identity/protocols/oauth2/web-server .

## 4. Low-cost, own-algorithm-first intelligent Marketing Agent

**The core is ours**: event ingestion, rules, classifiers, ranking, RAG/knowledge lookup, scheduling, policy enforcement, analytics, credits and audit. An external LLM is **optional** and paid only when justified, not the default for all work.

**Reference pipeline:**
\`\`\`
Provider webhook / website enquiry / consented inbound call
  → signature + replay protection + business ownership
  → normalize event (channel, sender_id, thread, timestamp, intent source)
  → opt-in/opt-out + contact-window + Pro entitlement + per-provider scope
  → deterministic rules: business hours, FAQ, location, approved catalog, campaign dates
  → multilingual intent normalization (EN / தமிழ் / සිංහල + transliteration)
  → small classifier, keyword/BM25 retrieval, embedding search if useful
  → confidence & policy gate
       ├─ known fact / high confidence: rule/approved-template reply
       ├─ lead/enquiry: create CRM lead + notify owner
       ├─ complex: bounded retrieval-augmented LLM draft for human approval
       └─ complaint/payment/legal/uncertain: human handoff
  → per-action approve/send queue (only if permitted and enabled)
  → provider receipt, retries/idempotency, CRM update, cost/quality metrics
\`\`\`

**Algorithms to own/build in cost order:** regex/finite-state rules, synonym maps, Tamil/Sinhala language detection and transliteration, BM25-style retrieval, deterministic FAQ knowledge base, duplicate-event hashing, logistic regression/fastText-like intent classifier, calibrated confidence, context-window-aware policy state machine, lightweight embeddings and approximate nearest-neighbor search (when data quality justifies it), then small neural classifier and selectively hosted open-weight models. Deep model training **from scratch** is not realistic on a small founder budget; benchmark data, latency, quality and cost before investing. Use only consented/licensed data to train.

**Local-first/LLM-first tradeoff:** Good prompt engineering improves controlled generation but is not a replacement for provider permissions, a factual knowledge base or real retrieval evaluation. Preserve model independence: \`interface CaptionProvider/IntentProvider\` can call Groq, Gemini or a self-hosted model behind identical guarded contracts. Treat “free tier” as a changing quota, not guaranteed production capacity.

**Critical AI safety:** No invented prices/discounts, personal customer facts, verified outcomes or delivery claims. No autonomous refunds, billing changes or sensitive replies. For launch, AI creates drafts; owner approval is required for high-impact content. Provide opt-out, pause agent, per-channel enable, emergency human handoff, multilingual quality tests.

## 5. P2 Marketing Engine scope, exact status at the checkpoint

Use states: **NOT STARTED**, **DESIGN**, **CODE+TESTS IN DEV**, **INTEGRATED PREVIEW**, **PRODUCTION VERIFIED**. Do not call draft or Docker-only code live.

| ID | Scope | State | Evidence / missing work |
|---|---|---|---|
| P2-01 | Business Brand Profile | CODE+TESTS IN DEV | Editor + owner API + Docker RLS; production table absent |
| P2-02 | EN/TA/SI AI Caption Generator | CODE+TESTS IN DEV | Caption Lab, gated provider integration and human review; provider action disabled, production tables absent |
| P2-03 | AI Poster Studio | NOT STARTED | Original generated artwork variants, editable text overlay and cost guards still required |
| P2-04 | Design Editor | INTEGRATED PREVIEW (local only) | Four original layouts, square/portrait/story, draggable text layers, local PNG/JSON export; no persisted project assets |
| P2-05 | Campaign Library | CODE+TESTS IN DEV (audit SQL) | Revision/audit SQL passes Docker; approval UI, publishing receipt and live migration not done |
| P2-06 | Content Calendar | NOT STARTED | Existing scheduling is *planning-only*. Durable jobs, leases, retries, failure recovery missing |
| P2-07 | Social Integration | DESIGN | Official per-user OAuth, Facebook Page/IG professional, WhatsApp/Messenger adapters missing |
| P2-08 | SEO Intelligence | DEFERRED per new order | Build after Marketing and Growth as SEO specialization/engine |
| P2-09 | Email Marketing | DESIGN | OAuth, opted-in contacts, suppression, verified deliverability, drafts/agent missing |
| P2-10 | Usage Credits | CODE+TESTS IN DEV | Wallet reservation/settle/refund/rate caps Docker tested; **no live enabling** |
| NEW | Calls & Messages Customer AI Agent | REQUIREMENT APPROVED / DESIGN | Dedicated module, event adapters, rule engine, supervised replies, CRM integration and voice provider pending |
| NEW | Plug-and-Play Connection Manager | REQUIREMENT APPROVED / DESIGN | Scopes, credential vault, webhook, health, disconnect/revoke pending |
| NEW | Marketing Studio overview separation | REQUIREMENT APPROVED / DESIGN | Existing Marketing page still mixes editing tools; rework IA carefully |

**Relevant code on P2 branch:** \`app/vendor/marketing/page.tsx\`, \`app/vendor/marketing/brand/page.tsx\`, \`app/vendor/marketing/captions/page.tsx\`, \`app/vendor/marketing/design/page.tsx\`, \`app/api/marketing/brand-profile/route.ts\`, \`app/api/marketing/caption/route.ts\`; \`lib/marketing/\`; \`docs/growth/p2/\`; P2 GitHub Actions CI.

## 6. Engineering decisions / trust boundaries

- **Authorization:** Supabase SSR \`auth.getUser()\`, ownership from \`businesses.owner_id\`, row-level security, **real verified Pro/Enterprise entitlement** before connecting or performing actions. Owner-readable status ≠ right to mutate.
- **Secrets:** encrypt provider tokens at rest using a trusted server-side secret management approach; restrict database access, rotate/revoke, do not log tokens or store them in client localStorage. Only OAuth state/nonce/PKCE session artifacts may transit the browser.
- **Multi-tenant:** every provider connection, message, campaign, draft and job scoped to \`business_id\` and authenticated \`owner_id\`; negative A/B tests.
- **Webhooks:** validate Meta/provider signatures, canonical raw body, timestamps and replay/duplicate IDs; quarantine failures. Fast acknowledge; process via durable jobs, not long running request handlers.
- **Durable delivery:** state machine \`draft → owner_approved → queued → leased → provider_accepted → delivered/failed\` with idempotency, backoff, dead-letter queue, alerts and operator retry; “scheduled” UI date alone is not a real job.
- **Email/DM/WhatsApp compliance:** opt-in records, suppression list, unsubscribe, allowed message windows, template approval, bounce/complaint rules, service messages vs promotional messages; customer consent precedes automation.
- **Voice:** explicit local-law consent checks for recording/transcription, safe disclosure, human transfer, call-rate limits and per-minute spend caps.
- **Evidence:** only a provider-supplied publication/message ID and reconciled status can establish real external publishing. Historical \`marketing_campaigns.status='posted'\` is not proof.
- **Billing & budgets:** trusted reservation → action → settlement/refund ledger; no browser-driven credits, no duplicate deductions, hard provider daily spend/tenant quotas; user approval before paid activation.
- **Runtime:** Vercel for web/API, Supabase Postgres Auth/RLS; Neon for existing billing; evaluate a lightweight worker/cron only when real queue is ready. Do not introduce Kafka/Kubernetes just for enterprise appearance.
- **Observability:** channel connection health, failed webhooks, p95 latency, first-response time, percentage auto-answered safely, human overrides, cost per resolved enquiry, spam rate, consent violations, model hallucination evaluation.

## 7. Delivery plan (dependency first; actual order requested)

**Sprint A: Canonical architecture + UX split** — this master handoff; Marketing Studio overview; Marketing Engine root; Pro-gated modules; provider registry and permission/capability screen; keep previously written P2 code. Gate: Next.js CI and Basic-user forbidden on server endpoints.

**Sprint B: Persistence and internal intelligence** — review versioned P2 DB migrations; Docker real-Auth/RLS; authorized Brand Profile save/read, private campaign assets, rule FAQ, leads integration, per-business Agent on/off, human handoff. Gate: authenticated business-owner browser test; no paid staging branch required.

**Sprint C: First plug-and-play provider** — choose **Facebook Page** as earliest content-publishing candidate or **Gmail** for scoped email drafts; official OAuth, real account selection, token refresh, disconnect, safe sandbox/test account. Gate: provider review granted, limited-scope live account QA, no personal-profile publishing claim.

**Sprint D: Social & content** — WhatsApp Business/IG eligible adapters, caption/creative generation with approved cost ceilings, human approved campaign library, immutable provider receipts, re-usable design projects, actual calendar queue/retry.

**Sprint E: Customer Communications Agent** — website enquiry → leads → rule-based FAQ → human handoff; then eligible WhatsApp/Messenger/Email; voice comes **after** telephony availability, pricing and consent verification. Never turn agent on without explicit vendor opt-in.

**Sprint F: Email outreach** — OAuth mailbox triage + low-risk draft replies; for campaigns, verified-domain bulk provider, opt-in audience, suppression, unsubscribes, deliverability metrics; scheduled send with approval.

**Sprint G: Marketing launch gate** — Pro entitlement, cost monitoring, security/abuse tests, EN/TA/SI real evaluation sets, accessibility/mobile, consent and provider compliance, staged rollout, error log review, production sign-off.

**After Marketing:** Growth Engine workstream → SEO Engine/specialization, per owner order. Continue Security/Revenue/Learning safeguards throughout.

## 8. Mandatory continuity/update workflow

**This Markdown document on GitHub \`main\` is the canonical handoff.** PDF/DOCX copies are dated *snapshots* for sharing. A new chat should not rely on recalled chat history or cached screenshots over current GitHub, migration history and CI.

At each completed task **while actively working with an assistant**:
1. Open and reread this file; check latest \`main\`, current P2 branch/PR, migration history, Vercel target and CI SHA.
2. Make changes on a feature branch; do not erase Discovery/P1 or current marketing functionality.
3. Verify targeted tests and production build; for auth/billing/provider modules run negative owner-A/B Docker checks and real-browser QA when available.
4. Update the module table, last verified SHA, PR, migration, Preview/Production status, blockers, risks, next exact file/function; add a dated change-log line here.
5. Only after consent and release gates: deploy or apply versioned migrations. State exactly what is and is not live.
6. If requested or at agreed milestones, regenerate PDF/DOCX snapshot from latest Markdown.

**Limits:** An assistant cannot silently monitor GitHub or regenerate this document when no task is running. The file is updated **during actual work** and is not magically kept synchronized in the background. Never put OAuth client secrets, service-role keys, tokens, customer email, personal contacts or private message contents in this public/shareable file.

### Current handoff checkpoint (2026-11-13)

- **Latest live main observed:** \`ffb9c14aebd658e7bbc662811d60defa49e175bd\`.
- **P2 draft PR:** #68, branch \`phase2/marketing-engine-foundation-p2-01-20261113\`, SHA \`5088e0d7589c0f28f5bf4041a051635bb3d263b3\`. CI workflows previously 6/6 pass, Preview READY; **NOT production**.
- **New user architecture decisions:** overview-only Marketing Studio; standalone Marketing Engine; Pro-gated plug-in channels; unified Calls/Messages/Leads agent; minimize provider fees with own algorithms; separate future Growth then SEO.
- **Immediate next code deliverable:** Marketing overview + separate Engine layout/navigation and **verified backend Pro entitlement guard**, then official connector registry/OAuth design. Confirm users without Professional/Enterprise entitlements cannot access any mutation, token or auto-send endpoint.
- **Critical external blocker:** provider OAuth app approval, professional/Page/business eligibility and per-provider permissions. Login alone never means full personal-account control.
- **Critical internal blocker:** P2 Supabase migrations absent from production; no real AI/marketing credits enabled.
- **Do not declare Marketing Engine complete** before real provider connection, approved send/publish, consent, quota, retry and production tests work.

### New Chat — copy/paste this starter

> Continue SLBusinessIndex. The canonical living document is \`docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md\` on GitHub \`Victor-dev-03-cmd/sl_business_index\`. Read it FIRST, plus \`docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md\` on the P2 branch and GrowthOS v1 PDF from my Library if available. Verify current main, P2 PR #68, CI, Vercel and Supabase migration status; do NOT guess completion. **Discovery existing → Marketing Engine NOW → Growth afterward → SEO afterward.** Marketing Studio must be overview only; standalone Marketing Engine must have Pro-entitlement-gated social/email/calls/messages/leads automation with official OAuth provider adapters and own algorithm-first AI. Develop incrementally, test, then update the living handoff with exact verified state. Do not incur paid provider costs or publish/send without explicit release permission.

## 9. Change log

- **2026-11-13 — v1.0:** Created canonical cross-chat implementation handoff after user requested a durable PDF/Word/GitHub workflow. Captures new plugin-based Marketing Engine design, Pro gating, low-cost own-AI approach, official provider limitations, previous P1/P2 verified code status and Marketing → Growth → SEO priority. **Documentation only; no production feature claims.**


## 10. Step 1 — Marketing Studio / standalone Marketing Engine code checkpoint (2026-11-13)

**This is a continuation after v1.0; earlier snapshot SHAs above are historical. Future coding agents must re-query the P2 branch.**

- P2 draft PR #68 remains **OPEN / DRAFT**: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68 . Latest P2 branch SHA inspected for this checkpoint: `be841597d1d773e643fbac6cbe65d41e5943c092`. Standalone route aliases and associated tests are still completing CI at that SHA; do not call them verified until exact commit checks pass.
- **Verified earlier code checkpoint:** SHA `ac1f1e565245976517531f4cba99cf9ba236d576`, all 7 GitHub workflows passed; Vercel Preview `dpl_4gLbEqmaywHtnJFxABfYqYNcUdL9` READY at https://sl-business-index-l5wrpi17z-victor-dev-03-cmds-projects.vercel.app . This is Preview ONLY and predates standalone route aliases.
- **Implemented in development branch:** `/vendor/marketing` server-rendered overview-only; previous manual composer preserved at `/vendor/marketing/campaigns`; independent Marketing Engine implementation with Social, Email, Customer Calls & Messages Agent, Plugin Connections, Automation, Leads, Calendar, Campaigns; canonical user-facing URL **`/vendor/marketing-engine`** (plus child paths), backward-compatible `/vendor/marketing/engine` route retained. Topbar has distinct Marketing Studio and Engine links.
- **Pro controls coded:** verified Professional/Enterprise entitlement via SSR Supabase `auth.getUser()` + `growth_entitlements` expiry and payment reference checks; protected Premium layouts and server Brand/Caption APIs. No frontend-only plan trust. The legacy `marketing_campaigns` direct write RLS was further restricted in P2-05 STAGING-only SQL; synthetic Basic and expired-Pro denials passed Docker at SHA `d74e8015174bc0e0a99f881e1de981ad905d0f86`, where 7/7 workflows passed. **That policy has not been applied to production DB yet.**
- **Algorithm and connector foundation coded:** 12 first-party official provider candidates, all labelled planned/disconnected (not actually OAuth-connected); browser-local rules-only English/Tamil/Sinhala enquiry classifier, with human escalation of pricing/refund/complaint/ambiguity. This is not yet a neural network, live WhatsApp bot or telephone agent.
- **P2 phase documentation:** `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` (on P2 branch) is the detailed milestone ledger; `docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md` is a supplementary P2 design reference. **THIS** document on main remains the canonical cross-chat handoff, as `AGENTS.md` directs.
- **Still outstanding:** actual OAuth callbacks/provider review, encryption/rotation/revocation of account credentials, customer provider webhooks, live agent permissions, true social posts/verified receipts, opt-in email, persistent scheduling jobs, real paid-entitlement e2e, Supabase P2 migrations, production deployment. No external messages/calls/posts sent or model credits activated.
- **Next code task:** establish typed official-provider adapter contract and server-side authorization state storage, then implement the first provider OAuth with proper business account selection. Keep credentials absent/disabled until actual user/provider authorization. Continue Marketing before Growth, then SEO.

**New chat instruction:** After reading this file, read `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` and `docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md` from PR #68 (the P2 branch). Verify exact CI SHA and live Supabase/Vercel before changing code. Update this canonical document at every verified milestone; do not expect chat memory to be complete.
