-- G0-20 REVIEW ONLY. Do not run in production until separately versioned,
-- after new 2026-11-24 archive's ISOLATED RESTORE, independent physical copy,
-- exact role/client verification, owner release window, rollback and preflight.
-- Execute inside ONE controlled transaction. Never replay historical March GRANT ALL.
-- Scoped least-privilege change ONLY; does not affect managed storage.buckets,
-- authenticated/service_role privileges, or legacy anonymous lead INSERT.
DO $preflight$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'
        AND c.relname IN ('businesses','profiles','leads')
        AND c.relkind IN ('r','p')
        AND c.relrowsecurity) <> 3 THEN
    RAISE EXCEPTION 'G0-20 fail closed: scoped table or RLS contract drift';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND tablename='leads'
      AND policyname='SLBI legacy compatible enquiry insert'
      AND cmd='INSERT' AND ('anon'=ANY(roles))
  ) THEN
    RAISE EXCEPTION 'G0-20 fail closed: expected legacy public lead policy missing';
  END IF;
  IF NOT pg_catalog.has_table_privilege('anon','public.businesses','SELECT')
      OR NOT pg_catalog.has_table_privilege('anon','public.leads','INSERT')
      OR NOT pg_catalog.has_table_privilege('authenticated','public.businesses','INSERT')
      OR NOT pg_catalog.has_table_privilege('authenticated','public.profiles','INSERT') THEN
    RAISE EXCEPTION 'G0-20 fail closed: required public/vendor contract already drifted';
  END IF;
END
$preflight$;

-- These eight direct anonymous DML grants were observed on live catalog.
-- Row policies currently constrain access; revocation adds defense in depth.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.businesses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM anon;
REVOKE UPDATE, DELETE ON TABLE public.leads FROM anon;

DO $postcheck$
BEGIN
  IF pg_catalog.has_table_privilege('anon','public.businesses','INSERT')
     OR pg_catalog.has_table_privilege('anon','public.businesses','UPDATE')
     OR pg_catalog.has_table_privilege('anon','public.businesses','DELETE')
     OR pg_catalog.has_table_privilege('anon','public.profiles','INSERT')
     OR pg_catalog.has_table_privilege('anon','public.profiles','UPDATE')
     OR pg_catalog.has_table_privilege('anon','public.profiles','DELETE')
     OR pg_catalog.has_table_privilege('anon','public.leads','UPDATE')
     OR pg_catalog.has_table_privilege('anon','public.leads','DELETE') THEN
    RAISE EXCEPTION 'G0-20 fail closed: anonymous direct DML grants remain effective';
  END IF;
  IF NOT pg_catalog.has_table_privilege('anon','public.businesses','SELECT')
     OR NOT pg_catalog.has_table_privilege('anon','public.profiles','SELECT')
     OR NOT pg_catalog.has_table_privilege('anon','public.leads','INSERT')
     OR NOT pg_catalog.has_table_privilege('authenticated','public.businesses','INSERT')
     OR NOT pg_catalog.has_table_privilege('authenticated','public.profiles','INSERT')
     OR NOT pg_catalog.has_table_privilege('authenticated','public.leads','UPDATE') THEN
    RAISE EXCEPTION 'G0-20 fail closed: public/vendor compatibility grant changed';
  END IF;
END
$postcheck$;
