# WA-05A — Growth Operator understandable preview and email onboarding boundary

**Date:** 2026-11-26 (Asia/Colombo)
**Owner request:** The Vendor GrowthOS "Prepare review plan" only displayed generic tool links, leaving users confused about poster/email/call agent/automation outputs. Owner requested exact Email Marketing onboarding steps.

## Source audit
- The existing authenticated POST /api/vendor/marketing/whatsapp/plan accepts a bounded request and owned approved business; returns deterministic WA-04 and ML-07 link proposals only, never content, OAuth tokens, an executed action or model inference.
- UI displayed "Proposed actions · not executed" with generic "Open tool to review" links and did not transfer drafts to tools.
- Email Marketing is planned in lib/marketing/studio-apps.ts and lib/marketing/engine-registry.ts; existing Gmail OAuth work is Preview-only. Meta sandbox webhook is NOT a per-vendor live WhatsApp account.

## Implemented in this branch
- New app/vendor/marketing/components/OwnerPlanPreview.tsx: concrete, multilingual EN/TA/SI **static illustrative** previews for matched intents: poster copy layout, caption, email subject/body, call-agent greeting/human handoff, consent-gated automation flow, campaign brief and social draft. Unknown offer details remain visibly unfilled.
- Renders the original owner instruction, owner-scoped selected business display name, numbered previews, a Copy Example control with failure feedback, links to the actual tool, and explicit disclosure that opening the tool DOES NOT transfer the brief/draft.
- Replaces the confusing generic plan list in WhatsAppGrowthOperator with preview cards, scrolls to result respecting reduced-motion preference, auto-detects Tamil/Sinhala request language unless language is manually pinned, and keeps responsive layout.
- Corrects misleading email chip from "connect and review" to "not connected" in three languages. Shows connector catalogue shortcut and sending requirements.
- No change to auth, owner RLS, API, entitlements, Meta webhook, actual model inference, external calls, email sending, saved campaign, SQL or provider credentials.

## Limits
This is an illustrative working preview, NOT an AI-generated image, actual completed draft, persisted campaign, populated destination tool, connected mailbox, provider send, scheduled job or verified delivery. Recipient email requires opt-in, suppression, unsubscribe, authenticated sender and specific owner approval. Do not describe a provider catalogue link as real OAuth.

## Email Marketing Automation owner checklist
A. For scalable opt-in promotional email: decide a sending domain/subdomain and appropriate sender address; select a legitimate email delivery service provider; add the EXACT DNS records the chosen provider issues for SPF/DKIM and configure DMARC; verify domain. Set up unsubscribe endpoint, opt-in provenance, suppression, bounce/complaint hooks, volume limits and test recipients. All provider secrets must be encrypted and server-only, never shown in public screenshots/chat.
B. For a vendor Gmail mailbox: independently create an owned Google Cloud project, enable Gmail API, configure OAuth Branding/consent, verified domains/privacy policy, test users for testing, then use exact redirect URI of a **future implemented** callback, never a guessed URL. Request minimum necessary scopes (gmail.send for sending only, not all-mail); complete any required Google verification for production. Vendor authorization must use account-bound encrypted OAuth credential storage and revocation. Current prototype is Preview-only, not production-ready.
C. Developer follow-up is actual provider implementation, owner-account OAuth state/PKCE/replay security, token vault, A/B tenant isolation, unsubscribe/consent ledger, durable approval/outbox, provider delivery receipts, tests and a gated rollout. These are NOT completed.

## Release gates
- PR and head CI: pending
- Main merge: pending
- Vercel READY exact merged SHA and www alias: pending
- Real authenticated desktop/mobile tests: pending
- No paid resources or production migrations

## Next-chat continuation prompt
Continue SLBusinessIndex GrowthOS in Tamil. Read GitHub main docs/growth/HANDOFF_LATEST.md, AGENTS.md and docs/growth/WA_05A_OWNER_PLAN_PREVIEW_EMAIL_HANDOFF_20261126.md. Owner wants a clear actual review experience because the old plan displayed generic links only, plus an Email Marketing Automation connection path. The branch fix/wa05-owner-plan-clarity-20261126 adds multilingual copyable illustrative previews only, no LLM/artwork/provider sends. Verify all exact-head CI, merge only green, confirm exact Vercel READY SHA/www alias and physically test logged-in mobile/desktop. Next design staging-only owner-scoped persistent content drafts/real model grounding, explicit draft transfer, and consented Gmail/verified-domain ESP OAuth under independent approval; preserve Meta sandbox, G0 blockers, current entitlement, RLS and no unapproved SQL. Update HANDOFF_LATEST with each PR.
