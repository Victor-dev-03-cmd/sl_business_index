# SLBusinessIndex — MASTER IMPLEMENTATION & CHAT HANDOFF

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

> **Source of truth for future ChatGPT sessions.** Read this file before making design, billing, AI, GitHub, database, or deployment changes. Update it at each completed milestone, with evidence. **Do not claim any feature is production-ready merely because its code compiles or a preview deploys.**
>
> **Document version:** 1.0 · **Created:** 2026-11-13 (Asia/Colombo) · **Project:** https://slbusinessindex.com · **Repository:** https://github.com/Victor-dev-03-cmd/sl_business_index

> **CURRENT SOURCE CONSOLIDATION — 14 Nov 2026:** PR #68 merged into `main` at `852da229728ec4141b8f3ac3df3015c9dbbd99d2`. Latest validated feature source `c2326c5`: 7/7 CI checks passed and Vercel Preview `dpl_H7GVfPcp5xsDsnXhXLuVDK6RRJdR` READY. Production deploy/build status must be rechecked at the current `main` SHA. **Code merged does not mean integrations are live**; no P2 Supabase migration, provider permission, managed KMS or authenticated paid-vendor E2E. Legacy Basic manual campaign access preserved. Read section 11 below for precise next actions.

> **LATEST PRODUCT UX (2026-11-14):** Only **Marketing Studio** appears in Dashboard > Tools. `/vendor/marketing` now combines an overview and 12-card first-party marketing app marketplace. `/vendor/marketing-engine` and `/vendor/marketing/engine` root URLs redirect there; Pro deep-links continue. Source PR #69 merged as `715fb2b`. Read section 12 for exact tests, preview and rollout boundaries. Earlier descriptions of two topbar entries are historical.

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

- P2 draft PR #68 remains **OPEN / DRAFT**: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68 . Verified standalone Marketing Engine application code SHA: `be841597d1d773e643fbac6cbe65d41e5943c092` — **7/7 GitHub workflow families passed**, Vercel Preview deployment `dpl_C9MDRpHiWo3T6GBrUCRTpu81TJie` **READY** at https://sl-business-index-5iilmobeo-victor-dev-03-cmds-projects.vercel.app . This is NOT production and is NOT evidence of live provider OAuth, paid AI execution or real vendor browser acceptance. The P2 branch may contain later docs-only commits; always re-query.
- **Verified earlier code checkpoint:** SHA `ac1f1e565245976517531f4cba99cf9ba236d576`, all 7 GitHub workflows passed; Vercel Preview `dpl_4gLbEqmaywHtnJFxABfYqYNcUdL9` READY at https://sl-business-index-l5wrpi17z-victor-dev-03-cmds-projects.vercel.app . This is Preview ONLY and predates standalone route aliases.
- **Implemented in development branch:** `/vendor/marketing` server-rendered overview-only; previous manual composer preserved at `/vendor/marketing/campaigns`; independent Marketing Engine implementation with Social, Email, Customer Calls & Messages Agent, Plugin Connections, Automation, Leads, Calendar, Campaigns; canonical user-facing URL **`/vendor/marketing-engine`** (plus child paths), backward-compatible `/vendor/marketing/engine` route retained. Topbar has distinct Marketing Studio and Engine links.
- **Pro controls coded:** verified Professional/Enterprise entitlement via SSR Supabase `auth.getUser()` + `growth_entitlements` expiry and payment reference checks; protected Premium layouts and server Brand/Caption APIs. No frontend-only plan trust. The legacy `marketing_campaigns` direct write RLS was further restricted in P2-05 STAGING-only SQL; synthetic Basic and expired-Pro denials passed Docker at SHA `d74e8015174bc0e0a99f881e1de981ad905d0f86`, where 7/7 workflows passed. **That policy has not been applied to production DB yet.**
- **Algorithm and connector foundation coded:** 12 first-party official provider candidates, all labelled planned/disconnected (not actually OAuth-connected); browser-local rules-only English/Tamil/Sinhala enquiry classifier, with human escalation of pricing/refund/complaint/ambiguity. This is not yet a neural network, live WhatsApp bot or telephone agent.
- **P2 phase documentation:** `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` (on P2 branch) is the detailed milestone ledger; `docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md` is a supplementary P2 design reference. **THIS** document on main remains the canonical cross-chat handoff, as `AGENTS.md` directs.
- **Still outstanding:** actual OAuth callbacks/provider review, encryption/rotation/revocation of account credentials, customer provider webhooks, live agent permissions, true social posts/verified receipts, opt-in email, persistent scheduling jobs, real paid-entitlement e2e, Supabase P2 migrations, production deployment. No external messages/calls/posts sent or model credits activated.
- **Next code task:** establish typed official-provider adapter contract and server-side authorization state storage, then implement the first provider OAuth with proper business account selection. Keep credentials absent/disabled until actual user/provider authorization. Continue Marketing before Growth, then SEO.

**New chat instruction:** After reading this file, read `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` and `docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md` from PR #68 (the P2 branch). Verify exact CI SHA and live Supabase/Vercel before changing code. Update this canonical document at every verified milestone; do not expect chat memory to be complete.

## 11. 2026-11-14 — MAIN SOURCE CONSOLIDATION (current checkpoint)

**Owner decision:** Audit P1 foundation + existing main + unfinished P2 development, preserve old workflows, merge safe code into main, then continue Marketing before Growth and SEO. The original v1 PDF (11 pillars; six conceptual engines) remains intact; no Discovery redesign.

**Code integration:** P2 PR [#68](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68) was squash-merged at GitHub main commit `852da229728ec4141b8f3ac3df3015c9dbbd99d2`. P2 feature source `c2326c5c09ee7e99e5fdda5149c09f6d73e857ee` passed 7/7 workflow families, including optimized Next.js TypeScript/build, P1 overview/security/integrated regressions, Billing V2 checks, P2 Node contracts, disposable PostgreSQL 17 owner/RLS/credit/campaign/OAuth tests. Vercel Preview `dpl_H7GVfPcp5xsDsnXhXLuVDK6RRJdR` READY at https://sl-business-index-jfuwe4ru3-victor-dev-03-cmds-projects.vercel.app — this is **Preview**, not proof of production provider capabilities.

**Regression corrected before merge:** The existing owner manual marketing campaign composer (English/Tamil/Sinhala drafts, locally generated PNG, planning-only calendar, owner-scoped saved drafts) stays accessible to Basic owners at `/vendor/marketing/campaigns`. Current live `growth_entitlements` has zero rows, so applying a blanket paid guard would have silently disabled the existing workflow. The staging P2-05 policy now preserves Basic draft/planning records, ownership RLS and immutable revision history, and prevents browser-forged `approved` or `posted` states. Premium connectors/agents remain verified Professional/Enterprise only.

**Source vs service:** Marketing Studio `/vendor/marketing` is overview-only; standalone Marketing Engine `/vendor/marketing-engine` is separate. Pro-only official connector catalogue, English/Tamil/Sinhala rule-based agent demo, Brand/Caption/editable Poster source, preview-only Google OAuth Start/Callback and atomic/PKCE/vault SQL tests are in main. However Supabase live lacks `social_brand_profiles`, `marketing_oauth_intents`, `marketing_connections`, `marketing_connection_secrets` and P2 credit/revision tables; no P2 migration applied. Three usage-credit AI/SEO action switches remain disabled. No verified active Pro entitlements, managed KMS, real Google OAuth approval, provider account test, email/WhatsApp/Facebook sends, automatic schedule/receipt or production real-owner acceptance. Do not mark any of these COMPLETE.

**Production safety:** P2 OAuth runtime explicitly requires `VERCEL_ENV=preview`; Production fails closed regardless of ordinary client session. The current source merge triggers an automatic Vercel production build for main, but **READY must be verified for its exact SHA**; no live migration, new secrets, external operations or paid action was performed here. Nonsecret operational evidence belongs in [P2 live status](p2/IMPLEMENTATION_STATUS_LIVE.md).

**Next milestone:** Recheck main CI+Vercel deployment first, compare paid plan/billing entitlement mechanism with missing Supabase grants, review versioned P2 migrations on disposable/staging DB with rollback, perform real owned-vendor browser tests and production smoke. Then implement vendor-initiated Google connection UI, actual provider OAuth test account/consent, KMS-backed token persistence/rotation, revoke/disconnect, verified provider receipts. Continue Marketing P2-05/06/07/09/10, then Growth, then SEO. Do not rebuild Discovery or enable external provider spends before separate authorization.

**Current cross-chat instruction:** Read this `main` document, `AGENTS.md`, `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` and `docs/growth/p2/P2_07_OAUTH_IMPLEMENTATION_SECURITY_HANDOFF.md` directly from `main`; check exact current GitHub/CI/Vercel/Supabase before acting. Earlier P2 branch SHAs within historical sections remain reference checkpoints, not live deploy evidence.

## 12. 2026-11-14 — Single Marketing Studio App Hub UI launch

**Owner request:** In Dashboard topbar Tools, replace duplicated Marketing Studio/Marketing Engine entries with only **Marketing Studio**. Inside Studio show visually rich, app-store-style modular apps and plugins with Iconsax vectors; change illegible white hero to black. Each app should open its own workspace; a verified Pro plan is the entitlement for premium tools, not itself a provider login. Continue backend/security work after deploying this UX.

**Implementation:** PR [#69](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/69) source `0d6b525d953f263a30e9948fcadff77d7013e8a7`; squash merge on main `715fb2b3b2950a77c6249e012208beed3d01e7ae`. Single topbar Tools entry in `app/vendor/layout.tsx` for desktop + mobile, including active navigation on nested modules. `app/vendor/marketing/page.tsx` retains authenticated owner campaign counters and has a dark `#1D1D20` hero and sole `MarketingAppStore` view. New `lib/marketing/studio-apps.ts` is 12 distinct first-party catalog records, categories, truthful capability status, 10 Pro + 2 included apps; new client `app/vendor/marketing/components/MarketingAppStore.tsx` provides accessible search, filter tabs, vector icons, responsive cards and actual per-app URLs. Existing Engine root landing URLs redirect to Studio; existing deep links, premium child layouts and manual Campaign Planner are preserved. Changed Iconsax fallback for document icon to vector FileText. No installations, fake provider connectivity, payment mutation, Supabase schema or external publishing.

**Security and compatibility:** New Pro apps continue to require verified Professional/Enterprise server access. A Basic user may browse catalogue and enter the upgrade notice; Basic continues using existing manual Campaign Planner and Leads CRM. Poster design is a local editor/exporter, AI caption route is not globally enabled, Google provider OAuth is preview-only, connectors/social/email/voice remain demo/catalogue unless separately authorized. No new credit action enabled.

**Verification:** App-source SHA `0d6b525`: **6/6 GitHub workflow families PASS**, P2 Node and Docker A/B tests, P1 portal/overview, billing SQL and optimized Next.js build. Exact-source Vercel Preview `dpl_8GVzX64Zd7rdTGwapNH8H8KtuKdj` **READY** at https://sl-business-index-3gxvugp6b-victor-dev-03-cmds-projects.vercel.app/vendor/marketing . [P2 test run](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43578213457) · [Next build](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43578213428). Main production deployment `dpl_GhG8eRzFwtBYJvcXkgJRMMxJdYD7` was observed BUILDING after merge; check exact current SHA and domain alias before declaring completion. No authenticated Pro-vendor browser E2E was performed.

**Pending AFTER UI release:** first reviewed P2 schema migrations and real vendor browser testing, verified Pro entitlement purchase/mapping, secure OAuth provider app and managed KMS, connect UI and token refresh/disconnect/revoke, P2-05 verified publication receipts, P2-06 durable queue, P2-09 consented email campaigns and suppressions, budgeted AI/credit activation with authorization. Then Growth and SEO in that order; no Discovery rewrite. Keep master roadmap PDF unchanged.

## 13. 2026-11-14 — P2-07 Preview Google Connect entry and skeleton-first performance (latest milestone)

**Owner decision:** Continue Marketing first, prioritize extremely responsive UI and skeleton loaders instead of blocking spinners, use Chromium for desktop/mobile checks, then build provider connections within verified Pro-only Marketing apps. No special external provider permission has been provided; never bypass official OAuth or use unapproved provider accounts.

**Source:** PR [#70](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/70) squash merged `main` as `dc15c7b58797a2e67aa3a7349101b2104c74f323`. Verified source SHA `cbf395ea39b54b855913335f0f3286ee7122ea50`: **6/6 GitHub CI workflow families PASS**, including Next.js TypeScript/optimized build, P1 portal integration, P2 PostgreSQL 17 OAuth state/start/store, brand owner isolation, AI-credit and campaign RLS security, independent billing SQL. Exact feature-source Vercel Preview `dpl_6NfYfWSuUXtFvdPh1UzaFrYK3uwm` **READY**: https://sl-business-index-4q6l2eixo-victor-dev-03-cmds-projects.vercel.app/vendor/marketing . Exact merge SHA production build `dpl_BVn1A9Lgp29gApHyVEbEjfMXhfxP` was BUILDING at this checkpoint; recheck READY and alias against latest main before release claim.

**Performance scope:** `app/vendor/components/VendorBootSkeleton.tsx` replaces initial full-page spinner in `app/vendor/layout.tsx`, preserving approximate dashboard geometry and visual feedback. `app/vendor/marketing/components/MarketingRouteSkeleton.tsx` with ten route-specific `loading.tsx` files covers Studio, dashboard, campaign editor, poster/brand/captions and both Engine route families. All use accessible busy status and reduced-motion-safe pulse rather than fake statistics. `app/vendor/marketing/page.tsx` runs independent owner business + Pro RLS reads concurrently. `MarketingAppStore.tsx` memoizes tiles, defers input filtering, and disables eager prefetch for the 12 distinct app destinations. These are targeted latency/bandwidth improvements, **not proof of a measured production Core Web Vitals gain**.

**Google Mail consent UI:** `app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx` and `app/vendor/marketing/engine/(pro)/connections/page.tsx` now provide a first-party vendor-selected business + secure start button when and only when the server has validated Vercel Preview OAuth config and isolated owner-scoped connection metadata. POST goes to existing `/api/marketing/oauth/google_mail/start`, which independently checks auth, verified Pro, owner, exact origin, PKCE, one-time state, 5/hour start limit. Google destination is origin/path allowlisted; no credentials or tokens passed to client. Connection metadata is visible only after RLS; no real test owner/provider connection executed. Production Vercel runtime **remains hard-OFF** for P2 OAuth. Live Supabase has **no** `marketing_oauth_intents`, `marketing_connections` or vault tables; verified active Pro rows currently 0. No live migrations, KMS, provider consents, sends, revokes or charges were performed.

**Chromium:** Headless Chromium 144.0 desktop 1440×900 and mobile 390×844 tested a *local static visual fixture* modeled on the new skeleton: no horizontal overflow, `aria-busy` present, dark hero background, reduced-motion animation disabled. Hosted app and signed-in vendor browser testing remain **NOT VERIFIED** because the tool container lacks network access to the deployed URL. Avoid claiming authentic Playwright E2E or production speed measurements.

**Next implementation:** 1) verify latest production Vercel/CI; 2) release-reviewed, reversible P2 schema in test environment and owner-A/B/Basic/expired-Pro real Auth tests; 3) KMS-backed preview token custody, Google developer app and test owner approval, refresh and disconnect/revoke; 4) browser Playwright authenticated journey and security/cost sign-off; 5) P2 campaigns, opt-in email, scheduler and provider receipts. Continue Marketing → Growth → SEO; do not reimplement Discovery.

## 14. 2026-11-14 — Branch audit and safe Google local disconnect checkpoint

**Owner release decision:** Audit pending branches before new development; merge tested, complete changes through new PRs; verify exact SHA Preview and production, and keep living handoffs current. Five old open *draft* PRs (#34, #30, #27, #9, #7) remain divergent/historical—not safe as a mass-merge. PRs #68/#69/#70/#71 are already merged, although their old source branches may still exist. See [branch audit](p2/P2_BRANCH_AUDIT_20261114.md).

**Production source completed:** PR [#71](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/71) squash merged main SHA `cb26f6a0a28dff885f843d922e1097065fa7644c`; source `d7f199ae7ba721fb76d3936a58663126fe4fe044` passed 6/6 unique workflow families: Next.js optimized build & TypeScript, P1 integrated/review security, independent billing/SQL and P2 PostgreSQL 17 synthetic tenants/credits/campaigns/OAuth disconnect. Exact feature Vercel Preview `dpl_Ag1SCt8VG1BzqzjQZEbN8sVjUmif` READY. Merge-source Vercel Production `dpl_GgaedofWMCk6YQbPUh7XqxXdSNiA` READY; verified alias `www.slbusinessindex.com`. [P2 CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43583415076) · [Next build](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43583415079).

**Scope:** Preview-only `/api/marketing/oauth/google_mail/disconnect` requires actual SSR user identity, same-origin JSON and owned business. Service-role-only staged `slbi_disconnect_google_mail_connection` checks owner/business/connection, marks local state revoked, purges encrypted access & refresh token records and consumes unclaimed pending OAuth intents atomically. Does **not** require active Pro for privacy removal after expiry, does **not** expose secrets to client, and **does not revoke provider OAuth grant**. UI explicitly confirms and explains Google security grant removal separately. No live Supabase migration, real provider account authorization, paid credit, sending or browser E2E executed. Production OAuth flags continue hard-off.

**Live Supabase read-only audit:** `growth_entitlements` and `marketing_campaigns` exist; P2 OAuth tables not present and verified active Pro grants **0**. `marketing_campaigns` still uses permissive owner `FOR ALL` RLS without status constraints; staged P2-05 hardening remains a required reviewed security migration. Supabase advisors also flag older function search_path and RLS policy reviews; do not apply broad uncontrolled changes.

**Next release gates:** (1) Fix claimed-callback-versus-disconnect race with generation-bound durable store invariant and rigorous Docker parallel tests; (2) fully reviewed reversible P2 schema with owner-A/B/Basic/expired-Pro tests on isolated Supabase; (3) verified billing entitlements, managed KMS + rotation, Google registration/test consent, refresh and provider-side revoke; (4) authenticated Chromium E2E and release security sign-off. Only then enable official connector production capabilities; Marketing first, then Growth, SEO. Never mass-merge old PRs or confuse a Vercel deployment with working live OAuth.

## 15. 2026-11-14 — OAuth Disconnect vs Claimed Callback race closure (PR #72)

**User-directed release discipline:** Verify open PRs/branches; promote only passing, non-regressive code through Preview then production and keep a durable main handoff.

**Branch audit:** Five old open draft PRs #34 (Growth security rehearsal), #30 (old marketing/QR/settings UX), #27 (SemanticSearch V3 research), #9 (historic PostgreSQL billing), #7 (historic auth/billing) remain heavily diverged and **not production-approved**. Each overlaps newer source, research or staging code. PRs #68 through #71 already squash merged to main. Do not cherry-pick stale code without current tests. `docs/growth/p2/P2_BRANCH_AUDIT_20261114.md` contains exact comparisons/dispositions.

**Implementation:** PR [#72](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/72) source `56ee2397c98af065cb1ba3ba5dbac84a2239361b`, squash merge SHA `4b9cf4d06d275367200c9108848563a96800ad2a`. Existing Google callback now sends its trusted one-time claimed-intent UUID (not from browser) into `slbi_store_claimed_google_mail_connection`. Staged-only `P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql` adds `invalidated_at`/`stored_at` on intents; invalidates even claimed callbacks after Disconnect; serializes token-store and Disconnect with the **same owner advisory transaction lock**; checks consumed/unexpired/not-invalidated/not-stored state under row lock; removes service_role EXECUTE from previous unbound store. `tests/p2-oauth/callback-disconnect-race-verify.sql` covers first claimed store, stale second claim denied after disconnect, replay, cross-owner/unclaimed denial, credential purge and grant restrictions. No external Google operations. Existing staging SQLs are prerequisites; no live migration.

**Evidence:** Feature `56ee239` **6/6 GitHub workflows PASSED** (P1, billing, P2 Node and Docker PG 17 contract, independent Next.js). Exact SHA Vercel Preview `dpl_H56d1T5aEEiGTh5cLXMzaksbFVep` READY: https://sl-business-index-qio23d87u-victor-dev-03-cmds-projects.vercel.app. Merge SHA production `dpl_41aYCX8pqaeifiwsE8ZgnVht6Sgr` READY and `www.slbusinessindex.com` alias verified. Production merge-SHA GitHub CI needs exact recheck (source-sha 6/6 already green). Documentation follow-up SHA CI + deployment should be independently verified.

**Boundaries:** Production Supabase has no P2 OAuth tables/RPCs and 0 verified Pro grants; Google OAuth remains deliberately preview-gated and off in production. This releases **security source code**, not a working provider connection. No KMS, remote Google revoke, refresh, provider registration, trial/real mailbox, billed AI, contact data, schema DDL or sending operations were authorized/executed.

**Next:** isolate and version P2 schema with rollback/restore and tenant tests; validate real billing Professional/Enterprise entitlements and stale Pro denial; managed KMS + Google OAuth test-app and callback; remote revoke/refresh; signed-in Chromium E2E, then controlled rollout of Marketing workflows. Live `marketing_campaigns` still has an old owner-only FOR ALL policy allowing spoofed status; validate a backwards-compatible repair on disposable DB before any production mutation. Marketing → Growth → SEO.

## 16. 2026-11-14 — Global Marketing Studio foundation: LIVE DB migration + 12 Coming Soon cards

**Applied Supabase production migration:** `20261114104216 p2_marketing_global_foundation_coming_soon_v1` in `SL_Business_Index` project `oofxhragafekazwjikae`. Source `docs/growth/p2/P2_MARKETING_GLOBAL_BASELINE_PRODUCTION.sql` was previously verified as one atomic transaction on PostgreSQL 17 using synthetic owner A/B. Adds five new RLS-protected tables: `marketing_studio_app_rollouts` (12 strictly `coming_soon` rows), `social_brand_profiles`, `marketing_oauth_intents`, `marketing_connections`, `marketing_connection_secrets`; and service-only OAuth begin/claim/bound-store/local-disconnect primitives. Owner-scoped brand profile exists but marketplace app remains Coming Soon. No user-paid Pro entitlements were created and no remote provider access was activated. Existing one `marketing_campaigns` row remains unchanged and one old `posted` flag is *not provider verified*.

**Production code:** PR [#73](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/73) feature `a6094afe3518e5c32a31c7a68b09e401efdb35bc`, passed **5/5 CI families**, **7 P2 jobs**, exact 34,474-byte SQL Docker rehearsal and production Next TypeScript/build. Preview READY `dpl_A6KE1nRMmSbK2V793EuxrHid9Kr3`. Merge `main` `12d0add2f99b7fdf8936b1042e581c291a4bdeb3`, main CI success, Vercel Production READY `dpl_3XQP5DUcG51cMwAUuD96kH7mSDxN`, exact `www.slbusinessindex.com` alias verified. Client marketplace renders app cards as non-clickable Coming Soon until each server-fetched DB rollout row has status `live`; `preview` remains closed, and schema/query errors fail closed. Existing Basic manual campaigns and Leads CRM remain reachable via their original vendor routes.

**Security:** Live verification: 12/12 status Coming Soon, 0 OAuth intents/connections/secrets, 0 verified active Pro, 0 social brand profiles, preexisting campaigns count 1; all five new tables RLS true. Authenticated users can read catalogue statuses only; cannot write them; cannot read vault or call secret-write RPC. Old unbound service-role store grant revoked. OAuth feature explicitly impossible in Vercel Production regardless of DB. Existing PostGIS `spatial_ref_sys` RLS warning unrelated. No real user/browser authenticated E2E yet. `marketing_campaigns` old owner `FOR ALL` can still allow fake `posted`; staged P2-05 fix should be separately migration-tested and deployed soon.

**Next one-by-one app launch:** `docs/growth/p2/P2_MARKETING_ROLLOUT_RUNBOOK_20261114.md` describes status promotion and gate requirements. Priority: P2-05 live campaign RLS repair, verified Pro billing, consented Google test OAuth with managed KMS, refresh and remote revoke, genuine owner-A/Basic-B browser acceptance, then marketing provider publishing with approvals and delivery receipts. Marketing → Growth → SEO. Avoid merging old draft PRs blindly.
