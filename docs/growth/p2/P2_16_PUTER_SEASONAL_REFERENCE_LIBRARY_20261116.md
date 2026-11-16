# P2-16 — Seasonal Original Reference Library + User-Pays Image-to-Image + Estimated Progress

Date: 2026-11-16. Private owner QA route only.

## Owner decision
Owner approved prior plan of premium loading, seasonal smart suggestion chips and deep prompt guidance, and proposed a second useful method: show small example poster **reference images** for each suggested campaign style; user selects one to generate with similar visual direction. Asked where to source the images, uncertain whether to fetch from Google. This version includes real original mini artwork files designed by SLBI, not scraped stock or other vendors' posters.

## Source / rights
- Nine lightweight original SVG mini-reference images in `public/poster-references/`: Christmas, New Year, Thai Pongal, Sinhala & Tamil New Year (Avurudu), Deepavali, Halloween, Year-End Deals, Modern Tech and Minimal Luxury. Each is an SVG-only illustration without external image loading, scripts or logos. These belong to SLBI and can safely be curated and used as image input without third-party copyright ambiguity.
- No Google image scraping. External stock library integrations not activated. Pexels API requires its own key and photographer/link credit; Unsplash API requires registered access, hotlinked image URLs and attribution. Before adding stock images to reference catalog, implement a server-side provider/caching/license/attribution strategy and disallow unlicensed copies.
- No internal/business/vendor generated private posters are used as shared templates. A future owner can upload an explicitly licensed reference into private media (separate feature) but this version does not leak photos across tenants.

## Calendar suggestion logic
- Pure module `lib/marketing/poster-reference-library.ts` ranks campaign themes by Sri Lanka calendar month and **next month**. E.g. November shows December Christmas and New Year along with year-end promotions; December suggests next January Thai Pongal. January recommends Thai Pongal; April recommends Avurudu; October/November Deepavali; October Halloween. No invented exact festival dates, and no fixed month for variable-date events outside the curated approximate season.
- The center panel is not empty before first generation: `PuterReferenceGallery` shows actual small original artwork images, curated top six by current/next month, with All Styles switch to browse all nine.
- Clicking a thumbnail chooses the *style only*, not an AI request, and does not edit existing verified business facts, discount, contacts or payment. If user is still on the default Deepavali prompt, replace the sample prompt with a short custom text for chosen campaign and update the unedited default headline. If the user typed a prompt/headline manually, preserve it.
- Rich prompt style direction is stored in the TS catalog, not shown in the mini-card. Behind-the-scenes art prompt is the combination of selected style, any reviewed Gemini creative brief, the user's exact campaign idea, verified business category/city, chosen export ratio and no-typography rules.

## True input-image reference
- Official Puter `puter.ai.txt2img` API documents `options.input_images` for every provider, accepting Blob/File, base64, data URI or public URL. Source: https://docs.puter.com/AI/txt2img/ (checked 2026-11-16).
- **Default:** use selected reference's art direction as text-only prompt guidance. No reference image is uploaded to Puter.
- **Opt-in:** user explicitly checks "Also send this original preview image ...". The SLBI original SVG gets validated, loaded from same origin, rendered into 640×512 PNG `Blob` in-browser, and is sent to `puter.ai.txt2img(creative,{...,input_images:[blob]})`. Puter might upload Blob temporarily to the user's Puter account. No model guarantee of copying exact thumbnail pixels, and the intent is visual style, not plagiarized replication.
- Re-selecting a new reference resets image upload consent to false. Existing separate checkbox for **real User-Pays AI usage** remains enforced; no pay-as-you-go generation on clicking thumbnails.

## Premium loading UX
- New `PuterGenerationMotion` component draws a stable animation inside the center poster frame, with art thumbnail, shimmer, aurora, subtle grid, SVG icons and stage-dependent texts.
- Stage labels connecting → image inference → exact text composition → complete. Provider offers no progress callback: the percentage is explicitly **estimated**. It rises to 89% maximum while the remote image model runs, switches to 94% on browser typography, and reaches **100% only after Blob export succeeds**. Does not misrepresent estimated time as real provider telemetry. Reduced-motion CSS disables animations if requested by OS.
- No automatic re-generation or paid retries; no quotas/credits/provider or server changes.

## QA
- Owner-only Puter Lab and normal production login untouched; exact copy, Noto Tamil/Sinhala/English, 4 PNG sizes, browser download unaffected.
- Added focused tests to `tests/p2PuterBrowserLab.test.mjs`: original SVGs, seasonal ranking code and month, no remote image scraping, explicit image-upload opt-in, honest percentages, motion reduction, selected styles and 3-column layout.
- Require exact-head CI green, Next.js/TypeScript build and Vercel production READY. Owner must perform browser rendering and opt-in image-reference testing (possibly billable) and verify style consistency, costs and text quality.
- **Future** planned separately: polished brand typography hierarchy, icon-based website/phone/email footer, reference library editor and vendor-specific template licensing. Do not claim these already implemented.
