-- Tests performed only in disposable GitHub Actions Postgres.
\set ON_ERROR_STOP on
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO public.leads(business_id,name,email,phone,message,source)
VALUES('20000000-0000-4000-8000-000000000003','Mobile User',NULL,'0771234567',
       'Hello, this is an existing mobile enquiry','Mobile App - Business Details');
INSERT INTO public.leads(business_id,name,email,phone,message,source)
VALUES('20000000-0000-4000-8000-000000000003','Web Customer',
       'customer@testing.invalid','0771234567','Hello there','Business Detail Page');
DO $$
BEGIN
 BEGIN
  INSERT INTO public.leads(business_id,name,email,phone,message,source)
  VALUES('20000000-0000-4000-8000-000000000001','Pending Lead',
   'customer@testing.invalid',NULL,'Not published','Mobile App - Business Details');
  RAISE EXCEPTION 'FAIL: unapproved listing accepted public lead';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.leads(business_id,name,email,phone,status)
  VALUES('20000000-0000-4000-8000-000000000003','Forged Status',
    'customer@testing.invalid',NULL,'converted');
  RAISE EXCEPTION 'FAIL: anonymous user created converted CRM lead';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.leads(business_id,name,email,phone)
  VALUES('20000000-0000-4000-8000-000000000003','  ',
    'customer@testing.invalid',NULL);
  RAISE EXCEPTION 'FAIL: blank-name contact accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.leads(business_id,name,email,phone)
  VALUES('20000000-0000-4000-8000-000000000003','No contact',
    NULL,NULL);
  RAISE EXCEPTION 'FAIL: no customer contact accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.leads(business_id,name,email,phone)
  VALUES('20000000-0000-4000-8000-000000000003',
    repeat('x',101),'customer@testing.invalid',NULL);
  RAISE EXCEPTION 'FAIL: oversized payload accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
\echo 'PASS: old web/mobile insert accepted, unapproved/forged/empty denied'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.leads)<>7 THEN
   RAISE EXCEPTION 'FAIL: owner cannot see two new legacy leads plus five secure leads'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.leads) THEN
   RAISE EXCEPTION 'FAIL: cross-owner private leads visible'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='leads' AND policyname='Anyone can insert leads') THEN
  RAISE EXCEPTION 'FAIL: unrestricted public lead policy remains'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='leads' AND policyname='SLBI legacy compatible enquiry insert') THEN
  RAISE EXCEPTION 'FAIL: compatible legacy lead INSERT missing'; END IF;
END $$;
\echo 'PASS: legacy public lead RLS is scoped; owner reporting remains isolated'
