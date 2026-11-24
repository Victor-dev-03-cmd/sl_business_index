-- G0-21 repeatable live READ-ONLY ACL audit. No row data, credentials, SQL body.
-- Default privileges depend on the CREATING role and schema. Only postgres/public
-- is included in the candidate; other owners and implicit PUBLIC function EXECUTE
-- require explicit separate assessment and cannot be inferred from this query.
WITH future_grants AS (
 SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS creator,
        COALESCE(n.nspname,'<global>') AS target_schema,
        d.defaclobjtype AS object_type,
        CASE WHEN a.grantee=0 THEN 'PUBLIC'
             ELSE pg_catalog.pg_get_userbyid(a.grantee) END AS grantee,
        a.privilege_type
 FROM pg_catalog.pg_default_acl d
 LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
 CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
 WHERE n.nspname='public' OR d.defaclnamespace=0
)
SELECT creator,target_schema,object_type,grantee,
       array_agg(privilege_type ORDER BY privilege_type) AS explicit_default_grants
FROM future_grants
GROUP BY creator,target_schema,object_type,grantee
ORDER BY creator,target_schema,object_type,grantee;

-- Existing object ACLs remain independent from any ALTER DEFAULT PRIVILEGES.
SELECT c.relname AS table_name,c.relrowsecurity,
       pg_catalog.has_table_privilege('anon',c.oid,'SELECT') AS anon_read,
       pg_catalog.has_table_privilege('anon',c.oid,'INSERT') AS anon_insert,
       pg_catalog.has_table_privilege('anon',c.oid,'UPDATE') AS anon_update
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('businesses','profiles','leads','marketing_campaigns','growth_credit_wallets')
ORDER BY c.relname;
