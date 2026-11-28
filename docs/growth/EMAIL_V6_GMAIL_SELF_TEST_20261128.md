# EMAIL-V6: Review-first Gmail self-test and real email-safe HTML

Date: 2026-11-28. Branch: feat/email-v6-gmail-self-test-html-renderer-20261128.

## Intended user journey

Campaign Hub → New Campaign → Inline Design → Review to Send →
**Send one test to my Gmail** (only shown when operator `SLBI_EMAIL_GMAIL_TEST_ENABLED=true`, production Gmail OAuth configuration is valid, the chosen approved business has a connected account, and `gmail.send` is actually among consented scopes).

The vendor must explicitly confirm the full mailbox address before a test occurs. The recipient is **always that exact verified Gmail account**; there is no recipient field, no CSV import, no bulk list, no automatic retry, no scheduled send. Google provider acceptance is not a guarantee of final Inbox delivery. A self-test is **not** a marketing campaign, and carries clear `[SLBI TEST]` subject, `Auto-Submitted` and test-only headers.

## Security

- `/api/marketing/email/test-send` POST only. Exact origin, JSON size/shape, auth.getUser, verified Pro entitlement, approved business owner, matching RLS-visible marketing connection, live `gmail.send` scope and its verified own address; `custom` user HTML refused for test.
- Server-only Supabase service client reads encrypted refresh token **only after** owner/connection validation, decrypts AES-256-GCM with its AAD-bound owner/business/sub identity, and refreshes with Google OAuth. Never returns tokens in UI/errors.
- `docs/growth/EMAIL_V6_GMAIL_SELF_TEST_MIGRATION.sql`: new service-only audit `marketing_email_test_sends` RLS table and idempotent private reservation with a public **service-role-only** wrapper. 3 attempts per business per UTC day, 8 per owner per UTC day. One-time request key, advisory transaction lock, persisted state, provider receipt tracking.
- Google Gmail users/me/messages/send only after all checks; **To === From === verified connected mailbox**, never a client-supplied email. Unknown provider outcome consumes the reservation with no retry.
- `lib/marketing/email-renderer.ts`: responsive table-based, HTML-escaped brand logo, headline, body, two-offer grid, CTA; plain text alternative, safe HTTPS links, UTF-8 MIME, no trusted custom HTML or private poster URLs. A separate marketing render path hard-requires a working HTTPS unsubscribe link, but **the production marketing send route does NOT exist**.

## Release boundary

The implementation and migration are not evidence that Gmail self-test is active in Production. It is OFF until `SLBI_EMAIL_GMAIL_TEST_ENABLED=true` is explicitly enabled after a vendor-connected Gmail has passed an end-to-end test (without Google account lock/restriction). Do not reveal or ask the user to paste OAuth secrets.

This does NOT enable any bulk marketing campaign, imported contacts, actual unsubscribe, subscriber double opt-in, domain DKIM/SPF verification, scheduled workers or real analytics. For world-class email marketing, a verified provider such as Resend Broadcasts or SES plus contact consent/suppression and signed provider events must be implemented and independently verified. There is no Resend/SES key currently configured on Vercel.

## Verification

- `tests/emailMarketingV6SelfTest.test.mjs` checks MIME To=From, anti-XSS, nontrivial UTF-8, private poster exclusion, HTTP/HTTPS and unsubscribe rules, privileged authorization and quota conditions, UI confirmation.
- Verify Next.js full CI, Bun/TypeScript/build tests and Supabase advisor+table/RPC ACL verification required before PR merge.
- User-side signed-in Gmail acceptance still required. The owner may see the test button only when the environment gate is enabled; absent button does not imply Gmail is unconnected.
