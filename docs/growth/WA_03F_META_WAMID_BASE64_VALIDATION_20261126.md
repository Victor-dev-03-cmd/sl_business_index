# WA-03F — Real WhatsApp text inbound: Base64 WAMID parser compatibility

## Evidence (2026-11-26)
- Owner's `SLBI Growth AI` WhatsApp webhook verification GET returns 200; App is visible in messaging account subscription GET.
- A genuine WhatsApp message to Meta test number produces webhook POSTs on `www.slbusinessindex.com` via `facebookexternalua`; Vercel Firewall Allowed, but returns 403 with `payload_invalid malformed_text_event` (owner screenshot at 13:48 Asia/Colombo). Early non-warning UI color while request pending was not a successful final HTTP response.
- Exact value of the failing message field is **not visible**, correctly, because webhook message content/IDs must not be logged.
- Code in `lib/growth/agent/wa02-webhook.mjs` used `/^wamid[.A-Za-z0-9_:-]{3,250}$/`; this excludes `=` (and `+`, `/`) commonly present in legitimate base64-encoded Meta Cloud API `wamid.` IDs. Realistic public documentation examples show IDs ending `=`. This is a strong code-level candidate, not confirmation of the exact user's private WAMID.

## Narrow implementation
- Accept `wamid.` prefix followed by a bounded alphabet of base64 and base64url-safe characters `[A-Za-z0-9_+/=-]`, length 3..250, on verified signed inbound text; preserve all other text, sender, timestamp, message count, signature, WABA and phone guards.
- Only emit fixed diagnostic stage suffix (`malformed_text_event_id/sender/timestamp/body`) for any remaining malformed text after signature verification. No phone, message text, signature, secret or real WAMID is persisted or logged.
- Synthetic tests: realistic padded WAMID recognized and hashed; invalid chars, long id, wrong prefix, invalid sender, timestamp, and malformed body fail closed. POST non-text/invalid signature and no persistence remain unchanged.
- Do not expand this sandbox to AI replies, owner mapping, database persistence, outbound messages or provider eligibility.

## Release gates and next QA
1. Exact-head 15/15 (or all present) full GitHub workflows PASS, typecheck/Bun/P1 build green; merge PR; confirm Vercel READY with exact merged SHA and `www.slbusinessindex.com` alias.
2. Owner sends a **new** message from personal WhatsApp to the official Meta test number while monitoring Vercel Request Logs.
3. If POST HTTP 200, webhook read-only sandbox accepted **event only**; no automatic WhatsApp reply expected and no content persisted.
4. If POST 403, inspect **Runtime Logs** for only the fixed field-level diagnostic suffix after `payload_invalid`; never request raw payload/phone/token. Fix only after classification, not by disabling security.
5. Rotate exposed Verify Token and API Access Token via their respective systems after stable setup. Keep owner-authenticated linking and Meta AI eligibility restrictions outstanding.

## Continuation prompt
Continue SLBusinessIndex GrowthOS WhatsApp WA-03F in Tamil. Read GitHub main `docs/growth/HANDOFF_LATEST.md`, `AGENTS.md` and WA-03F report. Verify exact PR head CI, merge if all green, Vercel READY exact commit and www alias. User's genuine WhatsApp inbound POST reached server but was rejected 403 with `payload_invalid malformed_text_event`. Previous validator WAMID excluded base64 `=`; candidate code supports legitimate padded WAMIDs, tests and fixed field-name diagnostics, without exposing message payloads or relaxing signature/test WABA checks. After release ask owner to send one new real test-number message, report HTTP status and fixed reason only; no AI replies/DB writes. Rotate exposed tokens once stable.
