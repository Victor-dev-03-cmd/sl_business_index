# SLBI P2-11 — User-controlled voice recording and Gemini poster preparation recovery

**Date:** 2026-11-15 (Sri Lanka)  
**Repository:** `Victor-dev-03-cmd/sl_business_index`  
**Pull request:** https://github.com/Victor-dev-03-cmd/sl_business_index/pull/90  
**Status:** Changes staged in PR; inspect current exact-head CI and Vercel before claiming production. No assistant-run inference.

## Owner's report
- Voice transcript in Tamil/mixed languages is already accurate but recording stops automatically after a few seconds, requiring multiple clicks.
- First image Generate in `/vendor/marketing/design` reached estimated ~15% and reported `Multilingual creative prompt preparation is temporarily unavailable. No image was generated; please retry later.`
- Keep accepted desktop **LEFT controls, RIGHT poster**, private output, multi-business isolation and user review of the transcript.

## Confirmed evidence
1. Studio frontend hard-coded `setTimeout(()=>{if(rec.state==='recording')rec.stop();},12000)`. That is the 12-second stop regardless of whether the user has finished talking.
2. Production Vercel deployment `dpl_BdYZJTpnTuh57546irp3pQcmFjyj` at main `5ec63866f911e98d17670c905ea04f68ee5be3d1` recorded `Poster image generation failed gemini-unavailable` on 2026-11-15T11:51:23Z at `POST /api/marketing/poster/generate`. The error happens BEFORE Cloudflare image generation. The original Gemini adapter did not log HTTP status, so the exact root of upstream rejection is not established.
3. Gemini voice service worked from the owner's own browser according to report, which suggests the model/key are usable for audio; it does not prove the JSON-mode brief request succeeds.

## Fix in PR #90
- Frontend microphone stays active until the user explicitly clicks Stop. Visible elapsed seconds; no hidden 12-second timer. Data posted once after stop and shown in editable text, never auto-generates images.
- Still enforce owner authentication, origin checks and existing voice quota (12 requests per UTC day), 1.5 MB audio cap and bounded 1200-character creative brief. More than 1.5 MB needs a clear user-facing error, not a silent cut.
- Gemini creative-brief request uses `responseMimeType:'application/json'` plus explicit key schema instructions and validates the response server-side, avoiding potential upstream `responseJsonSchema` incompatibility; timeout and output token budget adjusted. Safe upstream HTTP status or transport error category logged; never log business/user content or Gemini keys.
- Do not alter global image cap, paid model provider, private image asset storage, Pro verification, existing 8-Growth-Credit reserve/claim/refund, or basic planner. UI image progress is **estimated**, not provider-supplied.

## Acceptance and diagnostic procedure
1. Run exact-head Github checks: Next.js production build, P2 security/RLS, P1, Billing, poster tests. Fix all failures before merging.
2. Merge PR #90 to main, verify Vercel production deployment READY on matching main commit and `www.slbusinessindex.com` production alias. Do not claim owner browser/E2E success just from CI.
3. Owner reloads Studio, speaks >12 seconds, manually taps Stop and verifies the complete editable transcript. Confirm secure same-origin permission policy unchanged.
4. Owner may intentionally click Generate for one permitted QA attempt. Check whether a **completed** private poster exists. If error, inspect fresh Vercel runtime log `Poster Gemini prompt upstream HTTP failure <status>` (or transport category); check Supabase refund/credit accounting. Never trigger extra inference from the assistant or silently increase daily budget.
5. If HTTP 401/403 inspect Gemini project/key permissions (metadata only, no secrets); 400 inspect request schema/model; 429 free tier quota; 5xx upstream outage. Do not claim success until owner image-generation test.
