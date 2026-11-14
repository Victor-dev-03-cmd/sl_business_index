-- P2-07: CLOSE REVOKED-CALLBACK CREDENTIAL RESURRECTION RACE
-- STAGING / DISPOSABLE POSTGRES ONLY. Never apply directly to Production.
-- Run AFTER: vault, claim, store, begin and local-disconnect staging SQL.
-- No provider credentials, external sends, subscription changes or live DDL.
BEGIN;
ALTER TABLE public.marketing_oauth_intents
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS stored_at timestamptz;

-- Preserve a claimed state's identity; later privileged persistence must bind
-- to this exact intent ID, not merely an owner/business/provider tuple.
CREATE OR REPLACE FUNCTION public.slbi_claim_marketing_oauth_intent(
  p_state_digest text,
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_redirect_uri text
)
RETURNS TABLE(intent_id uuid, encrypted_pkce_verifier text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $claim$
  UPDATE public.marketing_oauth_intents AS i
     SET consumed_at = clock_timestamp()
   WHERE i.state_digest = p_state_digest
     AND i.user_id = p_owner_id
     AND i.business_id = p_business_id
     AND i.provider = p_provider
     AND i.redirect_uri = p_redirect_uri
     AND i.consumed_at IS NULL
     AND i.invalidated_at IS NULL
     AND i.expires_at > clock_timestamp()
     -- Google/Microsoft must not proceed without securely held PKCE material.
     AND (i.provider NOT IN ('google_mail', 'microsoft_mail')
          OR length(coalesce(i.pkce_verifier_ciphertext, '')) >= 32)
     AND EXISTS (
       SELECT 1 FROM public.businesses AS b
        WHERE b.id = i.business_id AND b.owner_id = p_owner_id
     )
     AND EXISTS (
       SELECT 1 FROM public.growth_entitlements AS g
        WHERE g.user_id = p_owner_id
          AND g.plan_name IN ('Professional', 'Enterprise')
          AND g.payment_reference IS NOT NULL
          AND length(g.payment_reference) >= 3
          AND g.verified_at IS NOT NULL
          AND g.verified_at <= clock_timestamp()
          AND g.expires_at > clock_timestamp()
     )
  RETURNING i.id, i.pkce_verifier_ciphertext;
$claim$;


-- Even service_role must no longer invoke the legacy unbound credential store.
REVOKE EXECUTE ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM service_role;

-- The only trusted connection-store operation must prove one claimed intent,
-- acquire the same advisory lock as disconnect, and mark it stored exactly once.
CREATE OR REPLACE FUNCTION public.slbi_store_claimed_google_mail_connection(
  p_intent_id uuid,
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
v_intent public.marketing_oauth_intents%ROWTYPE;
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

  -- Serialize with begin and disconnect using the same owner-scoped lock.
  -- A pre-disconnect claimed OAuth callback cannot resurrect deleted tokens.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  SELECT i.* INTO v_intent FROM public.marketing_oauth_intents AS i
  WHERE i.id=p_intent_id
    AND i.user_id=p_owner_id
    AND i.business_id=p_business_id
    AND i.provider=p_provider
  FOR UPDATE;
  IF NOT FOUND OR v_intent.consumed_at IS NULL
    OR v_intent.invalidated_at IS NOT NULL
    OR v_intent.stored_at IS NOT NULL
    OR v_intent.expires_at<=clock_timestamp()
    OR v_intent.consumed_at<clock_timestamp()-interval '10 minutes'
  THEN
    RAISE EXCEPTION 'OAuth intent expired, revoked or already persisted'
      USING ERRCODE='42501';
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

  -- Commit binding of state to this exact one-time credential store.
  -- Any exception also rolls back metadata and secret ciphertext.
  UPDATE public.marketing_oauth_intents
     SET stored_at=clock_timestamp()
   WHERE id=p_intent_id AND stored_at IS NULL AND invalidated_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OAuth intent no longer available' USING ERRCODE='42501';
  END IF;
  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.slbi_store_claimed_google_mail_connection(
  uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_store_claimed_google_mail_connection(
  uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) TO service_role;

-- Disconnect now invalidates even the already-claimed OAuth callback state.
-- Advisory lock + UPDATE serialize the purge with connection persistence.
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

    -- Invalidate BOTH unclaimed and already-claimed OAuth states.
    -- The revised store checks invalidated_at under the owner lock.
    UPDATE public.marketing_oauth_intents i
       SET consumed_at=COALESCE(i.consumed_at,clock_timestamp()),
           invalidated_at=clock_timestamp()
     WHERE i.user_id=p_owner_id
       AND i.business_id=p_business_id
       AND i.provider='google_mail'
;
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
