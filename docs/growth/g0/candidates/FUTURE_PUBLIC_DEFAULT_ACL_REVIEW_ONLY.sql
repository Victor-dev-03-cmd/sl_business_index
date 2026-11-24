-- G0-21 REVIEW ONLY. This is NOT a production migration.
-- PostgreSQL 17 / Supabase default privileges are scoped by object creator role.
-- Owner must verify fresh 2026-11-24 encrypted archive's isolated restore AND
-- truly independent encrypted physical copy before any approved production DDL.
-- Execute in one reviewed transaction with fresh read-only preflight/rollback.
-- Current grantor: postgres; no other creator, managed schema, or role changed.
-- Existing tables, sequences, functions and RLS policies stay exactly unchanged.
DO $g021_preflight$
DECLARE v_expected int;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'G0-21 expected postgres role; do not implicitly escalate';
  END IF;
  SELECT count(*) INTO v_expected
  FROM pg_catalog.pg_default_acl d
  JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = d.defaclrole
  WHERE n.nspname = 'public' AND owner_role.rolname='postgres'
    AND d.defaclobjtype IN ('r','S')
    AND EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) a
      JOIN pg_catalog.pg_roles grantee ON grantee.oid=a.grantee
      WHERE grantee.rolname='anon'
    );
  IF v_expected <> 2 THEN
    RAISE EXCEPTION 'G0-21 default ACL drift: expected anon on future tables AND sequences';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d
    JOIN pg_catalog.pg_roles r ON r.oid=d.defaclrole
    WHERE r.rolname='postgres' AND d.defaclnamespace=0
      AND d.defaclobjtype IN ('r','S')
      AND EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(d.defaclacl) a
        JOIN pg_catalog.pg_roles grantee ON grantee.oid=a.grantee
        WHERE grantee.rolname='anon'
      )
  ) THEN
    RAISE EXCEPTION 'G0-21 global default grants present; schema-only revoke is insufficient';
  END IF;
END
$g021_preflight$;

-- FUTURE objects created by role postgres within schema public only.
-- No change to authenticated, service_role, PUBLIC, existing object ACLs,
-- other default-privilege owners/schemas, Storage, or routine EXECUTE.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;

DO $g021_postcheck$
DECLARE v_anon int; v_other int;
BEGIN
 SELECT count(*) INTO v_anon
 FROM pg_catalog.pg_default_acl d
 JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
 JOIN pg_catalog.pg_roles owner_role ON owner_role.oid=d.defaclrole
 CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
 JOIN pg_catalog.pg_roles grant_role ON grant_role.oid=a.grantee
 WHERE n.nspname='public' AND owner_role.rolname='postgres'
   AND d.defaclobjtype IN ('r','S') AND grant_role.rolname='anon';
 IF v_anon <> 0 THEN
   RAISE EXCEPTION 'G0-21 anon still receives future table/sequence default grants';
 END IF;
 SELECT count(DISTINCT d.defaclobjtype::text||':'||r.rolname) INTO v_other
 FROM pg_catalog.pg_default_acl d
 JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
 JOIN pg_catalog.pg_roles owner_role ON owner_role.oid=d.defaclrole
 CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
 JOIN pg_catalog.pg_roles r ON r.oid=a.grantee
 WHERE n.nspname='public' AND owner_role.rolname='postgres'
   AND d.defaclobjtype IN ('r','S')
   AND r.rolname IN ('authenticated','service_role');
 IF v_other <> 4 THEN
   RAISE EXCEPTION 'G0-21 signed-in/service default privileges unexpectedly absent';
 END IF;
END
$g021_postcheck$;
