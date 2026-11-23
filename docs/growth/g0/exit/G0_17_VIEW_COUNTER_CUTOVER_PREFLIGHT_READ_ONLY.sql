-- G0-17 RELEASE READINESS: SELECT-only catalog preflight.
-- Safe for production, but its output is NOT authorization to apply SQL.
-- Never executes the counting RPC or writes any analytics events.
-- Check output under staging first, then compare separately with production.
WITH identified AS (
  SELECT
    to_regprocedure('public.slbi_record_verified_business_view(uuid,uuid,text,text)') AS verified_oid,
    to_regprocedure('public.increment_business_views(uuid)') AS legacy_oid,
    to_regprocedure('public.slbi_record_growth_event(uuid,uuid,text,text,text)') AS ingestion_oid
), expectations AS (
  SELECT
    verified_oid IS NOT NULL AS additive_rpc_installed,
    CASE WHEN verified_oid IS NOT NULL
      THEN has_function_privilege('service_role', verified_oid, 'EXECUTE')
      ELSE false END AS verified_service_execute,
    CASE WHEN verified_oid IS NOT NULL
      THEN has_function_privilege('anon', verified_oid, 'EXECUTE')
      ELSE false END AS verified_anon_execute,
    CASE WHEN verified_oid IS NOT NULL
      THEN has_function_privilege('authenticated', verified_oid, 'EXECUTE')
      ELSE false END AS verified_authenticated_execute,
    CASE WHEN legacy_oid IS NOT NULL
      THEN has_function_privilege('anon', legacy_oid, 'EXECUTE')
      ELSE false END AS legacy_anon_execute,
    CASE WHEN legacy_oid IS NOT NULL
      THEN has_function_privilege('authenticated', legacy_oid, 'EXECUTE')
      ELSE false END AS legacy_authenticated_execute,
    ingestion_oid IS NOT NULL AS ingestion_rpc_installed
  FROM identified
)
SELECT e.*,
  (SELECT NOT p.prosecdef
     FROM pg_proc p JOIN identified x ON p.oid=x.verified_oid) AS verified_security_invoker,
  (SELECT COALESCE('search_path=""'=ANY(p.proconfig), false)
     FROM pg_proc p JOIN identified x ON p.oid=x.verified_oid) AS verified_pinned_path,
  (to_regclass('public.analytics_logs') IS NOT NULL) AS analytics_logs_present,
  (to_regclass('public.growth_event_rate_limits') IS NOT NULL) AS rate_limits_present,
  (SELECT COALESCE(c.relrowsecurity,false) FROM pg_class c
     WHERE c.oid=to_regclass('public.analytics_logs')) AS analytics_logs_rls,
  (SELECT COALESCE(c.relrowsecurity,false) FROM pg_class c
     WHERE c.oid=to_regclass('public.growth_event_rate_limits')) AS rate_limits_rls
FROM expectations e;
