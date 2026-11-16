# P2-17 — Premium Halloween Tech Poster design system (2026-11-16)

## Owner-supplied reference spec
The owner supplied an ultra-modern Halloween Tech promotional poster plus exact colors, type roles, glass/neon effects, and 9:16 layering directions. This is the source of truth. It is **not** permission to insert sample contact details or make up discounts.

Palette: Obsidian `#07070C`; ambient purple `#18082E`; neon orange `#FF5E00`; amber `#FF8A00`; violet `#8A2BE2`; white `#FFFFFF`; muted `#B8B8C7`.

Fonts (1080×1920 nominal): Upper display Anton/Bebas Neue 180–220px, -2% tracking, 0.9 line-height; business Space Grotesk 600 / 36px; primary offer Plus Jakarta Sans 800 / 84px; service Inter 500 / 32px; CTA Plus Jakarta Sans 700–800 / 28px; footer JetBrains Mono or Inter 400 / 24px. Tamil/Sinhala render in Noto Sans Tamil/Sinhala, with per-field script detection so Latin headlines can use Anton even if UI language is Tamil.

Glass/neon: fill rgba(18,16,28,.72), border 1.5px rgba(255,255,255,.14), radius 32px, blur 24px; orange glow 28px, violet ambient glow 32px, CTA gradient `#FF5E00` to `#FF8A00`, rounded pill with dark text.

Layout: dark ambient background, very large upper headline, visually centered 3D hero, lower frosted card with one approved offer, body, CTA and icon-based website/phone/email footer. Do not render model-invented letters in the AI artwork. **Exact pixel-level foreground masking (hero overlapping headline) is not built:** the image model composes a background with a copy-safe zone, and browser Canvas draws the headline/card. No fabricated words or duplicate offers.

## Implementation
- `lib/marketing/poster-premium-presets.ts`: exact Halloween token source and related Christmas/New Year/Pongal/Avurudu/Deepavali/Tech/Luxury color variants sharing layout grammar.
- `lib/marketing/puter-premium-poster-renderer.ts`: full-resolution Canvas, actual clipped background blur, translucent glass, fitted condensed headline, neon one-time offer, orange pill CTA, verified website/phone/email line icons; refuses copy that cannot fit. Wide uses adapted left-card/right-hero composition.
- `lib/marketing/puter-poster-composer.ts`: premium style invocation, font loading, **explicit user prompt first**, optional seasonal style only if compatible, Gemini creative direction secondary. More reliable for owner podium/geometric-frame instructions; no guarantee the model obeys every detail.
- `app/vendor/marketing/design/puter-lab/typography.css`: OFL Google font import and owner CSS visual tokens (PNG drawing performed in Canvas, not CSS screenshot).
- `app/vendor/marketing/design/puter-lab/page.tsx`: selected premium preset and palette readout; published email toggle; same PNG for preview/download. Puter SDK `auth.isSignedIn()` avoids repeated popups while session remains valid. No auth tokens stored by SLBI.

## Invariants / QA
Owner-only QA route, no Puter provider switch, no private data publication, no automatic paid inference or extra Growth Credits. Existing Gemini voice, business ownership, user-approved CTA/offer and 1080×1920/1080×1350/1080×1080/1200×630 dimensions retained. Exact typography tested by CI contract and browser owner visual QA; real image requests require user consent. CI/build and Vercel Production READY must be verified before claiming deployment. Generated images are not guaranteed to match the supplied reference photo pixel-for-pixel.
