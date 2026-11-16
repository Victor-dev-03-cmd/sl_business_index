# P2-15 — Puter Studio 3-column compact desktop workspace (2026-11-16)

## Owner's actual request
Owner supplied a screenshot of the completed real Deepavali image with accurate Unicode business text/discount. The current desktop 2-column workspace grows vertically with oversized 2×2 export-format buttons and an oversized long image. Owner requests reuse of the already established Campaign Planner SVG picture-size selector style in smaller cards and a full-width **LEFT input, CENTER poster preview, RIGHT settings** layout that fits desktop viewport without page-length scrolling; mobile may scroll vertically normally.

## What was implemented
- File `app/vendor/marketing/design/puter-lab/PuterCompactFormatSelector.tsx`: four compact SVG picture silhouettes reused from `app/vendor/marketing/campaigns/CampaignFormatSelector.tsx` (same green visual canvas and orange accent). Four cards in one row instead of the original 2×2 large boxes. Accessible radio group, labels, selection state, exact sizes from `POSTER_FORMATS`; Campaign Planner itself is unchanged.
- `app/vendor/marketing/design/puter-lab/page.tsx`: 3-column desktop layout at Tailwind `xl`, left Creation inputs, center exact poster preview/download, right Format/approved copy/contact settings; responsive 2-column `lg` and mobile stacked with poster first.
- Viewport-constrained `xl:h-[calc(100dvh-8.5rem)]`, `min-h-0`, `overflow-hidden`. The center output area has its own height and `object-contain` images, so a tall 9:16 artwork cannot enlarge the desktop page. Left/right panels have independent `xl:overflow-y-auto` for unusually long content while controls remain available. The left Generate/consent control is fixed in the panel footer; center Download button is fixed below the frame.
- Header, owner-QA warning and success/failure messages remain visible in the layout. Important credit and external Puter User-Pays consent remains intact. Previously approved voice recorder, Gemini, exact copy composer, download Blob and owner-only auth are unchanged.
- Full PNG resolution remains 1080×1080, 1080×1350, 1080×1920, 1200×630. Only the **visual preview frame** was reduced; no screenshot export, browser-scale export, database/image-provider/billing change.
- Mobile stays stacked and scrollable, preview before controls. Tablet 1024–1279 widths fall back to 2 columns, no forced overly-narrow three columns.

## Validation
- Existing secure Puter lab regression suite + three new layout tests (responsive column order, source-matched SVG geometry, full exact PNG path).
- Exact-head GitHub CI/Next.js build required before merge. Verify desktop viewport on ~1366×768 and 1700×900; selector size, poster fit, left/right internal scrolling, and portrait/story image not stretching. Confirm mobile scroll and touch size selection.
- User has not yet independently visually QA-tested the new live layout. A build passes syntax and route health, not actual browser visual acceptance.
- **No inference calls should be made by the assistant.** Layout screenshot can be tested using existing saved/generated browser image without another Puter cost.
