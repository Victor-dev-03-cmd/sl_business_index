-- SLBI P0 · STAGING-ONLY security hardening candidate (2026-11-12).
-- REVIEW ONLY: not in supabase/migrations and NEVER run against production
-- until authenticated vendor A/B, admin, anon, signup and legacy client tests pass.
--
-- Existing triggers protect profiles.role and business approval/badges. Preserve them.
-- This script deliberately does NOT touch public analytics/lead INSERT grants,
-- vendor views/calls counters, billing, or GrowthOS credit allocation.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Approved businesses public')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Owners view own')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Admins can manage all businesses')
  THEN
    RAISE EXCEPTION 'Required business access policies missing; abort without changes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t
       WHERE t.tgrelid='public.businesses'::regclass
         AND t.tgname='protect_business_approval' AND NOT t.tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger t
       WHERE t.tgrelid='public.profiles'::regclass
         AND t.tgname='prevent_profile_role_escalation' AND NOT t.tgisinternal)
  THEN
    RAISE EXCEPTION 'Existing privilege guards absent; abort';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='verifications'
       AND policyname='Admins can manage all verifications')
  THEN
    RAISE EXCEPTION 'Verification staff policy missing; abort';
  END IF;
END
$preflight$;

-- Existing approved/owner/staff policies remain intact.
DROP POLICY IF EXISTS "Temporary Public View" ON public.businesses;

-- Restrict vendors to only their own review request READ and pending INSERT.
-- Staff retains its separate admin/ceo ALL policy. No vendor review UPDATE/DELETE.
DROP POLICY IF EXISTS "Vendors manage own verifications" ON public.verifications;
DROP POLICY IF EXISTS "SLBI vendor read own verification requests" ON public.verifications;
CREATE POLICY "SLBI vendor read own verification requests" ON public.verifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=verifications.business_id
        AND b.owner_id=(SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS "SLBI vendor submit pending verification" ON public.verifications;
CREATE POLICY "SLBI vendor submit pending verification" ON public.verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    status='pending'
    AND COALESCE(moderation_status,'pending')='pending'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=verifications.business_id
        AND b.owner_id=(SELECT auth.uid())
    )
  );

-- Defense in depth for owner-editable profile identity/verification fields.
CREATE OR REPLACE FUNCTION public.slbi_p0_guard_profile_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE v_admin boolean;
BEGIN
  IF (SELECT auth.role())='service_role' THEN RETURN NEW; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.role::text IN ('admin','ceo')
  ) INTO v_admin;
  IF v_admin THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.verification_status IS DISTINCT FROM 'unverified'
       OR NEW.verification_image_url IS NOT NULL THEN
      RAISE EXCEPTION 'Profile verification must be reviewed by staff'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verification_image_url IS DISTINCT FROM OLD.verification_image_url THEN
      RAISE EXCEPTION 'Profile identity/verification fields require staff review'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;
REVOKE ALL ON FUNCTION public.slbi_p0_guard_profile_verification()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS slbi_p0_profile_review_guard ON public.profiles;
CREATE TRIGGER slbi_p0_profile_review_guard
  BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.slbi_p0_guard_profile_verification();

-- Prevent owners spoofing review audit attribution, without blocking existing
-- view/call counters or the admin's business status/verification triggers.
CREATE OR REPLACE FUNCTION public.slbi_p0_guard_business_review_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE v_admin boolean;
BEGIN
  IF (SELECT auth.role())='service_role' THEN RETURN NEW; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.role::text IN ('admin','ceo')
  ) INTO v_admin;
  IF v_admin THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.verified_by IS NOT NULL OR NEW.verified_at IS NOT NULL
       OR NEW.admin_notes IS NOT NULL OR NEW.verification_remarks IS NOT NULL THEN
      RAISE EXCEPTION 'Business audit fields require staff review'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.verification_remarks IS DISTINCT FROM OLD.verification_remarks THEN
      RAISE EXCEPTION 'Business identity/audit fields require staff review'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;
REVOKE ALL ON FUNCTION public.slbi_p0_guard_business_review_audit()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS slbi_p0_business_review_guard ON public.businesses;
CREATE TRIGGER slbi_p0_business_review_guard
  BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW
  EXECUTE FUNCTION public.slbi_p0_guard_business_review_audit();

COMMIT;
