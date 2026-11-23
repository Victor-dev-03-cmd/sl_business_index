-- SLBI G0: catalog-only security posture inspection; strictly read-only.
-- Does not replace current PRE_RELEASE_READ_ONLY.sql or Supabase Security Advisor.
-- No customer records, tokens, or function definitions are selected.
WITH function_inventory AS (
 SELECT p.oid,p.proname,p.prosecdef,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
  coalesce(array_to_string(p.proconfig,',') LIKE '%search_path%',false) AS has_pinned_path,
  e.extname AS extension_owner
 FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 LEFT JOIN pg_depend dep ON dep.classid='pg_proc'::regclass AND dep.objid=p.oid AND dep.deptype='e'
 LEFT JOIN pg_extension e ON e.oid=dep.refobjid
 WHERE ns.nspname='public'
), app_definers AS (
 SELECT * FROM function_inventory WHERE prosecdef AND extension_owner IS NULL
), private_table_acl AS (
 SELECT c.relname,c.relrowsecurity,
  has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('marketing_connection_secrets','marketing_oauth_intents','slbi_lead_request_receipts')
), postgis_system_table AS (
 SELECT e.extname AS extension_owner
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e'
 LEFT JOIN pg_extension e ON e.oid=d.refobjid
 WHERE n.nspname='public' AND c.relname='spatial_ref_sys'
)
SELECT 'app_anon_security_definers' AS check_name,
 count(*) FILTER (WHERE anon_exec)::text AS value
FROM app_definers
UNION ALL
SELECT 'app_definers_without_pinned_search_path',
 count(*) FILTER (WHERE NOT has_pinned_path)::text
FROM app_definers
UNION ALL
SELECT 'private_tables_with_unsafe_read_acl',
 count(*) FILTER (WHERE NOT relrowsecurity OR anon_select OR auth_select)::text
FROM private_table_acl
UNION ALL
SELECT 'postgis_system_reference_extension_owned',
 CASE WHEN count(*)=1 AND bool_and(extension_owner='postgis') THEN 'YES' ELSE 'REVIEW_REQUIRED' END
FROM postgis_system_table;
