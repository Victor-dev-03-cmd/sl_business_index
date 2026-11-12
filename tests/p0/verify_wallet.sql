-- CI only: isolated PostgreSQL 17, fake users, no live wallet or payment.
\set ON_ERROR_STOP on
-- Supabase service_role bypasses RLS, unlike ordinary PostgreSQL roles.
ALTER ROLE service_role BYPASSRLS;
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.growth_wallet_status();
    RAISE EXCEPTION 'FAIL: anonymous wallet access allowed';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.growth_wallet_status();
  IF v.plan_name<>'Basic' OR v.monthly_allowance<>30
    OR v.credits_remaining<>30 OR v.credits_used<>0 THEN
    RAISE EXCEPTION 'FAIL: basic wallet allowance incorrect'; END IF;
  PERFORM * FROM public.growth_wallet_status();
  IF (SELECT count(*) FROM public.growth_credit_ledger)<>1 THEN
    RAISE EXCEPTION 'FAIL: duplicate monthly grant'; END IF;
  BEGIN
    UPDATE public.growth_credit_wallets SET credits_remaining=99999;
    RAISE EXCEPTION 'FAIL: user changed wallet balance';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN
    PERFORM public.growth_consume_credits(
      '00000000-0000-4000-8000-000000000002',
      'ai_social_draft','request-self-fail-001');
    RAISE EXCEPTION 'FAIL: browser can consume growth credits';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $$;
\echo 'PASS: Basic wallet created; no double grant or browser write access'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.growth_wallet_status();
  IF v.plan_name<>'Basic' OR v.credits_remaining<>30 THEN
    RAISE EXCEPTION 'FAIL: vendor B wallet not initialized'; END IF;
  IF (SELECT count(*) FROM public.growth_credit_wallets)<>1 THEN
    RAISE EXCEPTION 'FAIL: vendor B sees vendor A wallet'; END IF;
  IF EXISTS(SELECT 1 FROM public.growth_credit_ledger
     WHERE user_id='00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'FAIL: vendor B sees vendor A history'; END IF;
END $$;
\echo 'PASS: wallet and ledger cross-vendor RLS'
RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO public.growth_entitlements(user_id,plan_name,payment_reference,verified_at,expires_at)
VALUES('00000000-0000-4000-8000-000000000002',
  'Professional','synthetic-verified-payment',now(),now()+interval '20 days');
UPDATE public.growth_credit_actions SET is_enabled=true WHERE action_key='ai_social_draft';
DO $$
DECLARE v_balance int;
BEGIN
  v_balance:=public.growth_consume_credits(
    '00000000-0000-4000-8000-000000000002','ai_social_draft','request-unique-00001');
  IF v_balance<>498 THEN
    RAISE EXCEPTION 'FAIL: Professional credit allowance or debit incorrect: %',v_balance;
  END IF;
  v_balance:=public.growth_consume_credits(
    '00000000-0000-4000-8000-000000000002','ai_social_draft','request-unique-00001');
  IF v_balance<>498 THEN RAISE EXCEPTION 'FAIL: duplicate request changed balance'; END IF;
  IF (SELECT credits_used FROM public.growth_credit_wallets
      WHERE user_id='00000000-0000-4000-8000-000000000002')<>2 THEN
    RAISE EXCEPTION 'FAIL: duplicate request double charged credits'; END IF;
  IF (SELECT count(*) FROM public.growth_credit_ledger
      WHERE request_key='request-unique-00001')<>1 THEN
    RAISE EXCEPTION 'FAIL: duplicate action ledger entry'; END IF;
  BEGIN
    PERFORM public.growth_consume_credits(
      '00000000-0000-4000-8000-000000000002','seo_basic_audit','request-disabled-001');
    RAISE EXCEPTION 'FAIL: disabled SEO action consumed credits';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  UPDATE public.growth_credit_actions SET is_enabled=true WHERE action_key='seo_basic_audit';
  BEGIN
    PERFORM public.growth_consume_credits(
      '00000000-0000-4000-8000-000000000002','seo_basic_audit','request-unique-00001');
    RAISE EXCEPTION 'FAIL: reused idempotency key for different action';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
END $$;
\echo 'PASS: service-only debit, idempotency, disabled action, mismatched keys'
UPDATE public.growth_entitlements
  SET verified_at=now()-interval '10 days',
      expires_at=now()-interval '1 day'
  WHERE user_id='00000000-0000-4000-8000-000000000002';
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.growth_wallet_status();
  IF v.plan_name<>'Basic' OR v.monthly_allowance<>30 OR
     v.credits_remaining<>28 OR v.credits_used<>2 THEN
    RAISE EXCEPTION 'FAIL: expiry downgrade does not preserve usage: %, %, %, %',
       v.plan_name,v.monthly_allowance,v.credits_remaining,v.credits_used;
  END IF;
END $$;
\echo 'PASS: expired paid entitlement downgraded without losing usage history'
RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.growth_credit_wallets)<>2 THEN
    RAISE EXCEPTION 'FAIL: wrong wallet count'; END IF;
  IF (SELECT count(*) FROM public.growth_credit_ledger
    WHERE user_id='00000000-0000-4000-8000-000000000002'
      AND action_key='monthly_grant')<>1 THEN
    RAISE EXCEPTION 'FAIL: duplicate grant after upgrade/downgrade'; END IF;
END $$;
\echo 'PASS: deterministic synthetic ledger reconciliation'
