-- P2-31: Restore the existing column-only campaign write allowlist.
-- All owner access stays under marketing_campaign_owner_* RLS policies.
BEGIN;
REVOKE INSERT, UPDATE ON TABLE public.marketing_campaigns FROM authenticated;
DO $verify$
BEGIN
  IF has_table_privilege('authenticated','public.marketing_campaigns','INSERT')
    OR has_table_privilege('authenticated','public.marketing_campaigns','UPDATE')
    OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
    OR has_table_privilege('anon','public.marketing_campaigns','SELECT')
    OR NOT has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','INSERT')
    OR has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','UPDATE')
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.marketing_campaigns'::regclass)
  THEN RAISE EXCEPTION 'Campaign permissions outside approved owner-only allowlist'; END IF;
END $verify$;
COMMIT;
