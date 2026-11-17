# P2-27 — AI Caption Lab Voice Parity, UI Arrows & Marketing Handoff

**Date:** 2026-11-17 · **Repository:** `Victor-dev-03-cmd/sl_business_index`  
**Branch:** `feat/p2-caption-voice-waveform-dropdown-handoff-20261117`  
**Pull request:** [#115](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/115) · **Feature status:** MERGED and PRODUCTION READY (code/CI verified; live authenticated browser voice-model QA pending).

## Owner request and established baseline

Owner accepted the connected business-specific Poster Studio and requested that **AI Caption Lab receive the same voice/recording/transcript UX**, correctly aligned dropdown/disclosure arrows, and continuously maintained GitHub handoff history.

**Existing active routes**
- Poster Studio: `/vendor/marketing/design/puter-lab`; original user-approved fonts remain **Tamil Pavanam**, **Sinhala Gemunu Libre heading / Maname body**.
- Caption Lab: `/vendor/marketing/captions`, existing three-column Brief / Social Preview / Refine & Copy layout and #F97316 / #111827 / white theme.
- Shared secure voice endpoint: `POST /api/marketing/poster/transcribe` (1.5 MB maximum, owner-business and Pro checks, original-language Gemini transcript, atomic shared daily allowance).
- Caption variations: `POST /api/marketing/caption` with authenticated Pro/internal-QA, validated business owner, language, financial controls, draft review and real Gemini provider gate.
- Local poster handoff: `lib/marketing/caption-poster-handoff.ts` (IndexedDB PNG + bounded context, UUID URL, same device, 2h TTL), later Campaign Planner local image preview.

## Implemented in this code change

1. **Poster-consistent voice controls.** Idle state shows mic icon only. Direct user click invokes native `getUserMedia({audio:true})` for an HTTPS origin. Native denied/blocked/no-device/busy-device errors retain actionable browser permissions help.
2. **Live waveform and explicit recording actions.** Browser WebAudio `AnalyserNode` reads *real* frequency bins; elapsed time excludes paused time; dark inset bar has `Cancel`, `Pause/Resume`, and orange `Send` with accessible labels. AudioContext, frames, timers, media tracks and object URLs clean up on stop, cancellation and page unmount. Cancel/discard never posts audio or consumes a transcription request.
3. **Truthful transcription progress.** After **Send**, an explicit spinner/status shows `Transcribing…` until the same secure server returns the original-language transcript. User reviews/edit the text; no caption generation automatically follows recording or transcript.
4. **No silent loss of long offer terms.** Campaign brief API contract remains 5–600 characters. A returned voice transcript that would overflow the 600-character typed brief is shown in a **full editable transcript review** instead of truncating business, percentage or offer-scope words. The vendor shortens and explicitly applies it or discards it. Generate does not proceed with an unapplied transcript. The previous `slice(0,600)` when concatenating a redundant `Campaign angle` has been removed: the goal is already sent as its own validated field.
5. **Accurate quota visibility.** Owner-QA Caption Lab may read the shared Gemini poster voice/brief quota via existing GET `?quota=1`; refreshed after a transcription attempt. This GET does **not** reserve credits or call Gemini. The backend's atomic reservation is authoritative. No quota, subscription, permission or feature flag changed.
6. **Arrow alignment.** Caption Lab's one native business `select` gets local `appearance:none` plus a 15px SVG chevron inset 14px from the right border, 2.65rem reserved padding—matching Poster Studio. `Info`, `Quick brief suggestions` and `Offer terms & CTA` use explicit Lucide chevrons with consistent rotation on open; no global selector changes.
7. **Product-specific poster handoff preserved.** Recent Poster Studio picker pre-populates headline, validated `serviceFocus` and offer when the brief is empty (the initial URL handoff already did). Current ownership re-verification remains required. Existing three language variation cards, social mockups, editable hashtags, local polish, campaign-planner draft flow, and phone/website facts are not replaced.

### Code and regression coverage
- `app/vendor/marketing/captions/page.tsx`
- `app/vendor/marketing/captions/caption-fonts.css`
- `tests/p2CaptionVoicePermission.test.mjs` (revised)
- `tests/p2CaptionVoiceStudioParityAndHandoff.test.mjs` (new)
- `tests/p2ConnectedCaptionLab.test.mjs` (disclosure regression update)
- `.github/workflows/p2-marketing-brand-foundation.yml` (new test release-gated)

No new DB migration, provider login/authorization, cross-device poster storage, background transcription, automatic publishing, auto-caption generating, AI credits, or paid model invocations from implementation/testing. New browser controls remain client-side.

## Security / billing invariants
- Voice bytes to the authenticated same-origin server only on **Send**, with server-owned Pro + owner/business + quota. On cancel/unmount **no** API request is sent.
- The caption model POST is invoked only by the separate **Generate Caption Variations** click, one reserved provider request per selected language, respecting `SLBI_MARKETING_AI_ENABLED` and credit settlement/refunds.
- Temporary poster assets stay private to browser IndexedDB; URLs contain only UUID refs and are checked against the selected currently owned business.
- Preview is explicitly **Not published**; Planner save is a draft, not provider posting.
- `next.config.ts` retains global `microphone=()` and only the two dedicated studio/captions route overrides `microphone=(self)`; camera is denied.

## Release / acceptance checklist

**CI verified:** Exact PR-head SHA `975be42a73573575a879c32be80bebf9b9b43ab2` passed all **5 workflow families**: Next.js production build/TypeScript/smoke, P2 contract + Docker owner RLS + credits + poster image budget + OAuth, P1 integrated, Billing V2 SQL and independent Postgres billing. No provider inference was run by tests.

**Production verified:** PR #115 squash-merged with head guard into `main` commit `422b90e65095df1277337ee979178726f0fecd14`. Vercel production deployment `dpl_DNHjm9fYVxLtRPTGKtAFKknaXiRU` returned state **READY**, the exact same GitHub commit, and alias `www.slbusinessindex.com`. This verifies build and routing, NOT the outcome of signed-in real speech/transcription.

**Human authenticated browser QA still required:** Chrome native mic Allow prompt or site-permission guidance, waveform responsive to real speech, pause timer, resume, Cancel sends nothing, Send shows spinner/transcript, Tamil/Sinhala/English original script preserved, full overflowing transcript editable, quota count decrements only after actual Gemini reservation, one inbox brief containing poster's promoted service and true offer, dropdown arrows clear of border, mobile responsive dark strip, caption Generate credit and draft flags, Caption → Planner same-device PNG handoff.

## Follow-ups not falsely marked complete
- Browser E2E voice + Gemini transcription, exact social variant output and Android/iOS audio MIME still need user acceptance; CI does not prove external provider quality.
- No automatically scheduled transcription or posting; no new connector permission, no unrestricted Pro rollout.
- Cross-device private poster asset persistence is not implemented. Continue to require owner-approved private storage and policy design if requested.
- This is a living handoff; update `docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md` and `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` at subsequent milestones rather than trusting old dated "LATEST" labels.
