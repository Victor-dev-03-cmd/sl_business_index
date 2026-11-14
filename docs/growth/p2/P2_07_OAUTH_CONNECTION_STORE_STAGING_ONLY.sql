-- P2-07 preview-only atomic verified provider connection store.
-- STAGING / DISPOSABLE POSTGRES ONLY; NEVER APPLY AS-IS TO LIVE SUPABASE.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.
-- Uses ciphertext only; application must verify Google UserInfo and scopes.
BEGIN;

CREATE OR REPLACE FUNCTION public.slbi_store_verified_marketing_connection(
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_external_account_id text,
  p_account_display_name text,
  p_account_type text,
  p_granted_scopes text[],
  p_expires_at timestamptz,
  p_encrypted_access text,
  p_encrypted_refresh text,
  p_encryption_key_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL
    OR p_provider <> 'google_mail' OR p_account_type <> 'mailbox'
    OR length(coalesce(p_external_account_id,'')) NOT BETWEEN 3 AND 255
    OR length(coalesce(p_account_display_name,'')) NOT BETWEEN 5 AND 160
    OR length(coalesce(p_encrypted_access,'')) NOT BETWEEN 40 AND 20000
    OR length(coalesce(p_encrypted_refresh,'')) NOT BETWEEN 40 AND 20000
    OR left(p_encrypted_access,3) <> 'v1.'
    OR left(p_encrypted_refresh,3) <> 'v1.'
    OR length(coalesce(p_encryption_key_id,'')) NOT BETWEEN 3 AND 120
    OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp()+interval '1 day'
    OR p_granted_scopes IS NULL
    OR NOT ('https://www.googleapis.com/auth/gmail.send'=ANY(p_granted_scopes))
    OR NOT ('openid'=ANY(p_granted_scopes))
    OR cardinality(p_granted_scopes) > 10 THEN
    RAISE EXCEPTION 'Invalid verified OAuth connection request' USING ERRCODE='22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements g
    WHERE g.user_id=p_owner_id
      AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL
      AND length(g.payment_reference)>=3
      AND g.verified_at<=clock_timestamp()
      AND g.expires_at>clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'Not authorized for provider connection' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.marketing_connections(
    user_id,business_id,provider,external_account_id,account_display_name,
    account_type,granted_scopes,status,access_expires_at,last_verified_at,connected_at
  ) VALUES (
    p_owner_id,p_business_id,p_provider,p_external_account_id,p_account_display_name,
    p_account_type,p_granted_scopes,'connected',p_expires_at,clock_timestamp(),clock_timestamp()
  )
  ON CONFLICT (user_id,business_id,provider,external_account_id) DO UPDATE
    SET account_display_name=excluded.account_display_name,
        account_type=excluded.account_type,
        granted_scopes=excluded.granted_scopes,
        status='connected',
        access_expires_at=excluded.access_expires_at,
        last_verified_at=excluded.last_verified_at,
        connected_at=excluded.connected_at,
        disconnected_at=NULL
  RETURNING id INTO v_id;

  INSERT INTO public.marketing_connection_secrets(
    connection_id,encrypted_access_token,encrypted_refresh_token,encryption_key_id
  ) VALUES (v_id,p_encrypted_access,p_encrypted_refresh,p_encryption_key_id)
  ON CONFLICT (connection_id) DO UPDATE
    SET encrypted_access_token=excluded.encrypted_access_token,
        encrypted_refresh_token=excluded.encrypted_refresh_token,
        encryption_key_id=excluded.encryption_key_id,
        updated_at=clock_timestamp();

  RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) TO service_role;
COMMIT;
