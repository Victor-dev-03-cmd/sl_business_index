\set ON_ERROR_STOP on
-- On disposable Docker only, reset earlier one-off OAuth intent fixtures.
DELETE FROM public.marketing_oauth_intents;
UPDATE public.growth_entitlements SET expires_at=now()+interval '30 days'
 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $denials$
DECLARE denied boolean:=false;
BEGIN
  IF has_function_privilege('anon',
    'public.slbi_begin_marketing_oauth_intent(uuid,uuid,text,text,text,text,timestamptz)',
    'EXECUTE') OR has_function_privilege('authenticated',
    'public.slbi_begin_marketing_oauth_intent(uuid,uuid,text,text,text,text,timestamptz)',
    'EXECUTE') THEN RAISE EXCEPTION 'Untrusted OAuth begin RPC exposed'; END IF;
  BEGIN
    PERFORM public.slbi_begin_marketing_oauth_intent(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '22222222-2222-4222-8222-222222222222','google_mail',
      repeat('B',42),'v1.test-encrypted-pkce-envelope-sufficient-length',
      'https://slbusinessindex.com/oauth/google',now()+interval '10 minutes'
    );
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Basic vendor started OAuth'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.slbi_begin_marketing_oauth_intent(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222222','google_mail',
      repeat('C',42),'v1.test-encrypted-pkce-envelope-sufficient-length',
      'https://slbusinessindex.com/oauth/google',now()+interval '10 minutes'
    );
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Foreign business OAuth started'; END IF;
END $denials$;
DO $quota$
DECLARE i integer; rejected boolean:=false; total integer;
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM public.slbi_begin_marketing_oauth_intent(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111','google_mail',
      repeat('X',41)||i::text,'v1.test-encrypted-pkce-envelope-sufficient-length',
      'https://slbusinessindex.com/oauth/google',now()+interval '10 minutes'
    );
  END LOOP;
  SELECT count(*) INTO total FROM public.marketing_oauth_intents;
  IF total<>5 THEN RAISE EXCEPTION 'Did not persist five distinct intents'; END IF;
  BEGIN
    PERFORM public.slbi_begin_marketing_oauth_intent(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111','google_mail',
      repeat('Y',42),'v1.test-encrypted-pkce-envelope-sufficient-length',
      'https://slbusinessindex.com/oauth/google',now()+interval '10 minutes'
    );
  EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'OAuth rate limit bypassed'; END IF;
END $quota$;
SELECT 'P2-07 Pro OAuth start, cross-vendor denial and 5/hour rate limit PASS' result;
