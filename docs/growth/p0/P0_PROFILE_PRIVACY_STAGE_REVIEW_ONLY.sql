-- SLBI P0: Profiles RLS privacy, isolated staging/CI ONLY. Never auto-apply.
-- Prior dependency: authenticated user own row policy still exists; role guard installed.
-- Admin lookups used by other RLS policies must not recurse or fail for public pages.
BEGIN;
DO $p0$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='profiles' AND policyname='Users can view own profile')
 THEN RAISE EXCEPTION 'Owner SELECT policy absent; do not install'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.profiles'::regclass
    AND tgname='prevent_profile_role_escalation' AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'Role escalation trigger missing; abort'; END IF;
END $p0$;
-- No inputs, no user-controlled role claims: actor identity derives only from auth.uid().
-- Runs with function owner's rights, so staff check does not recurse into profiles RLS.
CREATE OR REPLACE FUNCTION public.slbi_p0_is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $staff$
 SELECT EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin'::public.user_role,'ceo'::public.user_role)
 );
$staff$;
REVOKE ALL ON FUNCTION public.slbi_p0_is_staff() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_p0_is_staff() TO authenticated;

-- Existing owner SELECT stays. Staff-only broader SELECT is explicitly restricted.
DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "SLBI staff read profiles" ON public.profiles;
CREATE POLICY "SLBI staff read profiles" ON public.profiles
 FOR SELECT TO authenticated
 USING ((SELECT public.slbi_p0_is_staff()));

-- Do not revoke anon SELECT table grants in this step: many legacy public-table
-- RLS staff predicates query profiles as a relation. No RLS-readable rows for
-- anon, but revoking table grants now would break those legacy public queries.
-- Do not expose a public user-data view; this policy is intentional least-row.
COMMIT;
