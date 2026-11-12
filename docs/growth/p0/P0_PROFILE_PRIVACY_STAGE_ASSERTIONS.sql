-- Structural profile access assertions: run only on the isolated staging DB.
DO $tests$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Profiles viewable by all'
  ) THEN RAISE EXCEPTION 'FAIL: public unrestricted profiles SELECT remains'; END IF;

  IF has_table_privilege('anon','public.profiles','SELECT')
    OR has_column_privilege('anon','public.profiles','email','SELECT')
  THEN RAISE EXCEPTION 'FAIL: anonymous profile read grant exists'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can view own profile'
  ) THEN RAISE EXCEPTION 'FAIL: owner profile READ policy gone'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='SLBI staff read account profiles'
  ) THEN RAISE EXCEPTION 'FAIL: staff profile READ policy gone'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid='slbi_p0_internal.current_actor_is_staff()'::regprocedure
      AND p.prosecdef AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
  ) THEN RAISE EXCEPTION 'FAIL: admin lookup function is not secured'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata
    WHERE schema_name='slbi_p0_internal')
  THEN RAISE EXCEPTION 'FAIL: internal helper schema missing'; END IF;
END $tests$;

-- Authenticated E2E negative tests remain REQUIRED:
-- - anon cannot select or infer any email, phone, push_token, verification doc.
-- - user A cannot read user B's profile, including role/status/email/phone.
-- - user A can read/update own non-sensitive profile fields.
-- - user A cannot grant own role or verified status.
-- - admin can list/update accounts and suspend/reinstate.
-- - business article/review author display still loads.
-- - auth sign-up and auth callbacks correctly generate profile rows.
-- - service-role operations continue using server-side-only credentials.
