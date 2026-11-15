# P2-10 — Poster Studio microphone permission and Generate availability (15 November 2026)

## Latest owner report
On the Production split-screen Poster Studio the Generate button was disabled and clicking Voice returned “Permission denied” without any native browser microphone Allow prompt. The owner requested these issues be repaired and deployed, preserving the accepted LLM-style centered composer and LEFT controls / RIGHT output layout.

## Verified root causes
1. **Server response header blocked the browser prompt.** Source `next.config.ts` set a global `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`. This forbids microphone use even when a first-time user clicks Voice. `getUserMedia({audio:true})` rejects `NotAllowedError` with no native permission dialog. The safe repair adds a LAST exact-match rule `source: '/vendor/marketing/design'` with `camera=(), microphone=(self), geolocation=(self)`. Everywhere else microphone stays disabled; camera never becomes allowed. Next.js last matching header wins.
2. **Browser rejection recovery.** Even after the site policy is fixed, any browser that has previously saved “Block” cannot be forced by JavaScript to display a new Allow prompt. App detects insecure context / Permissions-Policy blocks / NotAllowedError / SecurityError / unavailable device and shows a readable recovery panel: Chrome Site controls next to the address bar → Site settings → Microphone Allow → Reload → user-initiated Retry. Gemini transcription remains click-to-record, and returned transcript remains reviewable and NEVER auto-sends Generate.
3. **Disabled Generate came from database quota, not CSS, missing API keys or invalid user subscription.** Actual production Supabase UTC 2026-11-15 cap was `attempts=2,max_attempts=2`, with 1 completed private poster + 3 refunded history jobs. The currently verified Pro entitlement and wallet remain valid; image credit action is enabled at 8 internal Growth Credits; Gemini and Cloudflare env names and feature flags exist. Current reserve RPC excludes refunded attempts from user 3/day cap.

## Owner-authorized bounded test allocation
The owner explicitly requested making Generate usable for test. A guarded database UPDATE changed only UTC 2026-11-15 `max_attempts: 2 → 4`, leaving `attempts=2`. **Two additional QA attempts**, and no more, became available. Successful user-requested image generations consume existing 8 internal Growth Credits each. The assistant did NOT invoke Cloudflare/Gemini, change providers, upgrade billing plans, remove RLS, or enable unlimited future-day inference. Future UTC dates still default to 0 until the administrator allocates a limit; never promise an automatic refresh.

## Implementation locations
- `next.config.ts`: exact route-specific microphone permission override, global default unchanged.
- `app/vendor/marketing/design/page.tsx`: native browser permission request, policy/HTTPS checks and denial recovery steps, user-initiated retry.
- `tests/p2PosterStudioWorkspace.test.mjs`: assert default deny and route allow ordering, user recovery, unchanged database-backed Generate gate.
- `docs/growth/p2/P2_09_POSTER_SPLIT_WORKSPACE_VOICE_REFERENCE_HANDOFF_20261115.md`: previous validated layout and deployment.

## Release acceptance
1. CI exact PR-head green: Next.js production build, Marketing/P2 security and contracts, P1, Billing.
2. Merge PR to main, Vercel Production READY at exact SHA, `www.slbusinessindex.com` alias verified.
3. Check actual Production header `Permissions-Policy` on `/vendor/marketing/design` is `microphone=(self)` while homepage stays `microphone=()` (if access to headers is possible).
4. Re-read database `attempts/max_attempts`; never run owner inference automatically. On first browser test native Allow should appear unless browser previously blocked it, then follow user-facing site-settings steps.
5. Owner tests voice transcript and one poster. Requester-owned business selection, 8-credit consent, private image storage, existing editor, non-autopublishing all remain intact.

**Status at time this document was first written:** branch implementation and QA budget adjustment complete; CI/production deployment must be verified separately before claiming release.
