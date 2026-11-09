-- Growth OS phase 1: secure, non-destructive credit wallet foundation.
-- Existing subscriptions/invoices are not rewritten.
-- Browser users must never grant themselves paid plans or paid invoices.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.growth_credit_plans (
  plan_name text PRIMARY KEY,
  monthly_credits integer NOT NULL CHECK (monthly_credits BETWEEN 0 AND 1000000)
);
INSERT INTO public.growth_credit_plans(plan_name,monthly_credits)
VALUES ('Basic',30),('Professional',500),('Enterprise',1500)
ON CONFLICT(plan_name) DO NOTHING;

-- Only trusted service-role backend may assign verified Growth OS entitlements.
-- Legacy client-generated subscription invoices do not unlock Growth credits.
CREATE TABLE IF NOT EXISTS public.growth_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL REFERENCES public.growth_credit_plans(plan_name)
    CHECK (plan_name <> 'Basic'),
  payment_reference text NOT NULL CHECK (length(payment_reference) BETWEEN 3 AND 200),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > verified_at)
);

CREATE TABLE IF NOT EXISTS public.growth_credit_wallets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  plan_name text NOT NULL REFERENCES public.growth_credit_plans(plan_name),
  credit_limit integer NOT NULL CHECK(credit_limit>=0),
  credits_remaining integer NOT NULL CHECK(credits_remaining>=0),
  credits_used integer NOT NULL DEFAULT 0 CHECK(credits_used>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,period_start)
);
CREATE TABLE IF NOT EXISTS public.growth_credit_actions (
  action_key text PRIMARY KEY,
  credit_cost integer NOT NULL CHECK(credit_cost>0),
  is_enabled boolean NOT NULL DEFAULT false
);
-- Do not enable deductions before actual SEO/AI backend jobs exist.
INSERT INTO public.growth_credit_actions(action_key,credit_cost,is_enabled)
VALUES ('seo_basic_audit',10,false),('ai_social_draft',2,false),('ai_email_draft',3,false)
ON CONFLICT(action_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.growth_credit_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  action_key text NOT NULL,
  delta integer NOT NULL CHECK(delta<>0),
  balance_after integer NOT NULL CHECK(balance_after>=0),
  request_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,period_start) REFERENCES
    public.growth_credit_wallets(user_id,period_start) ON DELETE CASCADE,
  UNIQUE(user_id,period_start,request_key)
);
CREATE INDEX IF NOT EXISTS growth_credit_history_idx
  ON public.growth_credit_ledger(user_id,created_at DESC);

ALTER TABLE public.growth_credit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY growth_plans_read ON public.growth_credit_plans
  FOR SELECT TO authenticated USING(true);
CREATE POLICY growth_actions_read ON public.growth_credit_actions
  FOR SELECT TO authenticated USING(true);
CREATE POLICY growth_entitlements_read ON public.growth_entitlements
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY growth_wallets_read ON public.growth_credit_wallets
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY growth_ledger_read ON public.growth_credit_ledger
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger TO authenticated;
GRANT ALL ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.growth_credit_ledger_id_seq TO service_role;

-- Row-locked wallet creation/reconciliation. Month boundaries are UTC.
-- Upgrades top up immediately. Downgrades and expired entitlements reclaim
-- unspent paid credits while preserving usage history.
CREATE FUNCTION public._growth_ensure_wallet(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
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
$$;
REVOKE ALL ON FUNCTION public._growth_ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._growth_ensure_wallet(uuid) TO service_role;

-- Signed-in users can only read/provision their own wallet.
CREATE FUNCTION public.growth_wallet_status()
RETURNS TABLE(plan_name text,monthly_allowance integer,credits_remaining integer,
  credits_used integer,period_start date,resets_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  PERFORM public._growth_ensure_wallet(v_uid);
  RETURN QUERY SELECT w.plan_name,w.credit_limit,w.credits_remaining,
    w.credits_used,w.period_start,
    (w.period_start + INTERVAL '1 month') AT TIME ZONE 'UTC'
  FROM public.growth_credit_wallets w
  WHERE w.user_id=v_uid
    AND w.period_start=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_wallet_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.growth_wallet_status() TO authenticated;

-- Future services must validate user/workspace and real operation success
-- before calling this function with service-role credentials.
-- Action cost is NOT supplied by clients. Retries use an idempotency key.
CREATE FUNCTION public.growth_consume_credits(
  p_user_id uuid,p_action_key text,p_request_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_period date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_cost integer;
  v_balance integer;
  v_existing text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted server only' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_request_key IS NULL
     OR length(p_request_key)<8 OR length(p_request_key)>120 THEN
    RAISE EXCEPTION 'Invalid credit request' USING ERRCODE='22023';
  END IF;
  SELECT credit_cost INTO v_cost FROM public.growth_credit_actions
  WHERE action_key=p_action_key AND is_enabled;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'Feature not enabled'; END IF;

  PERFORM public._growth_ensure_wallet(p_user_id);
  SELECT credits_remaining INTO v_balance FROM public.growth_credit_wallets
  WHERE user_id=p_user_id AND period_start=v_period FOR UPDATE;

  SELECT action_key INTO v_existing FROM public.growth_credit_ledger
  WHERE user_id=p_user_id AND period_start=v_period AND request_key=p_request_key;
  IF FOUND THEN
    IF v_existing<>p_action_key THEN RAISE EXCEPTION 'Idempotency conflict'; END IF;
    RETURN v_balance;
  END IF;
  IF v_balance<v_cost THEN
    RAISE EXCEPTION 'Insufficient growth credits' USING ERRCODE='P0001';
  END IF;
  v_balance:=v_balance-v_cost;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=v_balance,credits_used=credits_used+v_cost,
    updated_at=now()
  WHERE user_id=p_user_id AND period_start=v_period;
  INSERT INTO public.growth_credit_ledger
    (user_id,period_start,action_key,delta,balance_after,request_key)
  VALUES(p_user_id,v_period,p_action_key,-v_cost,v_balance,p_request_key);
  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_consume_credits(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.growth_consume_credits(uuid,text,text)
  TO service_role;
