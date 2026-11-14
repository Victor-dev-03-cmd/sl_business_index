# P2-06 — Marketing Studio app #10 Content Calendar

**Implementation staging checkpoint:** 2026-11-14  
**Owner direction:** Work on #10 while awaiting BOC merchant QR branch appointment; minimize Vercel Preview deployments.

## App identity
- App #10 of 12 in \`lib/marketing/studio-apps.ts\`: \`content-calendar\`, public Studio card remains **Coming Soon**.
- Route: \`/vendor/marketing-engine/calendar\`, behind \`(pro)/layout.tsx\` verified Pro/Enterprise guard.
- Registry release flag in live Supabase \`marketing_studio_app_rollouts\`: \`coming_soon\`; no promotion until full E2E approval.

## Implemented in candidate source (not deployed)
- Replaces explanatory stub with server-rendered Supabase Auth + owner-scoped real campaign queries.
- Calendar month navigation with query parameter (server bounds validation), 42-day Monday-first grid with desktop event pills and mobile counts.
- Explicit Asia/Colombo timezone normalization, including date boundaries at UTC+05:30; desktop/mobile month grid and day-detail pane.
- Filter by owned business, search campaign text/status/channel, select date to see time-labelled records.
- Upcoming planned records, unscheduled drafts, metrics, empty/error states, prominent link to existing campaign editor.
- Individual \`status='posted'\` records are labelled \`Marked posted (unverified)\`, NOT actual published provider receipts.
- Data queries bind \`businesses.owner_id\` to validated SSR user; \`marketing_campaigns.business_id\` bound to selected owned businesses; Supabase RLS also applies.
- NO new SQL, NO provider call, NO mail/social send, NO new write path, NO queues, NO AI charges. Original Basic campaign editor and owner records unchanged.
- Queries capped (1000 dated records in visible six-week grid + 50 undated drafts); clear cap warning in UI.

## Verification gates
- New pure \`lib/marketing/calendar-model.ts\` and \`tests/p2ContentCalendar.test.mjs\`: verify November 2026 six-week bounds, Colombo midnight shift, previous/next month, invalid month input, owner-bound read-only SSR route, Pro layout and honest publish labels.
- Added Node tests to \`.github/workflows/p2-marketing-brand-foundation.yml\` contractual job; Next optimized build must pass at exact source SHA.
- Still pending: GitHub branch/PR exact-SHA jobs, real signed-in Chromium Basic/Pro/owner-A/B checks, performance/accessibility checks, billing entitlement issuance, separate P2-05 production campaign policy security hardening.
- Do NOT set \`content-calendar\` to \`preview\` or \`live\` before these gates. All 12 Studio cards stay Coming Soon.

## Related Billing / BOC QR
- Owner chose **BOC Merchant LankaQR + Payments.lk only**, no WEBXPAY. Owner is visiting BOC branch Monday 2026-11-16 because BOC SmartPay Enroll repeatedly did nothing.
- Merchant QR has NOT been supplied/approved. Detached reviewed billing integration candidate \`371857bf402e342aec439517976b0946fae81166\` exists but is **not on main** or deployed; do not display personal P2P QR.
- Payments.lk merchant API/verified webhook/ledger settlement E2E not active.
- Admin Billing redesign and new plan prices await owner decisions.

## Future chat entrypoint
- **Living development tracker:** https://github.com/Victor-dev-03-cmd/sl_business_index/issues/74
- First verify fresh GitHub \`main\` SHA, this issue, latest CI and deployment target. Do not blindly merge old PRs.
- Release sequence: review #10 source and test; close P2-05 campaign write/status policy; obtain verified Pro test account; staged CI & browser acceptance; one controlled deployment; only then review live marketplace flag.
- Continue apps progressively: user aims for all 12 apps genuinely live, not just visually unlocked.
