-- SLBI P2-04 paid image-generation budget ledger: STAGING / DISPOSABLE DATABASE ONLY.
-- Do NOT apply to production or enable the cost action without owner approval.
-- Existing Basic plans, credit wallets, campaigns and vendor data are untouched.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';

DO $preflight$
BEGIN
  IF to_regclass('public.growth_credit_wallets') IS NULL OR
     to_regclass('public.growth_credit_actions') IS NULL OR
     to_regclass('public.growth_entitlements') IS NULL OR
     to_regclass('public.businesses') IS NULL OR
     to_regprocedure('public._growth_ensure_wallet(uuid)') IS NULL
  THEN RAISE EXCEPTION 'GrowthOS credits and owner schema must exist first'; END IF;
END $preflight$;

-- This action is OFF by default even when the API route and model key exist.
INSERT INTO public.growth_credit_actions(action_key,credit_cost,is_enabled)
VALUES('ai_poster_design',8,false)
ON CONFLICT(action_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketing_poster_daily_limits(
  day_utc date PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100),
  max_attempts integer NOT NULL DEFAULT 0 CHECK (max_attempts BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.marketing_poster_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_key text NOT NULL CHECK(char_length(request_key) BETWEEN 16 AND 96),
  brief_hash text NOT NULL CHECK(brief_hash ~ '^[0-9a-f]{64}$'),
  cost_credits integer NOT NULL CHECK(cost_credits BETWEEN 1 AND 100),
  state text NOT NULL DEFAULT 'reserved'
    CHECK(state IN ('reserved','processing','completed','refunded')),
  storage_path text,
  provider_model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  resolved_at timestamptz,
  UNIQUE(user_id,request_key),
  CONSTRAINT poster_completed_asset CHECK(
    state <> 'completed' OR (storage_path IS NOT NULL AND provider_model IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS marketing_poster_jobs_user_recent
  ON public.marketing_poster_jobs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_poster_jobs_stale
  ON public.marketing_poster_jobs(created_at) WHERE state IN ('reserved','processing');

ALTER TABLE public.marketing_poster_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_poster_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_poster_daily_limits,public.marketing_poster_jobs
  FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.marketing_poster_daily_limits,public.marketing_poster_jobs TO service_role;
GRANT SELECT ON public.marketing_poster_jobs TO authenticated;
DROP POLICY IF EXISTS marketing_poster_owned_job_read ON public.marketing_poster_jobs;
CREATE POLICY marketing_poster_owned_job_read ON public.marketing_poster_jobs
  FOR SELECT TO authenticated USING (
    user_id=(SELECT auth.uid()) AND EXISTS(
      SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.marketing_poster_reserve(
  p_user_id uuid,p_business_id uuid,p_request_key text,p_brief_hash text,p_expected_credits integer
)
RETURNS TABLE(job_id uuid,job_state text,charged_credits integer,newly_created boolean,asset_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE
  v_day date:=(now() AT TIME ZONE 'UTC')::date;
  v_period date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_job public.marketing_poster_jobs%ROWTYPE;
  v_cost integer;
  v_balance integer;
  v_global public.marketing_poster_daily_limits%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  IF p_user_id IS NULL OR p_business_id IS NULL OR
     p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 16 AND 96 OR
     p_brief_hash IS NULL OR p_brief_hash !~ '^[0-9a-f]{64}
  THEN RAISE EXCEPTION 'Invalid image job' USING ERRCODE='22023'; END IF;
  -- A self-claimed browser tier cannot qualify. Only a verified, unexpired payment does.
  IF NOT EXISTS(
    SELECT 1 FROM public.growth_entitlements e WHERE e.user_id=p_user_id
    AND e.plan_name IN ('Professional','Enterprise')
    AND e.expires_at>now() AND e.verified_at<=now()
    AND char_length(e.payment_reference)>=3
  ) THEN RAISE EXCEPTION 'Verified Pro subscription required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_user_id
  ) THEN RAISE EXCEPTION 'Business ownership mismatch' USING ERRCODE='42501'; END IF;

  PERFORM public._growth_ensure_wallet(p_user_id);
  SELECT w.credits_remaining INTO v_balance FROM public.growth_credit_wallets w
    WHERE w.user_id=p_user_id AND w.period_start=v_period FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Credit wallet unavailable'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs j
    WHERE j.user_id=p_user_id AND j.request_key=p_request_key;
  IF FOUND THEN
    IF v_job.business_id<>p_business_id OR v_job.brief_hash<>p_brief_hash
    THEN RAISE EXCEPTION 'Idempotency key used for a different creative' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT v_job.id,v_job.state,v_job.cost_credits,false,v_job.storage_path;
    RETURN;
  END IF;

  SELECT a.credit_cost INTO v_cost FROM public.growth_credit_actions a
    WHERE a.action_key='ai_poster_design' AND a.is_enabled;
  IF v_cost IS NULL OR v_cost>100
  THEN RAISE EXCEPTION 'Poster image generation is not funded or enabled'; END IF;
  IF v_cost<>p_expected_credits
  THEN RAISE EXCEPTION 'Poster credit price changed. Review before generating.'; END IF;
  IF (SELECT count(*) FROM public.marketing_poster_jobs j
      WHERE j.user_id=p_user_id AND j.created_at>=now()-interval '1 day')>=3
  THEN RAISE EXCEPTION 'Daily poster allowance exhausted'; END IF;
  INSERT INTO public.marketing_poster_daily_limits(day_utc) VALUES(v_day)
    ON CONFLICT(day_utc) DO NOTHING;
  SELECT * INTO v_global FROM public.marketing_poster_daily_limits l
    WHERE l.day_utc=v_day FOR UPDATE;
  IF v_global.attempts>=v_global.max_attempts
  THEN RAISE EXCEPTION 'Global poster image budget is disabled or exhausted'; END IF;
  IF v_balance<v_cost THEN RAISE EXCEPTION 'Insufficient growth credits'; END IF;

  UPDATE public.marketing_poster_daily_limits SET attempts=attempts+1 WHERE day_utc=v_day;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=credits_remaining-v_cost,
    credits_used=credits_used+v_cost,updated_at=now()
    WHERE user_id=p_user_id AND period_start=v_period;
  INSERT INTO public.marketing_poster_jobs(
    user_id,business_id,request_key,brief_hash,cost_credits
  ) VALUES(p_user_id,p_business_id,p_request_key,p_brief_hash,v_cost)
  RETURNING * INTO v_job;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(
    p_user_id,v_period,'ai_poster_design',-v_cost,v_balance-v_cost,'p2-poster:'||p_request_key
  );
  RETURN QUERY SELECT v_job.id,'reserved'::text,v_cost,true,NULL::text;
END; $f$;

-- One-time claim prevents concurrent replays from calling the paid provider twice.
CREATE OR REPLACE FUNCTION public.marketing_poster_claim(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  UPDATE public.marketing_poster_jobs SET state='processing',claimed_at=now()
    WHERE id=p_job_id AND state='reserved';
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  RETURN v_updated=1;
END; $f$;

CREATE OR REPLACE FUNCTION public.marketing_poster_complete(
  p_job_id uuid,p_storage_path text,p_model text,p_prompt_version text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_job public.marketing_poster_jobs%ROWTYPE;v_changed integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state<>'processing' OR
    p_storage_path IS NULL OR
    p_storage_path <> (v_job.user_id::text||'/'||v_job.business_id::text||'/'||v_job.id::text||'.png')
    OR p_model NOT IN ('gpt-image-2.5-flare','gpt-image-2.5-sunburst')
    OR p_prompt_version IS NULL OR char_length(p_prompt_version)>80
  THEN RAISE EXCEPTION 'Invalid image settlement' USING ERRCODE='22023'; END IF;
  UPDATE public.marketing_poster_jobs SET state='completed',storage_path=p_storage_path,
    provider_model=p_model,prompt_version=p_prompt_version,resolved_at=now()
    WHERE id=p_job_id AND state='processing';
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  RETURN v_changed=1;
END; $f$;

CREATE OR REPLACE FUNCTION public.marketing_poster_refund(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
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
END; $f$;

REVOKE ALL ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_claim(uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_complete(uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_refund(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_complete(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_refund(uuid) TO service_role;

DO $postflight$
BEGIN
 IF has_table_privilege('anon','public.marketing_poster_jobs','SELECT')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','INSERT')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','UPDATE')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','DELETE')
   OR has_function_privilege('authenticated',
      'public.marketing_poster_reserve(uuid,uuid,text,text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Poster job role privileges unsafe'; END IF;
END $postflight$;
COMMIT;
 OR
     p_expected_credits IS NULL OR p_expected_credits NOT BETWEEN 1 AND 100
  THEN RAISE EXCEPTION 'Invalid image job' USING ERRCODE='22023'; END IF;
  -- A self-claimed browser tier cannot qualify. Only a verified, unexpired payment does.
  IF NOT EXISTS(
    SELECT 1 FROM public.growth_entitlements e WHERE e.user_id=p_user_id
    AND e.plan_name IN ('Professional','Enterprise')
    AND e.expires_at>now() AND e.verified_at<=now()
    AND char_length(e.payment_reference)>=3
  ) THEN RAISE EXCEPTION 'Verified Pro subscription required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_user_id
  ) THEN RAISE EXCEPTION 'Business ownership mismatch' USING ERRCODE='42501'; END IF;

  PERFORM public._growth_ensure_wallet(p_user_id);
  SELECT w.credits_remaining INTO v_balance FROM public.growth_credit_wallets w
    WHERE w.user_id=p_user_id AND w.period_start=v_period FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Credit wallet unavailable'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs j
    WHERE j.user_id=p_user_id AND j.request_key=p_request_key;
  IF FOUND THEN
    IF v_job.business_id<>p_business_id OR v_job.brief_hash<>p_brief_hash
    THEN RAISE EXCEPTION 'Idempotency key used for a different creative' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT v_job.id,v_job.state,v_job.cost_credits,false,v_job.storage_path;
    RETURN;
  END IF;

  SELECT a.credit_cost INTO v_cost FROM public.growth_credit_actions a
    WHERE a.action_key='ai_poster_design' AND a.is_enabled;
  IF v_cost IS NULL OR v_cost>100
  THEN RAISE EXCEPTION 'Poster image generation is not funded or enabled'; END IF;
  IF (SELECT count(*) FROM public.marketing_poster_jobs j
      WHERE j.user_id=p_user_id AND j.created_at>=now()-interval '1 day')>=3
  THEN RAISE EXCEPTION 'Daily poster allowance exhausted'; END IF;
  INSERT INTO public.marketing_poster_daily_limits(day_utc) VALUES(v_day)
    ON CONFLICT(day_utc) DO NOTHING;
  SELECT * INTO v_global FROM public.marketing_poster_daily_limits l
    WHERE l.day_utc=v_day FOR UPDATE;
  IF v_global.attempts>=v_global.max_attempts
  THEN RAISE EXCEPTION 'Global poster image budget is disabled or exhausted'; END IF;
  IF v_balance<v_cost THEN RAISE EXCEPTION 'Insufficient growth credits'; END IF;

  UPDATE public.marketing_poster_daily_limits SET attempts=attempts+1 WHERE day_utc=v_day;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=credits_remaining-v_cost,
    credits_used=credits_used+v_cost,updated_at=now()
    WHERE user_id=p_user_id AND period_start=v_period;
  INSERT INTO public.marketing_poster_jobs(
    user_id,business_id,request_key,brief_hash,cost_credits
  ) VALUES(p_user_id,p_business_id,p_request_key,p_brief_hash,v_cost)
  RETURNING * INTO v_job;
  INSERT INTO public.growth_credit_ledger(
    user_id,period_start,action_key,delta,balance_after,request_key
  ) VALUES(
    p_user_id,v_period,'ai_poster_design',-v_cost,v_balance-v_cost,'p2-poster:'||p_request_key
  );
  RETURN QUERY SELECT v_job.id,'reserved'::text,v_cost,true,NULL::text;
END; $f$;

-- One-time claim prevents concurrent replays from calling the paid provider twice.
CREATE OR REPLACE FUNCTION public.marketing_poster_claim(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  UPDATE public.marketing_poster_jobs SET state='processing',claimed_at=now()
    WHERE id=p_job_id AND state='reserved';
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  RETURN v_updated=1;
END; $f$;

CREATE OR REPLACE FUNCTION public.marketing_poster_complete(
  p_job_id uuid,p_storage_path text,p_model text,p_prompt_version text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_job public.marketing_poster_jobs%ROWTYPE;v_changed integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state<>'processing' OR
    p_storage_path IS NULL OR
    p_storage_path <> (v_job.user_id::text||'/'||v_job.business_id::text||'/'||v_job.id::text||'.png')
    OR p_model NOT IN ('gpt-image-2.5-flare','gpt-image-2.5-sunburst')
    OR p_prompt_version IS NULL OR char_length(p_prompt_version)>80
  THEN RAISE EXCEPTION 'Invalid image settlement' USING ERRCODE='22023'; END IF;
  UPDATE public.marketing_poster_jobs SET state='completed',storage_path=p_storage_path,
    provider_model=p_model,prompt_version=p_prompt_version,resolved_at=now()
    WHERE id=p_job_id AND state='processing';
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  RETURN v_changed=1;
END; $f$;

CREATE OR REPLACE FUNCTION public.marketing_poster_refund(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
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
END; $f$;

REVOKE ALL ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_claim(uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_complete(uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_refund(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_complete(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_refund(uuid) TO service_role;

DO $postflight$
BEGIN
 IF has_table_privilege('anon','public.marketing_poster_jobs','SELECT')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','INSERT')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','UPDATE')
   OR has_table_privilege('authenticated','public.marketing_poster_jobs','DELETE')
   OR has_function_privilege('authenticated',
      'public.marketing_poster_reserve(uuid,uuid,text,text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Poster job role privileges unsafe'; END IF;
END $postflight$;
COMMIT;
