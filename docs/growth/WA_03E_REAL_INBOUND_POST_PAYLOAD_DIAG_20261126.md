# WA-03E — Real Meta inbound POST / payload_invalid diagnostics (2026-11-26)

## Owner evidence
- `SLBI Growth AI` App ID `1960051488713330` was added to the test Messaging Account / WABA's `/{id}/subscribed_apps` list and owner confirmed by GET. Previously subscribed Meta `WA DevX Webhook Events 1P App` remains alongside it.
- A WhatsApp message to the official test phone then produced real Vercel webhook POSTs on `www.slbusinessindex.com` around 13:35 Asia/Colombo. User agent `facebookexternalua`, Firewall Allowed, HTTP 403.
- Vercel's existing code-only log showed `SLBI WA sandbox webhook POST rejected: payload_invalid`. A transient non-error color during request processing is **not** evidence of HTTP 200.
- Previously GET verification HTTP 200 and the dashboard `messages` field was subscribed. POST signature verification passed, but **specific JSON validation step is not yet known**.
- Several POST 403s may be webhook retries; avoid treating these as separate successful message deliveries.

## Candidate narrow diagnostic change
- Keep existing HMAC signature validation, exact WABA/phone test-number boundaries, message-size cap, no raw payload logging, no persistence, and no AI or outbound sends.
- Only after a verified signature, surface a small fixed internal parser reason as `detail` on `payload_invalid`, for example `malformed_text_event`, `malformed_change`, or `unexpected_meta_object`. Never surface raw JSON, phone number, token, signature, text, a field's actual value or event IDs.
- Vercel Runtime Logs display `SLBI WA sandbox webhook POST rejected: payload_invalid <detail>`. HTTP status remains 403.
- Add synthetic tests for invalid object, entry, change, message timestamp, future event; plus no leaking details and unchanged signature behavior.

## Next owner action after all-green CI, exact main merge and Vercel READY
1. Open Vercel **Runtime Logs**, filter by `SLBI WA sandbox webhook POST rejected`.
2. Send **one** WhatsApp test-number message; report **only the fixed parser-step word** after `payload_invalid`; no screenshots with tokens or raw request bodies.
3. Apply a separately tested, **minimal** compatible schema fix **only after that detail identifies the issue**. Do not generally relax message/account/ownership security.
4. A verified HTTP 200 would mean only that an event passed this read-only sandbox; it still does not persist incoming content or send any WhatsApp reply.

## Security outstanding
Owner screenshots exposed Verify Token and Meta API Access Token; revoke/rotate both once stable, set matching Vercel/Meta verify value before continuing. WABA subscription and test-number success are NOT proof of eligible AI message automation, vendor identity linking or a live marketing service. Meta publishing, consent, policy and RLS/transactional owner links remain separate gates.
