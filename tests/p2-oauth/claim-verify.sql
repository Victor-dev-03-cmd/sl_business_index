\set ON_ERROR_STOP on
-- Run AFTER tests/p2-oauth/verify.sql in disposable PostgreSQL only.
-- The prior test intentionally expires Pro A. Restore synthetic Pro to test
-- successful state claim, then expire it again to test denial.
UPDATE public.growth_entitlements
   SET expires_at = now() + interval '30 days'
 WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $permissions$
BEGIN
  IF has_function_privilege(
       'authenticated',
       'public.slbi_claim_marketing_oauth_intent(text,uuid,uuid,text,text)',
       'EXECUTE'
     ) OR has_function_privilege(
       'anon',
       'public.slbi_claim_marketing_oauth_intent(text,uuid,uuid,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Browser/anon can call privileged OAuth state claim';
  END IF;
  IF NOT has_function_privilege(
       'service_role',
       'public.slbi_claim_marketing_oauth_intent(text,uuid,uuid,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Trusted service role cannot claim OAuth state';
  END IF;
END $permissions$;

SET ROLE authenticated;
SET "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $browser$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM * FROM public.slbi_claim_marketing_oauth_intent(
      'synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'meta_pages',
      'https://slbusinessindex.com/api/marketing/oauth/meta_pages/callback'
    );
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Authenticated browser claimed an OAuth state';
  END IF;
END $browser$;
RESET ROLE;
RESET "request.jwt.claim.sub";

DO $atomic$
DECLARE count_rows int;
BEGIN
  -- Even a trusted server cannot claim against the wrong owner, business,
  -- provider or an attacker-supplied callback/redirect URI.
  SELECT count(*) INTO count_rows
  FROM public.slbi_claim_marketing_oauth_intent(
    'synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    'meta_pages',
    'https://slbusinessindex.com/api/marketing/oauth/meta_pages/callback'
  );
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Cross-owner state claim'; END IF;

  SELECT count(*) INTO count_rows
  FROM public.slbi_claim_marketing_oauth_intent(
    'synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'meta_pages', 'https://attacker.example/callback'
  );
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Redirect mismatch state claim'; END IF;

  SELECT count(*) INTO count_rows
  FROM public.slbi_claim_marketing_oauth_intent(
    'synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'meta_pages',
    'https://slbusinessindex.com/api/marketing/oauth/meta_pages/callback'
  );
  IF count_rows <> 1 THEN RAISE EXCEPTION 'Valid Pro owner claim failed'; END IF;

  SELECT count(*) INTO count_rows
  FROM public.slbi_claim_marketing_oauth_intent(
    'synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'meta_pages',
    'https://slbusinessindex.com/api/marketing/oauth/meta_pages/callback'
  );
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Replay claim succeeded'; END IF;
END $atomic$;

-- Basic B, expired state and missing required PKCE are denied.
INSERT INTO public.marketing_oauth_intents (
  user_id, business_id, provider, state_digest, redirect_uri, expires_at
) VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '22222222-2222-4222-8222-222222222222', 'meta_pages',
   repeat('B',45), 'https://slbusinessindex.com/oauth/meta', now()+interval '10 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111', 'google_mail',
   repeat('C',45), 'https://slbusinessindex.com/oauth/google', now()+interval '10 minutes');

INSERT INTO public.marketing_oauth_intents (
  user_id, business_id, provider, state_digest, redirect_uri,
  created_at, expires_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111', 'meta_pages',
  repeat('D',45), 'https://slbusinessindex.com/oauth/meta',
  now()-interval '20 minutes', now()-interval '10 minutes'
);

DO $negative$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.slbi_claim_marketing_oauth_intent(
    repeat('B',45), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'meta_pages', 'https://slbusinessindex.com/oauth/meta'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'Basic owner claimed intent'; END IF;

  SELECT count(*) INTO n FROM public.slbi_claim_marketing_oauth_intent(
    repeat('C',45), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'google_mail', 'https://slbusinessindex.com/oauth/google'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'Google intent without PKCE claimed'; END IF;

  SELECT count(*) INTO n FROM public.slbi_claim_marketing_oauth_intent(
    repeat('D',45), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'meta_pages', 'https://slbusinessindex.com/oauth/meta'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'Expired intent claimed'; END IF;
END $negative$;

UPDATE public.growth_entitlements
   SET expires_at = now() - interval '1 minute'
 WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $expired_pro$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.slbi_claim_marketing_oauth_intent(
    repeat('C',45), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'google_mail', 'https://slbusinessindex.com/oauth/google'
  );
  IF n <> 0 THEN RAISE EXCEPTION 'Expired entitlement accepted'; END IF;
END $expired_pro$;

SELECT 'P2-07 atomic OAuth claim, Basic/expired Pro, PKCE, replay and browser denial PASS' AS result;
