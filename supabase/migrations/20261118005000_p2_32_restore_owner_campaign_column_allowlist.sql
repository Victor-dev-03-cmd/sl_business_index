-- P2-32: Explicit owner-scoped column allowlist for Campaign Planner.
-- A table-level REVOKE also clears PostgreSQL per-column grants, so restore
-- only the pre-existing safe fields plus P2-30's poster_asset_id INSERT.
BEGIN;
GRANT INSERT (business_id,banner_text,banner_color,platforms,scheduled_at,status,brief,poster_asset_id)
  ON TABLE public.marketing_campaigns TO authenticated;
GRANT UPDATE (banner_text,banner_color,platforms,scheduled_at,status,brief,is_archived)
  ON TABLE public.marketing_campaigns TO authenticated;
DO $verify$
BEGIN
  IF NOT has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','INSERT')
    OR has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','UPDATE')
    OR has_table_privilege('authenticated','public.marketing_campaigns','INSERT')
    OR has_table_privilege('authenticated','public.marketing_campaigns','UPDATE')
    OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
    OR has_table_privilege('anon','public.marketing_campaigns','SELECT')
    OR NOT has_column_privilege('authenticated','public.marketing_campaigns','banner_text','UPDATE')
    OR NOT has_column_privilege('authenticated','public.marketing_campaigns','business_id','INSERT')
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.marketing_campaigns'::regclass)
  THEN RAISE EXCEPTION 'Campaign column permissions not restored safely'; END IF;
END $verify$;
COMMIT;
