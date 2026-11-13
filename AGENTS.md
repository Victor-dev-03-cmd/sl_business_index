# SLBusinessIndex — repository handoff for coding agents

## First read (required before any implementation)

1. **Canonical living handoff:** [docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md](docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md).
2. **P2 detailed roadmap:** [docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md](docs/growth/p2/P2_MARKETING_ENGINE_ROADMAP_AND_STATUS.md) on P2 development branch while PR #68 is not merged.
3. **Original product vision:** \`SLBI_Growth_and_Security_OS_Master_Roadmap_v1.0.pdf\` in project owner's Library when available.
4. **Live truth:** verify GitHub branch/commit, migration history, Vercel Preview/Production target and exact GitHub Actions statuses. Do not confuse a successful preview build with a live feature.

## Current owner decisions (2026-11-13)

- Existing **Discovery** engine is regression-protected.
- Complete **Marketing Engine FIRST**. After Marketing, work on **Growth**, then **SEO**. The original six-engine taxonomy stays intact until owner approves a structural change.
- \`/vendor/marketing\` becomes **Marketing Studio overview only**.
- The standalone \`/vendor/marketing-engine\` includes **Social Media, Email, Calls & Messages AI Agent, Leads, Provider Connections, Campaigns and Calendar** as separate modules.
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

**New chat hint:** The user expects a future ChatGPT session to read this file, the master handoff and the P2 PR before requesting a recap from the owner. Continue development instead of restarting requirements discovery.
