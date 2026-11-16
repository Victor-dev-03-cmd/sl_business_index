# P2-24 — Connected AI Caption Lab / SLBI GrowthOS

Date: 2026-11-16. Owner supplied a premium three-column Caption Lab spec and explicitly connected it to the finished Gemini/Puter/Canvas AI Poster Studio. This is the next major Marketing Studio tool. No separate unverified poster generation or provider advertising claims.

## Visual / UX
- Keep existing GrowthOS style: **#F8F9FA** / white surfaces, 1px **#E5E7EB** borders, gentle shadows, **#111827** charcoal and **#F97316** SLBI orange. Responsive **30% / 42% / 28%** desktop grid, stacked mobile, numbered `01 / Campaign Brief`, `02 / Live Social Preview`, `03 / Refine & Copy`.
- Column 1: select genuinely owned business, linked PNG image from Poster Studio (optional), 5 campaign goals, Tamil/Sinhala/English multi-select, brand tone slider, factual prompt, non-overriding chips, editable original-language voice transcription, optional offer terms/CTA.
- Column 2: social mockup for Facebook / Instagram / WhatsApp; clear **NOT PUBLISHED** indicator and approximate "See more" fold; language pills including combined text; actual linked PNG or honest no-poster placeholder; copy with/without hashtags; save as an unscheduled **draft** in existing Campaign Planner.
- Column 3: Hook, Story & Value, Short & Punchy; editable per language; script-aware custom hashtags; no-cost shorten/urgency/emojis/verified contacts (urgency NEVER invents a deadline); saved-draft states. Noto Sans Tamil/Sinhala with line-height 1.6.
- No fake sponsorship, fake posted state, fabricated reviews, unverified discounts or surprise paid model calls.

## Real Poster → Caption handoff
- **New button** adjacent to Poster Studio `Download PNG`: `Write Caption for this Poster →`.
- `lib/marketing/caption-poster-handoff.ts` stores a **short-lived** (2-hour) exact PNG Blob + bounded business/campaign copy in browser IndexedDB; URL receives ONLY a random UUID (`?handoff=<uuid>`), not a base64 image, phone, offer or business info. Client does not upload poster into a publicly accessible bucket. Viewer’s selected business is checked against **fresh owned businesses** before displaying.
- Handoff automatically pre-fills headline, offer, CTA, business, suggested campaign goal and mood. It never executes a paid Gemini/Puter/Groq call during navigation. User explicitly clicks caption Generate.
- On the same browser/device, Campaign Planner can show the linked image using its local key; after TTL or on other devices, display accurate expired/local-only state. **No claim of permanent cloud poster persistence**.
- Copy and campaign text/variants are saved in the existing `marketing_campaigns` row as `banner_text` plus optional `brief.captionBundle`, `brief.posterLocalKey`, `brief.createdFrom='caption_lab'`. Row insertion is rechecked for user-owned business and subject to existing table RLS. No database migrations, storage bucket/policy or provider accounts required. Saved texts persist cloud-side; linked poster is local only.

## AI engine / billing
- Existing `/api/marketing/caption` remains the security/billing authority: login, Pro check, user-owned business & Brand Profile languages, per-user request UUID, transactional `marketing_reserve_ai_draft` credit/quota, duplicate guard, true provider call and compensating refund on failure.
- Adds backward-compatible optional `mode:'three_angles'`, `tone: 'friendly'|'professional'|'urgent'` to `caption-contract.ts`. A single model call **per language** returns three clearly delimited `[[HOOK]] / [[STORY]] / [[SHORT]]` captions. Existing single-caption format and max 512 tokens remain unchanged; variant mode has dedicated 1100 cap. Three selected languages can therefore make up to three quota/credit reservations (not nine); UI should transparently communicate this and recover partial success.
- **CRITICAL: SLBI_MARKETING_AI_ENABLED hard-off remains unchanged.** Without an explicit owner-provider and Growth Credits spending approval, AI calls return 503 and UI does not show mock text as genuine AI. No automatic provider calls upon page opening, even when the link says Write Caption.
- Existing Gemini poster voice transcription API may be reused by explicitly authorized Pro account with 1.5MB limit, human review, daily Gemini quota and no automatic generation. Its server security is unchanged.

## Known gated follow-ups
1. Activate the real provider and credit budgets only after owner approves model/provider, per-language cost and success criteria; no silent secrets changes.
2. For permanent cross-device **poster + caption** cloud packages, design a private Supabase Storage bucket with enforced vendor/business ownership and retention, and a migration/API to attach a durable private storage key to the campaign. Until then, browser-local thumbnails and cloud-saved text are clearly differentiated.
3. Current social previews are visual approximations, not official Facebook, Instagram or WhatsApp integrations. No publishing/OAuth or automatic background runs.
4. Human QA: Tamil/Sinhala/English typographic shaping, real poster Blob in read-more feed, phone/website from verified business, role access, mobile breakpoints, credits disabled behavior, and RLS-backed Planner inserts.

## Release gate
Open PR, run exact-head tests, TS/Next production build, security and credit contracts. Vercel Preview READY for owner review; do not auto-merge Production for a new application unless user explicitly requests deployment. Existing Poster Studio and other Marketing Studio apps must remain unchanged, except for the single connected action button and Planner linked thumbnail.
