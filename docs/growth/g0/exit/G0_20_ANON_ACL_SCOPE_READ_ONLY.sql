-- G0-20 LIVE SAFE, SELECT-ONLY EFFECTIVE PRIVILEGE SNAPSHOT.
-- Excludes customer rows, token values and raw PII. Do NOT confuse grants with
-- effective row access; RLS must be checked independently and runtime JWT tested.
WITH scoped AS (
 SELECT c.oid,n.nspname,c.relname,c.relrowsecurity,
        c.relacl::text AS acl_text
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public'
   AND c.relname IN (
     'businesses','profiles','leads','reviews',
     'marketing_campaigns','slbi_lead_request_receipts'
   )
), baseline AS (
 SELECT relname,relrowsecurity,acl_text,
    pg_catalog.has_table_privilege('anon',oid,'SELECT') AS anon_select,
    pg_catalog.has_table_privilege('anon',oid,'INSERT') AS anon_insert,
    pg_catalog.has_table_privilege('anon',oid,'UPDATE') AS anon_update,
    pg_catalog.has_table_privilege('anon',oid,'DELETE') AS anon_delete,
    pg_catalog.has_table_privilege('authenticated',oid,'INSERT') AS authenticated_insert,
    pg_catalog.has_table_privilege('authenticated',oid,'UPDATE') AS authenticated_update,
    pg_catalog.has_table_privilege('authenticated',oid,'DELETE') AS authenticated_delete
 FROM scoped
)
SELECT relname,relrowsecurity,anon_select,anon_insert,anon_update,anon_delete,
  authenticated_insert,authenticated_update,authenticated_delete,
  pg_catalog.md5(acl_text) AS acl_md5,
  CASE
    WHEN relname IN ('businesses','profiles')
      THEN 'Candidate: revoke anon INSERT/UPDATE/DELETE after restore+physical copy'
    WHEN relname='leads'
      THEN 'Keep anon INSERT; candidate only revokes anon UPDATE/DELETE'
    ELSE 'Observation only; no changes proposed'
  END AS disposition
FROM baseline ORDER BY relname;

SELECT schemaname,tablename,policyname,cmd,roles
FROM pg_catalog.pg_policies
WHERE schemaname='public'
  AND tablename IN ('businesses','profiles','leads')
ORDER BY tablename,cmd,policyname;
