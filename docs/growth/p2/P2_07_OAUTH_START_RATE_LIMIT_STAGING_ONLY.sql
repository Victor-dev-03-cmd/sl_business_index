-- P2-07 secure OAuth start with trusted tenant and rate-limit transaction.
-- STAGING / DISPOSABLE DOCKER ONLY; do not apply to production.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.slbi_begin_marketing_oauth_intent(
  p_owner_id uuid,p_business_id uuid,p_provider text,p_state_digest text,
  p_pkce_ciphertext text,p_redirect_uri text,p_expires_at timestamptz
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF p_provider <> 'google_mail' OR p_owner_id IS NULL OR p_business_id IS NULL
    OR length(coalesce(p_state_digest,'')) NOT BETWEEN 40 AND 60
    OR length(coalesce(p_pkce_ciphertext,'')) NOT BETWEEN 40 AND 2000
    OR left(p_pkce_ciphertext,3)<>'v1.'
    OR length(coalesce(p_redirect_uri,'')) NOT BETWEEN 20 AND 500
    OR left(p_redirect_uri,8)<>'https://'
    OR p_expires_at<=clock_timestamp()
    OR p_expires_at>clock_timestamp()+interval '12 minutes'
  THEN RAISE EXCEPTION 'Invalid OAuth start request' USING ERRCODE='22023';
  END IF;
  -- Lock per owner so simultaneous starts cannot bypass the per-hour quota.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements g
    WHERE g.user_id=p_owner_id AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL AND length(g.payment_reference)>=3
      AND g.verified_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'Not authorized for OAuth start' USING ERRCODE='42501';
  END IF;
  IF (
    SELECT count(*) FROM public.marketing_oauth_intents i
     WHERE i.user_id=p_owner_id
       AND i.created_at > clock_timestamp()-interval '1 hour'
  )>=5 THEN
    RAISE EXCEPTION 'OAuth start rate limit' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.marketing_oauth_intents(
    user_id,business_id,provider,state_digest,pkce_verifier_ciphertext,
    redirect_uri,expires_at
  ) VALUES (
    p_owner_id,p_business_id,p_provider,p_state_digest,p_pkce_ciphertext,
    p_redirect_uri,p_expires_at
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.slbi_begin_marketing_oauth_intent(
  uuid,uuid,text,text,text,text,timestamptz
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_begin_marketing_oauth_intent(
  uuid,uuid,text,text,text,text,timestamptz
) TO service_role;
COMMIT;
