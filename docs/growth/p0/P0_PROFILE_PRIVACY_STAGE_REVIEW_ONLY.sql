-- SLBI P0 · PRIVATE PROFILE READ RESTRICTIONS · STAGING ONLY.
-- NOT A PRODUCTION MIGRATION. Requires public UI, auth and admin E2E tests.
-- Objective: remove the currently unrestricted "Profiles viewable by all"
-- policy while preserving own-profile reads and admin/ceo user-management access.
--
-- Why an internal SECURITY DEFINER helper? Querying public.profiles inside a
-- policy on public.profiles itself causes infinite recursion. This helper is
-- deliberately in a NON-exposed schema, returns only a boolean, fixes
-- search_path, restricts EXECUTE, and never exposes profile data.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can view own profile'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users update own profile'
  ) THEN
    RAISE EXCEPTION 'Expected owner policies absent: do not continue';
  END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS slbi_p0_internal;
REVOKE ALL ON SCHEMA slbi_p0_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA slbi_p0_internal TO authenticated;

CREATE OR REPLACE FUNCTION slbi_p0_internal.current_actor_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $helper$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid())
      AND p.role::text IN ('admin','ceo')
  )
$helper$;
REVOKE ALL ON FUNCTION slbi_p0_internal.current_actor_is_staff()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION slbi_p0_internal.current_actor_is_staff()
  TO authenticated;

DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;

DROP POLICY IF EXISTS "SLBI staff read account profiles" ON public.profiles;
CREATE POLICY "SLBI staff read account profiles" ON public.profiles
 FOR SELECT TO authenticated
 USING ((SELECT slbi_p0_internal.current_actor_is_staff()));

DROP POLICY IF EXISTS "SLBI staff update account profiles" ON public.profiles;
CREATE POLICY "SLBI staff update account profiles" ON public.profiles
 FOR UPDATE TO authenticated
 USING ((SELECT slbi_p0_internal.current_actor_is_staff()))
 WITH CHECK ((SELECT slbi_p0_internal.current_actor_is_staff()));

-- Public Data API should never return private user profiles.
-- This grant is unnecessary for own-profile queries (authenticated retains it).
REVOKE SELECT ON public.profiles FROM anon;

COMMIT;

-- TEST BEFORE RELEASE: anonymous select denied, cross-user authenticated
-- select empty, owner read/update, admin user-management select/update,
-- account creation/trigger, password reset, navbar, notification state,
-- business-news article/review authors, Hono API and mobile clients.
