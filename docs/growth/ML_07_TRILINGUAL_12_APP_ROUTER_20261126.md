# ML-07 — 12 Marketing Studio app intent foundation + synthetic trilingual CPU training

**Date:** 2026-11-26 (Asia/Colombo)  
**Owner scope:** all twelve Marketing Studio first-party apps, vendor-specific GrowthOS, marketing/automation/email/calls.  
**Important:** A synthetic intent classifier is not a trained, proven real-vendor Growth Intelligence model and not a conversational LLM.

## Canonical 12-app inventory (GitHub source)
Source of truth: `lib/marketing/studio-apps.ts`. Do not infer launch status from the ability to open a route.

| # | ID | Tool route | Execution state in this batch |
|---|---|---|---|
| 1 | campaign-planner | /vendor/marketing/campaigns | read/review route only |
| 2 | poster-editor | /vendor/marketing/design/puter-lab | read/review route only |
| 3 | caption-lab | /vendor/marketing/captions | read/review route only |
| 4 | brand-kit | /vendor/marketing/brand | read/review route only |
| 5 | social-marketing | /vendor/marketing-engine/social | Meta permission + owner approval still required |
| 6 | email-marketing | /vendor/marketing-engine/email | mailbox/provider, recipient consent, unsubscribe + approval still required |
| 7 | voice-agent | /vendor/marketing-engine/agent | telephony provider/consent + signed call webhooks still required |
| 8 | workflow-automation | /vendor/marketing-engine/automation | durable queue/replay/approval worker still required |
| 9 | plugin-connectors | /vendor/marketing-engine/connections | official OAuth/scopes + vault still required |
| 10 | content-calendar | /vendor/marketing-engine/calendar | planning only, no scheduled publish worker |
| 11 | leads-workspace | /vendor/marketing-engine/leads | read/review route only |
| 12 | leads-crm | /vendor/leads | existing owner CRM route; no automatic sends |

## New code
- `lib/growth/agent/ml07-studio-router.mjs` deterministic EN/TA/SI intent phrase routing to all 12 canonical Studio app IDs, matching original app URLs. Handles mixed-script and multi-app requests. Invalid/destructive requests fail closed, unrecognized intents abstain. Returns review links only, never minted authorization, persisted, sent, charged or invoked external APIs.
- Augment `POST /api/vendor/marketing/whatsapp/plan` response with `studio` proposals *after* its existing same-origin, Supabase `auth.getUser`, approved business `owner_id` RLS check. No new data access scope, no new service role, no DB changes.
- `WhatsAppGrowthOperator.tsx` shows app-specific review links and honest provider-approval warnings, in English/Tamil/Sinhala. This is an authenticated vendor website action—not yet an inbound WhatsApp command.
- `ml/neurogrowth/contracts/ml07_synthetic_studio_intents.json`: 12 classes, 3 languages, 2 distinct training utterances and 1 distinct evaluation utterance per app-language. 72 completely synthetic training phrases, 36 synthetic holdouts, 6 OOD examples. **No real customer data**.
- `ml/neurogrowth/ml07_studio_intent_train.py`: actual reproducible CPU Unicode char 2–4-gram multinomial Naive Bayes training and per-language holdout metrics, no packages beyond Python standard library, no GPU/API calls, no model-serving path.
- Python negative unit tests and Node 12-app parity / RLS / no-execution regressions, dedicated ML-07 CI.

## Model evaluation gates
- Synthetic metrics describe ONLY the artificial phrase corpus. Even 100% accuracy is not reliable evidence of Sri Lankan colloquial Tamil/Sinhala, transliteration, code switching or real user commands.
- Do not claim model is already deployed for real vendor inference; this production website uses a low-cost deterministic router only.
- ML-05 numeric Growth Engine was evaluated on synthetic data and had minority failures; ML-06 gave a synthetic consent/observable-label validator; nothing in ML-07 authorizes real production data collection, fine tuning, GPU spend, owner writes or provider messages.
- To train with real business history: legal basis, purpose-limited informed opt-in, revocable consent ledger, owner-scoped RLS, minimization/de-identification, immutable timestamped labels, separate held-out businesses and time, clear abstentions and a conservative human baseline are mandatory. Never treat clicks or status `converted` as proof of actual revenue.

## External blockers and user action
- User will independently register SL Business Index through their local Divisional Secretariat, as a sole proprietor. No fictitious Meta legal business identity is entered by software. Meta Tech Provider/App Review/Advanced Access, Embedded Signup configuration and eligible WhatsApp AI use case remain external gates.
- Existing SLBI Meta test-number webhook had real inbound HTTP 200 after WA-03F. That is NOT a per-vendor inbox, owner binding or outbound AI reply.
- Gmail OAuth existing code is Preview-only, and OAuth secret/vault and authorized users are not production-ready.
- Email marketing requires **recipient opt-in** (separate from owner approval), suppression, unsubscribe and authenticated sender domain.
- Call agents require real telephony routing/number, consent and regulatory handling, streaming/low latency provider, human handoff, signed inbound callbacks and billing.
- No new production SQL/migration, provider activation, email/WhatsApp send, paid GPU or token rotation was performed in this batch. Previously exposed tokens remain a security risk; owner should revoke/rotate through Meta/Vercel outside public screenshots.

## Complete next-chat continuation
Continue SLBusinessIndex GrowthOS in Tamil. Read full GitHub main `docs/growth/HANDOFF_LATEST.md`, `AGENTS.md`, `docs/growth/ML_07_TRILINGUAL_12_APP_ROUTER_20261126.md`, `ml/neurogrowth/contracts/ml07_synthetic_studio_intents.json` and `lib/marketing/studio-apps.ts`. User wants all twelve Marketing Studio apps, unified Growth AI, English/Tamil/Sinhala, eventual personal vendor WhatsApp/email/social connectors, automation and call agents; they will register sole proprietor with Divisional Secretariat. ML-07 branch `feat/ml07-12app-multilingual-routing-20261126` implements owner-scoped authenticated 12-app deterministic review suggestions plus synthetic CPU-trained multilingual intent benchmark. Need check exact-head Node/Python/TypeScript/Next.js CI. Fix failures; only all-green PR merge; confirm Vercel READY exact SHA with www alias. The router proposes links ONLY; no production model, no real owner data training, provider OAuth, WhatsApp AI replies, email delivery, telephony, durable job queue or scheduled sending. For follow-up prioritize staging-only durable approval+outbox and consent/tenant-labeled event contracts; preserve old production Webhook, Pro/Basic rollout gating, user data and original GrowthEngine ML05/06 contracts. No public token values; no fabricated model accuracy.
