# SLBI — Poster Design Studio (Pro) | Source-only implementation handoff
**Date:** 2026-11-14 (Asia/Colombo)  
**Branch:** `feature/p2-poster-studio-ai-foundation-20261114`  
**Base main:** `44ec7d0a581d24dfd91839f799748f57adfb43d5` (Campaign Planner V2, Vercel production READY `dpl_Ck2CCERiQdJgMPpeM99ScQM2pASX`)  
**Status:** DEVELOPMENT / NOT DEPLOYED / NOT LIVE. No production DB migration or rollout flag change.

## Owner acceptance and priority
- Owner verified Campaign Planner V2 Basic manual draft, export, images and editing as working on production. Basic retains manual text/PNG export; **no auto-posting, AI charging or external provider access**.
- Owner requests a small Campaign Planner dropdown chevron inset fix and changes the **next-app priority from Content Calendar #10 to Poster Design Studio #2**.
- Poster Design Studio is a **verified Pro / Professional or Enterprise** tool. Keep the unchanged server component gate in `app/vendor/marketing/design/layout.tsx` and independent server API/RLS checks.
- Do not merge, deploy or promote `poster-editor` from `coming_soon` without CI, authenticated Pro tenant A/B, image/font QA, and owner release review. Minimize Vercel Preview quota consumption.

## Staged changes
1. Campaign Planner: consistent inset dropdown arrows for all native select controls (16px from right), dark and light chevrons; no changes to Basic save logic.
2. Poster blueprint: four sizes (1080×1080 square, 1080×1350 feed portrait, 1080×1920 story, 1200×630 landscape) and format-dependent coordinate validation on JSON import/export.
3. Pro Poster Design Studio: retained original visual editor, drag-and-drop text, brand colors, local artwork upload and editable JSON; modern orange/black hero; canvas text wraps Unicode grapheme clusters. Prevents silently cropped Tamil/Sinhala/emoji text; shows overflow error and **blocks PNG export** until the user edits/repositions.
4. AI copy panel: English/Tamil/Sinhala, objective and factual prompt. Reuses existing `POST /api/marketing/caption`: owner-scoped SSR auth, verified Pro entitlement, Brand Profile, per-request idempotency, trusted credit reservation, model flag, provider budget, review draft and refund protection. User must explicitly apply a reviewed 1–250-character headline. It does **not** call an AI model directly from the browser and cannot enable AI by itself.
5. Regression test `tests/p2PosterDesign.test.mjs` expanded for four formats, JSON validation, clipping guard, protected AI flow and dropdown spacing.

## Production gates — currently NOT met
- At inspection: `growth_credit_actions.ai_social_draft.is_enabled = false`, **0 verified Pro entitlements** and `marketing_studio_app_rollouts.poster-editor=coming_soon`. Do not enable model flags, create test paid entitlements, credit issuance, or paid provider spend on behalf of the owner.
- The existing AI endpoint requires `SLBI_MARKETING_AI_ENABLED=true` plus real verified owner credits, Brand Profile and server-only provider secret. Keep the switch OFF until the owner approves the budget and the credit-ledger path receives fresh live tests.
- **AI image generation is NOT implemented.** Choose/approve a licensed image-generation inference provider or a self-hosted model, hard server-side scope/budget caps, prompt/policy filters, asset provenance/license, private tenant storage, retention, and separate metering with idempotency before enabling background generation. Never label local image upload as generative AI.
- Browser/Android/iOS text-fit QA, screen reader and drag keyboard controls, server-side owner A/B isolation, cloud project versioning and provider-generated background image QA are next milestones.
- No social publishing, email, scheduled jobs, AI-generated backgrounds, marketing event external actions, or new subscription pricing included.
- Content Calendar staged PR #75 remains separately pending; don't merge it into this Poster Studio branch.

## Verification / release checklist
- GitHub PR should run `tests/p2PosterDesign.test.mjs`, `tests/p2AiCaption.test.mjs`, Campaign Planner V2 tests, all P1/Billing security checks, TypeScript and Next.js optimized build.
- Verify original JSON import/edit/drag/PDF? **PNG and JSON only**. Test long grapheme-based Tamil/Sinhala/emoji poster text on all four sizes; overflow must warn and refuse export. Do not assert PDF support.
- Verify Basic cannot render Poster page and cannot call AI endpoint; unverified Pro/expired entitlements denied; A cannot read B's business or credits. Owner-approved production rollouts are separate.
- Record exact successful PR head SHA, CI jobs, any production rollout migration, deployment ID and authenticated owner QA in living handoff **after** actual verification. No fake success claims.

## Next implementation after this source-only slice
- AI creative specification (headline/CTA/layout/palette suggestions with original background assets); provider adapter and separately reserved `ai_poster_design` credit action.
- Thumbnail generation, safe model outputs and user approval before merging into editable layers; native font measurements and template library.
- Pro per-business design projects in tenant-isolated RLS storage, autosave/version history, private originals, multi-size export, provider usage/error audit.
