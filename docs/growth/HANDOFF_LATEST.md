> **G1-08 RELEASE CANDIDATE — 2026-11-24:** Free Campaign Planner Live Caption Preview adds **Share caption manually**; Web Share OS sheet on supported mobile, clipboard fallback on unsupported desktop. User chooses whether/where to send, no auto-post. **Not live until exact CI, merge and Vercel READY.** See [G1-08 release note](G1_08_FREE_PLANNER_MANUAL_SHARE_20261124.md), then the merged PR release body for verified SHA/deployment.

> **LATEST VERIFIED RELEASE — 2026-11-24:** G1-07 PR #171 **MERGED + 16/16 CI PASS + Vercel production READY**. Code release main SHA `89ee21fed30fab0698409e89e0319b3e8193a9eb`, production deployment `dpl_B37FQBwYG2WU8zQbySXeBSHoTXtQ`, alias `www.slbusinessindex.com`, `aliasError=null`. Free Campaign Planner's approved owner Business Facts/service-copy UI is now shipped; actual signed-in owner/vendor A/B and physical-device QA still pending. This document-only update may produce a later `main` commit; consult GitHub main and Vercel for its exact SHA. [Verified release record](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/171).

# SLBusinessIndex GrowthOS — HANDOFF_LATEST
**Updated:** 2026-11-24, Asia/Colombo. **Owner's working language:** Tamil. **Rule:** Each meaningful GitHub code change must update this document and provide a next-chat prompt. Always give page, change, tested CI status, main commit, production READY and pending QA separately.

## Latest independently verified production BEFORE G1-07
- Website: https://www.slbusinessindex.com
- GitHub main SHA: `a0d62055dbab794036bceb80e017f0d93a2562a8` (G1-06, merged PR #170).
- Vercel production deployment `dpl_tX3SBQZor6q3SY2o3Hy8Adk5SwBn`: READY, exact main SHA, www.slbusinessindex.com alias, aliasError=null. 16/16 GitHub CI at PR head.
- G1-05 (PR #169): owned approved Business Knowledge panel on My Businesses, Gallery & Services, Marketing Studio; GET-only `/api/vendor/g1-knowledge` SSR/RLS owner guard. Actual signed-in vendor A/B E2E tests pending.
- G1-06 (PR #170): Free Campaign Planner layout redesign, mobile horizontal tabs, larger live preview, Tamil/Sinhala/English editable static suggestions; Gallery & Services direct primary nav instead of Tools; no paid Pro feature.

## G1-07 — production released (PR #171, verified code commit)
- `/vendor/marketing/campaigns`: small read-only card uses the **existing** authenticated GET to display owner-approved business brand, safe service labels and gallery count. An explicit click on a service inserts a simple editable multilingual message **only when message field is empty**. It never invokes AI, credits or social publishing.
- Code: `lib/marketing/g1-planner-facts.ts`, `app/vendor/marketing/campaigns/G1PlannerFacts.tsx`, modified `app/vendor/marketing/campaigns/page.tsx`.
- Tests: `tests/p2CampaignPlannerG1Facts.test.mjs` plus existing Campaign Planner suites and full Next.js/SQL/Bun CI.
- Detailed report: `docs/growth/G1_07_PLANNER_OWNED_KNOWLEDGE_20261124.md`.
- Verified: PR #171 merged at code SHA `89ee21fed30fab0698409e89e0319b3e8193a9eb`, 16/16 exact-head CI PASS, Vercel production deployment `dpl_B37FQBwYG2WU8zQbySXeBSHoTXtQ` READY with `www.slbusinessindex.com`, aliasError=null. Future docs commits may update main SHA; check current Vercel separately.

## Outstanding blockers and boundaries
- G0 Foundation **0/7 owner-accepted**, complete GrowthOS master release **0/10**. These gates are different.
- G0 review-cache, verified view counter and leads consent/security production SQL **NOT executed**. Requires fresh independently encrypted archive, isolated restore, physically independent external drive copy, specific owner migration window/recovery approval; 47 historical migrations must not be replayed indiscriminately.
- Wallet: only manual admin-reviewed refunds by owner policy; runtime enforcement still unverified. No auto credit/refund authorization.
- Marketing: existing approved providers and unchanged boundaries only; no new OAuth, AI generation from G1 knowledge or auto-post.
- Desktop GPS: blocker until genuinely fixed and physically tested on desktop. Android/iOS and vendor A/B actual signed-in browser QA outstanding.
- Do not create paid staging or run production database writes without separate exact approval.
- User wants safe completed code released through GitHub main and verified Vercel READY, not left in multiple unfinished branches.

## Mandatory workflow for every subsequent task
1. Audit current GitHub main, PRs and Vercel exact SHA. State the affected URL/page and visible effect.
2. Implement and test in one focused branch. **Update this handoff file IN THE SAME PR**, keeping candidate vs production clear.
3. Run all checks to green; merge only tested head. Verify Vercel production READY exact main SHA, www domain, no alias error.
4. **Update merged PR description with the actual verified release SHA/ID and remaining QA.** Docs may refer to PR for post-merge IDs to avoid a second docs-only deployment.
5. Give the user a full copy/paste prompt that can restore all status in another chat.

## COPY / PASTE FOR NEXT CHAT
```text
SLBusinessIndex GrowthOS திட்டத்தை தமிழில் தொடருங்கள். Github repo Victor-dev-03-cmd/sl_business_index, production www.slbusinessindex.com, Vercel project prj_2mT8p2b640bGx4qXMg8DgMzRHGLy, Supabase project oofxhragafekazwjikae. முதலில் GitHub main-ல் docs/growth/HANDOFF_LATEST.md மற்றும் docs/growth/G1_07_PLANNER_OWNED_KNOWLEDGE_20261124.md, AGENTS.md, docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md, owner scope docs/growth/g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json படியுங்கள். GitHub main latest commit, open/merged PR, CI checks, Vercel production exact SHA/READY/www alias சரிபாருங்கள்; ஏதையும் ஊகிக்க வேண்டாம்.

Already live before G1-07: G1-05 PR #169 authenticated approved owner Knowledge UI My Businesses, Gallery & Services, Marketing Studio. G1-06 PR #170 Free Campaign Planner redesigned, user-clicked Tamil/Sinhala/English starters, Gallery & Services visible in main desktop/mobile navigation, tested main SHA a0d62055dbab794036bceb80e017f0d93a2562a8, Vercel deployment dpl_tX3SBQZor6q3SY2o3Hy8Adk5SwBn READY. G1-07 PR #171 merged and production READY (main code SHA 89ee21fed30fab0698409e89e0319b3e8193a9eb, Vercel dpl_B37FQBwYG2WU8zQbySXeBSHoTXtQ): Campaign Planner displays selected approved vendor's saved business facts/services from GET-only G1 API; user can click to start neutral multilingual message if blank; never overwrite typed content, no AI/provider/credits/auto-post. PR #171 exact head CI 16/16 PASS and production READY verified; recheck current main and Vercel for newer commits. Merged PR description contains final exact SHA/ID.

Owner requires: each GitHub change updates docs/growth/HANDOFF_LATEST.md in same PR, with page/changes, tested vs deployed and pending evidence, and copy-paste next-chat prompt. Keep one small release branch; complete green tests, merge to main and verify production automatically unless safety gate requires separate approval. G0 still 0/7 accepted and master GrowthOS 0/10. No production security SQL/review-cache/view-counter/lead migration or paid staging without new independently encrypted production backup, isolated restore and verified physical external-device copy plus separate exact owner migration/rollback approval. Wallet refunds manual admin-reviewed only, existing Marketing providers only. Desktop GPS not fixed/physically retested. Real owner/vendor A/B mobile/desktop QA not proven. Tell me clearly what page is truly live; don't call code-only deployment a usable feature.
```

## G1-08 — next-chat continuation (pending until verified release)
- Page: `/vendor/marketing/campaigns`, Live Caption Preview. New user-clicked Share caption manually; system share sheet or clipboard fallback only; no poster native-sharing, AI or auto-post.
- Files: `lib/marketing/campaign-manual-share.ts`, `app/vendor/marketing/campaigns/page.tsx`, `lib/marketing/campaign-language.ts`, `tests/p2CampaignPlannerManualShare.test.mjs`, `.github/workflows/verify-nextjs.yml`.
- Dedicated details: `docs/growth/G1_08_FREE_PLANNER_MANUAL_SHARE_20261124.md`.
- Full next-chat prompt:
```text
Continue SLBusinessIndex in Tamil. GitHub Victor-dev-03-cmd/sl_business_index, www.slbusinessindex.com. FIRST read main docs/growth/HANDOFF_LATEST.md, docs/growth/G1_08_FREE_PLANNER_MANUAL_SHARE_20261124.md, AGENTS.md and owner-scoped decisions; check latest main SHA, G1-08 PR, all CI checks and Vercel READY exact SHA/alias. Latest verified pre-G1-08 main ad66eeeada1b75176e44754ade139852bd454ce0, Vercel dpl_yrBSWd7Uvfe7FiStG7xT2Gr4RPKu READY. G1-05 My Businesses/Gallery/Marketing owner Knowledge panel; G1-06 Free Campaign Planner redesign + Gallery in primary nav; G1-07 owner-scoped service facts opt-in text (PR #171) live. G1-08 candidate Free Planner Live Caption Preview adds Share caption manually; native OS share where supported, desktop clipboard fallback; no automatic posting/provider or SQL. Verify exact PR then merge if full green, verify Vercel production and update merged PR body with exact code SHA/deployment ID; do not call live if unverified. Every GitHub change must update HANDOFF_LATEST in same PR and supply copy-paste prompt. Preserve Basic Free access, saved campaign workflows, PNG sizes and G1 privacy. G0 0/7 owner accepted, GrowthOS master 0/10, no live G0 SQL without encrypted backup/isolated restore/external physical copy and scoped approval. Desktop GPS and real A/B/Android/iOS signed-in QA still pending; wallet manual admin-reviewed refunds only, approved provider limits unchanged. Report page, change, CI, production and actual physical testing separately.
```
