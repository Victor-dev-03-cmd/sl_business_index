# P2-19 — SLBI Poster Design Blueprint v2 (Owner Architecture)

Date: 2026-11-16. Owner explicitly supplied complete proposed architecture, fonts, strict Gemini JSON and roadmap; preserve this design as the normative long-term direction.

## 1. End-to-end pipeline, as approved
Vendor input = typed Tamil/Sinhala/English/Tanglish, manually stopped voice transcription, or one-click seasonal/category chip. Use selected **owner-verified business facts**. The backend calls Gemini only on an **explicit Prepare with Gemini** click and returns a verified structured design blueprint; its client-side branches are (a) a user-first, text-free Puter image art prompt and (b) an allowlisted multilingual font, palette and design configuration for the full-resolution browser Canvas. Vendor can review/edit all copy BEFORE separately consenting to real User-Pays image generation. No automatic paid calls or server image storage.

**Engineering refinement:** There are two data-dependent stages, not literally everything in parallel: Gemini JSON must complete before Puter can use its art brief. Once the JSON exists, font loading may execute independently/concurrently with Puter image generation. Final Canvas composition needs BOTH decoded artwork and loaded fonts. Changes to font/color/copy alone recompose the browser Blob at zero Puter image requests.

## 2. Exact proposed strict JSON
```json
{
  "posterCopy": {"headline": "string", "offerText": "string", "ctaText": "string"},
  "styling": {
    "vibe": "festive | modern_tech | luxury | bold_sale | warm_retail",
    "headlineFont": "allowlisted Google Font family",
    "bodyFont": "allowlisted Google Font family",
    "primaryColor": "#RRGGBB",
    "accentColor": "#RRGGBB",
    "textColor": "#RRGGBB",
    "overlayGradient": "dark_bottom_top | subtle_vignette"
  },
  "imagePrompt": "English text-free rich art direction"
}
```
Stored as validated value **in current owner browser memory only**, not in a public DB. Server rejects invalid IDs/colors/fonts/unknown vibe/gradient, ungrounded percentages and invented contacts. If Gemini's two fonts are individually allowlisted but not an approved pair, pair is normalized to a pretested combination; no dangerous arbitrary CSS/URLs. Preserve exact input intent. No made-up brand, offer, contact, price, certification or date.

## 3. Font roles and multilingual design
Tamil modern: Noto Sans Tamil + Hind Madurai; festive: Noto Serif Tamil + Mukta Malar; decorative: Kavivanar + Mukta Malar.
Sinhala modern: Gemunu Libre + Noto Sans Sinhala; classic: Abhaya Libre + Noto Sans Sinhala.
English impact: Anton + Montserrat, modern: Montserrat + Poppins, luxury: Playfair Display + Plus Jakarta Sans, condensed tech: Bebas Neue + Inter. Each font pair loaded via licensed Google Fonts CSS; selected pairing also `document.fonts.load` in advance. Existing Noto fonts remain for glyph shaping/fallback. Tamil/Sinhala display line-height >=1.3 and script-sensitive sizing, while Latin condensed display may use 0.9. Hard font width/height bounds before PNG export; no silent cropping.

Dynamic contrast is protected by dark overlays and safe light text on the dark glass; palette cannot supply arbitrary script styles. The final 1080×1920/1080×1350/1080×1080/1200×630 PNG is Canvas-rendered (not a CSS screenshot). The premium reusable fonts, CTA, verified contact icons and adaptive glass card from P2-17/18 remain.

## 4. Suggestions
Original SLBI reference mini posters remain in center. New small **chip suggestions** appear in left panel, ranked by Sri Lanka calendar month and matching business category. Includes Thai Pongal, Avurudu, Vesak, Ramadan, Christmas, New Year, Black Friday, Grand Opening, Mega Sale, New Arrivals, Admissions Open and Free Delivery. A chip edits the vendor request and may choose its reference artwork; it does **not** automatically send a Gemini request, charge Puter or assert a discount. Vendor clicks Prepare for one quota-counted Gemini JSON call.

## 5. Layout and no-cost shuffle
Three safe-zone templates: Top-Center Hero (existing), Bottom-Left Editorial (headline left, partial-width card) and Split Card (narrower side card, hero visible). Visual quality still depends on the AI source art; a flat Puter image cannot guarantee segmentation of a 3D pumpkin in front of rendered headlines. `Shuffle font & colors` cycles licensed/pretested pairs and curated palettes locally. Original exact user copy, verified business data and source artwork unchanged; no paid regeneration.

## 6. Voice-to-JSON decision
Google Gemini docs support audio-to-structured-output and direct audio input. **Do not assume a 50% cost reduction:** token pricing, length, model capability, retry and transcription review affect cost. The user provided `Gemini 2.5 Flash` as an example, but this project currently uses Gemini 3.5 Flash Lite for the pre-existing production flows. Current stable reviewed voice→text remains as-is; no billable model change or new raw-audio Gemini endpoint activated in this first version. A one-call direct audio transcript+blueprint endpoint requires an owner-controlled pilot, server quota/size/MIME ownership verification, accurate `transcript` returned for human approval, and a repeatable multilingual evaluation before switching; do not silently remove human review.

## 7. Source and file map
- `lib/marketing/poster-design-blueprint.ts`: pure client/server schema, validated font pair/palette, category/season chips and shuffle/layout values.
- `lib/marketing/poster-gemini-design-blueprint.ts`: server-only Gemini structured JSON with strict validated response, user-request precedence and no secret leakage. Uses current configured model, Google `generateContent` JSON MIME mode and server side schema validation. Note: JSON schema currently supplied as system instruction because prior provider schema-on-wire sometimes failed; semantic validation is authoritative.
- `app/api/marketing/poster/puter-lab/route.ts`: independent `mode:'blueprint'` on existing owner-only POST after existing same-origin validation and atomic shared daily voice/brief quota reservation. Legacy brief request remains supported.
- `app/vendor/marketing/design/puter-lab/page.tsx`: one-click chips, editable Gemini blueprint, local shuffle, safe-zone selector, selected-font warm-up and original no-credit/real billing consent.
- `lib/marketing/puter-poster-composer.ts`: true output PNG/selected font loader.
- `lib/marketing/poster-premium-presets.ts` and `puter-premium-poster-renderer.ts`: safe design-overrides into actual PNG, Tamil/Sinhala shaping, glass and graphic hierarchy.
- `app/vendor/marketing/design/puter-lab/typography.css`: only OFL Google Font CSS, never ship files as attachments.

## Security, budget and release
Internal QA owner only; **do not** widen to all Pro vendors yet. No change to main Cloudflare production poster provider, Growth Credits, Puter User-Pays external charges, quotas, verified business ownership or login Turnstile. Gemini and Puter remain separate explicit action boundaries. No DB migration or poster asset storage.
Require exact-head 15/15 GitHub CI (security, billing, RLS, Next.js and contracts) before merge, and Vercel Production `READY` for `www.slbusinessindex.com`. User-browser visual QA for one Tamil, Sinhala, English poster in all four formats plus real selected brand fonts and original voice transcript is still needed before public Pro rollout.
