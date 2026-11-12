-- SLBI P0 · STAGING-ONLY read-only structural assertions.
-- This proves policy/trigger structure, NOT authenticated owner/admin behavior.
DO $test$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='businesses' AND policyname='Temporary Public View') THEN
    RAISE EXCEPTION 'FAIL: public all-business read still exposed'; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verifications' AND policyname='Vendors manage own verifications') THEN
    RAISE EXCEPTION 'FAIL: vendor ALL verification policy still exposed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='businesses' AND policyname='Approved businesses public') THEN
    RAISE EXCEPTION 'FAIL: approved public listing policy missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verifications' AND policyname='Admins can manage all verifications') THEN
    RAISE EXCEPTION 'FAIL: admin verification policy missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='verifications' AND policyname='SLBI vendor submit pending verification') THEN
    RAISE EXCEPTION 'FAIL: vendor pending submission policy missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.profiles'::regclass
    AND tgname='slbi_p0_profile_review_guard' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'FAIL: profile verification guard missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.businesses'::regclass
    AND tgname='slbi_p0_business_review_guard' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'FAIL: business audit guard missing'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid IN (
    'public.slbi_p0_guard_profile_verification()'::regprocedure,
    'public.slbi_p0_guard_business_review_audit()'::regprocedure
  ) AND has_function_privilege('anon',oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'FAIL: anon can execute privileged guard'; END IF;
END
$test$;

-- Required fixture-driven role matrix (must be executed using real test users):
-- 1 anon: approved listing visible; rejected and pending rows invisible.
-- 2 vendor A: own pending listing visible, other vendor's hidden; editing
--   description/is_open/service_radius/seo_keywords succeeds.
-- 3 vendor A: changing status,is_verified,verified_by,verified_at,
--   admin_notes,verification_remarks, profile.role and verification status fails.
-- 4 vendor A: pending verification INSERT and own SELECT succeed;
--   changing submitted review status or deleting request fails.
-- 5 vendor B: cannot view or update vendor A's verification request.
-- 6 admin: business approval/rejection, verification approval/rejection work.
-- 7 anon: view RPC still works; counters update via their existing safe path.
-- 8 signup: normal auth profile insert works with unverified defaults.
-- 9 storage: anon cannot read verification document; owner/admin signed access.
-- 10 regression: Nearby, business detail, home, search, mobile app behavior.
