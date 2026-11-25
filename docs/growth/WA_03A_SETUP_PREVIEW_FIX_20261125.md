# WA-03A — Secure Setup Preview Button UX Fix (2026-11-25)

## User-reported observation
On the live vendor dashboard WA-03 WhatsApp Connection Lab, clicking **Preview secure setup flow** appeared to do nothing (owner screenshot). The owner wondered whether an existing or verified WhatsApp Business account was required.

## Root cause
The original button only called `setDemo(true)`, revealing a **different visual demonstration below the fold**. It neither expanded anything next to the button nor scrolled into view. A normal desktop viewport gave no immediate visible feedback. This is a UI behavior bug, **NOT** a WhatsApp identity verification requirement.

## Implemented behavior
`app/vendor/marketing/components/WhatsAppConnectionLab.tsx` now has an independent accessible **setup preview** state:
- Clicking the orange button expands an inline region immediately under the button; label changes to **Close setup preview**, `aria-expanded` and `aria-controls` reflect state.
- Four clearly described steps: current SLBI-owned business, Meta WhatsApp Business Platform eligibility, future signed one-time linking, and future exact vendor AI approvals.
- **Previous / Next preview step / Finish demo** work locally, with aria-live description updates. Changing business resets both demos; the separate sample marketing workflow stays intact.
- Explains that a regular WhatsApp Business app account does not by itself establish WhatsApp Cloud API eligibility.
- Clearly identifies **Demo only · Not connected** and repeats that no verification code/Meta account or outbound message is created.

## Security and honest scope
No network requests, POST, Meta Embedded Signup, account linking, OAuth tokens, webhook, real WhatsApp test, signed-in browser automation, DB updates, customer data, AI inference, image creation, or marketing send was introduced. This fixes the confusion and visible feedback; it **does not activate official WhatsApp**. Live onboarding still requires Meta eligibility confirmation for Sri Lankan AI-provider workflows, approved WABA and registered number, true owner+business RLS, durable replay/consent/outbox and reviewed provider scopes.

## Acceptance
Check desktop and mobile: click preview -> inline step 1 visible immediately -> Next/Previous reach all 4 steps -> Finish closes. No real WhatsApp account needed. Choose another business -> reset. Separate **Show sample workflow** remains functional below. Authenticated business selection is server filtered by owner_id; signed-in cross-owner acceptance remains manual.

## Continuation next-chat prompt
Continue SLBusinessIndex GrowthOS in Tamil. FIRST read full GitHub main `docs/growth/HANDOFF_LATEST.md`, `docs/growth/WA_03A_SETUP_PREVIEW_FIX_20261125.md`, `docs/growth/NEUROGROWTH_WA03_WHATSAPP_CONNECTION_LAB_20261125.md`, `docs/growth/NEUROGROWTH_WHATSAPP_VENDOR_AGENT_NORTH_STAR_20261125.md` and `AGENTS.md`. Repo `Victor-dev-03-cmd/sl_business_index`, website `https://www.slbusinessindex.com/vendor/marketing/whatsapp`. Owner reported click of Preview secure setup flow appeared inert on live page. Root cause: button previously set state for a visual demo below fold. WA-03A fixes by expanding immediately visible accessible 4-step inline walkthrough directly below button with Next/Previous/Finish and explicit Not connected; no WhatsApp account verification is needed for DEMO. Keep direct Marketing Studio link and existing WhatsApp connector card; no real Meta API number/account is connected yet, and official provider AI eligibility for Sri Lanka remains unconfirmed. For code release require exact-head full CI, merge only pass, Vercel production READY with exact merged SHA and www alias; post actual release receipt on PR. Manual vendor desktop/Android/iOS click acceptance remains to be performed. Future WA-03B is separately approved verified Meta official onboarding, owner-linked account+RLS/nonce, signed webhook, and permitted sandbox messaging; only then WA-04 real marketing previews and human-approved dispatch. Do not start live WhatsApp/PII transfers to model training or autonomous billing/security/deletion. Update handoff in same PR.
