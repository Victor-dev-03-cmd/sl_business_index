-- Security hardening: a user must not promote themselves to admin
-- or mark their own business approved/verified via direct PostgREST calls.
-- This guard covers RLS-permitted UPDATE and INSERT paths.
CREATE OR REPLACE FUNCTION public.growth_prevent_profile_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id=auth.uid() AND p.role IN ('admin','ceo')
    ) THEN
      RAISE EXCEPTION 'Changing account role requires administrator approval'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_prevent_profile_role_escalation()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.growth_prevent_profile_role_escalation();

CREATE OR REPLACE FUNCTION public.growth_protect_business_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_is_staff boolean;
BEGIN
  v_is_staff := auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid() AND p.role IN ('admin','ceo')
  );
  IF v_is_staff THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'
      OR COALESCE(NEW.is_verified,false)
      OR COALESCE(NEW.is_featured,false)
      OR COALESCE(NEW.can_show_badge,false)
      OR NEW.verification_status NOT IN ('pending','unverified') THEN
      RAISE EXCEPTION 'Approval and badges require administrator review'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
      OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
      OR NEW.can_show_badge IS DISTINCT FROM OLD.can_show_badge
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Only administrators can change business approval and verification'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_protect_business_approval()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_business_approval ON public.businesses;
CREATE TRIGGER protect_business_approval
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.growth_protect_business_approval();
