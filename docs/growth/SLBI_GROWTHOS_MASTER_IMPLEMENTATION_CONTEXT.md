# SLBusinessIndex | GrowthOS Master Context — NEW CHAT HANDOFF
Version 1.0 | 2026-11-13 | Owner-approved architecture | Tamil collaboration

READ THIS FIRST in EVERY new development chat, together with docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md.
GitHub: https://github.com/Victor-dev-03-cmd/sl_business_index
Open P2 PR: https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68
This is a living implementation specification, not proof that an untested module is complete. Always check actual GitHub SHAs, CI, Supabase migrations and Vercel deployment before claiming current status.

## 1. Product vision
SLBusinessIndex is a Sri Lankan business discovery and vendor growth platform. Build our OWN enterprise-grade, low-operating-cost connector framework, workflow orchestration, deterministic algorithms, small ML/NN models, multilingual evaluation and carefully grounded prompt-engineered LLM fallbacks. We do NOT want to pay multiple third-party SaaS orchestrators unnecessarily. We DO require official provider APIs (Facebook/Instagram/WhatsApp/mail/telephony); those may have account restrictions, API review, quotas and unavoidable usage charges. Never claim all external integrations are free.

Original GrowthOS v1 PDF describes six conceptual engines: Discovery, Growth, Marketing, Security, Revenue, Learning. Owner explicitly updated EXECUTION ORDER: **Discovery (existing) -> Marketing (CURRENT) -> Growth (AFTER Marketing) -> SEO (AFTER Growth)**. Standalone SEO is a future product phase even though SEO intelligence was part of the original Growth scope. Security, Revenue and Learning are shared foundations throughout. Do not rebuild Discovery.

## 2. Approved user-facing architecture
Marketing Studio (/vendor/marketing): an OVERVIEW page only, accurate overview KPIs, status, usage and links. No giant embedded form/editor. Do not label call clicks and credit usage as a customer-service agent.
Marketing Engine (/vendor/marketing/engine): SEPARATE primary workflow and connector workspace.
Future modules:
- /vendor/marketing/social - channel connectors, content, posts, blog/media workflow, review, schedule and receipts.
- /vendor/marketing/email - mailbox plugins, consented campaign audience, drafts, scheduled mail, bounce/unsubscribe.
- /vendor/marketing/agent - Calls & Messages AI Agent, knowledge base, conversations, inbound/outbound handling and human handoff.
- /vendor/marketing/connections - social/email/voice plugin marketplace and provider health.
- /vendor/marketing/automation - lead CRM hooks, rule engine, job scheduling, outcomes, retries.
Existing /vendor/marketing/brand, /captions and /design are separate P2 development pages to preserve and then connect.
Use premium orange/black/white Tailwind styling, top navigation, Iconsax and mobile responsive layout.

## 3. Pro gating
Owner requires advanced AI agent, social/email connector automations to be Pro-only. Existing database plan name is Professional, display it as Pro; allow Enterprise too. Basic can see an overview and upgrade info but cannot connect providers or execute any premium action.
Never trust a client-side Pro flag or payment request. Check server-side verified, unexpired billing entitlement (growth_entitlements) AND authenticated vendor AND ownership of selected business at API, OAuth callbacks, job worker and provider send boundaries. Use least-privilege roles/RLS, deny by default.

## 4. First-party plugin architecture — same principle as ChatGPT connectors, NOT unrestricted access
User clicks Connect -> official provider OAuth authorization code / PKCE when supported -> server validates state, CSRF, correct redirect, owned business/account and consented scopes -> server exchanges code and encrypts credentials -> records capabilities, expiry, scopes, last sync and owner -> signed webhooks sync -> typed server adapter executes allowed actions with approval, rate limit and audit -> user can disconnect/revoke and stop queued jobs.
Never request user passwords for Facebook or Gmail. Never store OAuth tokens in browser localStorage, public database responses, logs or source code.
Common adapter contract: providerId, displayName, supportedAccountTypes, scopes, capabilities, startAuthorization, callback, verifyAccount, refresh, publishApproved, sendApprovedReply, handleSignedWebhook, disconnect; all unsupported actions fail closed.
Connection record: owner_id, business_id, provider, external_account_id, encrypted_token_ref, scopes, state, expires_at, last_verified_at, last_error_code. Provider receipt is proof of publishing, not a local "posted" status.

Provider rules:
* Facebook Login authenticates people but does NOT grant unrestricted automation of personal profile. Publish to Pages only where official permissions/app review/Page roles allow.
* Instagram official publishing targets eligible Professional Business/Creator accounts, not ordinary personal Instagram consumer profiles. Connection and certain publishing capabilities depend on provider account and login path.
* WhatsApp requires WhatsApp Business Platform Cloud API, eligible WhatsApp Business account/number, Embedded Signup/app review and approved templates for suitable outgoing messages. Do not automate personal WhatsApp via scraped WhatsApp Web.
* Messenger and Instagram DMs need eligible business accounts, app permissions and messaging window compliance.
* Gmail: Google OAuth; minimum gmail.send if send-only. Inbox read/modify scopes may be restricted and require verification/security assessment.
* Outlook: Microsoft OAuth / Graph, delegated Mail.Send for send; consented minimum mailbox read permissions if needed.
* Bulk email provider: verified domain, opt-in lists, unsubscribe/suppression, SPF/DKIM/DMARC, bounce and complaint tracking.
* Voice agent: real number/forwarding and telephony provider (e.g., Twilio if region-supported); signed call webhook, consent/recording requirements and human transfer. Click-to-call metrics alone cannot answer an actual voice call.
* Additional LinkedIn/TikTok/YouTube conditional on official account type and approved APIs.

Official references:
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup
https://support.google.com/cloud/answer/13464325?hl=en
https://learn.microsoft.com/en-us/graph/permissions-reference

## 5. Calls & Messages AI Agent is a real interaction agent, NOT usage credits
Pro vendor explicitly enables agent for an owned business and connects an eligible provider. Flow:
Signed inbound webhook -> verify signature -> dedupe -> opt-out and quiet-hours -> intent classifier -> business knowledge retrieval -> grounding and confidence score -> safe FAQ template / rule-based response -> optionally small trained classifier, embedding reranker, local inference -> optionally LLM multilingual draft ONLY for difficult cases -> human review or narrowly preapproved auto reply -> official provider action -> audit and handoff to existing Leads CRM.
English/Tamil/Sinhala and transliterated colloquial Sri Lankan phrasing. Pricing, refunds, bookings, uncertain health/legal/financial, complaints, unverified facts require human confirmation; no fabricated sales or promises. Training requires lawful example corpus, measurement, baseline comparison and opt-in.
Cost: algorithms and caching first; small ML/NN when evaluation demonstrates benefit; LLM only when necessary and within budget. No “neural network” claim without trained/evaluated model.

## 6. Social, Email, Automation
Social: connect authorised account -> business facts/Brand Profile -> post/blog/media draft -> original creative/fully editable names prices dates contacts -> human approval -> queued worker -> provider publish -> receipt -> retries/errors and post history.
Email: OAuth mailbox for business enquiries and approvals; for marketing emails collect explicit opt-in consent, unsubscribe/suppression, verified sender domain and compliant delivery. AI suggests timing from real aggregates and drafts with human review; never cold-spam a contacts list.
Automations: persistent jobs and idempotency; deterministic triggers and lead stages first, optional LLM/NN for classification and phrasing. No fake “automatic schedule” from a local date picker.

## 7. P2-01 to P2-10 scope
P2-01 Brand identity/logo/colors/offers/languages/guidelines.
P2-02 grounded English/Tamil/Sinhala AI captions and owner review.
P2-03 original AI poster backgrounds plus editable business names/prices/dates.
P2-04 original templates, square/portrait/story, text layers, asset uploads and export, later persisted project versions.
P2-05 campaign drafts, approvals, revisions, external provider proof.
P2-06 durable queue, retries and failed job recovery.
P2-07 authorized connector plugins (Facebook/Instagram/WhatsApp etc.).
P2-08 verified-domain SEO preparation; full SEO engine after Growth per updated execution order.
P2-09 plug-and-play Gmail/Outlook and consent-based email marketing.
P2-10 server-side credits/quotas, reservations, settlement/refunds, audit.
Also add Calls & Messages AI Agent / lead automation as owner-added Marketing Engine module rather than rename P2-10.

## 8. Project technology and known safety gates
Next.js + Tailwind/Iconsax frontend, GitHub source, Vercel deployment; Supabase Auth/profile/data/RLS/storage, independent Neon PostgreSQL for billing where already configured. Current GrowthOS credit plans Basic/Professional/Enterprise. Production P1 is on main SHA ffb9c14aebd658e7bbc662811d60defa49e175bd. P2 development branch SHA last audited 5088e0d7589c0f28f5bf4041a051635bb3d263b3; PR #68 is DRAFT, not merged; latest tested P2 preview READY. Reverify SHA every chat.
P2 branch includes Brand Profile UI/API, optional Groq English/Tamil/Sinhala Caption Lab, editable poster design and staged SQL for brand profiles, AI credits and campaign audits. Live Supabase P2 schema was NOT applied as of this record; live AI actions are disabled. No real provider account connectors, AI paid sending, campaigns queue/worker, Inbox voice agent or verified provider publishing yet. Never misstate them as complete.
No paid Supabase staging; disposable GitHub Actions Docker Postgres/real Auth where available. Never enable external sending, purchase new API capacity or apply risky live migrations without separately reviewed gates and user approval. Actual user OAuth authorization is always performed by each vendor.

## 9. Mandatory cross-chat documentation update protocol
1. Read this file and docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md FIRST.
2. Audit actual GitHub HEAD, PRs, CI, Vercel preview/prod and Supabase migrations with tools.
3. Continue the next safe module and update implementation ledger WITHIN same PR/commit.
4. Record exact timestamp, branch SHA, changed files/routes, tested gates, Docker RLS, preview URL, blockers, next action, production approval state.
5. Distinguish DESIGN, CODED, TESTED, PREVIEW, DATABASE LIVE, VERIFIED AUTHENTICATED E2E, and PRODUCTION (do not equate these).
6. Update this master only when architecture/owner decisions change; update LIVE STATUS after every completed implementation milestone.
7. After production merge, record production commit SHA, Vercel deployment ID and migration versions. No fabricated claims.
8. PDFs/DOCX snapshots are human handoffs; GitHub Markdown remains canonical and updated in future chats.

## 10. Exact message to paste in a new ChatGPT chat
"Continue my SLBusinessIndex Marketing Engine. Use GitHub repo Victor-dev-03-cmd/sl_business_index. FIRST READ docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md and docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md; verify branch SHAs/CI/deployments and continue the next safe unfinished P2 task. Current order is Marketing -> Growth -> SEO. Keep the GitHub status ledger updated. Explain in Tamil. Do not reimplement Discovery or deploy unverified/potentially paid services."

Owner scope approval = permission to develop and test; not blanket access to third-party accounts, not a way to bypass provider account restrictions, not unlimited cost or autonomous sending.
