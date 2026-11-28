# Email V6 — Provider-independent suppression registry (2026-11-28)

## SaaS audit: evidence-driven scope
- V5 #233 was merged and deployed READY: isolated server-synced campaign drafts, RLS, revision history.
- V4 editor is a branded visual canvas with reusable layouts but **not** a marketing sending platform yet.
- The V3 enquiry opt-in SQL is **review-only**, not a confirmed-subscriber onboarding workflow.
- Current absence of approved bulk provider, confirmed recipient verification, and sender/domain validation means sending, scheduling and delivery reports remain locked.

## Contemporary platform research
- Mailchimp: audience segments and marketing dashboards separated from campaigns, and only subscribed contacts are eligible for marketing sends.
- Brevo: distinguishes promotional campaigns vs transactional mail, and reports across campaign and automation.
- Klaviyo: campaigns differ from flows, and flows re-evaluate profile filters near send time; templates and segments are reusable.
- Resend: contact topics, broadcasts, provider-native unsubscribes and separate marketing analytics.

Official feature references:
- https://mailchimp.com/help/create-and-send-to-a-segment/
- https://mailchimp.com/help/getting-started-reports/
- https://help.brevo.com/hc/en-us/articles/360021196220-What-are-the-differences-between-marketing-transactional-and-automation-emails
- https://help.klaviyo.com/hc/en-us/articles/115002774932
- https://resend.com/products/marketing-emails
- https://resend.com/blog/unsubscribe-topics

## Delivered V6 slice
- New independent `marketing_email_suppressions` table SQL candidate: per-business unique normalized email, owner RLS, approved-business owner INSERT, owner-only SELECT, no UPDATE or DELETE grants, no anon grants, FK indexes.
- `GET/POST /api/marketing/email/suppressions`: Pro/owner authorization, origin and JSON validation, input-size/format limits, bounded response, no send/recipient import/secret exposure.
- Audience tab shows real owner-scoped manual exclusions, adds one after confirmation and never claims that a CSV or CRM lead constitutes confirmed opt-in.
- If schema is not applied or API is unavailable, UI refuses to write and shows unavailable status instead of a fabricated zero.
- V6 regression tests included in Verify Next.js CI.

## Important deliverability boundaries
A manual exclusion is not the same as an authenticated unsubscribe. Marketing sends must, at send-time, block anyone in: (1) current verified-and-unrevoked opt-ins, (2) manual suppression registry, (3) provider-native unsubscribe/complaint/bounce lists; they must also check verified sender, rate/quotas, message idempotency and a functioning unsubscribe URL. No sending endpoint exists at V6.

## Provider-later planned stages (not shipped)
1. Secure double-opt-in: one-time recipient proof, expiring signed token, audit/withdrawal, no legacy CRM backfill, independent transactional verification channel.
2. Subscriber CRM with compliant import evidence, tags/segments, per-business RLS, consent state transitions, suppression on unsubscribe and deletion/retention workflow.
3. Provider-adapter interface (Resend/SES/other user-approved), verified sending domain DNS, warmup, rate-limited worker, idempotent outbox and retry dead-letter.
4. Marketing events signed webhook processing, durable delivery/bounce/open/click counters with privacy-safe behavior, segment-aware analytics.
5. Active automations only after verified triggers, re-check eligibility at execution, timezone-aware scheduling and billing-metered quotas.

**No live provider activation, consent migration, email delivery, or user data model training in V6.**

## Release gate
- Exact-head GitHub CI includes the new V6 contract test, legacy V3/V4/V5 and build.
- Review additive DDL and database permission checks.
- Apply migration only after verifying expected Supabase project and security checks; keep both applied SQL in tracked `supabase/migrations` and handoff.
- Confirm production deployment READY and alias; do not claim owner-signed-in UI acceptance without actual testing.
