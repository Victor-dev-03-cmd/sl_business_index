# Campaign Planner V2: source / schema release and hands-on QA
Status written 2026-11-14. This is a **release handoff**, not a claim of completed authenticated browser testing.

## What changed
- Basic vendor may load a saved draft, edit fields and save back to the same RLS-owned record; 3-locale language selection localized form instructions.
- New Campaign resets fields, Duplicate loads without editing id, scheduled edit keeps planning status, archived/restore is reversible and auditable.
- PNG renderer does not truncate words with ellipsis. Browser Canvas measures all Unicode grapheme-based wrapped lines, shrinks font with bounded minimum and rejects too-long content with a clear message.
- Vector shape selector shows Square (1080×1080), Portrait feed (1080×1350), Phone story (1080×1920), Landscape (1200×630).
- No social provider posting, email sending, AI spending or Pro unlock.

## Live Supabase evidence
- Schema migration `20261114144023 p2_campaign_planner_v2_editable_brief_archive` applied successfully.
- Historical 3 campaign records preserved, 2 existing audit revisions retained, 0 backfilled briefs, 0 archived.
- Role privilege checks: anon SELECT=false, authenticated DELETE=false, business_id UPDATE=false, brief INSERT/UPDATE=true, is_archived UPDATE=true.
- Existing owner RLS and Pro restrictions remain intact.

## GitHub CI
- Draft PR #78 staged source `9502a17b82fc4dd260f8dba2b4d7fb08d45192d7` returned 6/6 workflow families SUCCESS including disposable PG17, tsc, Next build, Billing/P1 regression.
- This documentation will accompany the same code PR. After latest PR head CI success, merge then verify Vercel PROD. Track actual merge/production SHA in PR comment or tracked issue.

## User QA on https://www.slbusinessindex.com/vendor/marketing/campaigns
1. Log into a Basic vendor with an owned business.
2. In Library, open old Tamil draft via Edit: verify all content appears; optional legacy paragraph conversion is not semantic AI translation.
3. Change an offer and click Save/Update. Refresh; verify one existing row changed, no duplicate, revision audit appended.
4. Click New Campaign; verify all previous offer/CTA/terms/date entries clear. Save a new draft, verify Library.
5. Duplicate a record; edit and save. Verify new row separately.
6. Edit a planned record and save; confirm its planned status/date remain unless intentionally cleared.
7. Archive a draft; it disappears from Active and appears in Archived; Restore returns it to Active. No hard deletion.
8. Choose each vector size and download 4 PNGs. With long Tamil text (including emojis), no silent crop; overflow must offer warning. Test actual Tamil fonts on phones and desktop.
9. Change language to Sinhala and English and verify labels, placeholders, buttons and guidance switch; text is NOT automatically translated.
10. Ensure no social auto-post, connector or paid Pro actions started.

## Rollback caution
Frontend could be rolled back independently. New DB columns are additive; do not drop them while edited draft records depend on them. Any rollback should preserve campaign rows, revision history and basic access.
