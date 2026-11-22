-- Captured LIVE function baseline only. Forward correction normally safer after financial use.
-- Does NOT undo ledger deltas, refunds, entitlement adjustments or jobs. Finance review required.
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
  WHERE e.user_id=p_user_id AND e.expires_at>now()
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

  IF v_wallet.credit_limit<>v_allowance OR v_wallet.plan_name<>v_plan THEN
    IF v_allowance>v_wallet.credit_limit THEN
      v_balance:=v_wallet.credits_remaining+v_allowance-v_wallet.credit_limit;
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
$function$;

CREATE OR REPLACE FUNCTION public.marketing_refund_ai_draft(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_job public.marketing_credit_jobs%ROWTYPE;v_balance integer;
  v_period date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.marketing_credit_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state <> 'reserved' THEN RETURN false; END IF;
  v_period:=date_trunc('month',v_job.created_at AT TIME ZONE 'UTC')::date;
  -- Reserve/deduct/refund are serialized by the job lock and wallet update.
  UPDATE public.growth_credit_wallets
    SET credits_remaining=credits_remaining+v_job.cost_credits,
        credits_used=credits_used-v_job.cost_credits,updated_at=now()
    WHERE user_id=v_job.user_id AND period_start=v_period
    RETURNING credits_remaining INTO v_balance;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Missing historical wallet for refund';
  END IF;
  UPDATE public.marketing_credit_jobs SET state='refunded',resolved_at=now()
    WHERE id=v_job.id;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(v_job.user_id,v_period,'ai_social_refund',v_job.cost_credits,
           v_balance,'p2-refund:'||v_job.request_key);
  RETURN true;
END;$function$;

CREATE OR REPLACE FUNCTION public.marketing_poster_refund(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_job public.marketing_poster_jobs%ROWTYPE;v_period date;v_balance integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state NOT IN ('reserved','processing') THEN RETURN false; END IF;
  v_period:=date_trunc('month',v_job.created_at AT TIME ZONE 'UTC')::date;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=credits_remaining+v_job.cost_credits,
    credits_used=credits_used-v_job.cost_credits,updated_at=now()
    WHERE user_id=v_job.user_id AND period_start=v_period
    RETURNING credits_remaining INTO v_balance;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Refund wallet missing'; END IF;
  UPDATE public.marketing_poster_jobs SET state='refunded',resolved_at=now()
    WHERE id=v_job.id;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(
    v_job.user_id,v_period,'ai_poster_refund',v_job.cost_credits,v_balance,
    'p2-poster-refund:'||v_job.request_key
  );
  RETURN true;
END; $function$;
REVOKE ALL ON FUNCTION public._growth_ensure_wallet(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._growth_ensure_wallet(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.marketing_refund_ai_draft(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_refund_ai_draft(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.marketing_poster_refund(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_refund(uuid) TO service_role;
