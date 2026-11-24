-- G0-20 synthetic PostgreSQL 17 only. All rows fake; whole fixture ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END
$roles$;
CREATE TABLE public.businesses (
 id uuid PRIMARY KEY, owner_id uuid, status text NOT NULL
);
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY, display_name text
);
CREATE TABLE public.leads (
 id uuid PRIMARY KEY, business_id uuid REFERENCES public.businesses(id),
 name text NOT NULL, status text NOT NULL DEFAULT 'new'
);
-- Reproduce observed old March broad grants, plus current role-bound policies.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.businesses,public.profiles,public.leads TO anon,authenticated;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved businesses public" ON public.businesses
 FOR SELECT TO anon,authenticated USING(status='approved');
CREATE POLICY "Owner business create" ON public.businesses
 FOR INSERT TO authenticated WITH CHECK(owner_id=current_setting('request.jwt.claim.sub',true)::uuid);
CREATE POLICY "Users can view own profile" ON public.profiles
 FOR SELECT TO PUBLIC USING(id=current_setting('request.jwt.claim.sub',true)::uuid);
CREATE POLICY "Users can insert own profile" ON public.profiles
 FOR INSERT TO authenticated WITH CHECK(id=current_setting('request.jwt.claim.sub',true)::uuid);
CREATE POLICY "SLBI legacy compatible enquiry insert" ON public.leads
 FOR INSERT TO anon,authenticated WITH CHECK (
  business_id IS NOT NULL AND status='new' AND length(name) >= 2
 );
CREATE POLICY "Vendors update own leads" ON public.leads
 FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id
  AND b.owner_id=current_setting('request.jwt.claim.sub',true)::uuid)
 ) WITH CHECK(status='new');
INSERT INTO public.businesses(id,owner_id,status) VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','approved'),
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','pending');
INSERT INTO public.profiles(id,display_name) VALUES
 ('20000000-0000-4000-8000-000000000001','Synthetic owner'),
 ('20000000-0000-4000-8000-000000000002','Other synthetic owner');

-- Simulate effective grants BEFORE candidate.
DO $before$
BEGIN
 IF NOT pg_catalog.has_table_privilege('anon','public.businesses','INSERT')
 OR NOT pg_catalog.has_table_privilege('anon','public.profiles','DELETE')
 OR NOT pg_catalog.has_table_privilege('anon','public.leads','UPDATE') THEN
   RAISE EXCEPTION 'synthetic baseline did not reproduce broad grant exposure';
 END IF;
END
$before$;

\ir ../../docs/growth/g0/candidates/ANON_SCOPED_LEAST_PRIVILEGE_REVIEW_ONLY.sql

-- Reapply to ensure exact candidate is idempotent (candidate has its own guards).
\ir ../../docs/growth/g0/candidates/ANON_SCOPED_LEAST_PRIVILEGE_REVIEW_ONLY.sql

SET ROLE anon;
DO $anon_read$
DECLARE visible_count integer;
BEGIN
 SELECT count(*) INTO visible_count FROM public.businesses;
 IF visible_count<>1 THEN
   RAISE EXCEPTION 'RLS public approved-business read changed: %',visible_count;
 END IF;
END
$anon_read$;

-- Preserve legacy visitor enquiry, but never create a business or profile.
INSERT INTO public.leads(id,business_id,name)
VALUES('30000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001','Sample question');

DO $negative$
BEGIN
 BEGIN
  INSERT INTO public.businesses(id,owner_id,status) VALUES (
  '10000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001','approved');
  RAISE EXCEPTION 'anonymous business insert unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.businesses SET status='approved'
    WHERE id='10000000-0000-4000-8000-000000000002';
  RAISE EXCEPTION 'anonymous business update unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.profiles(id,display_name)
   VALUES('20000000-0000-4000-8000-000000000003','Synthetic fake');
  RAISE EXCEPTION 'anonymous profile insert unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  DELETE FROM public.leads WHERE id='30000000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'anonymous lead delete unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END
$negative$;
RESET ROLE;

DO $after$
BEGIN
 IF (SELECT count(*) FROM public.businesses)<>2
 OR (SELECT count(*) FROM public.profiles)<>2
 OR (SELECT count(*) FROM public.leads)<>1 THEN
   RAISE EXCEPTION 'unexpected synthetic row mutation';
 END IF;
 IF NOT pg_catalog.has_table_privilege('authenticated','public.profiles','UPDATE')
    OR NOT pg_catalog.has_table_privilege('authenticated','public.businesses','DELETE') THEN
   RAISE EXCEPTION 'signed-in grants accidentally reduced';
 END IF;
END
$after$;

-- All synthetic changes rolled back, no persisted database content.
ROLLBACK;
\echo G0_20_ANON_ACL_DISPOSABLE_PASS
