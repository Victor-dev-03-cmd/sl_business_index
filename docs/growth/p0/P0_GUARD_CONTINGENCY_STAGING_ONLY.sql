-- SLBI P0 · CONTINGENCY, STAGING ONLY.
-- Do NOT re-enable Temporary Public View or vendor verification ALL permissions.
-- This rollback only uninstalls the newly introduced BEFORE guards if
-- a proven compatibility regression is detected. Existing original protection
-- triggers are retained. Reverting access policies requires separate approval.
BEGIN;
DROP TRIGGER IF EXISTS slbi_p0_profile_review_guard ON public.profiles;
DROP TRIGGER IF EXISTS slbi_p0_business_review_guard ON public.businesses;
DROP FUNCTION IF EXISTS public.slbi_p0_guard_profile_verification();
DROP FUNCTION IF EXISTS public.slbi_p0_guard_business_review_audit();
COMMIT;
