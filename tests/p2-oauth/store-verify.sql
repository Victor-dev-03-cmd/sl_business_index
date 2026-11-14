\set ON_ERROR_STOP on
-- Run after claim-verify.sql; no user data or real OAuth values.
DO $permission$
BEGIN
  IF has_function_privilege(
    'authenticated','public.slbi_store_verified_marketing_connection(uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE'
  ) OR has_function_privilege(
    'anon','public.slbi_store_verified_marketing_connection(uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE'
  ) THEN RAISE EXCEPTION 'Privileged OAuth connection store exposed'; END IF;
END $permission$;

UPDATE public.growth_entitlements
SET expires_at=now()+interval '30 days'
WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $success$
DECLARE cid uuid;
BEGIN
  SELECT public.slbi_store_verified_marketing_connection(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'google_mail','google-synthetic-stable-sub','synthetic@example.test',
    'mailbox',ARRAY['openid','email','https://www.googleapis.com/auth/gmail.send'],
    now()+interval '1 hour',
    'v1.synthetic_encrypted_access_token_sufficient_length',
    'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
  ) INTO cid;
  IF cid IS NULL THEN RAISE EXCEPTION 'Valid verified Pro store failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.marketing_connection_secrets WHERE connection_id=cid)
  THEN RAISE EXCEPTION 'Missing encrypted token'; END IF;
END $success$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $metadata$
BEGIN
  IF (SELECT count(*) FROM public.marketing_connections WHERE provider='google_mail')<>1
  THEN RAISE EXCEPTION 'Paid owner cannot view own connected metadata'; END IF;
END $metadata$;
RESET ROLE;

DO $negative$
DECLARE rejected boolean:=false;
BEGIN
  BEGIN
    PERFORM public.slbi_store_verified_marketing_connection(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '22222222-2222-4222-8222-222222222222',
      'google_mail','invalid-basic-sub','basic@example.test','mailbox',
      ARRAY['openid','https://www.googleapis.com/auth/gmail.send'],
      now()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Basic owner saved connected credential'; END IF;

  rejected:=false;
  BEGIN
    PERFORM public.slbi_store_verified_marketing_connection(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222222',
      'google_mail','cross-tenant-sub','cross@example.test','mailbox',
      ARRAY['openid','https://www.googleapis.com/auth/gmail.send'],
      now()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Cross-tenant owner saved credential'; END IF;

  rejected:=false;
  BEGIN
    PERFORM public.slbi_store_verified_marketing_connection(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'google_mail','missing-scope-sub','scope@example.test','mailbox',
      ARRAY['openid','email'],now()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Missing gmail.send scope accepted'; END IF;
END $negative$;
UPDATE public.growth_entitlements SET expires_at=now()-interval '1 minute'
 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $expired$
DECLARE rejected boolean:=false;
BEGIN
  BEGIN
    PERFORM public.slbi_store_verified_marketing_connection(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'google_mail','expired-sub','expired@example.test','mailbox',
      ARRAY['openid','https://www.googleapis.com/auth/gmail.send'],
      now()+interval '1 hour',
      'v1.synthetic_encrypted_access_token_sufficient_length',
      'v1.synthetic_encrypted_refresh_token_sufficient_length','test-key-1'
    );
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Expired-Pro saved provider credential'; END IF;
END $expired$;
SELECT 'P2-07 atomic connection store, Pro and cross-tenant deny PASS' AS result;
