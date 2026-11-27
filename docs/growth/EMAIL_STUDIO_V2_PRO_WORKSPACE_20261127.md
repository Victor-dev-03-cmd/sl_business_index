# EMAIL-02 — Email Marketing Studio V2 Pro Workspace

Date: 2026-11-27 (Asia/Colombo)
Branch: feat/email-studio-3col-pro-workspace-20261127
Route: /vendor/marketing-engine/email

## Owner design

Redesign original plain email draft composer to GrowthOS 3-column Pro layout:
01 Campaign & Audience (30%), 02 Live Inbox Simulator (42%), 03 AI Polish & Automation (28%).
Connected Gmail status, Brand Kit/Poster Studio integration, EN/TA/SI language controls,
device preview, local audience review and concise compliance disclosure.

## Code implemented

- Email page: fresh Supabase auth.getUser, owner-approved business list, owner-matched
  Brand Kit profiles and RLS-visible connected marketing_connections. No third-party
  lead email addresses, encrypted credentials or OAuth tokens returned in page props.
  Existing Pro layout gate remains intact.
- Responsive 30/42/28 layout, actual Gmail sender status instead of generic
  Integration planned badge, business selector and branded sender preview.
- Brand Kit name, logo, colors, address and profile URL from owned listing;
  private saved Poster Studio picker uses existing authorized GET and does not
  create publicly reachable image URLs.
- English/Tamil/Sinhala campaign editing: 4 types, subject, preheader, message,
  CTA text/HTTPS URL, editable live desktop/mobile/dark email approximation.
  Preview includes a **nonfunctional unsubscribe placeholder** (not a fake opt-out).
- Copy reviewed draft and export clearly unsendable HTML preview (footer
  explicitly says a real unsubscribe is missing).
- CRM links explain that an enquiry is not opt-in; CSV/paste audience parsing
  occurs **locally in the browser only** without storing or sending recipients.
  Declared opt-in timestamps in a CSV do not count as verified consent.
- Local rule-based subject alternatives (NOT Gemini), heuristic content
  checks (NOT a spam/deliverability score), merge-tag placeholders,
  automation **plan** switches only (no scheduled jobs), and blank telemetry
  when none is verified (no fake sent/open/click counts).
- Separate authorized optional Gmail header preview remains collapsible on
  Email page, not in minimal Gmail App Connector dialog.
- Shared module frame omits old Integration planned pill and large disclaimer
  for Email only; other pages are unchanged.

## Explicitly NOT activated

Verified recipient consent registry, suppression and working unsubscribe,
Gmail draft scope, self-test sending, bulk sending, scheduling, recurring auto
follow-up, persistent campaign library, Gemini Email Generation, real audience
personalization, deliverability metrics or Gmail quota meters. No provider send,
private-mail training, model calls, production DB migrations or new secrets
were introduced by EMAIL-02.

Production Supabase schema was inspected read-only: leads table contains
enquiry email but no verified marketing consent field; no approved marketing
email audience/subscription/bounce/suppression tables were available.
Sending would be unsafe without separately reviewed migration, RLS, consent
withdrawal, idempotency and bounded provider worker. Gmail send scope does not
by itself permit Gmail Drafts API, which needs another scope.

## Next secure implementation slices

1. Consent ledger + per-business opt-in, unsubscribe, suppression and RLS.
2. Verified sender self-test API with human click, provider quotas,
   rate limits, idempotency and audit trail.
3. Metered Gemini email copy generation with verified owner business facts,
   content validation, bounded credits and explicit review.
4. Approved provider delivery queue, sender authentication and retry/bounce.
5. Verified delivery analytics, telemetry provenance and compliance review.

## Tests / release

- tests/emailStudioProWorkspace.test.mjs for layout, real data, local parsing
  and negative sending/privacy contracts.
- Adapted tests/gmailGrowthAiPreview.test.mjs; all other OAuth and
  connected-state tests should remain green.
- Verify Next.js, TypeScript, Bun and P1/P2 CI before merge.
- Signed-in mobile/desktop visual QA and private poster access still need
  owner-side acceptance. No live delivery claim.
