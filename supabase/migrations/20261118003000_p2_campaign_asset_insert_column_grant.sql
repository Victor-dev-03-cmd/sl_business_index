-- P2-30 / 2026-11-18: least-privilege repair for Caption Lab Save to Planner.
-- P2-29 introduced poster_asset_id, and the existing secure column-level
-- INSERT allowlist was not extended. Keep the prior grants and RLS unchanged.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.marketing_campaigns') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='marketing_campaigns'
         AND column_name='poster_asset_id' AND data_type='uuid'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_class
       WHERE oid='public.marketing_campaigns'::regclass AND relrowsecurity
     )
     OR (SELECT count(*) FROM pg_policies
       WHERE schemaname='public' AND tablename='marketing_campaigns'
         AND policyname IN (
           'marketing_campaign_owner_insert',
           'marketing_campaign_owner_read',
           'marketing_campaign_owner_update'
         ))<>3
  THEN
    RAISE EXCEPTION 'Campaign owner-policy or poster column preflight failed; refusing grant';
  END IF;
END
$guard$;

-- Intentionally no table-wide INSERT/UPDATE grant, no anon privileges and no
-- UPDATE permission on poster_asset_id. Existing archived and content updates
-- remain restricted to their previously approved columns and owner RLS.
GRANT INSERT (poster_asset_id) ON TABLE public.marketing_campaigns TO authenticated;

DO $verify$
BEGIN
  IF NOT has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','INSERT')
     OR has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','UPDATE')
     OR has_table_privilege('authenticated','public.marketing_campaigns','INSERT')
     OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
     OR has_table_privilege('authenticated','public.marketing_campaigns','TRUNCATE')
     OR has_table_privilege('anon','public.marketing_campaigns','SELECT')
     OR has_table_privilege('anon','public.marketing_campaigns','INSERT')
  THEN
    RAISE EXCEPTION 'Unsafe campaign table privileges detected; rolled back';
  END IF;
END
$verify$;
COMMIT;
