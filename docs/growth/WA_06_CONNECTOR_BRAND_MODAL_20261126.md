# WA-06 — Connector brand logos, centered setup modal, WhatsApp onboarding UI

**Date:** 2026-11-26 · **Scope:** Plugin & App Connectors only. Gmail provider activation intentionally deferred to the next owner-approved milestone.

## Owner request
All twelve connector cards should use recognizable original service logos where available. Clicking any card (especially WhatsApp) should open one clean popup **in the center** showing instructions and the connection workflow. WhatsApp should offer phone-number and QR methods, followed by a test-message area after secure onboarding. Facebook, Gmail and other providers should use the same popup design. Owner has not yet received Meta provider approval.

## Source and live readiness verified
- Inspected current `ConnectorGrid`, `WhatsAppConnectorSetup` predecessor, 12-entry `MARKETING_CONNECTORS`, Google OAuth Preview and sandbox webhook.
- Production Supabase **SELECT only**: `marketing_connections` currently has **zero records** (grouped provider/status). Existing encrypted credential schema cannot be presumed ready for vendor WhatsApp; no Meta connection is currently verified.
- Meta official guidance specifies **Embedded Signup** and verified WhatsApp Business number for Tech Providers. Coexistence QR is provided by **Meta in eligible WhatsApp Business App onboarding**; a generic WhatsApp Web QR is not Cloud API authorization. Normal Meta verification may use phone SMS/voice code. Meta Tech Provider/App Review and per-vendor asset linking remain blocked. Outside eligible conversation windows business-initiated test messages may require an approved template.
- Existing SLBI sandbox test webhook validates the **test number only**; cannot be reused to impersonate a vendor phone number. The test webhook and existing Gmail Preview are unchanged.

## Implemented
1. Nine locally bundled recognisable **service-brand SVG icons** for WhatsApp, Facebook, Instagram, Messenger, Gmail, Outlook, LinkedIn, YouTube and TikTok, plus **neutral MailCheck/PhoneCall** for non-branded verified email and voice. Instagram DM reuses Instagram. Assets sourced unchanged from Terence Eden's SuperTinyIcons (MIT); see `public/connector-icons/LICENSE.txt`.
2. Responsive 12-provider tiles with brand icons, descriptions and **same accessible Radix centered popup**. Focus containment, keyboard Escape, close button, mobile scrolling and quiet dark overlay. No route switching away from Connectors, no AI prompt.
3. WhatsApp modal contains approved owned-business selector, **Phone number / QR method** tabs, E.164 validation, authorization declaration, Meta-hosted SMS/voice/QR explanations, provider readiness messages, and a test-recipient + consent + test-message area.
4. `POST /api/vendor/marketing/whatsapp/onboarding/start` verifies same-origin, bounded JSON, valid E.164/QR selection, Supabase `auth.getUser()`, RLS and exact owned approved business. Returns **503 meta_approval_pending**, does **not** link/store a number, issue an OTP or falsely report success. After Meta approval, a **new audited** Embedded Signup callback/session must replace this fail-closed gate, including one-time state and token vault.
5. `POST /api/vendor/marketing/whatsapp/test-message` validates same-origin, owner and approved business, intended recipient format and explicit consent; returns **503 vendor_test_messaging_not_approved / messageSent:false**, never dispatches a message. UI test send remains disabled until **server-side verified vendor linking plus messaging clearance**; no fabricated delivery receipt.
6. Existing Preview-only Google OAuth panel remains inside Gmail popup if configured on the genuine Preview environment; Gmail live OAuth activation expressly deferred. Facebook/Instagram/Outlook and others share requirements-only popup until their provider OAuth approval/integration.

## Important: what is NOT completed
- **No real WhatsApp vendor number connection** or QR is available: Meta authorization pending and no vendor token vault or verified WABA/phone binding. A working vendor onboarding flow cannot be achieved solely by a phone input and UI QR. No actual test message was sent.
- No provider credentials, sample numbers, session tokens or recipient numbers are stored by new code. No production SQL/DDL, service-role credentials, privilege change, wallet or subscription override, publishing, AI replies or background sending. Existing owner-specific 12-tool access remains unchanged.
- No claims of QR-based WhatsApp Web automation; only official Meta coexistence process when eligible and approved.
- Production UI may now be ready to test visually, but **real signed-in Android/iOS/desktop acceptance remains pending** until owner checks.

## Upcoming gated WhatsApp backend work (after Meta Tech Provider approval)
Secure one-time onboarding state tied to authenticated owner + approved business, Meta SDK Embedded Signup launch + callback verification, verified WABA ID and phone number ID, token exchange + protected KMS vault, WhatsApp webhook subscription/phone-specific signature and ownership guards, anti-replay and deduplication, disconnection/revocation, recipient opt-in/approved template validation, idempotent test send and genuine provider receipt, abuse/rate controls and A/B owner tests. Requires separate implementation, testing and production authorization; do not flip a frontend flag to simulate connected.

## Tests and release checklist
- SVG assets valid, bundled and attributed.
- Dedicated `tests/wa06BrandedConnectorModal.test.mjs` checks modal, logos, validated onboarding and strict no-send policies.
- Updated legacy tests that previously asserted WhatsApp navigates away.
- **Exact PR-head full CI:** pending
- **Squash main merge:** pending
- **Vercel Production READY exact merged SHA + www alias:** pending
- **Real authenticated UI/device QA:** pending

## Next chat prompt
Continue SLBusinessIndex GrowthOS in Tamil. Read GitHub main `docs/growth/HANDOFF_LATEST.md` and `docs/growth/WA_06_CONNECTOR_BRAND_MODAL_20261126.md`. WA-06 changes ONLY Plugin & App Connectors: original colorful locally bundled brand icons on all 12 cards, centered Radix setup modal, WhatsApp phone/official coexistence QR instructions, owned-business selector and test recipient with consent, plus 2 strict authenticated endpoint gates. Official vendor WhatsApp Embedded Signup and actual test send are **NOT YET LIVE** because Meta Tech Provider approval, verified vendor account binding and secret vault are missing. Existing sandbox webhook and Google Preview are unchanged. Verify exact-head CI, fix and merge if green, confirm Vercel READY + www alias, and require real signed-in mobile/desktop QA. Owner wants Gmail Google Cloud OAuth setup in the next independent run — **do not start it inside WA-06**. Preserve G0 blockers, no unapproved SQL, strict owner RLS, no fake QR/connected/sent claims. Always update HANDOFF_LATEST in the same PR.
