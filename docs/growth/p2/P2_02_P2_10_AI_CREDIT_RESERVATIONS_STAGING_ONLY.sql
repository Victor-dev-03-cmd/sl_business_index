-- SLBI P2-02 + P2-10: trusted, bounded, idempotent AI marketing requests.
-- STAGING / DISPOSABLE DOCKER ONLY. Release as a versioned migration after
-- separate business-owner approval and verified rollback. Existing growth wallet,
-- user entitlements and plans are preserved; action flag stays disabled by default.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_ai_daily_limits (
  day_utc date PRIMARY KEY,
  reservations integer NOT NULL DEFAULT 0 CHECK (reservations BETWEEN 0 AND 50),
  max_reservations integer NOT NULL DEFAULT 50 CHECK (max_reservations BETWEEN 0 AND 50)
);

CREATE TABLE IF NOT EXISTS public.marketing_credit_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action_key text NOT NULL DEFAULT 'ai_social_draft'
    CHECK (action_key = 'ai_social_draft'),
  request_key text NOT NULL CHECK (char_length(request_key) BETWEEN 16 AND 96),
  cost_credits integer NOT NULL CHECK (cost_credits BETWEEN 1 AND 50),
  state text NOT NULL DEFAULT 'reserved'
    CHECK (state IN ('reserved','completed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS marketing_credit_jobs_daily_by_user
  ON public.marketing_credit_jobs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_credit_jobs_stale
  ON public.marketing_credit_jobs(created_at)
  WHERE state = 'reserved';

CREATE TABLE IF NOT EXISTS public.marketing_ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.marketing_credit_jobs(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en','ta','si')),
  caption text NOT NULL CHECK (char_length(btrim(caption)) BETWEEN 2 AND 3500),
  review_status text NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','approved','rejected')),
  model_id text NOT NULL CHECK (char_length(model_id) BETWEEN 2 AND 100),
  input_tokens integer NOT NULL DEFAULT 0 CHECK(input_tokens BETWEEN 0 AND 5000),
  output_tokens integer NOT NULL DEFAULT 0 CHECK(output_tokens BETWEEN 0 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_ai_drafts_by_user
  ON public.marketing_ai_drafts(user_id,created_at DESC);

-- Do not publish drafts. Owner can review/edit their own text only.
ALTER TABLE public.marketing_ai_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_credit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ai_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_ai_daily_limits,public.marketing_credit_jobs,
  public.marketing_ai_drafts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.marketing_ai_daily_limits,public.marketing_credit_jobs,
  public.marketing_ai_drafts TO service_role;
GRANT SELECT ON public.marketing_ai_drafts TO authenticated;
GRANT UPDATE (caption,review_status) ON public.marketing_ai_drafts TO authenticated;

DROP POLICY IF EXISTS marketing_ai_owner_read ON public.marketing_ai_drafts;
CREATE POLICY marketing_ai_owner_read ON public.marketing_ai_drafts
  FOR SELECT TO authenticated USING (
    user_id=(SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS marketing_ai_owner_review ON public.marketing_ai_drafts;
CREATE POLICY marketing_ai_owner_review ON public.marketing_ai_drafts
  FOR UPDATE TO authenticated
  USING (user_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=business_id
    AND b.owner_id=(SELECT auth.uid())
  ))
  WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=business_id
    AND b.owner_id=(SELECT auth.uid())
  ));

-- A platform-wide reservation limit bounds provider spend beyond per-user
-- wallets. Count is not refunded on failure: the provider may already charge.
-- An operation is never permitted by a browser cookie or frontend plan flag.
CREATE OR REPLACE FUNCTION public.marketing_reserve_ai_draft(
  p_user_id uuid,p_business_id uuid,p_request_key text
)
RETURNS TABLE(job_id uuid,job_state text,remaining_credits integer,charged_credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE
  v_period date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_day date:=(now() AT TIME ZONE 'UTC')::date;
  v_job public.marketing_credit_jobs%ROWTYPE;
  v_cost integer;
  v_balance integer;
  v_global public.marketing_ai_daily_limits%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_business_id IS NULL
    OR p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 16 AND 96 THEN
    RAISE EXCEPTION 'Invalid AI request' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_user_id
  ) THEN RAISE EXCEPTION 'Business ownership mismatch' USING ERRCODE='42501'; END IF;
  -- Existing function is responsible for trusted plan reconciliation and
  -- monthly wallet issuance. It locks wallet state for this user.
  PERFORM public._growth_ensure_wallet(p_user_id);
  SELECT w.credits_remaining INTO v_balance FROM public.growth_credit_wallets w
    WHERE w.user_id=p_user_id AND w.period_start=v_period FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'No wallet available'; END IF;

  SELECT * INTO v_job FROM public.marketing_credit_jobs j
    WHERE j.user_id=p_user_id AND j.request_key=p_request_key;
  IF FOUND THEN
    IF v_job.business_id<>p_business_id THEN
      RAISE EXCEPTION 'Request key belongs to another business' USING ERRCODE='23505';
    END IF;
    RETURN QUERY SELECT v_job.id,v_job.state,v_balance,v_job.cost_credits;
    RETURN;
  END IF;

  SELECT a.credit_cost INTO v_cost FROM public.growth_credit_actions a
  WHERE a.action_key='ai_social_draft' AND a.is_enabled;
  IF v_cost IS NULL OR v_cost>50 THEN
    RAISE EXCEPTION 'AI social drafts are not enabled' USING ERRCODE='P0001';
  END IF;

  -- Per-user bound includes failures to stop unmetered retries/spam.
  IF (SELECT COUNT(*) FROM public.marketing_credit_jobs j
      WHERE j.user_id=p_user_id AND j.created_at >= now()-interval '1 day')>=6
  THEN RAISE EXCEPTION 'Daily AI request limit reached' USING ERRCODE='P0001'; END IF;

  INSERT INTO public.marketing_ai_daily_limits(day_utc)
    VALUES (v_day) ON CONFLICT(day_utc) DO NOTHING;
  SELECT * INTO v_global FROM public.marketing_ai_daily_limits l
    WHERE l.day_utc=v_day FOR UPDATE;
  IF v_global.reservations >= v_global.max_reservations THEN
    RAISE EXCEPTION 'Platform AI budget limit reached' USING ERRCODE='P0001';
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient Growth Credits' USING ERRCODE='P0001';
  END IF;
  UPDATE public.marketing_ai_daily_limits SET reservations=reservations+1 WHERE day_utc=v_day;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=credits_remaining-v_cost,
    credits_used=credits_used+v_cost,updated_at=now()
    WHERE user_id=p_user_id AND period_start=v_period;
  INSERT INTO public.marketing_credit_jobs(user_id,business_id,request_key,cost_credits)
    VALUES(p_user_id,p_business_id,p_request_key,v_cost) RETURNING * INTO v_job;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key)
    VALUES(p_user_id,v_period,'ai_social_draft',-v_cost,v_balance-v_cost,
      'p2-ai:'||p_request_key);
  RETURN QUERY SELECT v_job.id,'reserved'::text,v_balance-v_cost,v_cost;
END;$f$;

CREATE OR REPLACE FUNCTION public.marketing_complete_ai_draft(
  p_job_id uuid,p_language text,p_caption text,p_model_id text,
  p_input_tokens integer,p_output_tokens integer
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_job public.marketing_credit_jobs%ROWTYPE;v_draft_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.marketing_credit_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state<>'reserved' OR
    p_language NOT IN ('en','ta','si') OR p_caption IS NULL OR
    char_length(btrim(p_caption)) NOT BETWEEN 2 AND 3500 OR
    p_model_id IS NULL OR char_length(p_model_id) NOT BETWEEN 2 AND 100 OR
    p_input_tokens IS NULL OR p_input_tokens NOT BETWEEN 0 AND 5000 OR
    p_output_tokens IS NULL OR p_output_tokens NOT BETWEEN 0 AND 1000
  THEN RAISE EXCEPTION 'Invalid or settled AI request' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.marketing_ai_drafts(
    job_id,user_id,business_id,language,caption,model_id,input_tokens,output_tokens
  ) VALUES (
    v_job.id,v_job.user_id,v_job.business_id,p_language,btrim(p_caption),
    p_model_id,p_input_tokens,p_output_tokens
  ) RETURNING id INTO v_draft_id;
  UPDATE public.marketing_credit_jobs SET state='completed',resolved_at=now()
    WHERE id=v_job.id;
  RETURN v_draft_id;
END;$f$;

CREATE OR REPLACE FUNCTION public.marketing_refund_ai_draft(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
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
END;$f$;

REVOKE ALL ON FUNCTION public.marketing_reserve_ai_draft(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_complete_ai_draft(uuid,text,text,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_refund_ai_draft(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_reserve_ai_draft(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_complete_ai_draft(uuid,text,text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_refund_ai_draft(uuid) TO service_role;
COMMIT;
