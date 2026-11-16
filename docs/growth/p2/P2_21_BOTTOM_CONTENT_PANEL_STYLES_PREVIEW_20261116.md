# P2-21 — Bottom information-panel style variants only (preview)

Date: 2026-11-16. Owner approved a tightly scoped change following the working 3-column SLBI AI Poster Studio. No other architecture, navigation, headline, hero art, canvas geometry, business inputs, verified contacts, languages, price / user consent or exported dimensions may change. **Show a Preview before any Production merge.**

## Why
Owner's generated hiring poster already has strong top `WE ARE HIRING` typography and nice art. Owner wants Gemini to choose different *lower content surface designs*, rather than repeating the same black glass/card visual for every poster.

## Exact implementation
- `lib/marketing/poster-design-blueprint.ts` adds optional `layoutStyling.contentPanelStyle` to the validated Gemini JSON. Eight allowlisted values: `black_marble_luxury`, `frosted_glass_modern`, `neon_glow_card`, `minimal_editorial_strip`, `split_info_panel`, `premium_gradient_plate`, `soft_dark_blur_panel`, `bold_sale_badge_layout`. Legacy JSON missing this key defaults to `black_marble_luxury`; unknown values fail validation.
- `lib/marketing/poster-gemini-design-blueprint.ts` adds **bottom-only** art-director prompt selection. Hiring/corporate → frosted/editorial, festive/luxury → marble/gradient, tech/youth → neon/soft blur, sale → bold badge, info-heavy → split. Strong instructions not to change top headline, selected-safe-zone geometry, image prompts, actual approved words or contact details.
- `lib/marketing/puter-content-panel-styles.ts` is a **new isolated Canvas painter** for lower surfaces, CTA appearance and minimal badge accent. No model requests, data/credit access, source artwork editing, or independent geometry decisions. Marble lines, subtle gradients, clipped blur, borders and glow are drawn into real PNG pixels. Even minimal/editorial styles preserve contrast and exact text.
- `lib/marketing/puter-premium-poster-renderer.ts` calls the painter only inside the existing measured bottom card (or same wide-panel coordinates); exact hero drawing, massive title, font fit, alignment, brand/offer/service/CTA/contact order and contact clipping unchanged. Existing original frosted-glass path preserved.
- `app/vendor/marketing/design/puter-lab/page.tsx` passes through the one allowlisted field from verified Gemini blueprint to the existing Canvas rendering; no new controls, no new column, no UI layout changes.
- `tests/p2PuterBrowserLab.test.mjs` includes allowlist, legacy fallback, all variants, unchanged geometry, no billable calls and original 3-column contracts.

## Security, provider and preview
Owner-only QA access, same-origin, verified business facts, Gemini daily quota, Puter User-Pays consent / no-credit sample remain. This change does not deploy a new model, create raw audio calls, touch main Cloudflare Pro poster engine, add a storage bucket or create automatic paid artwork. No server DB migrations.

**Preview-first release:** open GitHub PR, require all latest-head CI checks, verify an actual Vercel `preview` deployment has `READY` state and return its exact URL to owner. Do NOT merge to main or Production until owner reviews / requests it. Owner may need preview deployment access auth. The static UI still shows 3 columns and the lower styling changes only appear on a composed PNG after a Gemini Prepare (or fallback styling), not on image artwork alone. Avoid calling paid Puter generation during QA.
