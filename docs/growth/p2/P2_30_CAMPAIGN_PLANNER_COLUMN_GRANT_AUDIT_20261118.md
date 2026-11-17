# P2-30 — Caption Lab Save to Planner permission fix & complete Planner permission audit

**Date:** 2026-11-18 (Asia/Colombo).  
**Branch:** `fix/p2-campaign-planner-column-grant-20261118`.  
**Status when staged:** Production database hotfix applied and independently verified; Docker synthetic tenant regression, exact-head CI, PR merge and Vercel READY still to be recorded.

## Reported issue

Owner retried the **Save to Planner** button in AI Caption Lab after P2-29, seeing **`permission denied for table marketing_campaigns`** and asked to check that all related controls work, not just provide instructions to adjust permissions manually.

## Verified production root cause

The P2-29 migration `20261117210000_p2_caption_planner_private_poster_asset_ref.sql` added nullable `poster_asset_id UUID`, and Caption Lab's `savePlanner` always sent `poster_asset_id:posterAssetId||null` on the Supabase browser insert. However, P2-05 had deliberately **revoked table-wide INSERT/UPDATE** and issued strict, explicit **column-level grants**. The P2-29 migration did not extend the authenticated INSERT column allowlist.

Read-only Supabase production audit before the repair:
- `has_table_privilege('authenticated','public.marketing_campaigns','SELECT')=true` but table-wide `INSERT=false` and `UPDATE=false` **by design**.
- Approved business_id, banner_text, banner_color, platforms, scheduled_at, status, brief columns had INSERT grants.
- New `poster_asset_id` had **INSERT=false**, while **SELECT=true** and **UPDATE=false**.
- Three owner RLS policies already existed; `relrowsecurity=true`; no anonymous campaign access; DELETE/TRUNCATE denied.
- One `slbi_marketing_campaign_history` audit trigger records inserts/updates via its trusted function; browser cannot directly insert into revisions.

This is a **PostgreSQL column GRANT** mismatch, not a missing RLS policy and not a reason to use a service role in the browser. Supabase's current Data API docs distinguish grants from RLS and document a 42501 when table/column access is missing.

## Production fix actually applied

Migration: `supabase/migrations/20261118003000_p2_campaign_asset_insert_column_grant.sql`.

Only privilege change:

```sql
GRANT INSERT (poster_asset_id)
  ON TABLE public.marketing_campaigns TO authenticated;
```

The migration has transaction, preflight for the three owner RLS policies/UUID column, and postflight to reject broad INSERT, DELETE, TRUNCATE, anon visibility or poster asset UPDATE grants. **No wide-open INSERT, no anon grants, no RLS disable/alter, no service-role browser bypass.**

**Verified production Supabase result after migration:**
- `can_insert_asset=true`, `can_update_asset=false`, `broad_insert=false`, `can_delete=false`, `can_truncate=false`, `anon_select=false`, `rls_enabled=true`.
- Under actual PostgreSQL `SET LOCAL ROLE authenticated`, `EXPLAIN INSERT` of the Caption Lab's exact columns (including `poster_asset_id`) **succeeded without writes**. Before migration a missing column grant caused the permission failure.
- An attempted anonymous `EXPLAIN INSERT` failed with 42501, as expected. The test does not execute any production campaign mutations, provider requests or credit charges.

## Related controls audited

**Caption Lab:** owner business selection; image attach (local and owner-private); voice Send/quota; language and tone; explicit Gemini Generate via existing credit-reserved/refunded API; copy and hashtags; local Quick Polish; Save to Planner with exact seven-field validated `brief` and persistent poster UUID. No changes made to model, quotas or prices.

**Campaign Planner:** owner READ/LIBRARY; manual draft INSERT, status scheduled via owner UPDATE; edit text/brief; archive/restore via owner-only `is_archived`; poster asset read; historical audit trigger. The existing column grants cover these fields. No direct deletion or browser publication rights.

**Poster Studio:** explicit Save Poster, private owner/biz scoped PNG upload, list, download, and Caption Lab attach; no public bucket URLs and no automatic provider retries.

To prevent repeat regressions, CI's `docker-campaign-approvals` job now applies P2-29 and P2-30 migrations in synthetic Postgres 17 after prior P2-05 and V2 contracts. `tests/p2-campaign/poster-asset-grants-verify.sql` tests owner A INSERT of linked UUID, UPDATE/SCHEDULE, ARCHIVE/RESTORE, revision audit, malformed seven-key brief rejection, disallow updating poster UUID, and owner B inability to read, archive or insert into owner A campaigns. `tests/p2CampaignPlannerColumnGrant.test.mjs` statically verifies the critical exact minimal GRANT and UI/server references. **Never run these synthetic DML tests against production.**

## Release and genuine owner QA

Record the PR number, exact SHA, all relevant CI results, squash merge SHA and Vercel production receipt after verification. The **database permission fix is live immediately**, independent of a frontend code release; remaining GitHub changes document and regression-gate it.

Signed-in owner browser E2E is still required to confirm full user journey:
1. Refresh Caption Lab, select verified owned business, reuse an existing caption (no AI inference required), Save to Planner. Confirm success without error.
2. Open Campaign Planner Library; verify new draft displays exact text and linked PNG; archive/restore draft; edit/schedule a manual draft.
3. Create/attach or download a small existing private poster through Studio/Caption Lab; confirm access restricted to owning business and it persists after reload. **Avoid generating a new paid image just to check save.**
4. Only if expressly testing Gemini, use a single-language CTA containing the verified business phone and review credits/refunds. The current DB fix cannot guarantee external Gemini provider success.

No customer/browser authenticated E2E was executed during the database hotfix. This document keeps that distinction explicit.
