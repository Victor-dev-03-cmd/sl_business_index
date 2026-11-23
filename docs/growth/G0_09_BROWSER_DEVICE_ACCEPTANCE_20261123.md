# G0-09 — Browser Engine Acceptance and Release Hold (2026-11-23)

Status: CI candidate only; **no production DB migration or G0 acceptance**.

## Context
- PR #152 synthetic Supabase Auth JWT + PostgREST integration 6/6 CI PASS, merged \`00b223f\`.
- PR #153 encrypted external media copy safety helper, verified synthetic tests, SQL read-only preflight 6/6 PASS; 5/5 CI merged \`33f3b518\`.
- Latest handoff main \`94afb8f907c09a1c8a72cc92d492c9c851b7873a\`. Real owner-provided encrypted DB archive was isolated-restored and tested; no physical separate copy/fresh independent password yet.
- Owner PC can be off; G0 browser QA uses isolated GitHub runner and fake Supabase placeholder host. No live records, session cookies, OAuth/provider calls or Vercel Preview.

## G0-09 candidate implementation
- \`tests/g0/browser/playwright.config.mjs\`: Playwright 1.65.1, Android Pixel 7 Chromium, iPhone 13 WebKit and desktop Chromium contexts; fully local Next.js app served on 127.0.0.1:3098. External network requests blocked from browser; no media artifacts persisted; service workers blocked. Browser emulation does **not** equal a physical Android/iPhone device or native Safari/Chrome.
- \`tests/g0/browser/auth-and-navigation.spec.mjs\`: anonymous protected vendor/admin/registration redirect and safe next path; visible sign-in options; local email form input and show/hide password; mobile overflow <=2 CSS pixels; signup/email/sign-in link navigation. Never submit a real account/password.
- \`.github/workflows/g0-browser-acceptance.yml\`: only PRs editing these QA files (or manual dispatch), pinned Playwright browser container, dummy Supabase URL/key; no production DB or SaaS dependency. No persistent npm application dependency change. Candidate CI results pending.

## Remaining acceptance
1. Physical Android Chrome/iOS Safari and desktop browser authenticated owner A/B/admin manual tests, real Google/passkey/email, Turnstile and session persistence with redacted screenshots or statuses (no tokens).
2. Fresh owner AES256 backup with independent GPG passphrase and actual restored archive, verified independent encrypted external drive copy (tools from G0-08), no archive in repo or chat.
3. Exactly approved separate Lead/Review migration bodies, documented rollback/maintenance window, owner final decision, live preflight immediately before release; wallet refund financial decision separate. No paid Supabase branch/preview without permission.
4. Master G0 release gates still unchecked; G1 remains held.

## Next chat prompt
\`\`\`text
Continue SLBusinessIndex GrowthOS G0 in Tamil. Repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_09_BROWSER_DEVICE_ACCEPTANCE_20261123.md, G0_08_RELEASE_SAFETY_AND_BACKUP_COPY_20261123.md, GROWTH_ENGINE_RELEASE_CHECKLIST.md. PR #152 real JWT/PostgREST PASS merged 00b223f. PR #153 secure external backup-copy checker + live read-only 6/6 PASS merged 33f3b518, docs head 94afb8f. Next G0-09 browser-emulation candidate tests Playwright 1.65.1 against *local* Next.js fake backend in Android Chromium, iOS WebKit, desktop Chromium; CI must be checked, fix if needed, merge only when green. User PC off, do not request restart unless fresh backup operator step. Real physical devices/auth Google/Turnstile/provider and owner A/B/Admin acceptance remain pending. Fresh separately encrypted backup/copy and scoped release signoff still required. No production database migration, no wallets, no paid resources, no real keys/PII. Keep 0/10 master gates unchecked. Update repo handoff/checklist and copyable next-chat prompt each milestone.
\`\`\`
