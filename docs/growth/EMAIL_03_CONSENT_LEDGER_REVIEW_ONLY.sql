-- EMAIL-03: REVIEW-ONLY production candidate, DO NOT apply without RLS,
-- independent privacy approval, unsubscribe/double-opt-in and migrations gate.
-- Separate enquiry contact consent from marketing consent; no old leads backfill.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_email_optins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 160),
  consent_text_version text NOT NULL CHECK (consent_text_version='email-offers-v1'),
  consent_source text NOT NULL CHECK (consent_source='verified_business_enquiry'),
  consented_at timestamptz NOT NULL DEFAULT now(),
  confirmation_status text NOT NULL DEFAULT 'pending'
    CHECK (confirmation_status IN ('pending','confirmed','revoked')),
  confirmed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id,lead_id),
  CHECK (
    (confirmation_status='pending' AND confirmed_at IS NULL AND revoked_at IS NULL)
    OR (confirmation_status='confirmed' AND confirmed_at IS NOT NULL AND revoked_at IS NULL)
    OR (confirmation_status='revoked' AND revoked_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS marketing_email_optins_owner_count_idx
  ON public.marketing_email_optins(business_id,confirmation_status);
ALTER TABLE public.marketing_email_optins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_email_optins FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketing_email_optins TO authenticated;
CREATE POLICY marketing_email_optins_owner_select ON public.marketing_email_optins
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=business_id AND b.owner_id=(SELECT auth.uid())
  ));
-- No browser INSERT, UPDATE, DELETE. Writes are only through vetted service-role RPC.
-- The original slbi_submit_verified_lead remains completely unchanged.
CREATE OR REPLACE FUNCTION public.slbi_submit_verified_lead_optin(
  p_request_id uuid,p_business_id uuid,p_name text,p_email text,p_phone text,
  p_message text,p_rate_bucket text,p_business_bucket text,p_marketing_opt_in boolean
) RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_lead uuid;v_saved_id uuid;
BEGIN
  -- Explicit consent is only submitted from the server AFTER a successful
  -- Cloudflare challenge and same-origin, IP rate-bucket verification.
  IF p_marketing_opt_in IS DISTINCT FROM TRUE THEN RETURN NULL; END IF;
  v_lead:=public.slbi_submit_verified_lead(
    p_request_id,p_business_id,p_name,p_email,p_phone,p_message,p_rate_bucket,p_business_bucket
  );
  IF v_lead IS NULL THEN RETURN NULL; END IF;
  -- Prevent reusing a request ID across different lead/body/email to alter consent.
  IF NOT EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id=v_lead AND l.business_id=p_business_id
      AND lower(l.email)=lower(trim(p_email))
  ) THEN RETURN NULL; END IF;
  INSERT INTO public.marketing_email_optins (
    business_id,lead_id,request_id,email,consent_text_version,consent_source
  ) VALUES (
    p_business_id,v_lead,p_request_id,lower(trim(p_email)),'email-offers-v1','verified_business_enquiry'
  )
  ON CONFLICT (request_id) DO NOTHING
  RETURNING id INTO v_saved_id;
  IF v_saved_id IS NULL AND NOT EXISTS(
    SELECT 1 FROM public.marketing_email_optins
    WHERE request_id=p_request_id AND lead_id=v_lead AND email=lower(trim(p_email))
  ) THEN RETURN NULL; END IF;
  RETURN v_lead;
END
$$;
REVOKE ALL ON FUNCTION public.slbi_submit_verified_lead_optin(
  uuid,uuid,text,text,text,text,text,text,boolean
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_submit_verified_lead_optin(
  uuid,uuid,text,text,text,text,text,text,boolean
) TO service_role;
COMMIT;

-- Release gate:
-- 1. No confirmation_status='confirmed' without separately validated
--    one-time recipient email verification; DO NOT add manual admin toggle.
-- 2. Independent unsubscribe/suppression, retention/deletion, consent revocation
--    and double-opt-in delivery workflow REQUIRED before any marketing sending.
-- 3. Test anonymous and cross-tenant SELECT/INSERT/UPDATE/DELETE denial using
--    actual signed JWT, rate limit and idempotent replay with same request ID.
-- 4. Verify legacy lead insertion and review policy; do not infer consent from
--    enquiries, customer emails, CSV, QR scans or previously recorded leads.
