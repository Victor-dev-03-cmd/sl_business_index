-- STAGING ONLY contingency in case admin management breaks.
-- Do not restore unrestricted "Profiles viewable by all" or anon read grants.
BEGIN;
DROP POLICY IF EXISTS "SLBI staff read account profiles" ON public.profiles;
DROP POLICY IF EXISTS "SLBI staff update account profiles" ON public.profiles;
DROP FUNCTION IF EXISTS slbi_p0_internal.current_actor_is_staff();
-- Keep 'Users can view own profile' and 'Users update own profile'.
-- Provide an audited admin-only server endpoint as fallback before release.
COMMIT;
