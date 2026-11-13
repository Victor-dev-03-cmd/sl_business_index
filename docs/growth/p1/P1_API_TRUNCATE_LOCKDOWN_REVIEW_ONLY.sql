-- SLBusinessIndex — REVIEWED P1 supplemental API TRUNCATE lockdown.
-- No customer rows are edited/deleted. This only revokes privileges that
-- PostgreSQL RLS does not protect. Applies to all current public tables.
-- Test against real local Docker roles before production deployment.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('public.businesses') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.reviews') IS NULL
     OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon')
     OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    RAISE EXCEPTION 'Required roles or tables absent; do not change grants';
  END IF;
END
$preflight$;

REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public
FROM PUBLIC, anon, authenticated;

DO $verify$
BEGIN
  IF EXISTS(
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (
        has_table_privilege('anon',c.oid,'TRUNCATE') OR
        has_table_privilege('authenticated',c.oid,'TRUNCATE')
      )
  ) THEN
    RAISE EXCEPTION 'API role still has TRUNCATE on a public table';
  END IF;
END
$verify$;
COMMIT;

-- Admin/system maintenance uses authorized server-side DB/service roles;
-- this migration does not revoke service_role or postgres privileges.
