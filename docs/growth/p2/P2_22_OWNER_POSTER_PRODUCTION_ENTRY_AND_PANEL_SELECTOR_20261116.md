# P2-22 — Owner live Poster Studio entry + visible bottom-card style picker

Date: 2026-11-16. Owner reported production still looked like the **old Poster Studio** after merging P2-21 (8 lower panel style variants).

## Confirmed root causes
1. Two distinct production routes exist: `/vendor/marketing/design` is the older Cloudflare/Creative AI poster page; `/vendor/marketing/design/puter-lab` is the premium Gemini+Puter+Canvas Poster Studio. P2-21 only modified the latter; production Vercel commit `f481f77` was READY and aliased to www.slbusinessindex.com. Hence navigating through old poster entry still showed the old interface.
2. P2-21 did not expose the 8 content-panel styles as a control. It selected an optional style only after *Prepare with Gemini*. Before that, fallback `black_marble_luxury` could look similar to the previous dark panel. A user could not verify all eight variants directly without another Gemini response.

## Narrow fix
- On the **legacy Client Poster page**, perform one background GET of the already-existing server-authorized `/api/marketing/poster/puter-lab`. If the server confirms the current viewer has internal owner QA access (HTTP 200), redirect to `/vendor/marketing/design/puter-lab`. For every other viewer (403/network failure) leave the legacy Cloudflare page unchanged. No client-side owner email checks, exposed keys, broadening of QA permissions or provider switches. The `puter-lab` route retains its own enforced authorization gate.
- In the private Studio's existing **right settings column** add a compact **Bottom content panel style** select. It includes `Gemini Auto` and all 8 previously implemented enum values. All 3 columns and every top heading, art direction, card coordinates, language, user input, billing mode and exact copy remain unchanged.
- The panel control maintains its own `panelStyleOverride` independent of Gemini typography and font shuffle; changing it recomposes existing Canvas PNG locally at its original pixel size without image-generation calls or Puter credits. Freshly prepared Gemini design resets the override to Auto.
- The style is passed through the existing `composeExactPoster` → `renderPremiumPoster` path as a validated `ContentPanelStyle` and only affects the lower-card Canvas painter. Existing default and Gemini styles still work.
- Regression tests verify owner-only route switch, preservation of legacy provider for other users, selection of all eight styles, manual priority over Gemini with no artwork rerun, and original owner-only/consent controls.

## Release expectations
Require clean latest PR-head CI (Next.js build/TypeScript, security/contracts). This fix is owner-requested Production repair after explicit owner approval of P2-21, so merging `main` and verifying Vercel `READY` + `www.slbusinessindex.com` is appropriate.

User browser QA: open **https://www.slbusinessindex.com/vendor/marketing/design** while logged in as authorized QA owner — it should land on **/vendor/marketing/design/puter-lab**. Choose **Bottom content panel style → Neon Glow Card**, generate a *no-credit sample*, switch to **Premium Gradient Plate** and see immediate panel-only local PNG change. Existing browser memory artwork may disappear after hard refresh; no paid Puter test is required. If route does not switch, validate auth cookies/owner entitlement before changing access permissions. Neither CI nor logs prove browser visual acceptance.

Main Cloudflare Creative AI provider, main public Pro vendor experience and billing/quotas remain unchanged.
