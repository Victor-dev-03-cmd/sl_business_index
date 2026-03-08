-- Ensure profiles are viewable by all (or at least by admins)
-- First, drop the policy if it exists to avoid conflicts or stale definitions
DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;

-- Re-create the policy
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
