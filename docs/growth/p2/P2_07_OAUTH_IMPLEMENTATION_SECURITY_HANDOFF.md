# P2-07 Secure OAuth Start / Callback — Architecture, PDF Study & Cross-chat Handoff

> **14 November 2026 (Asia/Colombo)**. Development-only technical handoff, not a production release. Canonical cross-chat overview remains \`docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md\` on \`main\`. Live module truth: \`docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md\` on PR #68. Read both before changing code.

## 1. Sources reviewed (do not confuse plan with shipped status)

1. **Library — original PDF**: \`/SLBI_Growth_OS_Master_Workspace/SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf\`. Full 19 A4 pages, issued 10 November 2026. This is the locked baseline; **no rewrite of v1.0**.
2. Library editable source: \`SLBI_Growth_OS_Master_Roadmap_v1.0.md\` (eleven substantive sections); Library \`WORKSPACE_README.md\`, \`DECISION_LOG.md\`, \`IMPLEMENTATION_TRACKER.md\`. The Library tracker is a dated planning baseline, **not** live evidence for November 14.
3. GitHub \`main\`: \`docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md\`, \`AGENTS.md\` (when present), and current app source.
4. PR #68 P2 branch: \`docs/growth/SLBI_GROWTHOS_MASTER_IMPLEMENTATION_CONTEXT.md\`, \`docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md\`, \`docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md\`, versioned staging-only SQL, code and CI.
5. Original PDF file was **located in ChatGPT Library**, not in the P2 GitHub repository tree during this audit. Do not invent a GitHub PDF path or overwrite Library baseline.

### Full-roadmap synthesis — all eleven pillars retained

| Pillar (PDF) | Approved intent | Implementation constraint for P2-07 |
|---|---|---|
| 01 Algorithm Strategy | Six shared engines (Discovery, Growth, Marketing, Security, Revenue, Learning) | Connectors are a Marketing capability sharing server-side identity/consent with Revenue/Security; not a new Discovery module |
| 02 Product Modules | Unified vendor tools, email/social marketing, billing, SEO, domain/security | Preserve existing vendor routes and operational workflows |
| 03 Best-Fit Algorithms | BM25/hybrid search, SEO rules, creative intelligence, consented email | OAuth is authorization infrastructure, not ML; avoid unnecessary model calls |
| 04 Neural Intelligence | Offline benchmarks, local data and measurable neural gain | No NN or provider automation claim without trained/evaluated model |
| 05 Technical Architecture | Next.js SSR/handlers, Supabase Auth/RLS, trusted billing, job/queue later | Every connector record tied to authenticated owner and owned business |
| 06 Logging & Privacy | Separate security/operations from consented marketing data | Never log OAuth code, access/refresh tokens, customer mailbox contents or identifying marketing data |
| 07 Development Roadmap | Six indicative phases, not deadlines or deployment evidence | Owner specifically reordered work: existing Discovery → Marketing NOW → Growth → SEO |
| 08 Billing Architecture | Verified entitlements, quotas, preserving legacy plans | UI Pro = verified Professional (or Enterprise); Basic and expired Pro denied server-side |
| 09 Own Algorithms | GeoRank, GrowthScore, SEOScore, CampaignIQ, LeadIQ, SecurityScore, Recommend, NeuralCore | Algorithm registry remains future; no invented "completed" metrics |
| 10 Quality Gates | Negative RLS tests, dependency checks, consent, p95, rollback, release evidence | Distinguish Node tests / Docker SQL / Next build / Vercel Preview / real Google consent / production |
| 11 Foundation v1 | Identity, data quality, event semantics, cost caps, audit, jobs, evaluation | P2 release still depends on Foundation v1 security/billing gates |

**Master baseline governance:** preserve all eleven pillars, six-phase roadmap and original v1.0. Changes to billing, AI budget, data capture, external sending or provider apps require tracked owner approval. The P2 Marketing-first execution order and new connector requirements are owner-directed addenda; original PDF remains intact. The PDF's six engines are architectural categories; its eight proprietary algorithms are a separate registry concept.

## 2. Exact user-approved product information architecture

- \`/vendor/marketing\`: Marketing **Studio overview only**, existing creative composer at \`/vendor/marketing/campaigns\`.
- \`/vendor/marketing-engine\`: separate Pro-only operating workspace (social, email, agent, connections, automation, leads, calendar, campaigns).
- Verified server-side Professional / Enterprise authorization, business owner isolation for every start, callback, credential operation, send and worker.
- Existing Discovery/Search protected from redesign or migration. Growth workstream follows Marketing; standalone SEO follows Growth. No unapproved pricing changes.
- Official provider APIs only. Facebook Pages/eligible Instagram Professional/WhatsApp Business have different permissions; personal-account automation is not supported by this implementation.

## 3. Exact code implemented on P2 branch (Google Mail first; PREVIEW-ONLY)

- \`lib/marketing/oauth-provider-contract.ts\`: typed provider inventory, state HMAC, PKCE S256 and exact callback primitives (earlier accepted).
- \`lib/marketing/oauth-runtime.ts\`: explicit **Vercel Preview** opt-in, exact configured HTTPS origin, strict start request, AES-256-GCM preview envelope bound to owner+business+purpose+state/Google-sub. **This is not managed KMS**; production remains blocked.
- \`lib/marketing/oauth-google.ts\`: tightly scoped \`openid email gmail.send\`; code-to-token exchange through official Google HTTPS endpoint, UserInfo identity \`sub\` + verified email, precise granted scope and token expiry validation; no send endpoint.
- \`app/api/marketing/oauth/google_mail/start/route.ts\`: same-origin POST, SSR \`auth.getUser()\`, current verified Pro gate, owned business, secure state + PKCE, admin-only atomic \`slbi_begin_marketing_oauth_intent\` RPC; bounded request and 429 hourly limit.
- \`app/api/marketing/oauth/google_mail/callback/route.ts\`: same session, exact callback, one-time state claim, owner/Pro re-check before/after Google exchange, UserInfo verification, then atomic SQL store of connection metadata + encrypted tokens; safe redirect, no tokens in user-visible response. OAuth denial/cancel consumes the state.
- \`docs/growth/p2/P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql\`: **not live**, intent/connection/vault tables and RLS.
- \`P2_07_OAUTH_INTENT_CLAIM_STAGING_ONLY.sql\`: one-time state consumption, service-role only.
- \`P2_07_OAUTH_CONNECTION_STORE_STAGING_ONLY.sql\`: all-or-nothing credential metadata + ciphertext store, checks Pro/owner.
- \`P2_07_OAUTH_START_RATE_LIMIT_STAGING_ONLY.sql\`: serializes per-owner begin requests and limits to 5 starts/hour.
- \`tests/p2OAuthFlow.test.mjs\`, \`tests/p2-oauth/{claim-verify,store-verify,start-verify}.sql\`: fake provider responses and synthetic owners; no real email, account, tokens or paid API traffic.

**Caveat:** production Supabase does NOT contain these P2 tables/RPCs. No Google app credentials, actual account authorization, token refresh, revocation, authenticated browser acceptance, KMS, webhook or outbound email has been verified. No account is connected simply by deploying this code.

### Provider reference decisions

Google Gmail \`users.getProfile\` **does not accept only \`gmail.send\` scope**. To identify a vendor-connected Google mailbox without broad Gmail read scopes, request \`openid email\` plus \`gmail.send\`, verify UserInfo \`sub\` and \`email_verified\`. Official docs: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile ; https://developers.google.com/identity/openid-connect/openid-connect ; https://developers.google.com/identity/protocols/oauth2/web-server .

## 4. Secrets and activation — never record values in public GitHub

Preview-only configuration flags (currently **not claimed enabled**):
- \`VERCEL_ENV=preview\` **required by code**; production is rejected even if another flag is set.
- \`SLBI_MARKETING_OAUTH_PREVIEW_ENABLED=true\`, \`SLBI_MARKETING_OAUTH_GOOGLE_ENABLED=true\`.
- \`SLBI_MARKETING_OAUTH_ORIGIN\` = exact authorized HTTPS Preview origin in Google Cloud.
- \`SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_ID\`, \`SLBI_MARKETING_OAUTH_GOOGLE_CLIENT_SECRET\`.
- \`SLBI_MARKETING_OAUTH_STATE_SECRET\` (at least 32 chars).
- \`SLBI_MARKETING_OAUTH_ENCRYPTION_KEY\` (32 random bytes, base64url), \`SLBI_MARKETING_OAUTH_ENCRYPTION_KEY_ID\`.
- Existing runtime \`NEXT_PUBLIC_SUPABASE_URL\`, server-only \`SUPABASE_SERVICE_ROLE_KEY\`, SSR Supabase config.

**Never print/commit values.** Managed KMS with rotation/revoke, provider app verification, production-ready migration + rollback and external provider testing are still release blockers. Enable only after a scoped authorization; no attempt was made to set the flags or incur cloud/provider costs.

## 5. Evidence and deployment boundary

- Prior accepted OAuth state-claim source: \`0920367\` — 7/7 workflow families green; Docker Pro/Basic/expired/replay tested.
- This chat's first preview Google implementation: \`6bc9ce9\` — contract test initially failed because direct Node 24 TypeScript import resolution required explicit \`.ts\`; this was fixed in \`81bd906\` and **7/7 CI families passed** at that exact SHA.
- Following code: \`1a7d905\` (callback/store); \`07f3481\` (rate-limit); \`f271294\` (updated contract assertion for the trusted begin RPC). **Exact code+test SHA \`f271294931644dea5ae46d9b1f241897df0f6531\` passed 7/7 GitHub workflow families**, including optimized Next.js build and Docker PostgreSQL 17 OAuth start, replay, token-vault and owner/Pro denial checks. [P2 Docker/contract CI](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43530529585) · [Next build](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/43530529848). Early failed runs are superseded, not erased.
- Vercel production has never been authorized to run P2-07: P2 PR #68 remains draft/unmerged, Supabase P2 migration not applied. Last verified earlier P2 preview at \`000c75f\` is **not proof** that new start/callback routes were preview tested.
- Docker tests use disposable PostgreSQL 17 with synthetic vendor A (paid), B (Basic), and expired entitlements. They do not replace actual Supabase Auth user-browser QA.

## 6. Resume checklist for the NEXT ChatGPT conversation

1. Read main \`AGENTS.md\`, \`docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md\` and this P2-07 handoff; reread Library PDF if available.
2. Requery GitHub \`main\`, P2 PR #68 HEAD, exact 7 CI workflow families, Vercel production/preview and live Supabase migrations. Never assume snapshots are still current.
3. Fix remaining Node/Docker/build failure, if any; record the tested SHA. Inspect whether latest Vercel Preview really corresponds to that SHA.
4. Next functionality: trusted preview-only vendor-initiated Connect UI, provider app OAuth consent with authorized test owner, encrypted key management upgrade to KMS, secure refresh and disconnect/revoke with queue cancellation, and real browser Owner-A/Basic-B/expired-Pro tests.
5. Prior to production: plan versioned Supabase migration with rollback, security review of service-role RPC exposure, actual consent/account review, provider policies, rate limit/alerting, secret rotation, suppression/opt-out if email delivery is later added. No public release without approved QA and provider enablement.
6. Only then continue other official provider adapters (Meta Page, Instagram Professional, WhatsApp Business, Outlook), supervised messages/CRM, campaign receipts, scheduling worker; no email sends or automatic posts until separate approval.
7. Update P2 \`IMPLEMENTATION_STATUS_LIVE.md\` **with exact code SHA, workflow URLs, Vercel URL/target, migration applied/not, browser acceptance, blockers and next file/function** at each checkpoint. Update main canonical handoff by reviewed documentation-only process without silently promoting unverified P2 code.

**No Discovery reimplementation; Marketing → Growth → SEO.**

## 2026-11-14 source consolidation status (read this after historical sections)

P2 PR #68 was squash-merged into GitHub `main` at `852da229728ec4141b8f3ac3df3015c9dbbd99d2`. Source SHA `c2326c5` passed 7/7 CI workflows with Preview READY `dpl_H7GVfPcp5xsDsnXhXLuVDK6RRJdR`. **Source merge is not a real OAuth connection:** Vercel production OAuth remains hard-off, no live P2 Supabase schema, real provider account, Google client registration, KMS, token revoke, paid AI or external email. No real vendor-browser E2E. Next steps: verify production main build, review Supabase migration, wire real vendor consent via eligible Google app and safe token custody, implement disconnect/revocation. Existing Basic manual campaigns were preserved after audit; agents/connectors remain Pro-only. Read `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md` on main, not historical branch-only handoffs.

## 2026-11-14 — PR #70: preview-only vendor Google Mail Connect control (latest)

Previous code's OAuth start/callback existed without a vendor-facing button. PR [#70](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/70) added `app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx` and modified the Pro-only connections catalogue. Browser sends **only an owned businessId** to the existing same-origin POST; the server independently verifies live Auth, business ownership and verified Pro, persists one-time state with PKCE and bounded rate limit, and returns a strictly allowlisted Google URL for explicit vendor consent. The page checks Vercel Preview config and RLS-protected connection metadata only in Preview; if keys/schema/Pro do not exist it fails closed. Production still cannot start OAuth. Credentials remain server-only. **No real provider account has been connected or revoked**, and encryption remains preview-only AES-GCM rather than managed KMS.

Source SHA `cbf395e` **6/6 CI workflow families PASS**, exact Vercel Preview READY `dpl_6NfYfWSuUXtFvdPh1UzaFrYK3uwm`. GitHub main merge SHA `dc15c7b`; production exact deployment recheck needed. Chrome 144 tested a local *static skeleton visual fixture* only, not live Google consent. Priorities: reviewed reversible test migration, real Pro test owner, provider app registration, managed KMS, one-time callback E2E, token renewal + true revocation/disconnect, approved emails only afterward. No production P2 migration, AI credit action, external send, provider fees or Discovery changes.

## 2026-11-14 — P2-07 local disconnect / token-purge milestone

PR [#71](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/71), source `d7f199ae`, 6/6 GitHub workflow families PASS and exact Vercel Preview `dpl_Ag1SCt8VG1BzqzjQZEbN8sVjUmif` READY; main merge `cb26f6a0a28dff885f843d922e1097065fa7644c`, Vercel Production `dpl_GgaedofWMCk6YQbPUh7XqxXdSNiA` READY/alias `www.slbusinessindex.com`.

Preview-only user action: explicit Google mailbox **Disconnect from SLBI** confirmation; browser posts owned business + connection UUID only; SSR checks user + business owner + same origin + bounded JSON, then invokes server-only privileged SQL function. Stage-only `P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY.sql` atomically updates local status, destroys encrypted token ciphertext and marks UNCLAIMED OAuth intents consumed; allows cleanup for expired Pro. Docker validates Basic B/cross-business attempts cannot delete A's token, anonymous cannot invoke privileged RPC, idempotence, expired-Pro cleanup, pending state invalidation. No provider token is read by the disconnect API.

**Not complete:** This is NOT a Google provider-side remote revoke, and a previously claimed callback can race with disconnection until a generation-bound/transactional store mechanism is enforced. Do not enable real OAuth without fixing it, managed KMS, Google authorized test account, verified live billing/Pro, approved reversible DB migration, user permission, real browser/ownership negative tests. Actual production Google OAuth remains hard-off and no live P2 SQL was executed.

## 2026-11-14 — PR #72: claimed callback / local disconnect credential race fix

- The original preview Google callback could claim an OAuth state, exchange Google code and later store encrypted tokens **after** an owner had disconnected their account. Previous local disconnect only invalidated *unclaimed* states. This was caught by the PR #71 handoff, and fixed in PR #72 at source `56ee2397c98af065cb1ba3ba5dbac84a2239361b` (merged main `4b9cf4d06d275367200c9108848563a96800ad2a`).
- New staged-only SQL `P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql` extends intent columns with `invalidated_at` and `stored_at`, updates claim to reject revoked states, makes local disconnect invalidate even already-claimed states, and adds `slbi_store_claimed_google_mail_connection` with transaction lock, claimed-intent identity/expiry/replay/pro checks. Legacy unbound `slbi_store_verified_marketing_connection` loses service_role EXECUTE. The Next.js callback receives trusted `claimed[0].intent_id` and forwards it to the new privileged store. No browser-selected ID, no plaintext token in UI.
- Disposable Postgres 17 test `tests/p2-oauth/callback-disconnect-race-verify.sql` passes first stored consent, denied replay, denied stale claimed state after disconnect, denied cross-owner/unclaimed, secret purge and role restrictions; 6/6 CI workflow families passed. Feature Vercel Preview `dpl_H56d1T5aEEiGTh5cLXMzaksbFVep` READY, merge Production `dpl_41aYCX8pqaeifiwsE8ZgnVht6Sgr` READY, alias verified.
- **Deployment boundary:** Production OAuth still hard OFF and no P2 SQL live. This is not a managed KMS or remote provider revoke; old Google grants are not remotely revoked and refresh/rotation and real vendor/browser approval remain pending. Next release must stage schema and run real Auth owner A/B acceptance before activation.

## 2026-11-14 — P2 production foundation migration changes previous "not live" status

Prior entries correctly said P2 OAuth SQL was STAGING-ONLY **at their historical time**. On 2026-11-14 user explicitly authorized migration; an exact reviewed bundle was applied as Supabase version `20261114104216` (`p2_marketing_global_foundation_coming_soon_v1`). The live database now CONTAINS `marketing_oauth_intents`, `marketing_connections`, `marketing_connection_secrets` with owner read policy and full RLS; plus service-role-only begin/claim/stored-once/local-disconnect RPCs. Exactly 0 real OAuth connections, intents or secrets exist; Google OAuth remains hard-off in Vercel Production by runtime environment gate and without official provider account/managed KMS. Never claim an OAuth account was connected. Current source PR #73 merged `12d0add2f99b7fdf8936b1042e581c291a4bdeb3` with CI+Production READY. Callbacks still require actual provider verification and token rotation/revocation; user must separately consent to Google requested scopes. Secrets are not present in DB. Full per-app status runbook `P2_MARKETING_ROLLOUT_RUNBOOK_20261114.md`. Do NOT rerun staged individual migrations on production; baseline was already applied as a consolidated transaction.
