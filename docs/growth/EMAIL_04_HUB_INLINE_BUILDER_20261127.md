# EMAIL-04 — World-Class SaaS Email Hub + Full-Screen Visual Builder

**Date:** 2026-11-27 (Asia/Colombo)
**Branch:** `feat/email-worldclass-hub-inline-editor-20261127`
**Target:** `/vendor/marketing-engine/email`
**Scope:** Safe client-side UX rearchitecture. No production schema migration, recipient migration, provider sending activation, Google permission change, budget increase or auto-action.

## What changed

- Vendor first sees clean **Campaigns, Audience & Lists, Templates, Automations** tabbed Hub (one actionable connection banner only if selected business has no verified Gmail connection).
- Campaigns: top-level KPI placeholders show **—** until genuine delivery-event telemetry exists, never fabricated values. Confirmed subscriber counts are read from actual owner-RLS confirmed/unrevoked consent ledger *only when deployed*; missing ledger leaves count unknown. Real local browser drafts are shown in a searchable list, with continue editing and delete. They are plainly labelled **Browser draft**.
- New Campaign (or Use Template) opens an independent **full-screen focus-mode** React portal that visually covers the dashboard sidebar and site header. Desktop/mobile/dark previews; back/save/review top actions; left sender, verified audience, layout, language/campaign type; center live interactive email card; right block palette, reorder controls, saved poster selection, approved Brand Kit controls and QA-only Gemini.
- The canvas offers editable Subject, Preheader, Heading, Body, Offer Grid, and CTA label directly in the preview via accessible **plain-text-only contentEditable** (pasted HTML not accepted). Editable blocks support drag-and-drop reorder and explicit Move Up/Down buttons for keyboard and mobile.
- Six blocks: heading, text, private saved poster preview, CTA button, 2-offer grid, divider. Brand Kit logo renders as a round image next to the business name; font scale slider and CTA color picker can be saved. Custom HTML template uses the prior sandbox/CSP isolated iframe, with local source editing; it is **not** sent to any recipient.
- Sender status is sourced from authenticated owner-approved business `marketing_connections`; connected business selected by default. No more fake `No sender connected` when another owned business has an authorized connection. Optional restricted Gmail Inbox preview appears collapsed inside Audience only if independently permitted.
- Audience & Lists: only verified aggregate subscriber count, honest unknown unsubscribe count; links to actual Leads CRM; **CSV and paste previews are browser-local** and never turn customer emails into marketing subscriber permission. No public lead PII copied into Hub props.
- Automations: useful launchable design starters (welcome, follow-up, festival); links to existing Marketing Automations for configuration. No fake active workflows or scheduling engine.
- Gemini AI appears only when current owner is verified as internal QA **and** billing/provider env flags are genuinely enabled; inherits prior strict `/api/marketing/email/generate` owner, brand, language, CTA, shared credit and refund checks. No use of real Gmail/recipient data for training or generation.
- Prior Email V3 composer left in repository for migration safety, but no longer routed on the email page. Existing read-only SQL candidate and disabled public opt-in are unchanged.

## Release boundaries

**Gmail connection DOES NOT unlock bulk sending by itself.** Only saving designs is operational. The Send review sheet shows accurate sender, confirmed subscriber and infrastructure readiness; no `gmail.send`, `messages/send`, unverified recipient uploads, fake open/click counters, automatic schedule, database migration, nonconsensual marketing or disabled buttons deceptively labelled "Send now".

The proposed Custom Domain / Resend / SES / Postmark integration is **not implemented in this release**. It requires verified SPF/DKIM/DMARC, unsubscribe, suppression, bounce/webhook handling, quotas, opt-in, provider billing, authoritative worker idempotency and user consent. No claims of a numeric fixed Gmail daily limit or perfectly accurate open tracking: privacy, clients and provider constraints affect reporting.

Browser-local drafts intentionally exclude recipient emails and sender tokens, use owner-UUID-keyed localStorage namespaces and strict validation on read. No cross-device/server synchronization is claimed. Shared devices require manual browser storage clearing. Next phase: audited owner-RLS server-backed draft repository with automated migration from local drafts only with explicit approval.

## Verification

- New `tests/emailMarketingV4Hub.test.mjs`: four tabs, portal, inline text/no-HTML paste, blocks/reordering, local draft owner-isolation, no synthetic analytics, Canva-style styling, CMS and Gemini gates.
- Existing `tests/emailStudioV3.test.mjs`, `tests/emailStudioProWorkspace.test.mjs`, Gmail production security and all Next.js/Bun workflows run unchanged.
- UI smoke testing should include Vercel signed-in Pro owner, multi-business sender switching, 360px Android/Apple browser layout, keyboard accessibility, dark preview, cookie/session persistence and draft restoration.
- Handoff updates: `docs/growth/HANDOFF_LATEST.md`.

**Next production roadmap:** Server-saved private draft history, consent confirmation + unsubscribe/suppression, verified domain transactional/marketing delivery provider, signed event webhooks and truthful per-campaign analytics, audited scheduled sending/automation, real-world vendor acceptance tests. Do not activate send CTA before corresponding end-to-end protections pass.
