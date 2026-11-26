# WA-04 — Multilingual Owner Growth Operator (review-only foundation)

**Date:** 2026-11-26 (Asia/Colombo)  
**Scope:** SLBusinessIndex GrowthOS Vendor Dashboard, existing WhatsApp Connection Lab, Plugin & App Connectors.

## Current owner request
- One GrowthOS operator per vendor, its context isolated to that vendor's own approved business.
- WhatsApp as a convenient command and approval channel; also Gmail/Email, Facebook, Instagram and future connectors.
- Native vendor-first onboarding for new sellers, no repeated trips to Meta Developer Console for ordinary sellers.
- English/Tamil/Sinhala support and *exact-action approvals* before sending emails, posting, changing listings, marketing or making money movements.
- End result to test: owner sends WhatsApp command, reviews content, receives real provider delivery confirmation.

## Facts verified before implementation
1. Live owner physical test previously showed **real Meta webhook POST HTTP 200** after WA-03F WAMID validation. It is a read-only Meta test-number callback: **no message saved, owner linked, AI invoked, or response sent**.
2. GitHub main has legacy `/vendor/marketing/whatsapp` as read-only WA-03 setup preview and `lib/growth/agent/wa01-orchestrator.mjs` synthetic-only approval manifests.
3. `marketing_connections` and `marketing_connection_secrets` tables already exist on production Supabase and have RLS. `marketing_connections` owner read currently requires verified Professional or Enterprise growth entitlement. Neither a connection row nor globally working test webhook certifies a vendor's approved WhatsApp Embedded Signup.
4. Google Mail OAuth code is **Vercel Preview only**, not live production sending. Facebook/Instagram/Outlook remain planned or research in `lib/marketing/engine-registry.ts`. No approved generic action executor or durable approved send queue.
5. The Meta official Embedded Signup path is available to Tech Providers/Solution Partners, but production multi-vendor onboarding requires verified Meta business/app, the applicable Advanced Access, permission review and vendor OAuth authorization. The screenshot earlier showed Business verification unverified. See official https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup and https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/subscribed_apps/.
6. Current WhatsApp Business Solution Terms restrict some AI-provider usage; a business-specific operational service still needs Meta policy eligibility confirmation. No unofficial WhatsApp Web automation.

## Implemented in this PR
- `lib/growth/agent/wa04-owner-operator.mjs` + exact TS declarations: deterministic EN/TA/SI command categorization (campaign/email/leads/reviews/insights); bounded input, blocks sensitive destructive/account actions, never runs external effects. Does not pretend to be an LLM.
- `POST /api/vendor/marketing/whatsapp/plan`: authenticated Supabase `auth.getUser`, same-origin guard, tiny JSON limit, owner+approved business scoped RLS query. Returns **only** proposed review actions with links to existing owned GrowthOS tools. No SQL write, service role, provider send or approval issuance.
- `GET /api/vendor/marketing/whatsapp/status`: authenticated per-owned-business connection metadata read under existing RLS, server boolean for global Meta test webhook **explicitly labeled test-only**, multi-vendor onboarding/replies/marketing all **false**. No tokens or account IDs exposed.
- `WhatsAppGrowthOperator.tsx`: orange/black/white mobile-friendly owner workspace with locale selector English/தமிழ்/සිංහල, approved business selector, request entry, proposed action preview and provider readiness. Legacy WA-03 UI remains accessible in collapsed reference details, not falsely promoted as active.
- Plugin & App Connectors WhatsApp card links to the new workspace; provider catalogue retains truthful `planned` status.
- Dedicated safety tests and WA-04 GitHub workflow, plus full existing CI checks.

## Explicitly NOT implemented / not to claim
- No Embedded Signup OAuth start/callback, no vendor credential vault/onboarding, no test/live phone binding or vendor-specific WhatsApp message replies.
- No durable approval database/outbox/idempotent executor or approval actions. A proposed action is **not** actual approval or generated poster/email.
- No actual provider send, email marketing, social publication, Meta account control, WhatsApp AI agent training or multilingual model inference.
- No migrations or production SQL applied; G0 unresolved backup/security/device gates and previous no-unapproved-migration boundaries are preserved. No Service Role used to bypass vendor RLS.
- No provider/app activation and no cost-bearing API actions.

## Follow-on implementation gates
**WA-05: vendor onboarding infrastructure**
1. Operator completes Meta Business Verification, Tech Provider/App Review and required scopes; configure official Embedded Signup product and HTTPS redirect/config ID with secret manager.
2. Add atomic owner-scoped, time-boxed OAuth/login intent, state/nonce/csrf replay protection, exchange and verify official Meta business asset token, WABA/phone ownership, encrypted vault rotation, and bidirectional revocation. Preview/staging and synthetic tenant A/B/replay tests first.
3. Versioned additive RLS SQL + rollback/restore proof, owner-signed business mapping and per-number uniqueness. No shared SLBI **test number** as multi-vendor production.
4. Verify authenticated Android/iOS/desktop Embedded Signup and provider health. Ordinary vendors authorize their own Meta account inside SLBI; each may still see Meta's legitimate consent UI.

**WA-06: agent + approvals + delivery**
1. Owner WhatsApp binding with verified send/receive consent, read-only context and a durable replay ledger. Separate provider eligibility for a WhatsApp-based AI service.
2. Trusted business-specific multilingual planner grounded on existing GrowthOS tools, knowledge snapshots, not a general-purpose assistant sold over WhatsApp.
3. Persist immutable revisioned action manifest and exact-content hashes per email/social/review/listing operation, 5-minute approval expiry and single-use nonce; require signed owner approve/edit/cancel/human handoff.
4. Implement provider-specific least-privilege OAuth/refresh, consented segment + suppression/unsubscribe for marketing, template/24-hour WhatsApp messaging restrictions, transactional queue/outbox with costs, idempotency and delivery receipts.
5. No automatic send/charge/delete/billing/verification; preserve separate explicit approvals and human override. Real success requires **provider** accepted/delivered status, not intent classification.

**WA-07: app connectors**
- Reuse approved Gmail preview contracts; separately complete Google authorization/KMS and refresh flows before production email.
- Meta Pages / Instagram Professional need per-provider approved scopes and approved account ownership. Outlook/Microsoft Graph, verified-domain email require their own consent and regulatory requirements. Never report 'connected' based on a planned registry entry.

## Verification / deployment fields
- Final PR head CI: PENDING
- Main merge commit: PENDING
- Vercel Production READY (exact merged SHA + www alias): PENDING
- Real signed-in vendor A/B + physical browser QA: NOT YET VERIFIED
- Meta Tech Provider/App Advanced Access: NOT CONFIRMED
- Vendor WhatsApp connected: NO; Global SLBI test-number webhook GET/POST already verified.
- Previously exposed Meta API Access Token & Webhook Verify Token must be revoked/rotated, then matched exactly in Meta/Vercel, without putting secret values in GitHub/chat.

## Next-chat continuation prompt
Continue SLBusinessIndex GrowthOS in Tamil. Read `docs/growth/HANDOFF_LATEST.md`, `AGENTS.md` and this WA-04 report. The user approved a full per-vendor WhatsApp/email/social GrowthOS assistant in English/Tamil/Sinhala, vendor onboarding, exact-content approvals, and minimal Meta console dependence. PR branch `feat/wa04-multilingual-owner-growth-operator-20261126` implements live authenticated read-only owner planning + multilingual status/dashboard; real Meta/test-number webhook is working HTTP 200 but is NOT an owner-linked AI responder. Verify all exact-head CI/tests, merge only all green, Vercel READY exact commit alias and report limits precisely. Then design WA-05 official Meta Embedded Signup and durable per-vendor RLS/linking without ignoring Meta Tech Provider/AI eligibility gates, consent, suppression or G0 production migration guard. Never call mock owner plan a live WhatsApp reply, and never ask to paste credentials.
