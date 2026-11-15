# SLBI P2-12 — Fixed-aspect Studio preview and exact multilingual poster typography

**Owner review:** 2026-11-15. The owner confirmed one real Cloudflare generated 9:16 poster, accurate 1080×1920 download but severe spelling, service copy and 25% offer corruption. Screenshot: gibberish "Celeberatac", "Deepaavaliil", duplicated percent and fabricated bottom copy. Must not ship to paying vendor as publish-ready typography.

## Verified current architecture
- Gemini Flash-Lite handles voice/intent (not text drawing). Image provider on production is Cloudflare `@cf/black-forest-labs/flux-2-klein-4b`, **not** Hugging Face. Provider adapter also contains old HF `black-forest-labs/FLUX.1-schnell` generation and `Qwen/Qwen-Image-Edit-2509` edit branches, but production `SLBI_POSTER_IMAGE_PROVIDER=cloudflare`.
- Current image model draws text directly into pixels; no trained spell checker can ensure all business names, Tamil/Sinhala word shaping, numbers, 25% offers and URLs.
- Generated job code resizes model image to exact formats via Sharp: square 1080×1080, feed 1080×1350, story 1080×1920, wide 1200×630. User's supplied story PNG metadata verified 1080×1920. Preview was not pinned to stage dimensions: original `max-h-full w-auto max-w-full` could change sizes after intrinsic image load.

## Preview fix in this PR
- A single `poster-aspect-frame` measured via ResizeObserver, clamped by both stage width and height for any format. It remains the same between progress spinner and final PNG.
- Reserve action footer height in both phases, avoiding a jump when Download/Share controls appear. Keep private PNG and download resolution untouched, use object-contain rather than crop.
- Existing LEFT controls/RIGHT output, mobile stacking, progressive estimated percentage, never 100 before true PNG load unchanged.

## Exact-typography design: next separate feature, not merged with preview
1. **Trusted text brief.** Validate the vendor's raw exact prompt, published selected-business facts, permitted offer terms and preferred output language, using Gemini only to detect intent/organize optional headings. Return structured `businessName`, `headline`, `offer`, `details`, `cta`, `publishedContact`, `language`. Do not auto-translate or invent an offer, phone, domain or pricing; 25% stays exactly 25%.
2. **Artwork only.** Ask the image provider for hero photography/illustration, atmospheric texture, lighting and **NO letters, numerals, slogans, symbols, pseudo-glyphs, watermarks or UI text**. Leave configurable dark/bright copy-safe visual zones. Validate text-free prompt and manually test the model does not sneak in glyphs. Never place a new overlay over a gibberish-filled existing image without regenerating/cleaning the background.
3. **Deterministic type/composition.** Server-side Sharp text/SVG composite with predictable layout grids and brand-safe text zones, actual Unicode shaping via a bundled licensed font family supporting Tamil and Sinhala (e.g. Noto Sans Tamil, Noto Sans Sinhala) plus a contemporary Latin family. Validate Vercel runtime font deployment and Pango complex-script shaping; SVG/foreignObject browser support should not be assumed. Use readable contrast, line breaks, punctuation, prices/%, safe margins, precise locale and aspect-specific auto layout. Vendor need not manipulate X/Y/layers.
4. **Edit workflow.** Retain owner-private background/artwork separate from the export master. AI prompt edits background only where applicable, then composite exact current text again. A text-only change should not make a costly image-model call; preserve secure owner/job checks. Distinguish new credit prices/settlement from existing 8 credits after billing review. No opaque source access or public assets.
5. **Output.** Save the composed final PNG privately at 1080×1080, 1080×1350, 1080×1920 or 1200×630; download that identical finished file. Accessible live preview must match export with zero stretched typography. Keep owner-owned job history.
6. **QA.** Test 3 languages × 4 formats × real categories, exact spellings, business/contact, 25% and other digits, ligatures, text wrapping, small-screen thumbnails and legibility; avoid OCR as sole verifier. Check failure refunds and RLS. Do not increase daily image cap or switch to charged Hugging Face inference without owner review.

## Model tradeoff
- Text fidelity of current FLUX.2 Klein 4B is weak, but swapping to older HF FLUX.1 Schnell alone will **not** guarantee Tamil/Sinhala or brand accuracy.
- Qwen-Image-2512, Qwen Image Edit 2511 or other stronger recent open weights may be A/B evaluated for artistic layout; model cards benchmark mostly EN/ZH, not Tamil/Sinhala. Their HF API model availability, inference costs, current quota and licensing must be checked before use. Training/fine-tuning is not first fix; the poster needs reliable type composition before any costly LoRA dataset.
- No standalone model inference, quota changes or provider switch executed as part of this preview PR.

## Release acceptance
- Exact PR-head CI all green, production merge only when appropriate. Check actual owner-browser progress vs final ratio; image export stays 1080×1920. Mobile CSS also checked for no overflow or frame shift.
- This PR is a UI-only fixed-preview patch plus documented exact-typography plan. Do not claim that it fixes existing gibberish or that a polished typography engine has shipped.
