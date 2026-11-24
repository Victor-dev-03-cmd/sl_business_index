-- G0-21 disposable PostgreSQL 17 only. Fake roles and test objects; full ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;

-- Emulate observed current owner+schema default grants, not global.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;

CREATE TABLE public.g021_existing (id integer PRIMARY KEY, published boolean NOT NULL);
ALTER TABLE public.g021_existing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published existing" ON public.g021_existing FOR SELECT TO anon USING (published);
INSERT INTO public.g021_existing VALUES (1,true),(2,false);
CREATE SEQUENCE public.g021_existing_seq;
DO $baseline$
BEGIN
 IF NOT pg_catalog.has_table_privilege('anon','public.g021_existing','INSERT')
    OR NOT pg_catalog.has_sequence_privilege('anon','public.g021_existing_seq','USAGE') THEN
   RAISE EXCEPTION 'synthetic baseline did not model broad default grants';
 END IF;
END
$baseline$;

\ir ../../docs/growth/g0/candidates/FUTURE_PUBLIC_DEFAULT_ACL_REVIEW_ONLY.sql

-- Existing object ACLs must be unchanged, even though new default ACLs differ.
DO $legacy$
BEGIN
 IF NOT pg_catalog.has_table_privilege('anon','public.g021_existing','INSERT')
    OR NOT pg_catalog.has_sequence_privilege('anon','public.g021_existing_seq','USAGE') THEN
   RAISE EXCEPTION 'G0-21 unexpectedly changed existing objects';
 END IF;
END
$legacy$;

CREATE TABLE public.g021_future_business (
 id integer PRIMARY KEY, published boolean NOT NULL DEFAULT false
);
ALTER TABLE public.g021_future_business ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published future" ON public.g021_future_business
  FOR SELECT TO anon USING(published);
INSERT INTO public.g021_future_business VALUES (1,true),(2,false);
CREATE SEQUENCE public.g021_future_seq;

DO $new_object$
BEGIN
 IF pg_catalog.has_table_privilege('anon','public.g021_future_business','SELECT')
   OR pg_catalog.has_table_privilege('anon','public.g021_future_business','INSERT')
   OR pg_catalog.has_table_privilege('anon','public.g021_future_business','UPDATE')
   OR pg_catalog.has_table_privilege('anon','public.g021_future_business','DELETE')
   OR pg_catalog.has_sequence_privilege('anon','public.g021_future_seq','USAGE')
   OR pg_catalog.has_sequence_privilege('anon','public.g021_future_seq','SELECT') THEN
  RAISE EXCEPTION 'G0-21 future objects leak anonymous default grants';
 END IF;
 IF NOT pg_catalog.has_table_privilege('authenticated','public.g021_future_business','INSERT')
    OR NOT pg_catalog.has_table_privilege('service_role','public.g021_future_business','SELECT')
    OR NOT pg_catalog.has_sequence_privilege('authenticated','public.g021_future_seq','USAGE') THEN
  RAISE EXCEPTION 'G0-21 broke existing signed-in/service default grants';
 END IF;
END
$new_object$;

-- Public reads must be an explicit grant and an approved-only RLS policy.
GRANT SELECT ON public.g021_future_business TO anon;
SET ROLE anon;
DO $anon_read$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM public.g021_future_business;
 IF n<>1 THEN RAISE EXCEPTION 'G0-21 explicit safe read+RLS failed'; END IF;
 BEGIN
  INSERT INTO public.g021_future_business(id,published) VALUES(3,true);
  RAISE EXCEPTION 'G0-21 unexpectedly allowed anon insert' USING ERRCODE='XX000';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END
$anon_read$;
RESET ROLE;

-- PostgreSQL's PUBLIC EXECUTE default is a *separate* risk, not fixed by
-- dropping explicit anon function grants in schema-specific default ACL.
CREATE FUNCTION public.g021_future_fn() RETURNS integer
 LANGUAGE sql AS $fn$ SELECT 1 $fn$;
DO $function_scope$
BEGIN
 IF NOT pg_catalog.has_function_privilege('anon','public.g021_future_fn()','EXECUTE') THEN
  RAISE EXCEPTION 'G0-21 unexpected function default semantics, revisit scope';
 END IF;
END
$function_scope$;

-- No permanent schema/role/object/default-ACL change in CI.
ROLLBACK;
\echo G0_21_DEFAULT_ACL_DISPOSABLE_PASS
