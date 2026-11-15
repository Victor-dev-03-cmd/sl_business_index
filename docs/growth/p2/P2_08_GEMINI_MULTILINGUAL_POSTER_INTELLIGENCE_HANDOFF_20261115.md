# SLBI P2-08 — Gemini Multilingual Business-Grounded Poster Intelligence Handoff

## 2026-11-15 — Actual release status, supersedes this document's initial pending-branch checkpoint
- The owner **has added `GEMINI_API_KEY`** to Vercel Production as a Sensitive env var, confirmed via decrypt=false metadata; secret value was never inspected. They had planned to redeploy.
- **PR #86 MERGED** `890f9c132df14d1edfd5f539beca874e2da71cb2` with **6/6 CI green**. Owner-scoped business facts, multilingual JSON Gemini brief, claim-before-model/idempotency/refund, private transcription route and strict 12/day voice SQL quota all in main.
- **PR #87 MERGED** `36a013cf3b87a7fb0a155efd70e2ce6baa08fa13` with **6/6 CI green**. Output poster text language now honors vendor-selected language independently of spoken/input language.
- Supabase migration `p2_poster_gemini_voice_quota_20261115` **applied**; DB verified RLS/client denial and service-only voice reservation; no voice calls yet.
- Assistant set Production `SLBI_POSTER_PROMPT_AI_ENABLED=true` after verifying the key exists. This is a rollback kill-switch separate from `SLBI_POSTER_IMAGE_PROVIDER=cloudflare`. Do not assume the API key is valid, Gemini free quota exists, or that any new AI output works until owner tests on live site.
- Current web UI has **NOT been changed** for MediaRecorder speech. Existing browser speech input is still in use; Gemini transcript endpoint exists but needs future UI wiring upon owner instruction. Not yet an end-to-end voice-to-Gemini-to-image demonstration.
- Original motivation and permanent decision remain below. Never reintroduce manual editor, invented contact details or automatic paid fallback to AWS/HF/OpenAI. Exact poster typography with automatic system composition remains future QA work, not guaranteed.
**Checkpoint:** 2026-11-15 (Asia/Colombo) — source branch under development, NOT yet an enabled production Gemini integration.

## Owner decision — read this first in next ChatGPT session
Owner approved the exact temporary workflow:
1. Vendor selects **one of their own businesses** in SLBI Creative AI. This must support vendors managing multiple independent businesses.
2. Vendor types or speaks **Sri Lankan Tamil, Sinhala, English, Tanglish or Singlish**; an AI speech-to-text service should transcribe original words and show the transcript for human correction before starting image generation.
3. Server verifies vendor authentication, Professional/Enterprise entitlement, business ownership and retrieves relevant **public listing facts only** for that selected business: name, description, category, service, publicly provided phone, email, address/city, website and optional Brand Kit (name, slogan, colors, tone). Never leak another business, billing data, private admin notes or account identity. Do not fabricate missing phone or discount.
4. **Google Gemini text model** (temporary free-tier language/prompt intelligence, `gemini-3.5-flash-lite`) reads the vendor's message + owner-verified public business facts, detects language, preserves exact user intent and known offer terms, produces **validated structured JSON** and a detailed grounded **English visual-art direction**. Original-language copy should remain accurate for the output language. Cloudflare image prompt is assembled server-side from the validated JSON + raw user request + authoritative listing fields.
5. Existing **Cloudflare Workers AI FLUX.2 Klein 4B** generates the genuine AI poster. The vendor sees the real owner-private image and may ask AI to edit **the same existing image** with a follow-up prompt. There must be no misleading black text-only mock poster or manual XY layer editor. Keep current 4 aspect formats, private history and PNG download; no social auto-posting.
6. Future transition after SLBI subscription revenue: replace the **language/voice/image provider adapters** with OpenAI GPT voice/text/GPT Image, without rewriting owner validation, business facts, credit accounting or UI flow. Provider switch must be explicit and secure, not an automatic paid fallback.

## Why owner requested this new architecture
- A prior vendor requested a **software/website-development Diwali promotional poster**, but Cloudflare produced unrelated food/street photography and unintelligible title lettering. Direct user prompt and generic advertising directions alone do not reliably bind the model to the actual selected business category, description or contact details.
- Free image models are especially unreliable for exact Tamil/Sinhala text, percentages, phone numbers and email. Gemini should help with multilingual understanding and grounded creative direction, but cannot promise perfect image-generated typography. Future **system-controlled automatic text composition** may be needed to guarantee exact phone/email/offer without any manual graphic editing. Do not imply the image model alone guarantees exact text.
- Image edit was also blocked by a generic `Verified Pro plan / poster credits / global AI budget` reservation error. That is a separate entitlement/credit/day-budget diagnosis, not necessarily a prompt/Gemini issue. Preserve and inspect request counters before increasing any limits.
- Vendor UX must be accessible to low-technical-literacy business owners. Owner will specify additional UI changes later; do **NOT** redesign UI in this phase.

## Gemini credentials (owner action)
- **Only user-provided key name:** `GEMINI_API_KEY`. Obtain it from https://aistudio.google.com/api-keys, add as **Sensitive / Production** in the `sl-business-index` Vercel project. NEVER use `NEXT_PUBLIC_GEMINI_API_KEY`, never paste keys into ChatGPT or GitHub.
- Owner said they will add the key and redeploy. At this checkpoint **key presence has not been independently verified**. Do not claim connected or that Gemini was actually called.
- Controlled activation **separate internal flag** `SLBI_POSTER_PROMPT_AI_ENABLED=true`. Code intentionally defaults OFF until key presence, migrations, user consent/privacy review and source tests are verified. This flag will be set in Vercel by assistant only after preparation; user needs to add just `GEMINI_API_KEY`.
- Google Free Gemini API has model-specific RPM/TPM/RPD caps; Free API data may be used to improve Google products (check current policy and vendor disclosure). No new paid Gemini billing/plan change without owner approval. Text/audio model is `gemini-3.5-flash-lite` (stable, supports audio input, structured JSON; not an image model).

## Branch implementation (planned/partially written, verify latest SHA)
**Git branch** `feat/p2-gemini-multilingual-business-brief-20261115`; read latest PR and CI before merging.
- `lib/marketing/poster-gemini-intelligence.ts`: server-only fixed Gemini REST `generateContent`, strict schema+validation, bounded short public facts, original prompt preservation, creative-direction output and provider-neutral normalized English image prompt. No API keys or phone numbers invented.
- `app/api/marketing/poster/generate/route.ts`: extended owner-scoped `businesses` selection to get description/contact website and optional Brand Kit slogan; selected business public facts passed only after owner/Pro check. Existing **image credit reservation + claim happens before Gemini call** to bound model traffic; failures refund existing Growth Credits. Idempotency hash covers stable original request + business facts + model rather than nondeterministic Gemini response.
- `app/api/marketing/poster/transcribe/route.ts`: staged authenticated same-origin, owner-scoped voice audio endpoint, limits audio size/MIME and uses Gemini for verbatim Tamil/Sinhala/Tanglish/Singlish transcription, no auto-send to image; returns transcript for vendor confirmation. **Not yet wired to UI** until owner shares UI requirements.
- `supabase/migrations/20261115094500_p2_poster_gemini_voice_quota.sql`: staged *not yet production applied* atomic 12 requests/owner/UTC day with owner-only server RPC; no authenticated/anon grants. Do not apply blindly; review PG17 test.
- `tests/p2PosterGeminiIntelligence.test.mjs` and `tests/p2-poster-image/gemini-voice-verify.sql` source+SQL regression coverage; P2 GitHub workflow updated to run both. Verify exact-head CI before merging.

## Release sequence / safety gates
1. Re-read GitHub current status and PR. Run Next.js TypeScript build + contracts and disposable PG17 database RLS. Fix errors. Reconcile master/main before merging.
2. Check Vercel env inventory **without decrypting** key. Verify `GEMINI_API_KEY` is Production Sensitive. Do not print secret.
3. Apply reviewed, idempotent voice quota migration (separate from image settlement) and verify service_role RPC grants; use disposable DB first. Existing business RLS/tenant access unchanged.
4. Deploy/merge once tests green. Set `SLBI_POSTER_PROMPT_AI_ENABLED=true` only when prerequisites are fulfilled; verify source+Vercel Production READY and backend API behavior. Do NOT send a paid image model request on owner's behalf.
5. Owner tests: software-business Diwali promotion (explicit 25% offer) vs food business promotion, Tamil/Sinhala/mixed speech and incorrect-contact prevention, owner A/B multi-business selection. Check actual private image and text for correctness; do not claim perfect typography until validated.
6. Once owner discusses UI, swap browser-only SpeechRecognition with a controlled MediaRecorder + authenticated transcript display/confirmation, without making a model request automatically.
7. Update this handoff with actual production commit, Vercel deployment ID, private image outcomes and any privacy/quality blockers.

**Current production before this branch:** Cloudflare image generation has produced at least one real private poster (owner screenshot), but prompt fidelity and fabricated letters remain deficient. A follow-up edit was denied by a generic quota/entitlement/credit error. Backend Gemini integration was not yet live when owner requested this workflow.
