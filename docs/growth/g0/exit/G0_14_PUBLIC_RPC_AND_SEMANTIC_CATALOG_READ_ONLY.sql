-- G0-14 SELECT-only catalog checks; no production writes, no customer rows.
-- Pin actual function signatures: do not drop/recreate/revoke on the basis of this audit.
WITH public_endpoints AS (
  SELECT p.oid::regprocedure::text AS routine,
         p.prosecdef AS security_definer,
         has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
         (SELECT x FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) AS x
             WHERE x LIKE 'search_path=%' LIMIT 1) AS pinned_path,
         md5(pg_get_functiondef(p.oid)) AS definition_md5
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN
      ('get_nearby_businesses','get_global_search_suggestions','increment_business_views')
)
SELECT routine,security_definer,anon_execute,
       coalesce(pinned_path,'UNPINNED') AS search_path_setting,definition_md5
  FROM public_endpoints ORDER BY routine;

SELECT n.nspname AS object_schema,c.relname AS object_name,
       c.relrowsecurity AS rls_enabled,
       string_agg(a.attname,', ' ORDER BY a.attnum) AS column_names
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE c.relkind IN ('r','p') AND
       ((n.nspname IN ('slbi_search_internal','slbi_search_lab') AND
          c.relname IN ('business_embeddings','relevance_judgments')) OR
        (n.nspname='public' AND c.relname IN
          ('search_evaluation_cases','search_relevance_reviews','vendor_notification_preferences')))
 GROUP BY n.nspname,c.relname,c.relrowsecurity ORDER BY n.nspname,c.relname;

SELECT n.nspname AS object_schema,c.relname AS object_name,
       con.conname AS constraint_name,md5(pg_get_constraintdef(con.oid)) AS constraint_md5
  FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('slbi_search_internal','slbi_search_lab')
   AND c.relname='business_embeddings' ORDER BY n.nspname,c.relname,con.conname;

SELECT schemaname,tablename,policyname,cmd,roles,
       md5(coalesce(qual,'')) AS using_md5,
       md5(coalesce(with_check,'')) AS check_md5
  FROM pg_policies
 WHERE (schemaname='public' AND tablename='vendor_notification_preferences')
    OR (schemaname='storage' AND tablename='objects'
        AND policyname IN ('Vendor uploads own business verification docs','Users can view own verification docs'))
 ORDER BY schemaname,tablename,policyname;
