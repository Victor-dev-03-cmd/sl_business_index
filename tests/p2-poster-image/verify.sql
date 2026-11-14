\set ON_ERROR_STOP on
-- Synthetic disposable PG17 tenant / Pro credits / idempotency / global budget.
-- Run after tests/p2-brand/bootstrap.sql and GrowthOS credit foundation + P2-04 candidate.
DO $default_off$
BEGIN
  IF (SELECT is_enabled FROM public.growth_credit_actions WHERE action_key='ai_poster_design') THEN
    RAISE EXCEPTION 'Poster image spending must be disabled by default';
  END IF;
  IF has_table_privilege('anon','public.marketing_poster_jobs','SELECT')
    OR has_table_privilege('authenticated','public.marketing_poster_jobs','INSERT')
    OR has_table_privilege('authenticated','public.marketing_poster_jobs','UPDATE')
    OR has_function_privilege('authenticated','public.marketing_poster_claim(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Client can access privileged poster jobs'; END IF;
END $default_off$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $browser$
DECLARE refused boolean:=false;
BEGIN
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '11111111-aaaa-4444-aaaa-111111111111',
      repeat('a',64),8);
  EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Authenticated browser bypassed service-only reserve'; END IF;
END $browser$;
RESET ROLE;

-- Synthetic verified payment is only ever inserted in disposable test DB.
INSERT INTO public.growth_entitlements(user_id,plan_name,payment_reference,verified_at,expires_at)
VALUES(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Professional','synthetic-verified-only',now()-interval '1 day',now()+interval '7 days'
);
SET ROLE service_role;
SET "request.jwt.claim.role"='service_role';
DO $guards$
DECLARE refused boolean:=false;
BEGIN
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '22222222-2222-4222-8222-222222222222',
      '22222222-bbbb-4444-bbbb-222222222222',repeat('b',64),8);
  EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Basic account spent Pro image credits'; END IF;

  refused:=false;
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222222',
      '33333333-bbbb-4444-bbbb-333333333333',repeat('c',64),8);
  EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Cross-business owner access succeeded'; END IF;

  refused:=false;
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '44444444-aaaa-4444-aaaa-444444444444',repeat('d',64),8);
  EXCEPTION WHEN raise_exception THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Default-disabled AI action accepted'; END IF;
END $guards$;

UPDATE public.growth_credit_actions SET is_enabled=true WHERE action_key='ai_poster_design';
DO $zero_cap$
DECLARE refused boolean:=false;
BEGIN
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '55555555-aaaa-4444-aaaa-555555555555',repeat('a',64),8);
  EXCEPTION WHEN raise_exception THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Global AI budget cap zero bypassed'; END IF;
END $zero_cap$;
INSERT INTO public.marketing_poster_daily_limits(day_utc,max_attempts)
VALUES((now() AT TIME ZONE 'UTC')::date,2)
ON CONFLICT(day_utc) DO UPDATE SET max_attempts=2;

DO $owner$
DECLARE
  first_id uuid;again_id uuid;second_id uuid;
  cost integer;new_ boolean;state_ text;balance integer;path text;
  refused boolean;claimed boolean;
BEGIN
  SELECT job_id,job_state,charged_credits,newly_created
  INTO first_id,state_,cost,new_
  FROM public.marketing_poster_reserve(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '66666666-aaaa-4444-aaaa-666666666666',repeat('f',64),8);
  IF first_id IS NULL OR state_<>'reserved' OR cost<>8 OR NOT new_
    THEN RAISE EXCEPTION 'First image charge failed'; END IF;
  SELECT credits_remaining INTO balance FROM public.growth_credit_wallets
   WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF balance<>492 THEN RAISE EXCEPTION 'Atomic Pro credit charge incorrect: %',balance; END IF;

  SELECT job_id,newly_created INTO again_id,new_
  FROM public.marketing_poster_reserve(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '66666666-aaaa-4444-aaaa-666666666666',repeat('f',64),8);
  IF again_id<>first_id OR new_ THEN RAISE EXCEPTION 'Image retry charged twice'; END IF;
  refused:=false;
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '66666666-aaaa-4444-aaaa-666666666666',repeat('e',64),8);
  EXCEPTION WHEN unique_violation THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Changed brief reused existing paid key'; END IF;

  IF NOT public.marketing_poster_claim(first_id) OR public.marketing_poster_claim(first_id)
    THEN RAISE EXCEPTION 'Provider claim not single-use'; END IF;
  refused:=false;
  BEGIN
    PERFORM public.marketing_poster_complete(first_id,'other-owner/file.png',
      'gpt-image-2.5-flare','slbi-v1');
  EXCEPTION WHEN invalid_parameter_value THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Cross-path output accepted'; END IF;
  path:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/'||
    '11111111-1111-4111-8111-111111111111/'||first_id::text||'.png';
  IF NOT public.marketing_poster_complete(first_id,path,
    'gpt-image-2.5-flare','slbi-v1') THEN RAISE EXCEPTION 'Settle failed'; END IF;
  IF public.marketing_poster_refund(first_id)
    THEN RAISE EXCEPTION 'Completed image refunded illegally'; END IF;

  SELECT job_id INTO second_id FROM public.marketing_poster_reserve(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '77777777-aaaa-4444-aaaa-777777777777',repeat('d',64),8);
  IF NOT public.marketing_poster_claim(second_id) THEN RAISE EXCEPTION 'Second job claim failed'; END IF;
  IF NOT public.marketing_poster_refund(second_id)
    OR public.marketing_poster_refund(second_id)
  THEN RAISE EXCEPTION 'Refund double-charged or failed'; END IF;
  SELECT credits_remaining INTO balance FROM public.growth_credit_wallets
   WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF balance<>492 THEN RAISE EXCEPTION 'Credit refund incorrect: %',balance; END IF;
  refused:=false;
  BEGIN
    PERFORM public.marketing_poster_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '88888888-aaaa-4444-aaaa-888888888888',repeat('c',64),8);
  EXCEPTION WHEN raise_exception THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Global daily ceiling bypassed'; END IF;
END $owner$;
RESET ROLE;
RESET "request.jwt.claim.role";

SET ROLE authenticated;
SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $tenant_b$
BEGIN
  IF (SELECT count(*) FROM public.marketing_poster_jobs)<>0
    THEN RAISE EXCEPTION 'Vendor B can see Vendor A image jobs'; END IF;
END $tenant_b$;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $tenant_a$
BEGIN
  IF (SELECT count(*) FROM public.marketing_poster_jobs)<>2
    THEN RAISE EXCEPTION 'Vendor A private job library invisible'; END IF;
END $tenant_a$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'Pro Poster AI funding, budget, RLS, claim/refund and tenant isolation PASS' result;
