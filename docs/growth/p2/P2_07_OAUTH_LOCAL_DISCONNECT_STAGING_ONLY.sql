-- P2-07: local first-party credential purge and connection disconnect.
-- STAGING / DISPOSABLE PostgreSQL ONLY. Never run on live Supabase as-is.
-- Dependencies: P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql
-- This does NOT revoke Google's OAuth grant remotely. Provider-side revocation
-- requires separate consent/API tests and a managed KMS with refresh handling.
BEGIN;
CREATE OR REPLACE FUNCTION public.slbi_disconnect_google_mail_connection(
  p_owner_id uuid,
  p_business_id uuid,
  p_connection_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE v_disconnected boolean:=false;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL OR p_connection_id IS NULL
  THEN
    RAISE EXCEPTION 'Invalid connection disconnect input' USING ERRCODE='22023';
  END IF;
  -- A formerly paid owner MUST retain the ability to remove private tokens,
  -- even after plan expiration. Ownership never depends on plan status.
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) THEN
    RETURN false;
  END IF;

  -- Lock by owner and serialize two disconnect requests. The caller is
  -- authenticated + ownership-checked by the server, not by browser IDs.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  UPDATE public.marketing_connections c
     SET status='revoked',
         disconnected_at=COALESCE(c.disconnected_at,clock_timestamp()),
         access_expires_at=NULL
   WHERE c.id=p_connection_id
     AND c.user_id=p_owner_id
     AND c.business_id=p_business_id
     AND c.provider='google_mail'
  RETURNING true INTO v_disconnected;

  IF COALESCE(v_disconnected,false) THEN
    DELETE FROM public.marketing_connection_secrets s
     WHERE s.connection_id=p_connection_id;

    -- Invalidate outstanding, UNCLAIMED OAuth state so the user must start
    -- a fresh consent flow. A previously claimed callback race still needs
    -- a generation-bound store contract before any production activation.
    UPDATE public.marketing_oauth_intents i
       SET consumed_at=clock_timestamp()
     WHERE i.user_id=p_owner_id
       AND i.business_id=p_business_id
       AND i.provider='google_mail'
       AND i.consumed_at IS NULL;
    RETURN true;
  END IF;
  RETURN false; -- nonexistent or cross-tenant id: no secret/error disclosure
END;
$function$;
REVOKE ALL ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) TO service_role;
COMMIT;
