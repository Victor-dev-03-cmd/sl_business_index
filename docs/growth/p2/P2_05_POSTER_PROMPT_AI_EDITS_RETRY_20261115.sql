-- SLBI P2-05: truthful poster retry accounting and allowlisted AI edits.
-- Owner-only, private assets; existing credit ledger & service-role restrictions remain.
-- Failed/refunded jobs should not consume the individual 3/day allowance.
-- Global UTC-day cap remains independently administrator-controlled.
BEGIN;
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
     p_brief_hash IS NULL OR p_brief_hash !~ '^[0-9a-f]{64}$' OR
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
  IF v_cost<>p_expected_credits
  THEN RAISE EXCEPTION 'Poster credit price changed. Review before generating.'; END IF;
  IF (SELECT count(*) FROM public.marketing_poster_jobs j
      WHERE j.user_id=p_user_id AND j.created_at>=now()-interval '1 day' AND j.state<>'refunded')>=3
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
    OR p_model NOT IN (
       'gpt-image-2.5-flare','gpt-image-2.5-sunburst',
       'gpt-image-2.6-flare','gpt-image-2.6-sunburst',
       'black-forest-labs/FLUX.1-schnell',
       'Qwen/Qwen-Image-Edit-2509'
     )
    OR p_prompt_version IS NULL OR char_length(p_prompt_version)>80
  THEN RAISE EXCEPTION 'Invalid image settlement' USING ERRCODE='22023'; END IF;
  UPDATE public.marketing_poster_jobs SET state='completed',storage_path=p_storage_path,
    provider_model=p_model,prompt_version=p_prompt_version,resolved_at=now()
    WHERE id=p_job_id AND state='processing';
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  RETURN v_changed=1;
END; $f$;

-- SQL function privileges are retained by CREATE OR REPLACE; reassert explicitly.
REVOKE ALL ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.marketing_poster_complete(uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_reserve(uuid,uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_poster_complete(uuid,text,text,text) TO service_role;
COMMIT;
