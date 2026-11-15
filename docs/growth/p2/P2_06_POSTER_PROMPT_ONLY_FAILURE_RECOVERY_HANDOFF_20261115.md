# SLBI Growth OS — Poster Studio Recovery Handoff (2026-11-15)

> Read this **after** `docs/growth/p2/P2_POSTER_HF_API_CONTINUATION_HANDOFF_20261115.md`. This checkpoint supersedes older status saying HF adaptation has not been merged. Verify latest PR and deployment; source code is authoritative.

## Owner's acceptance criteria
- Basic Campaign Planner stays unchanged, manual download only, no auto-posting.
- **Pro Poster Studio must be ChatGPT-style**. User enters Tamil/Sinhala/English prompt or speaks. AI returns **real marketing imagery**. The UI must NOT call a black text box "generated AI".
- Once image exists, owner/vendor types **another prompt to edit the exact source image**. No exposed canvas text layers, X/Y positions, color picker or complex manual designer. Successful versions remain in owner-only private storage with owner-only recent images, PNG download and system share; posting is **manual** until separately approved social OAuth/publishing workflow.
- Premium creative direction should produce full promotional image, not only empty background; no invented discounts, prices, numbers, certifications, phone or logos. Model typography may still need QA, especially Tamil/Sinhala. This is not a promise that model's text is perfect.

## Observed failure (verified read-only production DB)
- Owner clicked Generate twice after activating Hugging Face on Nov 15. `marketing_poster_jobs`: **2 jobs**, BOTH `refunded`; **0 completed** and **0 private storage assets**. Times Nov 14 UTC 22:18:39 and 22:18:53. Global UTC budget row Nov 14: 2 attempts/2 max. Internal Growth Credits refunded. No generated image exists to display. Provider-side billing status cannot be inferred from internal refunds.
- Vercel Hobby runtime logs retained only 1h and were unavailable for these older attempts; the precise upstream HTTP status is **not independently verified**.
- Source-level defect identified by inspecting official Hugging Face `fal_ai.py`: `FalAITextToImageTask` uses **synchronous POST** returning `images[0].url`, whereas the original SLBI FLUX code erroneously treated it as `FalAIQueueTask` and required `request_id`. Real provider could reject or return image JSON and fail immediately. Verified reference: https://raw.githubusercontent.com/huggingface/huggingface_hub/main/src/huggingface_hub/inference/_providers/fal_ai.py

## Fix in GitHub PR #84
https://github.com/Victor-dev-03-cmd/sl_business_index/pull/84
- Branch `fix/p2-hf-generation-prompt-only-20261115`.
- `lib/marketing/poster-image-provider.ts`: FLUX.1-schnell now uses HF FalAITask **synchronous** image response and a private image download from allowlisted fal.media HTTPS host. Provider error classes report token/credits/model/rate-limit reasons without leaking secrets. `Qwen/Qwen-Image-Edit-2509` (Apache 2.0) uses HF FalAI **image-to-image queue**, supplied with owner-only original image bytes (data URI), never public URL.
- `app/api/marketing/poster/generate/route.ts`: user Pro + owned business + same-origin + accepted Growth Credits + UUID idempotency. For edits validates `sourceJobId` belongs to same owner and business, is completed, and private path matches; securely downloads original PNG. Calls image-to-image provider and saves NEW private generation job. Failure triggers internal refund; user sees safe provider-specific message. Existing private artwork route remains enforced.
- `app/vendor/marketing/design/page.tsx`: 860-line manual canvas UI replaced with ~300-line conversational prompt, voice entry, four format choices, real private preview, AI edit prompt, saved history, download/share. No manual designer. Clear failed generation, and no fake preview.
- `lib/marketing/poster-creative-engine.ts`: generate full commercial advert artwork with factual, visibly legible text when model can render it, not only background. Avoid hallucinated prices/claims. Actual model quality remains unverified.
- `tests/p2PosterDesign.test.mjs`, `tests/p2PosterCreativeEngine.test.mjs`, `tests/p2PosterImageAPI.test.mjs` updated for truthful prompt-only behavior, provider response format, edit ownership, and refund gates.

## Production database and provider safety
- Existing poster job + private storage migrations were previously applied and provider was enabled with `HF_TOKEN` secret, `SLBI_POSTER_IMAGE_PROVIDER=huggingface`, `SLBI_POSTER_IMAGE_AI_ENABLED=true`. Do not disclose key value.
- New migration `20261115074345_p2_poster_real_ai_image_edits_refund_retry_20261115` is **ALREADY APPLIED** to production (verified pg_get_functiondef): refunded jobs no longer count toward per-user 3/24h cap; Qwen image editor added to service-only settlement model allowlist. Its exact tracked copy is `supabase/migrations/20261115074345_p2_poster_real_ai_image_edits_refund_retry_20261115.sql`.
- Global UTC daily limit independently gates traffic. The old Nov 14 row is 2/2 spent. **Before owner retests**, create/current UTC day row with max 2 requests (no automatic provider calls). Other vendors remain Pro-gated; this budget is global, so stay small and monitor.
- Each generated image currently costs 8 SLBI Growth Credits; Hugging Face cash cost depends on provider/free balance and may not be zero. Owner has authorized testing by clicking Generate; no automated model request should be executed by assistant. No image generated by assistant.

## Next steps
1. Verify **exact-head 6/6 GitHub CI** (P2 Marketing RLS+contracts, independent billing, P1 and Next.js) for PR #84; fix test/build issues before merging.
2. Merge reviewed PR to `main`; verify Vercel **production READY** and `www.slbusinessindex.com/vendor/marketing/design` serving matching commit.
3. Open **two new UTC-day** global requests only after deployment is ready; ensure `ai_poster_design` action enabled and daily attempt row has max 2.
4. Owner independently tests one actual HF FLUX generation in browser. If failed, retrieve fresh Vercel logs **within Hobby 1-hour retention** and reported safe provider status; check whether HF credits exhausted or model endpoint rejects. Never claim success without an actual stored image.
5. If generated, inspect owner-private image and try Qwen real image-to-image edit. Qwen provider mapping/price has not been smoke-tested, so if unsupported return a clear message/refund; no generic fake image substitutes.
6. Update this handoff or PR comment with exact production deployment SHA, flags, job outcomes and any blockers. Do not reveal secrets or private user identifiers.

**Production state at time of writing:** PR #84 not yet merged; exact-head CI is being verified. Two original jobs refunded, no imagery saved. No new image-provider requests have been made.
