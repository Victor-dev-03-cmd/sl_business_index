-- Role-specific interaction tests: ONLY synthetic users on PostgreSQL 17 Docker.
\set ON_ERROR_STOP on
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.businesses)<>1 THEN
    RAISE EXCEPTION 'FAIL: anon must see only the approved listing'; END IF;
  IF EXISTS(SELECT 1 FROM public.businesses WHERE status<>'approved') THEN
    RAISE EXCEPTION 'FAIL: unapproved listing leaked to anon'; END IF;
END $$;
\echo 'PASS: anonymous business search reveals approved only'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.businesses)<>2 THEN
    RAISE EXCEPTION 'FAIL: vendor A must see own pending and approved rows only'; END IF;
  IF EXISTS(SELECT 1 FROM public.businesses WHERE owner_id='00000000-0000-4000-8000-000000000003'::uuid) THEN
    RAISE EXCEPTION 'FAIL: vendor B private listing leaked to vendor A'; END IF;
END $$;
UPDATE public.businesses SET description='Editable detail',
  service_radius=12,seo_keywords=ARRAY['cafe','jaffna'],is_open=false
 WHERE id='20000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF (SELECT description FROM public.businesses WHERE id='20000000-0000-4000-8000-000000000001')<>'Editable detail' THEN
    RAISE EXCEPTION 'FAIL: legitimate vendor edit blocked'; END IF;
  BEGIN
    UPDATE public.businesses SET status='approved'
      WHERE id='20000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FAIL: vendor changed own approval status';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    UPDATE public.businesses SET admin_notes='admin-looking audit'
      WHERE id='20000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FAIL: vendor wrote admin_notes';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    UPDATE public.businesses SET verified_by='00000000-0000-4000-8000-000000000001'
      WHERE id='20000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FAIL: vendor spoofed verified_by';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET role='admin'
      WHERE id='00000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'FAIL: vendor escalated profile role';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET verification_status='verified'
      WHERE id='00000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'FAIL: vendor approved own personal verification';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET verification_image_url='https://testing.invalid/document'
      WHERE id='00000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'FAIL: vendor wrote staff-only document url';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $$;
\echo 'PASS: vendor edit works and privilege escalation fails'
INSERT INTO public.verifications(id,business_id,status,moderation_status)
VALUES('30000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','pending','pending');
DO $$
DECLARE n integer;
BEGIN
  BEGIN
    INSERT INTO public.verifications(business_id,status,moderation_status)
      VALUES('20000000-0000-4000-8000-000000000001','approved','pending');
    RAISE EXCEPTION 'FAIL: vendor preapproved verification';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  UPDATE public.verifications SET status='approved'
    WHERE id='30000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: vendor updated review status'; END IF;
  DELETE FROM public.verifications WHERE id='30000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: vendor deleted review request'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$
DECLARE n integer;
BEGIN
  IF EXISTS(SELECT 1 FROM public.verifications WHERE id='30000000-0000-4000-8000-000000000001')
    THEN RAISE EXCEPTION 'FAIL: vendor B read vendor A private verification'; END IF;
  UPDATE public.verifications SET status='approved'
    WHERE id='30000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: cross-vendor update'; END IF;
  BEGIN
    INSERT INTO public.verifications(business_id,status)
      VALUES('20000000-0000-4000-8000-000000000001','pending');
    RAISE EXCEPTION 'FAIL: vendor B submitted verification for vendor A';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $$;
\echo 'PASS: cross-vendor verification isolation'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
UPDATE public.verifications SET status='approved'
 WHERE id='30000000-0000-4000-8000-000000000001';
UPDATE public.businesses SET status='approved',is_verified=true,
  verified_by='00000000-0000-4000-8000-000000000001'
 WHERE id='20000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF (SELECT status FROM public.verifications WHERE id='30000000-0000-4000-8000-000000000001')<>'approved'
    THEN RAISE EXCEPTION 'FAIL: staff unable to approve verification'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.businesses
    WHERE id='20000000-0000-4000-8000-000000000001' AND status='approved' AND is_verified)
    THEN RAISE EXCEPTION 'FAIL: admin business approval not available'; END IF;
END $$;
\echo 'PASS: admin approval workflows still work'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
INSERT INTO public.profiles(id,email) VALUES
 ('00000000-0000-4000-8000-000000000005','signup@testing.invalid');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles
   WHERE id='00000000-0000-4000-8000-000000000005'
     AND role='customer' AND verification_status='unverified')
 THEN RAISE EXCEPTION 'FAIL: new customer profile signup blocked'; END IF;
END $$;
\echo 'PASS: normal customer signup profile creation'
RESET ROLE;
-- Known P0 blocker: baseline public.profiles policy remains permissive in
-- the review-only SQL and must be redesigned before production release.
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<5 THEN
   RAISE EXCEPTION 'Fixture unexpectedly hides existing public profile leakage'; END IF;
 RAISE NOTICE 'P0 BLOCKER (not release-ready): public.profiles data remains visible to anon';
END $$;
RESET ROLE;
