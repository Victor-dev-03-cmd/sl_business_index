# EMAIL-03 — Email Studio V3 advanced UI, Gemini QA and Opt-in Bridge

Date: 2026-11-27 (Asia/Colombo).
Branch: feat/email-v3-templates-gemini-optin-20261127
Production change scope: Email Studio user interface, pure templates, QA AI endpoint and optional schema-gated public preference checkbox. No release of bulk email sending.

## Requested and implemented

**Connected sender:** Email page reads the real user/auth and business-matched marketing_connections records from RLS, not a fake sender. When absent, the only primary action is Connect Gmail to Send. When connected, an orange Review Campaign for Sending action explains the real prerequisites; Gmail connection DOES NOT automatically entitle bulk sends or guarantee permission for all recipients.

**Four visual email templates:** Minimal Update; Hero Poster Spotlight (using the private saved Poster Studio preview), 2-Column Offer Grid (two editable offers); Custom HTML / Saved Brand Template (editable HTML source saved with business-scoped browser localStorage and previewed in sandboxed, script-free, network-disabled iframe with CSP). Custom HTML is not injected into any public SLBI page, AI API or outbound Gmail. Exported basic HTML preview is intentionally NOT an approved send asset.

**Gemini multilingual email drafting:** new POST /api/marketing/email/generate, isolated from Gmail mailbox, CRM contacts and bulk-send code. Exact same origin, bounded request, owner/approved-business and verified Pro/QA gating, Brand Kit language and tone, HTTPS CTA must match stored business page/website. Requires explicit SLBI_MARKETING_EMAIL_AI_ENABLED=true AND existing SLBI_MARKETING_AI_ENABLED=true, GEMINI_API_KEY, current shared Marketing AI draft credit reservation/settlement/refund. Structured Gemini JSON subject/preheader/body/CTA, manual factual review mandatory, no sending. Shared marketing AI credits currently store results in the legacy caption-draft table under a typed email marker, so *do not open this to all Pro users* until a separate email-specific ledger/library is migrated and reviewed.

**Lead consent bridge:** optional separate marketing checkbox on business details enquiry form, only available when the secure lead path and explicit NEXT_PUBLIC_EMAIL_OPTIN_ENABLED=true are on. Validated `marketing_opt_in:boolean` is passed through the same strict Cloudflare Turnstile + rate-limit endpoint; an opt-in request calls a versioned atomic RPC in `docs/growth/EMAIL_03_CONSENT_LEDGER_REVIEW_ONLY.sql`. That review-only ledger is owner-selectable under RLS and stores minimal email, request ID, lead ID, source, text version, timestamp and status PENDING. Explicit acknowledgement is not email ownership verification. Never grant confirmed status merely from checkbox or historic leads. Email page counts only `confirmation_status=confirmed` AND `revoked_at IS NULL`, if the audited table exists, with fail-closed missing-table behavior.

## Honest unfulfilled production dependencies

- **No bulk email sent or scheduled**. Marketing sends require confirmed subscriber evidence, automatic opt-out/suppression, Gmail sender verification/restrictions, rate controls, idempotent worker/provider receipts, billing and explicit campaign approval. Google Gmail sender guidelines require avoiding unsolicited emails and proper unsubscribes for bulk senders.
- **No Gmail draft saving**: current Gmail send scope does not authorize drafts.create; this requires `gmail.compose` and new opt-in consent.
- **No automatic schedules**: local automation intents still draft/planning only; cannot claim deployed worker.
- **No live self-test sending**: UI shows disabled self-test until a documented sender-specific rate-limited route ships. Never enable the flag without that route.
- **No verified audience from checkbox alone**: double opt-in confirmation, unsubscribe/suppression endpoints and privacy retention/deletion are separate migrations. Never set NEXT_PUBLIC_EMAIL_OPTIN_ENABLED before the SQL and corresponding email-confirmation path are reviewed; leave flag OFF for this release.
- **No general Pro Gemini rollout yet**: separate email-specific credit ledger, concurrency lease and model usage controls must pass staging. New QA endpoint remains OFF unless operator explicitly enables reviewed flags for verified internal QA.
- No live Supabase migrations, OAuth scope changes, real customer mailbox/model training, or secrets changes in this release.

## QA and release

- tests/emailStudioV3.test.mjs exercises four styles, HTML sandbox, strict Gemini input/output/QA constraints, opt-in validation, schema privacy and no fictitious subscribers.
- Existing tests/emailStudioProWorkspace.test.mjs, gmailGrowthAiPreview.test.mjs and growthSecureLeads.test.mjs adapted for V3.
- Verify Next.js, Bun, TypeScript, legacy OAuth, P1/P2 and security workflows must all PASS.
- Owner authenticates after deployment: connected Gmail vs selected business, light desktop/mobile design, multi-language, poster previews, browser saved templates, and missing-consent display.
- Next: (1) double opt-in and unsubscribe + suppression + verified recipient count migration in approved staging; (2) rate-limited self-test; (3) durable bulk queue and schedule; (4) separate Gemini email draft ledger and non-QA rollout.
