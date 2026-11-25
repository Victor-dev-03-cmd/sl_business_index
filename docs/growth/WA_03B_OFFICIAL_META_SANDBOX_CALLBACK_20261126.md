# WA-03B — Official Meta test-number Callback (2026-11-26)
## State
Partially implemented, **intentionally disabled by default** until owner configures Meta credentials in server-only Vercel environment variables. Only official Meta test-number webhooks, no live owner account link or outbound marketing. User confirmed Meta test template received and events visible in Meta dashboard; token visible in screenshot and MUST be revoked/rotated before configuring production.

## Callback
Set Meta Developer app → WhatsApp → Configuration → Webhook Callback URL:
`https://www.slbusinessindex.com/api/integrations/whatsapp/webhook`
Verify token: an operator-created random server secret, identical to `SLBI_META_VERIFY_TOKEN` in Vercel; NEVER share raw token in chat. The Webhook "messages" field must be selected. Need confirmed Meta AI-provider eligibility BEFORE actual AI replies / consumer messaging.

Required Vercel **server-only**, Production env keys (all absent at audit 2026-11-26):
- `SLBI_WA_SANDBOX_WEBHOOK_ENABLED=true` ONLY for approved test-number callback and after all secrets are configured, default off.
- `SLBI_META_APP_SECRET`: Meta App Settings → Basic → App Secret; server-only, never paste.
- `SLBI_META_VERIFY_TOKEN`: owner-generated random 32+ character string, same Meta webhook Verify Token.
- `SLBI_WA_IDENTITY_PEPPER`: separate random 32+ character secret for keyed fingerprints.
- `SLBI_WA_TEST_WABA_ID`: test *Messaging account ID* from Meta.
- `SLBI_WA_TEST_PHONE_NUMBER_ID`: test *Phone Number ID* from Meta.

The *App ID* is an operator-readable identifier required for later WhatsApp onboarding/OAuth configuration, not used by this callback. `SLBI_META_TEST_ACCESS_TOKEN` is NOT needed for webhook receipt (only later authorised outbound test send). Do not paste or commit any secrets.

## Security boundaries
- GET handshake validates Meta `hub.verify_token` with constant-time token equality, responds with the exact challenge only when activated.
- POST checks raw `X-Hub-Signature-256` HMAC and 256 KiB body bound before JSON processing; requires exact configured test WABA + phone scope. Uses WA-02 existing signed sanitizer and outputs **only an event count**. No logs, message persistence, vendor mapping or AI / Meta reply. Invalid/disabled returns 403/503.
- Readiness is **not** ownership linking. WA-01 and WA-02 supplied synthetic-only identity/approval contracts. Real Vendor-to-WhatsApp linkage needs a separate reviewed durable RLS + replay ledger and authenticated challenge, and a confirmed approved Meta test pathway. Existing Laxsan Dev vendor business not silently linked.
- Tests `tests/ml/wa03b-meta-sandbox-webhook.test.mjs` have synthetic valid/invalid HMAC, challenge, wrong phone, statuses-only and disabled config.
- Run CI on exact final head, merge only after all green, Vercel READY exact commit + www alias; no physical Meta webhook check can be claimed until owner configures secrets and Meta Callback URL.
- External Meta WhatsApp AI-provider primary-use restrictions (Business Solution Terms) may prohibit the proposed AI operator as WhatsApp primary service for Sri Lankan numbers; request Meta eligibility. Do not bypass with unofficial library; no customer data/Deepnote training.
- Background issue: Supabase list_tables surfaced `public.spatial_ref_sys` with RLS disabled. This pre-existing extension table is NOT changed; examine relevant PostGIS policies with DBA before applying any RLS action.

## Next-chat prompt
Continue SLBusinessIndex GrowthOS in Tamil. First read full GitHub main docs/growth/HANDOFF_LATEST.md, docs/growth/WA_03B_OFFICIAL_META_SANDBOX_CALLBACK_20261126.md, docs/growth/NEUROGROWTH_WA03_WHATSAPP_CONNECTION_LAB_20261125.md and AGENTS.md. Owner created Meta app SLBI Growth AI under SL Business Index and successfully sent test WhatsApp template and saw Meta test webhook events. Access Token was accidentally exposed in screenshot and MUST be revoked/rotated, don't ask them to paste secrets. User wants complete WhatsApp connection for Laxsan Dev and later all App Connectors. WA-03B adds strict HMAC webhook verification route at /api/integrations/whatsapp/webhook, DISABLED until 6 server-only production Vercel env keys configured, no real vendor link or inbound content persistence and no AI/outbound sends. Owner must supply only non-secret App ID + whether WABA/Phone IDs are still same and configure confidential App Secret/verify token/identity pepper directly in Vercel; confirm Meta AI-provider eligibility. Verify PR exact-head GitHub CI, merge only green, Vercel READY matching main SHA/alias and preserve HANDOFF_LATEST in same PR. Next after Meta callback verified: owner-authenticated 5-minute link intent with staged DB RLS/transactional unique sender+nonce/message replay, setup UI, revocation, safe inbound status; only after policy clearance add owner-only read messages and approvals; no automated customer messaging, unverified marketing or model training. Audit on live Supabase surfaced pre-existing public.spatial_ref_sys RLS disabled; do not apply change without DBA review. No secret in chat or GitHub.
