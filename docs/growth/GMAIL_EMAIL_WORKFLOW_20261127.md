# GMAIL-01 + EMAIL-01 — Consent-first GrowthOS connector and Email Marketing drafts

**Date:** 2026-11-27 (Asia/Colombo)  
**Scope:** New code in `feat/growthos-gmail-preview-mail-intelligence-20261127` only. This is a **Google OAuth PREVIEW-ONLY implementation**, not live Gmail production activation.

## Owner request and implementation

The SLBI vendor should use App Connectors to authorize Gmail, explicitly grant Growth AI mail access, and continue to Email Marketing. We implemented the safe foundation without pretending that Google has approved restricted scopes or that production OAuth SQL has been applied.

1. Existing `/api/marketing/oauth/google_mail/start`, `/callback`, `/disconnect` retained, with the same PKCE, HMAC state, encrypted secret, exact origin and verified owner/Pro gate.
2. `lib/marketing/oauth-runtime.ts`: OPTIONAL `https://www.googleapis.com/auth/gmail.readonly`, only when `SLBI_MARKETING_OAUTH_GMAIL_READ_PREVIEW_ENABLED=true` in the already-gated **Vercel Preview** environment. Default is send+OIDC without read; production remains disabled even with flag.
3. `lib/marketing/oauth-google.ts`: reject callbacks if the requested read permission was not explicitly granted by Google; prior send-only connections do not silently inherit read access. Owner must reconnect to upgrade scopes.
4. New owner-triggered `POST /api/marketing/oauth/google_mail/preview` checks same-origin, bounded JSON, Supabase fresh `auth.getUser()`, marketing entitlement, approved owned listing, owner/RLS-visible connected Google account and granted read scope. A service-role lookup reads only the encrypted refresh token *after* these checks; decrypts with owner/business/sub AAD, requires matching key ID, uses official Google refresh endpoint. Fetches at most five INBOX message headers (Subject, From, Date) using `format=metadata`, with hard timeouts, no redirects and no email body, attachment, storage or automatic sync. Response is private no-store; never logs third-party mail content/tokens. Provider reads only after vendor clicks Preview.
5. New deterministic, local `classifyGmailSubject` identifies support, booking, pricing enquiry, promotion/unknown from subject keywords. It never takes instruction from subject/body, sends/replies, makes LLM calls or trains on real mail. UI displays this honestly as **rules-first triage**. Any future external LLM would need distinct explicit content-minimization, data-processing, review and retention approval.
6. `EmailMarketingWorkbench.tsx`: a usable multilingual EN/TA/SI composer with business name, approved details, CTA, optional subject, subject/body live preview and user-triggered clipboard copy. No recipient collection, server saves, sending, scheduled jobs, claims of open/click/delivery stats, or fake AI output. Promotional drafts contain an unsubscribe placeholder until real consent/opt-out implementation.
7. Reused the real RLS-scoped connection status on the Email Marketing page in preview only; App Connector's Gmail modal shows the explicit read permission and optional manual inbox preview.
8. NeuroGrowth agent capabilities register `read_gmail_headers_preview` as **read candidate**, `propose_gmail_reply_draft` and `propose_email_marketing_draft` as **draft only**, and block `request_send_gmail_message` and `request_bulk_email_campaign`. This is a specification, not an executor.
9. ML-07 CPU-only Unicode char n-gram classifier: updated **only synthetic** training/holdout utterances for the Gmail connector + Email Marketing in English/Tamil/Sinhala (still 72 synthetic train and 36 disjoint holdouts across 12 existing apps). No mailbox data, real training consent, production ML inference or model deployment. The independent deterministic app router adds Tamil/Sinhala Gmail words, but cannot execute any action.

## Google Cloud setup (human admin, not performed here)

- Google Cloud Console → APIs & Services → **Library** → enable **Gmail API** for the appropriate reviewed Cloud project.
- Google Auth Platform → Branding / Audience / Data Access: configure approved OAuth brand, user type, Authorized Domains, verified privacy policy and allowed scopes; add explicit Gmail `gmail.send` (sensitive) and, only after the separate decision/security process, `gmail.readonly` (restricted).
- Clients → OAuth 2.0 **Web application** → Authorized redirect URI must exactly equal `https://<approved-preview-origin>/api/marketing/oauth/google_mail/callback`, no wildcard or arbitrary redirects. Test users only while in Google testing mode; Google production verification is not implied.
- Google `gmail.readonly` is a **restricted scope**. Verification and potentially a security assessment are required when restricted data is stored or transmitted through SLBI servers. The current one-off preview does process headers server-side; verify compliance before enabling the flag with any real mailbox.

## Vercel Preview-only env configuration

Existing `VERCEL_ENV=preview` required by code; the following are **names, never put secret values in GitHub/chat**:

- `SLBI_MARKETING_OAUTH_PREVIEW_ENABLED=true`
- `SLBI_MARKETING_OAUTH_GOOGLE_ENABLED=true`
- `SLBI_MARKETING_OAUTH_GMAIL_READ_PREVIEW_ENABLED=true` (**new opt-in, default false**)
- `SLBI_MARKETING_OAUTH_ORIGIN` = exact HTTPS preview origin registered in Google.
- `SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID` and server-only `SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET` from the approved Google OAuth web client.
- `SLBI_MARKETING_OAUTH_STATE_SECRET` random server-only value (minimum 32 chars).
- `SLBI_MARKETING_OAUTH_ENCRYPTION_KEY` 32 random bytes as base64url; `SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID` rotation label.
- Existing server-side `SUPABASE_SERVICE_ROLE_KEY` for reviewed isolated preview SQL; never expose in NEXT_PUBLIC vars.
- The P2-07 SQL files in `docs/growth/p2/` are **staging/disposable-only and not approved for production**. Do not apply as-is. They require a reviewed migration, tested RLS/RPC, KMS/vault key management and rollback before production.

## Release blockers / honest product status

- No approved production Google consent screen, no verified restricted `gmail.readonly` scope, no real Google test owner authorization, and no production P2-07 OAuth migration/KMS evidence. **Gmail cannot be connected live on production yet.**
- Current email send permission is never executed. Before enabling sending: verified sender domain and aliases, explicit per-contact marketing opt-in, unsubscribe/suppression, limits/quotas, provider policies, audit/idempotency, retry and bounce/complaint handling, human exact-action approval and tenant isolation.
- OAuth authorization does **not** authorize AI model access to all inbox mail or training. Rules-first preview reads only five headers on demand; external AI access remains separately gated.
- No live training on owner/customer email content; synthetic ML-07 evaluation is not proof of real-world predictive quality.
- Test suite: `tests/gmailGrowthAiPreview.test.mjs`, existing OAuth tests, `tests/ml/neurogrowth-ml07-studio-routing.test.mjs`, ML-07 Python synthetic benchmark, Next.js production build, existing Pro/owner/SQL tests. Physical signed-in Preview browser, both vendors and actual Google consent callback remain pending.

## Next steps

1. Get human approval for Google restricted-scope use, security assessment applicability and privacy/retention policy; provision reviewed Preview Google OAuth client and isolated Supabase staging SQL.
2. Run exact owner test user Google consent in isolated Preview and Basic/other-owner negative tests; verify connect → manual header preview → disconnect and revoke.
3. Implement consent-backed marketing recipient registry, unsubscribe/suppression, message approval nonce, idempotent capped sending workers and Google quota/bounce reporting **as separate security-gated milestones**.
4. Only then consider production OAuth callback migration and live Gmail marketing, with owner review and deployment rollback evidence.
