# WA-03C — Meta webhook GET verify 403 after observed callback (2026-11-26)

## Owner evidence
- Meta's **actual** callback arrived at `GET /api/integrations/whatsapp/webhook` on `www.slbusinessindex.com` (03:30:53 Asia/Colombo), User-Agent `facebookplatform/1.0`, Vercel firewall **Allowed**, function replied **403**.
- The Vercel Request Logs UI showed both canonical `hub.mode / hub.challenge / hub.verify_token` and mirrored `hub_mode / hub_challenge / hub_verify_token` query parameter names with matching apparent values.
- A local, token-bearing **canonical three-key** GET challenge was previously confirmed by owner as HTTP 200 and exact challenge echo.
- The previous `verifyMetaSubscribeQuery` rejected all requests with anything other than exactly three keys. This **explains** 403 if the six observed parameters were delivered to the Next.js Request URL. Browser/network details and logs can be normalized by tooling, so a real Meta retry is required before calling it fixed.

## Candidate fix
- Update shared `lib/growth/agent/wa02-webhook.mjs` GET helper to accept **only**:
  1. exactly three dotted `hub.*` keys, or
  2. exactly three underscored `hub_*` aliases, or
  3. exactly six keys comprising full dotted + underscored forms whose corresponding values match.
- Reject extras, duplicates, incomplete aliases, mismatched pairs, wrong mode, malformed challenge, and wrong token. Continue constant-time verification token comparison. Never include secret values in logs or QA files.
- Add `tests/ml/wa03b-meta-sandbox-webhook.test.mjs` regression coverage using synthetic secrets, including observed six-key shape and negative cases. POST HMAC checks, test WABA/phone isolation, no storage, no AI and no sends remain unchanged.
- No env changes, provider activation, SQL/migrations, or Meta subscription toggles required.
- All live tokens previously included in user terminal/screenshots should be rotated **after** the verified fix, updating Vercel and Meta together; do not paste or log secret values.

## Release gates
- Run exact-head WA-02 / WA-03B tests and full CI; inspect PR diff; merge only all-green.
- Confirm deployed exact commit and `www.slbusinessindex.com` alias READY.
- Meta owner reattempts `Verify and save` using **www** URL, same existing token before rotation; verify new `facebookplatform/1.0` GET returns HTTP 200 in Vercel **Request Logs**, and Meta confirms webhook saved.
- The current code deployment alone must NOT be represented as a successful Meta handshake.
- After successful Meta verification, owner rotates exposed verification and prior Meta access tokens. Sandbox remains test-number-only; no owner linking or outbound automation.
