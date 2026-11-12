-- Run after base role-matrix test, against disposable Postgres service.
\set ON_ERROR_STOP on
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
SELECT set_config('request.jwt.claim.role','anon',false);
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.profiles) THEN
   RAISE EXCEPTION 'FAIL: anonymous visitor can read private profiles'; END IF;
 IF (SELECT count(*) FROM public.businesses)<>2 THEN
   RAISE EXCEPTION 'FAIL: anonymous approved business discovery broke'; END IF;
END $$;
\echo 'PASS: anonymous profiles hidden; approved listings still visible'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1 THEN
   RAISE EXCEPTION 'FAIL: vendor A must read only own profile'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE
   email='vendor-b@testing.invalid') THEN
   RAISE EXCEPTION 'FAIL: vendor A read vendor B private email'; END IF;
 IF (SELECT count(*) FROM public.businesses)<>2 THEN
   RAISE EXCEPTION 'FAIL: vendor A business RLS broke'; END IF;
END $$;
UPDATE public.profiles SET phone='0709999999' WHERE id='00000000-0000-4000-8000-000000000002';
DO $$
BEGIN
 IF (SELECT phone FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000002')<>'0709999999' THEN
   RAISE EXCEPTION 'FAIL: vendor could not update own profile'; END IF;
END $$;
\echo 'PASS: vendor A self-profile update, private cross-vendor isolation'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1 THEN
   RAISE EXCEPTION 'FAIL: vendor B private profile visibility'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE phone='0709999999') THEN
   RAISE EXCEPTION 'FAIL: cross-vendor private contact leak'; END IF;
END $$;
\echo 'PASS: vendor B cannot see vendor A personal contact'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>5 THEN
   RAISE EXCEPTION 'FAIL: staff did not retain administrative profile access'; END IF;
 IF (SELECT public.slbi_p0_is_staff()) IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'FAIL: staff function returned false'; END IF;
END $$;
\echo 'PASS: real admin role retains staff visibility without RLS recursion'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1 THEN
   RAISE EXCEPTION 'FAIL: new customer own-profile visibility'; END IF;
 IF (SELECT public.slbi_p0_is_staff()) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: customer falsely recognized as staff'; END IF;
END $$;
\echo 'PASS: recent signup can view only own profile'
RESET ROLE;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='profiles' AND policyname='Profiles viewable by all') THEN
   RAISE EXCEPTION 'FAIL: broad public profiles policy remains'; END IF;
 IF has_function_privilege('anon','public.slbi_p0_is_staff()','EXECUTE') THEN
   RAISE EXCEPTION 'FAIL: anon allowed to execute staff helper'; END IF;
END $$;
\echo 'PASS: profile privacy policy structural tests'
