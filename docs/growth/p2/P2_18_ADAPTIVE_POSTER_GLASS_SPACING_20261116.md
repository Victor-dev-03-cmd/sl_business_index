# P2-18 — Adaptive glass card: remove offer-to-CTA dead zone (2026-11-16)

## Owner-provided evidence
- Owner shared screenshots of the live owner-only Puter QA Studio and downloaded 1080×1920 Halloween Neon special poster.
- Large upper headline and luminous 3D pumpkin hero are improving, but lower frosted glass card has a **large dead blank space** between the `30% Offer for price` / `Professional Services` and `Contact us for details` button. The icon-based phone, website and email footer are otherwise now working.
- User requests high-quality upper visual composition and strong content-aware prompt engineering, not random decorative filler. They want layouts to respond to the actual idea, without oversized blank regions.

## Verified code cause
The renderer in `lib/marketing/puter-premium-poster-renderer.ts` formerly pinned the card to a fixed 57.5%–93.8% of story height, then set:
`buttonTop=Math.max(y+22*scale,contactTop-93*scale)`.
This artificially anchored the CTA near the bottom footer even when the approved copy occupied only two short lines, leaving hundreds of pixels unused. This is a **Canvas layout bug**, not proof of poor upstream AI image resolution.

## Implemented P2-18
- New pure `lib/marketing/puter-adaptive-card-layout.ts` computes actual brand/offer/service/CTA/footer heights and spacing *before* painting the glass. Bottom safe area ~94.8%; glass top = bottom minus required content height. The CTA is placed 22 scaled pixels after the service text, and verified icon contacts follow by 24 scaled pixels. No huge synthetic blank spacer.
- `puter-premium-poster-renderer.ts` now uses `planStackedCard` for Story, Portrait, Square. Short copy => lower/shorter card and more AI hero visibly exposed. Longer approved copy => measured taller card if safe, otherwise fail with helpful message; no clipping, fake text, extra discounts or CTA duplication. Wide/landscape path untouched to avoid regressions.
- `puter-poster-composer.ts` prompt supports premium imagery and coherent high-fidelity center hero (31–67%), dark clean upper display type zone (0–31%), lower compact dynamically sized content area (68–95%) rather than forcing an oversized empty card. Owner's explicit objects/exclusions still highest priority, reference then optional Gemini.
- Halloween premium reference direction in `poster-premium-presets.ts` likewise reserves more hero space and smaller card area.
- Regression checks added to `tests/p2PuterBrowserLab.test.mjs`: test numerical actual geometry for 1080×1920, 1080×1350, 1080×1080; check CTA adjacency, proper contact hierarchy, no internal dead zone and safe fail on overflow.
- **No browser-paid Puter inference**, credits, live main Cloudflare provider, business/voice/auth, storage or PNG sizes changed. User can test typography/layout via no-credit sample; for new real artwork choose real mode with their explicit User-Pays consent.

## Release and acceptance
Verify PR latest-head GitHub CI contracts, TypeScript/Next.js production build, merge and Vercel Production READY on `www.slbusinessindex.com`. Browser-based visual QA and actual downloaded PNG for the owner's same business is still required. The assistant should not claim pixel-perfect recreation of the owner's artistic inspiration. A scene subject cannot be separated into an alpha layer without a further segmented layering pipeline.
