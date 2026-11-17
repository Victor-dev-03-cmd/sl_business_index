# P2-29 — Caption CTA Verification, Planner Save & Private Poster Library

**Date:** 2026-11-17 · **Branch:** `fix/p2-poster-cloud-save-caption-planner-cta-20261117`  
**Release:** staged; exact CI, DB migration verification and production Vercel READY must be recorded before marking complete.

## Reported browser failures and verified causes

Owner supplied the Caption Lab screenshot `image(20261117-181626).png` and reported:
1. **Save to Planner** fails with `new row ... marketing_campaigns violates check constraint marketing_campaign_brief_shape_v2`.
2. Adding `Contact me` with owner phone in **CTA** can cause AI caption Generate to fail while removing that detail succeeds.
3. Posters produced by **Poster Studio** and attached in **Caption Lab** are temporary and not available permanently; a private Save/Reuse flow is required in both pages.

### Grounded production evidence
- Read-only production Supabase query confirmed `marketing_campaign_brief_shape_v2` accepts only **seven** JSON string keys: `offer`, `cta`, `terms`, `language`, `objective`, `format`, `palette`, each with strict value/length constraints. Caption Lab was inserting unapproved `captionBundle`, `captionHashtags`, `posterLocalKey`, `createdFrom`, `selectedAngle` keys; that insertion fails. **Do not weaken or remove the constraint.**
- `marketing_credit_jobs` read-only aggregation for `ai_social_draft` (last five days) contained **4 refunded, 1 completed**. A Vercel recent production log recorded `AI provider request failed Error`; logs did not disclose whether a phone number or schema rejection caused a specific failure. Do not claim confirmed provider root cause.
- Supabase storage has existing private `slbi-poster-ai-private` PNG bucket, 12 MB limit, with `storage.objects` policy blocking direct anonymous/authenticated writes or reads. Server-only service credential plus authenticated owner/business checks must remain mandatory. **Do not make bucket public.**
- Owner QA uses the existing Pro/internal-QA gate; no new subscriber rollout, AI provider, auto-posting or billable model retries.

## Fix architecture

**Database:** add only nullable `marketing_campaigns.poster_asset_id uuid` with migration `supabase/migrations/20261117210000_p2_caption_planner_private_poster_asset_ref.sql`, plus partial index. Campaign brief shape and RLS remain unchanged.

**Caption → Campaign Planner:**
- `lib/marketing/caption-planner-brief.ts` outputs exactly the seven permitted brief keys and safe lengths. Full selected caption (+ hashtags if enabled) remains in `banner_text`. Other AI language/angle drafts remain in `marketing_ai_drafts` owner-scoped; they cannot be smuggled into `brief`.
- When attaching a PNG, Caption Lab's Save to Planner explicitly uploads it to the private library first, stores the returned UUID in nullable `poster_asset_id`, and then inserts the drafted campaign. Do not claim success when upload fails. No image attached => save caption-only with null asset ID.
- Campaign Planner Library reads `poster_asset_id` and retrieves the PNG via protected server route, with Download PNG. Old local `posterLocalKey` campaigns continue to show local fallback until their two-hour handoff expires. `banner_color='caption-lab-connected-v1'` identifies new connected drafts without malformed brief metadata. No automatic publishing.

**Private poster API:** `app/api/marketing/poster/saved/route.ts`:
- `POST` multipart PNG only, magic-header checked, 100 bytes–12 MB, same-origin, current authenticated Pro/internal QA, currently owner-verified business; service role upload to `saved/<uid>/<business_id>/<asset_uuid>.png`, upsert false, cap 50 per owned business. Return an ID only; no public or signed bucket URL.
- `GET ?businessId=...` list at most 50 from the verified prefix. `GET ?businessId=...&assetId=...` streams a PNG with private no-store, nosniff after the exact same owner check. No direct Storage permission or browser service secret.
- `lib/marketing/saved-poster-cloud-client.ts` shares authenticated POST/list/load helpers; enables explicit **Save Poster + Saved Posters** in Poster Studio and **Save image + private saved gallery** in Caption Lab.

**CTA phone/Gemini:**
- `lib/marketing/caption-cta-phone.ts` normalizes local `07...` and international `+94...` phones. If the CTA supplies an unverified 7+ digit phone, server returns `CTA_PHONE_NOT_VERIFIED` **before** any credit reservation and asks owner to correct My Business contact.
- When owner CTA matches verified business phone, Gemini prompt receives that exact approved contact and instructions to preserve digits with the selected-language surrounding CTA.
- Invalid structured Gemini output or provider failure has a distinct safe code; existing reservation/refund flow and the internal QA gate remain. No automatic paid retries and no new API keys.
- Because prior provider logs lacked detailed causes, real live CTA input success/credits balance must be user-accepted, not assumed from source tests.

## Security and QA (release gate)
- Run `tests/p2PrivatePosterSavePlannerCta.test.mjs` plus legacy Caption/Poster/Planner tests, Next production build/TS, P2 tenant RLS, billing, OAuth, and private storage checks. Source contains no public-URL creation or credit/model calls on Save.
- Apply the **single additive migration** to the authorized production Supabase project after CI and before the new frontend reaches production. Verify `poster_asset_id` exists and original check constraint definition remains unchanged.
- Verify Vercel production READY and domain alias on exact merged commit.
- Owner to test: existing signed-in Laxsan Dev CTA with verified phone, Generate (credits only when explicitly clicked), Save to Planner without CHECK error, Campaign Planner library displayed PNG, reload and cross-device image retrieval, Poster Studio Save Poster/Saved gallery, wrong-business reads denied. No live AI provider request or user account credit was consumed during development.

## Ongoing handoff
After release append actual PR #, head SHA, CI statuses, database migration result, production deployment ID, merge SHA and owner browser QA to this file, `docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md`, `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md`. Preserve historical sections as chronology.
