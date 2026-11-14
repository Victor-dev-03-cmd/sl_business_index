# Marketing Studio — twelve first-party app execution plan
Updated 2026-11-14 | Asia/Colombo | **Canonical source: GitHub main**

## Owner decisions (carry to every future chat)
- Complete all **12 Marketing Studio apps** one by one (ten Pro entries, two existing Basic entries); ultimately release only after each app passes real production gates. Marketing first, Growth next, SEO last; protect the working Discovery Engine.
- The 12 Bento Dashboard/Marketing Studio tiles are an **app launcher**, not an installation marketplace. Keep **all 12 `coming_soon`** while unverified. Existing Basic Campaign Planner and Leads CRM keep their direct working pages.
- **Avoid repeated Vercel Preview deploys** due to daily quota: source/static/CI tests first; aggregate one reviewed release. Do not treat staging, CI, or a ready preview as proof of provider activation.
- Keep GitHub `AGENTS.md`, the master handoff, P2 live ledger and **this file** synchronized when *working in a chat*. Do not claim autonomous updates between chats.
- Payments restricted to **BOC merchant LankaQR (SmartPay/Flex/branch)** plus **Payments.lk**. WEBXPAY rejected. QR not yet delivered; SmartPay enrollment button unresponsive after three attempts; BOC hotline suggested branch. Owner plans Monday **2026-11-16** visit. Merchant vs P2P approval and BOC account settlement must be verified. No payment gateway production checkout, no auto payment recognition; Admin billing/pricing redesign deferred.

## Verified environment as of this entry
- Supabase production project `oofxhragafekazwjikae`: migration `20261114104216 p2_marketing_global_foundation_coming_soon_v1` applied; app rollout rows **12/12 Coming Soon**, 5 RLS-protected foundation tables. No verified Pro entitlements, OAuth provider connections, managed KMS, outbound messaging or paid AI consumption.
- One legacy `marketing_campaigns.status='posted'` historical row cannot prove provider publication. P2-05 owner ALL-policy fix is **NOT** applied. Protect manual Basic `drafted` / `scheduled` writes during migration.
- Latest existing production before documentation update: `92e8d0893966b5e8cc008f7bf00648c7830f1673`, Vercel READY `dpl_BxuFKh4x8UBUYsKpyjmMcfJi4esM`. Current GitHub head is newer documentation-only `7020bcf423b1b4214d55c42bab12fdbc77dc7e8b`; recheck latest deployment status, do not assume code changed.
- **Staged Billing** detached non-branch commit `371857bf402e342aec439517976b0946fae81166`. Has QR merchant-flag and server-confirmed-awaiting-payment quote gate, plus Payments.lk *sandbox adapter only*. Not merged, not compiled/CI/E2E, not live.
- **Staged App #10 Content Calendar** detached non-branch commit `de258220fcb8ceda73efeff2c161dd77f39b3dca` (already in AGENTS/main): real signed-in owner-scoped campaign dates, month navigation, business filters, Lanka timezone, planning-only labels. Not merged/CI/E2E/live. An **alternate** detached implementation `ed4fbeac5f2517254a173cb62508d8495f664976` exists; **do not stack both** (both replace calendar/page.tsx); choose one after review; existing canonical preference is `de258220` because it is already referenced on main. Neither creates publishing jobs.
- No new Vercel preview was intentionally created while staging those code changes.

## Exact 12-app production journey
| # | app_id | Tier | Current functionality | Next mandatory release work |
|---|---|---|---|---|
| 1 | `campaign-planner` | Basic | Existing manual copy/drafts/PNG planning | P2-05 spoofed posted policy, owner A/B regression and browser E2E |
| 2 | `poster-editor` | Pro | Existing local editor/export | Owner/session E2E, PNG/export integrity, accessibility; cloud save later |
| 3 | `caption-lab` | Pro | Caption generation shell/gated APIs | Verified billing & capped credit reservation, Sinhala/Tamil evaluation, model budget |
| 4 | `brand-kit` | Pro | Working UI/API; live `social_brand_profiles` schema | Real authorized Pro test user, owner A/B persisted save/read, logo/storage audit |
| 5 | `social-marketing` | Pro | Planning UI & provider list | Official Meta scopes/page authorization, KMS, consent, verified provider receipts |
| 6 | `email-marketing` | Pro | Shell only; sending OFF | Official Google/Microsoft consents, domain validation, suppressions/unsubscribe, receipts |
| 7 | `voice-agent` | Pro | Offline rules-first demo | Approved inbound provider, consent, human takeover, telephony tests |
| 8 | `workflow-automation` | Pro | Shell/rule preview | Durable queue, retries, leases, idempotency, human approval and cost limits |
| 9 | `plugin-connectors` | Pro | OAuth schema + preview-only Google flow | Real OAuth test-account, managed KMS, refresh, remote revoke, provider audit |
| 10 | `content-calendar` | Pro | Informational page live; true read-only grid staged | Merge ONE staged source after CI; owner A/B; never equate planning date with scheduled job |
| 11 | `leads-workspace` | Pro | Existing CRM bridge shell | Owner scoped lead reads, audited follow-ups, no unconsented messages |
| 12 | `leads-crm` | Basic | Existing manual vendor CRM works | Regression, pagination/tenant tests, maintain direct Basic access |

## Work sequence for next coding session
1. Read `AGENTS.md`, `docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md`, `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md`, this file, and `docs/growth/p2/P2_MARKETING_ROLLOUT_RUNBOOK_20261114.md`. Verify latest GitHub main SHA, Supabase applied migrations, rollout flags, Vercel environment. Source truth is **live evidence**, not historic branch descriptions.
2. Audit the staged **Content Calendar** implementations and choose one; test via Node/TypeScript/Next and real auth owner A/B, mobile/desktop, before merge. Keep read-only calendar and all rollout flags Coming Soon.
3. Production-safe **P2-05 forged campaign status**: prepare a versioned migration from `P2_05_CAMPAIGN_REVISIONS_STAGING_ONLY.sql`; test on disposable PostgreSQL 17, Basic draft/schedule continuity, one legacy posted row, cross-owner denial, service-only trusted status transition. Apply live only after approved evidence.
4. Close verified **Pro billing entitlement** issuance, verify paid receipts and back-end gates. Old invoices show only zero-value Basic records; they are NOT paid Pro access. Link Marketing unlocks exclusively to independently verified payments.
5. Complete Pro-only Brand Kit real database E2E, Poster local browser E2E, then Calendar; follow with caption/lead workflows and more expensive third-party connectors by individual consent/approval. Never activate external messaging, posting, calls or paid model jobs before provider-scoped approval.
6. For each app: code → unit/RLS/security/tenant tests → exact SHA CI → one deliberate deployment → real authenticated browser E2E → rollout flag `coming_soon` → `preview` → `live` only after product sign-off; rollback individual flag and outgoing jobs. No fake "live" claims.
7. Add an evidence-rich GitHub handoff entry after each actual completed milestone (SHA, files, DB change, CI, Vercel status, provider state, blocked items, exact next step). This is not a promise to work when no chat is running.

## Merchant QR and Payments.lk next steps
Owner supplies **approved merchant BOC LankaQR PNG/JPG/WebP** to the chat after bank onboarding, not any P2P/person-to-person QR. Never request/share OTP, bank app password, bank secrets, card data, unredacted account details. Static QR is payment instruction only, never success proof; reconcile bank settlement independently. Payments.lk merchant API contract and signed webhook remain unverified, so keep live checkout disabled. No requirement to redesign Admin Dashboard or billing presentation yet.

## Next chat single-sentence handoff
**Continue SLBI Marketing Studio 12-app implementation from this handoff: prioritize P2-05 RLS hardening + staged read-only Content Calendar CI + Brand Kit owner A/B testing, while BOC merchant QR is pending, all 12 flags are Coming Soon, and Vercel preview quota must not be wasted.**
