-- SEPARATE FINANCIAL APPROVAL REQUIRED. Transaction body, no pricing changes.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $preflight$
DECLARE v_func regprocedure; v_fingerprint text; r record;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('public._growth_ensure_wallet(uuid)','0bce683434108013ccee6bccd6fb4539f273fa5bf93a12907b97fef547c18c74'),
  ('public.marketing_refund_ai_draft(uuid)','372ef83ea302b42bde6885aeedd4ed4c155fda3903d83deed026c9da3641f823'),
  ('public.marketing_poster_refund(uuid)','b1e7b73d78853aa2ca3dafd3ddcb96a2bb9354494229e526b7f52fa2c37cfa82')
 ) AS expected(signature,fingerprint)
 LOOP
  v_func:=to_regprocedure(r.signature);
  IF v_func IS NULL THEN RAISE EXCEPTION 'G0 missing expected function: %',r.signature; END IF;
  SELECT encode(extensions.digest(convert_to(pg_get_functiondef(v_func::oid),'UTF8'),'sha256'),'hex') INTO v_fingerprint;
  IF v_fingerprint IS DISTINCT FROM r.fingerprint THEN RAISE EXCEPTION 'G0 definition drift: %',r.signature; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=v_func::oid AND pg_get_userbyid(proowner)='postgres' AND proconfig @> ARRAY['search_path=""']) OR has_function_privilege('anon',v_func::oid,'execute') OR has_function_privilege('authenticated',v_func::oid,'execute') OR NOT has_function_privilege('service_role',v_func::oid,'execute') THEN RAISE EXCEPTION 'G0 function ownership or ACL drift: %',r.signature; END IF;
 END LOOP;
END $preflight$;
LOCK TABLE public.marketing_credit_jobs,public.marketing_poster_jobs,public.growth_credit_wallets IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketing_credit_jobs WHERE state='reserved') OR EXISTS(SELECT 1 FROM public.marketing_poster_jobs WHERE state IN ('reserved','processing')) THEN RAISE EXCEPTION 'G0 in-flight AI reservations: wait for quiescence'; END IF;
 IF EXISTS(SELECT 1 FROM public.growth_credit_wallets WHERE credits_remaining>greatest(0,credit_limit-credits_used)) THEN RAISE EXCEPTION 'G0 wallet overcap: reconcile before release'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION public._growth_ensure_wallet(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_period date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_plan text := 'Basic';
  v_allowance integer;
  v_wallet public.growth_credit_wallets%ROWTYPE;
  v_balance integer;
  v_delta integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user'; END IF;
  SELECT e.plan_name INTO v_plan FROM public.growth_entitlements e
  WHERE e.user_id=p_user_id AND e.verified_at<=now() AND e.expires_at>now()
  ORDER BY e.verified_at DESC LIMIT 1;
  v_plan:=COALESCE(v_plan,'Basic');
  SELECT p.monthly_credits INTO v_allowance FROM public.growth_credit_plans p
  WHERE p.plan_name=v_plan;
  IF v_allowance IS NULL THEN RAISE EXCEPTION 'Growth plan configuration missing'; END IF;

  INSERT INTO public.growth_credit_wallets
    (user_id,period_start,plan_name,credit_limit,credits_remaining)
  VALUES(p_user_id,v_period,v_plan,v_allowance,v_allowance)
  ON CONFLICT(user_id,period_start) DO NOTHING;

  SELECT * INTO v_wallet FROM public.growth_credit_wallets
  WHERE user_id=p_user_id AND period_start=v_period FOR UPDATE;

  INSERT INTO public.growth_credit_ledger
    (user_id,period_start,action_key,delta,balance_after,request_key)
  VALUES(p_user_id,v_period,'monthly_grant',v_wallet.credit_limit,
    v_wallet.credit_limit,'monthly-grant')
  ON CONFLICT(user_id,period_start,request_key) DO NOTHING;

  IF v_wallet.credit_limit<>v_allowance OR v_wallet.plan_name<>v_plan
     OR v_wallet.credits_remaining>GREATEST(0,v_allowance-v_wallet.credits_used) THEN
    IF v_allowance>v_wallet.credit_limit THEN
      v_balance:=LEAST(v_wallet.credits_remaining+v_allowance-v_wallet.credit_limit,
        GREATEST(0,v_allowance-v_wallet.credits_used));
    ELSE
      v_balance:=LEAST(v_wallet.credits_remaining,
        GREATEST(0,v_allowance-v_wallet.credits_used));
    END IF;
    v_delta:=v_balance-v_wallet.credits_remaining;
    UPDATE public.growth_credit_wallets SET
      plan_name=v_plan,credit_limit=v_allowance,
      credits_remaining=v_balance,updated_at=now()
    WHERE user_id=p_user_id AND period_start=v_period;
    IF v_delta<>0 THEN
      INSERT INTO public.growth_credit_ledger
        (user_id,period_start,action_key,delta,balance_after)
      VALUES(p_user_id,v_period,'entitlement_adjustment',v_delta,v_balance);
    END IF;
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.marketing_refund_ai_draft(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_job public.marketing_credit_jobs%ROWTYPE;v_balance integer;v_cap integer;v_used integer;v_reclaim integer;
  v_period date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.marketing_credit_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state <> 'reserved' THEN RETURN false; END IF;
  v_period:=date_trunc('month',v_job.created_at AT TIME ZONE 'UTC')::date;
  -- Reserve/deduct/refund are serialized by the job lock and wallet update.
  -- Reconcile current-month entitlement, never change historical plan.
  IF v_period=date_trunc('month',now() AT TIME ZONE 'UTC')::date THEN
    PERFORM public._growth_ensure_wallet(v_job.user_id);
  END IF;
  UPDATE public.growth_credit_wallets
    SET credits_remaining=credits_remaining+v_job.cost_credits,
        credits_used=credits_used-v_job.cost_credits,updated_at=now()
    WHERE user_id=v_job.user_id AND period_start=v_period
    RETURNING credits_remaining,credit_limit,credits_used INTO v_balance,v_cap,v_used;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Missing historical wallet for refund';
  END IF;
  UPDATE public.marketing_credit_jobs SET state='refunded',resolved_at=now()
    WHERE id=v_job.id;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(v_job.user_id,v_period,'ai_social_refund',v_job.cost_credits,
           v_balance,'p2-refund:'||v_job.request_key);
  -- Preserve the original full reversal and separately reclaim
  -- credits that are no longer spendable under the current allowance.
  v_reclaim:=GREATEST(0,v_balance-GREATEST(0,v_cap-v_used));
  IF v_reclaim>0 THEN
    UPDATE public.growth_credit_wallets SET credits_remaining=credits_remaining-v_reclaim,updated_at=now()
      WHERE user_id=v_job.user_id AND period_start=v_period;
    INSERT INTO public.growth_credit_ledger(user_id,period_start,action_key,delta,balance_after,request_key)
      VALUES(v_job.user_id,v_period,'entitlement_adjustment',-v_reclaim,v_balance-v_reclaim,'g0-caption-reclaim:'||v_job.request_key);
  END IF;
  RETURN true;
END;$function$
;
CREATE OR REPLACE FUNCTION public.marketing_poster_refund(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_job public.marketing_poster_jobs%ROWTYPE;v_period date;v_balance integer;v_cap integer;v_used integer;v_reclaim integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state NOT IN ('reserved','processing') THEN RETURN false; END IF;
  v_period:=date_trunc('month',v_job.created_at AT TIME ZONE 'UTC')::date;
  -- Reconcile current-month entitlement, never change historical plan.
  IF v_period=date_trunc('month',now() AT TIME ZONE 'UTC')::date THEN
    PERFORM public._growth_ensure_wallet(v_job.user_id);
  END IF;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=credits_remaining+v_job.cost_credits,
    credits_used=credits_used-v_job.cost_credits,updated_at=now()
    WHERE user_id=v_job.user_id AND period_start=v_period
    RETURNING credits_remaining,credit_limit,credits_used INTO v_balance,v_cap,v_used;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Refund wallet missing'; END IF;
  UPDATE public.marketing_poster_jobs SET state='refunded',resolved_at=now()
    WHERE id=v_job.id;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(
    v_job.user_id,v_period,'ai_poster_refund',v_job.cost_credits,v_balance,
    'p2-poster-refund:'||v_job.request_key
  );
  -- Preserve the original full reversal and separately reclaim
  -- credits that are no longer spendable under the current allowance.
  v_reclaim:=GREATEST(0,v_balance-GREATEST(0,v_cap-v_used));
  IF v_reclaim>0 THEN
    UPDATE public.growth_credit_wallets SET credits_remaining=credits_remaining-v_reclaim,updated_at=now()
      WHERE user_id=v_job.user_id AND period_start=v_period;
    INSERT INTO public.growth_credit_ledger(user_id,period_start,action_key,delta,balance_after,request_key)
      VALUES(v_job.user_id,v_period,'entitlement_adjustment',-v_reclaim,v_balance-v_reclaim,'g0-poster-reclaim:'||v_job.request_key);
  END IF;
  RETURN true;
END; $function$
;
REVOKE ALL ON FUNCTION public._growth_ensure_wallet(uuid),public.marketing_refund_ai_draft(uuid),public.marketing_poster_refund(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._growth_ensure_wallet(uuid),public.marketing_refund_ai_draft(uuid),public.marketing_poster_refund(uuid) TO service_role;
