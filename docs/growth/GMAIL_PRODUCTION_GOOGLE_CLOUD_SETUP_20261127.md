# GMAIL-02 — Production OAuth connector implementation and Google Cloud activation

**Date:** 2026-11-27 (Asia/Colombo)  
**Repo:** `Victor-dev-03-cmd/sl_business_index`  
**Canonical site:** https://www.slbusinessindex.com  
**Status:** Code release candidate. **Google Cloud identity setup and verification NOT performed by ChatGPT. Do not enable production OAuth until verified.**

## 1. Why the Gmail connector screenshot still shows disabled

The historical `getGooglePreviewConfig()` refused `VERCEL_ENV=production`, so production always rendered `Google Mail · Preview setup required`. On 2026-11-27 a read-only infrastructure audit confirmed:

- Current production Supabase has `public.marketing_oauth_intents`, `marketing_connections`, `marketing_connection_secrets` and all four expected `slbi_*google_mail*`/OAuth RPCs. All three tables have RLS, and none currently contains any connector records. Service-only RPCs are ACL restricted to `service_role`.
- Existing `marketing_connections_owner_read` RLS policy also requires an actual verified Professional/Enterprise entitlement; the current QA entitlement has a Professional plan and is verified. Other free vendors are **not** granted Gmail OAuth access by this code.
- Vercel project `sl-business-index` includes the Supabase service role secret for Production, but **no SLBI_MARKETING_OAUTH_* variables** yet. Nothing can successfully request Gmail consent without a Google OAuth Web client.
- Google `gmail.send` is **sensitive**; `gmail.readonly` is **restricted**. A restricted scope requires extra OAuth verification and, where data is processed/stored server-side, a security assessment under Google policies.

## 2. What code does (without external secrets)

- Existing Preview gate remains isolated and unchanged: `getGooglePreviewConfig()` continues to deny production.
- New `getGoogleConnectorConfig()` adds explicit, OFF-by-default **Production** gate, requiring `SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED=true` and a valid fixed canonical origin, approved Google Web credentials, state HMAC secret and 32-byte AES-256-GCM key. A random Vercel preview URL cannot become the production redirect origin.
- New `getGoogleConnectorReadiness()` provides a public-safe readiness status (never a secret/value). No fake connected flags.
- `start`, `callback`, `preview` use the new gate. Start and callback verify authenticated owner, allowed marketing entitlement, and an **approved owned business**. Existing single-use HMAC state/PKCE and token encryption/RLS/service role RPCs preserved.
- `getGoogleDisconnectOrigin()` permits existing authenticated owners to remove SLBI-stored credentials while Google connection feature flags are OFF, rather than locking them in.
- Vendor App Connectors reopen the Gmail dialog after Google's callback and show a success badge **only if actual RLS connection metadata exists**, plus cancellation/retry message. Authenticated owners see selected business links and can continue to Email Marketing. No email is sent by clicking Connect.
- Optional `gmail.readonly` activation requires **separate** Production-only `SLBI_MARKETING_OAUTH_GMAIL_READ_PRODUCTION_ENABLED=true`. Default is FALSE. It cannot inherit the Preview read flag, and older connections do not gain read scope automatically. Up to 5 INBOX headers can be fetched only on a fresh vendor click after actual granted scope verification.
- No background mail polling, AI body access, external LLM/mail training, bulk marketing sends, campaign recipients, scheduled workers or email unsubscribe processing are activated. Existing Email Marketing remains a local reviewed EN/TA/SI draft/copy workspace.

## 3. Google Cloud Console — explicit actions for human owner

1. Open https://console.cloud.google.com/ and select/create the dedicated SLBI Google Cloud project.
2. **APIs & Services → Library → Gmail API → Enable**.
3. **Google Auth Platform → Branding:** App name **SL Business Index** (or approved legal display name), support email, app domain. Link the publicly visible Privacy Policy `https://www.slbusinessindex.com/privacy-policy` and Terms `https://www.slbusinessindex.com/terms-of-service`. Add `slbusinessindex.com` in **Authorized domains** and verify domain ownership if Google requests it. Provide authorized support/developer contact.
4. **Google Auth Platform → Audience:** choose External for external vendors, then start in Testing with your Google account explicitly under **Test users**. Google Testing mode has user limits and testing refresh-token restrictions; production scale requires Publishing status/verification as applicable.
5. **Google Auth Platform → Data Access:** add `openid`, `email`, `https://www.googleapis.com/auth/gmail.send` (sensitive). For Growth AI inbox reading, add `https://www.googleapis.com/auth/gmail.readonly` (**restricted**, do not enable Production read flag until verification/security requirements are satisfied). Provide accurate reason for each.
6. **Google Auth Platform → Clients → Create Client → Web application**. Set **Authorized JavaScript origins** (if displayed/required): `https://www.slbusinessindex.com`. Set **Authorized redirect URI** EXACTLY:
   `https://www.slbusinessindex.com/api/marketing/oauth/google_mail/callback`
   Avoid localhost, wildcard, Preview URLs or the bare-domain callback for production.
7. Store the new OAuth **Client ID** and **Client secret** privately. Do not paste into chat, GitHub, screenshots or client-side variables.
8. Submit Google's OAuth app verification for sensitive and, if needed, restricted scopes. Include accurate use-case/demo/data-usage details. Restricted Gmail data transmitted through SLBI servers triggers Google's security-assessment requirements when applicable.
9. For safer staged acceptance, use a separate Google Cloud project/client and Vercel Preview environment, with a fixed authorized Preview HTTPS origin; do **not** share production refresh-token encryption keys between environments.

## 4. Vercel → SLBI project → Settings → Environment Variables

Set these variables **only in the appropriate environment**, using server-side encrypted/sensitive values for secrets:

| Environment variable | Value / source | Exposure |
|---|---|---|
| `SLBI_MARKETING_OAUTH_PRODUCTION_ENABLED` | `true` **only after verified readiness**; default missing/false | Server |
| `SLBI_MARKETING_OAUTH_GOOGLE_ENABLED` | `true` | Server |
| `SLBI_MARKETING_OAUTH_ORIGIN` | `https://www.slbusinessindex.com` | Server |
| `SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID` | Google Cloud OAuth Web client ID | Server |
| `SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Web client secret | Secret |
| `SLBI_MARKETING_OAUTH_STATE_SECRET` | cryptographically random 32+ byte secret | Secret |
| `SLBI_MARKETING_OAUTH_ENCRYPTION_KEY` | cryptographically random 32-byte key in base64url (43 chars) | Secret |
| `SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID` | key rotation identifier, e.g. `gmail-prod-v1` | Server |
| `SLBI_MARKETING_OAUTH_GMAIL_READ_PRODUCTION_ENABLED` | `false` until restricted-scope verification/assessment; `true` only after release review | Server |

Existing Production `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` must continue to be available. **Never create `NEXT_PUBLIC_*` variables for any OAuth client secret or encrypted token.**

For secure key generation locally, a trusted environment with Python can use:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'  # state secret (store privately)
python3 -c 'import secrets,base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("="))'  # encryption key (store privately)
```

**Do not rotate a working encryption key without a migration/re-encryption plan**: old stored tokens must remain decryptable for safe credential management; disconnect uses the service-only DB RPC even if the key is absent.

After setting environment variables, **redeploy** the exact `main` commit so Vercel runtime picks them up. Do not set or edit these variables in GitHub.

## 5. Tests before calling it live

- Verify only the canonical `www.slbusinessindex.com` redirect returns to the correct vendor session (same cookie-bound Supabase identity).
- Google consent must list the exact scopes you allowed; if the user declines/cancels, UI must not claim connected.
- Connected status must derive solely from owner-visible `marketing_connections` after exact Google verified email and token store.
- Test cross-owner and unapproved listing rejection and disconnect after disabling the feature flag.
- If restricted read is approved and explicitly enabled, manually preview the latest five Inbox **headers only** and verify no full mail body, AI provider upload or auto-send.
- Confirm disconnect deletes SLBI encrypted credentials; Google account permissions must separately be revoked in Google's account connection settings.
- Confirm no marketing send, bulk recipient import, CRM automation, or AI training on mailbox data without **separate** feature security release and a consent/unsubscribe/suppression implementation.

## 6. Follow-on Gmail + Email Marketing stages (not implied complete)

1. Provider review and real Google testing-mode callback acceptance in isolated Preview.
2. Live connect (with production credentials/verification), connection list, disconnect and optional owner-triggered metadata preview.
3. Consent-backed recipients and suppression + unsubscribe infrastructure, sender authentication (SPF/DKIM/DMARC), approval and delivery quotas. Avoid bulk marketing via personal Gmail accounts; assess Workspace policies and dedicated campaign delivery provider.
4. Owner-approved reply drafts; audited idempotent per-message execution with no autonomous Growth AI sending, delivery/bounce/complaint tracking.
5. Only user-approved, documented minimal-data ML training; synthetic ML-07 benchmark alone is not production model readiness.

## Official references

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://support.google.com/cloud/answer/13463073
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
