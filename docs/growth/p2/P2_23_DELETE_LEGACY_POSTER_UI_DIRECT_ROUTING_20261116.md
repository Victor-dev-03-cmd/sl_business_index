# P2-23 — Delete retired Creative AI Poster page and launch new Studio directly

Date: 2026-11-16. Owner explicitly reports a visible duplicate route / flash: Marketing Studio Poster card opens `/vendor/marketing/design`, renders the retired Creative AI workspace, performs a client GET of an owner-only endpoint, then uses `window.location.replace` to load `/vendor/marketing/design/puter-lab`. Owner requests **delete old page and obsolete routing, keep only current Poster Studio**.

## Verified root cause
- `app/vendor/marketing/design/page.tsx` was an obsolete ~41KB client-rendered Creative AI UI still deployed with a post-hydration authorization GET and JS `window.location.replace`. This necessarily showed its old UI before a second navigation.
- `lib/marketing/studio-apps.ts` still linked poster-editor to `/vendor/marketing/design`, not the active new Studio.
- New Studio's **Creative AI** back button also linked to the obsolete page.
- The parent layout exposed an expired-style staff-review status banner above the current Studio for reviewer accounts.

## Implemented removal
1. **Physically delete** `app/vendor/marketing/design/page.tsx` and `app/vendor/marketing/design/loading.tsx`; no legacy React component or old skeleton is imported, built, or served.
2. Marketing App Store poster-editor card **directly links** to `/vendor/marketing/design/puter-lab`, where the verified owner-only layout already enforces the entitlement and login. Update card title/description to match current AI Poster Studio / Gemini + Puter + Canvas.
3. New Studio's back button now returns to `/vendor/marketing` (Marketing Studio dashboard); no link back to old UI.
4. To keep old bookmarks safe and avoid a user-visible 404, **server-side Next.js config redirect** old `/vendor/marketing/design` to new `/vendor/marketing/design/puter-lab`. This is a lightweight URL compatibility rule (307), not a page render or a second client-side navigation. Remove obsolete microphone header allowance for the retired path; keep the current owner's Studio microphone permission policy.
5. Parent layout preserves `isPosterReviewAccount` staff-only bypass and ordinary `MarketingProOnly` gate, but no longer prints the obsolete staff-review overlay. The nested PuterLab owner-only server gate remains mandatory, so general Pro vendors are **not** granted access prematurely.

## Scope, test migration and honest boundaries
- This retires the previous **frontend only**. Former backend Cloudflare generation, source reference analysis and credit reservation APIs remain present and independently secured to avoid hazardous broad deletion of potentially used APIs; they are no longer part of the poster app launcher.
- P2-23 migrates source-code tests that previously read the deleted UI to inspect the actual active Gemini/Puter Studio, while preserving legacy API security/credit tests and four-format output checks.
- The Poster tile remains flagged `coming_soon` for non-QA users in server-owned rollout status. If DB governance says live for everyone, the owner-only nested server layout still fails closed rather than exposing unapproved Puter tools.
- One Studio only for the owner: no 41KB old code load, no legacy loading skeleton, no client GET+redirect waiting, no unapproved model change or Puter credits.
- No new image inference, Google AI call, DB migration, OAuth or payment switch. No UI re-layout of the active 3-column Studio.

## Release
Require latest-head GitHub contracts, Next.js production build, TypeScript, security, RLS, billing checks. Merge after green, verify Vercel Production `READY`, SHA and `www.slbusinessindex.com` alias. Browser acceptance: clicking Marketing Studio → AI Poster Studio should open `/vendor/marketing/design/puter-lab` immediately; old bookmark `/vendor/marketing/design` gets a server redirect and never shows old Creative AI UI. No paid Puter inference necessary.
