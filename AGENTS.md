# SLBusinessIndex — repository handoff for coding agents

## First read (required before any implementation)

1. **Canonical living handoff:** [docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md](docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md).
2. **P2 detailed roadmap:** [docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md](docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md) on GitHub `main` (merged source from PR #68 on 2026-11-14).
3. **Original product vision:** \`SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf\` in project owner's Library when available.
4. **Live truth:** verify GitHub branch/commit, migration history, Vercel Preview/Production target and exact GitHub Actions statuses. Do not confuse a successful preview build with a live feature.

## Current owner decisions (2026-11-13)

- Existing **Discovery** engine is regression-protected.
- Complete **Marketing Engine FIRST**. After Marketing, work on **Growth**, then **SEO**. The original six-engine taxonomy stays intact until owner approves a structural change.
- \`/vendor/marketing\` is the **single Marketing Studio app hub**: real owner campaign metrics, dark orange/black hero and an interactive 12-app launcher. No composer embedded into the overview.
- **ONLY Marketing Studio** appears in Dashboard > Tools. Each first-party app opens its real deep-link workspace under `/vendor/marketing-engine/*` or `/vendor/marketing/*`; the two old Marketing Engine root landing URLs redirect to Studio. Keep server-side Pro gates and original Basic manual Campaign Planner/Leads CRM.
- "Pro" in the UI maps to the current paid **Professional** plan, with **Enterprise** also eligible. The server must require genuinely verified entitlements for every connector, outbound action, token, AI credit and job. **Basic** cannot bypass via API calls.
- Build **own lightweight rule engines, multilingual language normalization, retrieval/classifiers and confidence gates**, with tightly capped external LLM fallback rather than paying an LLM for every incoming message.
- Official **OAuth/API permission** is mandatory. Facebook personal profile auto-publishing is not a substitute for Facebook Page permissions; Instagram consumer accounts are not professional publishing accounts; WhatsApp personal login is not WhatsApp Business Cloud API.
- No paid provider enablement, external publishing/email/phone campaigns, or production schema writes without scoped release approval.

## Change-completion ritual (do this during active work, never claim background updates)

1. Run relevant tests and inspect their exact commit SHA. For RLS, billing and provider changes use synthetic owner A/B and failure/retry tests.
2. Update **docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md** with last verified status: module, branch, SHA, PR, database migration (applied or not), CI, Preview/Production, blockers and next step.
3. Update P2 roadmap status table without marking staged SQL or feature-gated integrations as live.
4. Avoid secrets, OAuth token values and customer records in commits, logs or documentation.
5. Keep P1 production stable. Use development branches and PRs for product code; documentation-only handoffs may be merged independently.
6. PDF/DOCX are exported snapshots, **not** the source of truth. Regenerate them when requested or at approved milestones.

**New chat hint:** The user expects a future ChatGPT session to read this file, the master handoff and P2 implementation ledger on main before requesting a recap from the owner. Continue development instead of restarting requirements discovery.

## 2026-11-14 — CURRENT merged P2 source checkpoint

- PR [#68](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/68) was **squash-merged** into main at `852da229728ec4141b8f3ac3df3015c9dbbd99d2` after P2 code SHA `c2326c5c09ee7e99e5fdda5149c09f6d73e857ee` passed 7/7 distinct GitHub workflow families and exact-SHA Vercel Preview `dpl_H7GVfPcp5xsDsnXhXLuVDK6RRJdR` became READY. The P2 source, docs and staged-only SQL now reside on main.
- **Repository/source merge is NOT external provider enablement:** no live P2 Supabase migrations, no real OAuth connection, outbound messages, paid AI, token KMS, durable queue, real vendor browser E2E or confirmed provider publishing. OAuth start/callback fail closed in production by `VERCEL_ENV==='preview'` hard gate; new P2 database-backed features are unavailable until separate migrations + acceptance.
- Audit correction: existing manual multilingual campaign drafts/PNG/planning at `/vendor/marketing/campaigns` remain accessible to authenticated Basic owners; new Marketing Engine agent/connectors, Brand/Caption/design premium features require verified Pro. Staging P2-05 SQL retains owner-only manual drafts and blocks forged published/approved status. Docker Basic tenant A/B tests pass.
- Read **main** `docs/growth/p2/IMPLEMENTATION_STATUS_LIVE.md`, `docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md`, and `docs/growth/p2/P2_07_OAUTH_IMPLEMENTATION_SECURITY_HANDOFF.md` on future chats; all previous PR/branch-only advice is historical. Marketing → Growth → SEO; Discovery unchanged.

## 2026-11-14 — Marketing Studio app marketplace (PR #69)

- Owner-approved product navigation: Dashboard Tools menu exposes **one** Marketing Studio entry. Marketing Studio is an embedded first-party **app store / app launcher** (not an external install market and not a second Marketing Engine homepage), with black/orange accessible hero, 12 vector-icon apps, real owner metrics, browser-local search and category filters, actual Pro entitlement badges, honest delivery status.
- Existing 2 included workspaces (manual Campaign Planner and existing Leads CRM) remain usable by Basic. The other 10 first-party app entries require verified Professional/Enterprise at their destination's server-side layouts. Planned email, social, connectors, live phone and automation are clearly labelled as not yet activated: Pro subscription does not by itself grant provider OAuth consent, live AI credits, publishing or sending.
- Feature branch source `0d6b525d953f263a30e9948fcadff77d7013e8a7` passed **6/6 GitHub workflow families** including P1, P2 Docker security, app-store tests and optimized Next build. Exact source Preview `dpl_8GVzX64Zd7rdTGwapNH8H8KtuKdj` READY. [PR #69](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/69) squash-merged to main at `715fb2b3b2950a77c6249e012208beed3d01e7ae`. Production build for merge SHA must be checked explicitly; no new database migration or provider enablement authorized.
- New session workflow: read this AGENTS, main master handoff and P2 ledger; **do not re-add a second topbar Marketing Engine link** or imply a full paid app ecosystem has been activated. Continue P2-07 consent/credential-vault/revoke and P2 schema QA, then other Marketing features, Growth, SEO; Discovery unchanged.
