# WA-03D — Debug Meta POST test 403 without exposing message data (2026-11-26)

## Verified observations
- Meta GET handshake was successful: `facebookplatform/1.0`, HTTP 200, and the owner sees the green Configure Webhooks check mark.
- The `messages` field is subscribed (v27.0).
- Meta Dashboard **Test** issued genuine POST requests to `https://www.slbusinessindex.com/api/integrations/whatsapp/webhook` at 03:50-03:51 Asia/Colombo, returned HTTP 403 from deployed `d256978`; Vercel Firewall explicitly Allowed and routed to the function.
- GET challenge and POST payload validation are separate. POST requires valid `X-Hub-Signature-256` under the *Meta App Secret*, valid WhatsApp event JSON structure, and (for parsed messages) exact test WABA and phone IDs. No evidence yet which check failed.
- The Meta Dashboard "Test" event can be a synthetic payload. Do not assume it has the same WABA/phone details as a real message or that it should be accepted without the security checks.

## Minimal diagnostic implementation
- Existing `inspectWA03BInbound` now emits a safe fixed rejection `code`: `disabled`, `signature_invalid`, `validator_unavailable`, `payload_invalid`, or `unexpected_number`.
- POST handler prints a **fixed error category only** via `console.warn`, then still responds with `Webhook unavailable` and HTTP 403/503. NEVER log raw body, sender phone, text, App Secret, verify token, signature or WABA/phone IDs.
- Synthetic regression tests cover wrong signature, malformed payload, wrong phone and disabled sandbox, preserving all existing validations.
- No changes to acceptance gates, HMAC algorithm, WABA scope, POST success semantics, env configuration, billing, SQL, persistence, vendor links, LLM or sends.

## Owner QA after verified release
1. Confirm exact GitHub head CI and matching Vercel READY/www alias.
2. In Vercel **Runtime Logs**, filter for `SLBI WA sandbox webhook POST rejected:`.
3. Meta → Webhook fields → `messages` → `Test` → Send a single test; read only fixed category, do NOT share raw request, tokens or Meta payload.
4. `signature_invalid`: compare Vercel server-side `SLBI_META_APP_SECRET` **privately** to Meta App Settings → Basic → App Secret (not Meta access token or verify token); redeploy after change. Do not reveal values in chat.
5. `payload_invalid`: the dashboard synthetic test is not compatible with the intentionally strict real-test-number parser. Preserve fail-closed; test a legitimate message against Meta's *official test phone* instead. Do not loosen checks for mock data without scoped synthetic recognition.
6. `unexpected_number`: verify exact `SLBI_WA_TEST_WABA_ID` and `SLBI_WA_TEST_PHONE_NUMBER_ID` against official Meta test-number IDs, not App ID, not visible phone, not Live WABA.
7. `validator_unavailable`: inspect test secret/pepper length and deployment env presence privately.
8. `disabled`: enable sandbox only with approved official test-number credentials; no live number automation.
9. Reconfirm a real eligible signed inbound message receives HTTP 200; a mock test HTTP 403 alone is not evidence of broken production messages.

## Security and future
Exposed verify token and any exposed Meta access token must be rotated after stable setup; do not expose in screenshots. The sandbox still does NOT persist messages, invoke AI, link vendors, or reply to Meta. Policy/consent & verified business owner enrollment remain separate gates.
