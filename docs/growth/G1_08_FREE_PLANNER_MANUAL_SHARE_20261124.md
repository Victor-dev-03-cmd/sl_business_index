# G1-08 — Free Campaign Planner: Manual Native Caption Sharing
Date: 2026-11-24 (Asia/Colombo). Release candidate until exact CI, merge and Vercel READY verified.

## User-visible page
`/vendor/marketing/campaigns` → **Live Caption Preview** gains **Share caption manually** alongside Copy and Download text. On Web Share API-capable mobile browsers, clicking opens the native OS share sheet for vendor-selected destination. On unsupported desktop browsers, clicking copies the caption, if Clipboard API is available. User canceled share is silent; a failed share does not silently copy or post. Labels and explanatory copy available in English, Tamil and Sinhala.

This is the **text caption only**. PNG poster can still be downloaded manually in the original four formats. No automatic posting, new social provider access, AI generation, paid credits, billing or DB change. The selected business, approved G1 facts and free saved campaign workflow are unchanged.

## Code/tests
- `lib/marketing/campaign-manual-share.ts`: injected native share vs clipboard fallback; calls share synchronously before first await to preserve mobile user gesture; distinct canceled, unavailable, failed, copied, sheet-closed (never claims posted).
- `app/vendor/marketing/campaigns/page.tsx`: explicit button handler, disabled until selected business and meaningful text, separate toast status.
- `lib/marketing/campaign-language.ts`: EN/TA/SI translations.
- `tests/p2CampaignPlannerManualShare.test.mjs`: native, desktop fallback, canceled/failed no-autocopy, invalid input and no loss of existing Planner actions. Dedicated `verify-nextjs.yml` step.
- Signed-in physical Android/iOS native share and desktop clipboard user acceptance not yet evidenced by synthetic CI.

## Release and safety
Require exact full PR head CI all green, squash merge, Vercel production READY matching main SHA and www alias. Record actual release SHA and deployment ID in merged PR, which supersedes candidate note. No G0 production SQL: 0/7 foundation gates owner-accepted, independent encrypted backup/isolated restore/external physical copy plus exact scope still pending. Desktop browser GPS physical retest remains a blocker.
