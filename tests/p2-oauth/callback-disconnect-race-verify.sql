\set ON_ERROR_STOP on
-- Run on disposable PostgreSQL 17 AFTER the original disconnect tests,
-- then apply the P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql patch.
-- Synthetic users only; no real Google account or credentials.
DO $permissions$
BEGIN
  IF has_function_privilege('service_role',
    'public.slbi_store_verified_marketing_connection(uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Legacy unbound store still callable'; END IF;
  IF has_function_privilege('anon',
    'public.slbi_store_claimed_google_mail_connection(uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.slbi_store_claimed_google_mail_connection(uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Browser role may store OAuth secrets'; END IF;
END $permissions$;

-- Restore test owner's expired paid status for new OAuth consent; never
-- insert a real entitlement in live production.
UPDATE public.growth_entitlements SET expires_at=clock_timestamp()+interval '30 days'
 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DELETE FROM public.marketing_oauth_intents;

-- Two simultaneously claimed states: one may commit; once disconnect wins,
-- the other MUST NOT persist any token, even though it was already claimed.
DO $test$
DECLARE
  v_owner uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_business uuid:='11111111-1111-4111-8111-111111111111';
  v_other uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_one uuid;v_two uuid;v_cid uuid;
  v_pkce text;v_rejected boolean;
  v_first_digest text:=repeat('H',42);
  v_second_digest text:=repeat('J',42);
  v_old_count integer;
BEGIN
  INSERT INTO public.marketing_oauth_intents(
    user_id,business_id,provider,state_digest,pkce_verifier_ciphertext,
    redirect_uri,expires_at
  ) VALUES(
    v_owner,v_business,'google_mail',v_first_digest,
    'v1.synthetic-encrypted-pkce-for-test-1234567890',
    'https://slbi-test.example/api/oauth',clock_timestamp()+interval '10 minutes'
  ) RETURNING id INTO v_one;
  INSERT INTO public.marketing_oauth_intents(
    user_id,business_id,provider,state_digest,pkce_verifier_ciphertext,
    redirect_uri,expires_at
  ) VALUES(
    v_owner,v_business,'google_mail',v_second_digest,
    'v1.synthetic-encrypted-pkce-for-test-1234567890',
    'https://slbi-test.example/api/oauth',clock_timestamp()+interval '10 minutes'
  ) RETURNING id INTO v_two;

  SELECT encrypted_pkce_verifier INTO v_pkce
  FROM public.slbi_claim_marketing_oauth_intent(
    v_first_digest,v_owner,v_business,'google_mail',
    'https://slbi-test.example/api/oauth'
  );
  IF v_pkce IS NULL THEN RAISE EXCEPTION 'First OAuth state could not be claimed'; END IF;
  SELECT encrypted_pkce_verifier INTO v_pkce
  FROM public.slbi_claim_marketing_oauth_intent(
    v_second_digest,v_owner,v_business,'google_mail',
    'https://slbi-test.example/api/oauth'
  );
  IF v_pkce IS NULL THEN RAISE EXCEPTION 'Second OAuth state could not be claimed'; END IF;

  SELECT public.slbi_store_claimed_google_mail_connection(
    v_one,v_owner,v_business,'google_mail','first-sub-123','first@test.example',
    'mailbox',ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
    clock_timestamp()+interval '1 hour',
    'v1.synthetic_encrypted_access_token_sufficient_length',
    'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
  ) INTO v_cid;
  IF v_cid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.marketing_connection_secrets WHERE connection_id=v_cid
  ) THEN RAISE EXCEPTION 'Claimed first state was not atomically stored'; END IF;

  v_rejected:=false;
  BEGIN
    PERFORM public.slbi_store_claimed_google_mail_connection(
      v_one,v_owner,v_business,'google_mail','replay-sub-123','replay@test.example',
      'mailbox',ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
      clock_timestamp()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'One-time OAuth state replay accepted'; END IF;

  IF NOT public.slbi_disconnect_google_mail_connection(v_owner,v_business,v_cid)
  THEN RAISE EXCEPTION 'Owner disconnect was refused'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.marketing_oauth_intents
    WHERE id=v_two AND consumed_at IS NOT NULL AND invalidated_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Previously claimed callback survived disconnect'; END IF;

  v_rejected:=false;
  BEGIN
    PERFORM public.slbi_store_claimed_google_mail_connection(
      v_two,v_owner,v_business,'google_mail','stale-sub-123','stale@test.example',
      'mailbox',ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
      clock_timestamp()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'Stale claimed callback resurrected tokens'; END IF;
  IF EXISTS(SELECT 1 FROM public.marketing_connection_secrets s
    JOIN public.marketing_connections c ON c.id=s.connection_id
    WHERE c.user_id=v_owner AND c.business_id=v_business)
  THEN RAISE EXCEPTION 'Secret survived disconnect'; END IF;

  v_rejected:=false;
  BEGIN
    PERFORM public.slbi_store_claimed_google_mail_connection(
      v_two,v_other,'22222222-2222-4222-8222-222222222222',
      'google_mail','cross-sub-123','cross@test.example',
      'mailbox',ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
      clock_timestamp()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'Cross-owner intent used as authority'; END IF;

  -- New, unclaimed state must never authorize credential persistence.
  INSERT INTO public.marketing_oauth_intents(
    user_id,business_id,provider,state_digest,pkce_verifier_ciphertext,
    redirect_uri,expires_at
  ) VALUES(
    v_owner,v_business,'google_mail',repeat('K',42),
    'v1.synthetic-encrypted-pkce-for-test-1234567890',
    'https://slbi-test.example/api/oauth',clock_timestamp()+interval '10 minutes'
  ) RETURNING id INTO v_two;
  v_rejected:=false;
  BEGIN
    PERFORM public.slbi_store_claimed_google_mail_connection(
      v_two,v_owner,v_business,'google_mail','unclaimed-sub-123',
      'unclaimed@test.example','mailbox',
      ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
      clock_timestamp()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'Unclaimed intent allowed token storage'; END IF;

  SELECT COUNT(*) INTO v_old_count FROM public.marketing_connections
    WHERE user_id=v_owner AND business_id=v_business AND status='connected';
  IF v_old_count<>0 THEN RAISE EXCEPTION 'Unexpected active connection after disconnect'; END IF;
END $test$;
SELECT 'P2-07 claimed callback and local disconnect race guard PASS' AS result;
