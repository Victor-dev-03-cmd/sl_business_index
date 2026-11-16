-- SLBI P2-26: bounded Gemini voice+creative brief QA headroom.
-- Requested by owner for end-to-end Poster Studio -> Caption Lab testing.
-- Voice/brief quota is NOT Growth Credits and does NOT bill Puter.
-- Applies 24 requests/UTC day only to the verified internal QA entitlement;
-- all other users retain the existing cap of 12. No attempts reset or wallet topup.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';

DO $preflight$
BEGIN
  IF to_regclass('public.marketing_poster_voice_quotas') IS NULL OR
     to_regclass('public.growth_entitlements') IS NULL
  THEN RAISE EXCEPTION 'Required voice quota or trusted entitlement is absent'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements e
    WHERE e.payment_reference='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'
      AND e.plan_name IN ('Professional','Enterprise')
      AND e.verified_at<=now() AND e.expires_at>now()
  ) THEN RAISE EXCEPTION 'Verified internal QA entitlement unavailable'; END IF;
END $preflight$;

ALTER TABLE public.marketing_poster_voice_quotas
  DROP CONSTRAINT IF EXISTS marketing_poster_voice_quotas_attempts_check;
ALTER TABLE public.marketing_poster_voice_quotas
  ADD CONSTRAINT marketing_poster_voice_quotas_attempts_check
  CHECK (attempts BETWEEN 0 AND 24);

CREATE OR REPLACE FUNCTION public.marketing_poster_voice_try_reserve(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  v_attempts integer;
  v_daily_limit integer:=12;
  v_day date:=(now() AT TIME ZONE 'UTC')::date;
BEGIN
  -- Only the authenticated server's service role can reserve Gemini spend.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.growth_entitlements e
    WHERE e.user_id=p_user_id
      AND e.plan_name IN ('Professional','Enterprise')
      AND e.payment_reference='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'
      AND e.verified_at<=now() AND e.expires_at>now()
  ) THEN v_daily_limit:=24; END IF;

  INSERT INTO public.marketing_poster_voice_quotas(user_id,day_utc,attempts)
    VALUES(p_user_id,v_day,1)
  ON CONFLICT (user_id,day_utc) DO UPDATE
    SET attempts=public.marketing_poster_voice_quotas.attempts+1
    WHERE public.marketing_poster_voice_quotas.attempts<v_daily_limit
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts IS NOT NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  TO service_role;
COMMENT ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  IS 'Gemini voice/brief shared UTC cap: 12/day standard, 24/day verified SLBI QA owner. Atomic service-role-only reservations.';

DO $postflight$
BEGIN
  IF has_function_privilege('anon','public.marketing_poster_voice_try_reserve(uuid)','EXECUTE')
   OR has_function_privilege('authenticated','public.marketing_poster_voice_try_reserve(uuid)','EXECUTE')
   OR NOT has_function_privilege('service_role','public.marketing_poster_voice_try_reserve(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Gemini voice quota RPC privilege regression'; END IF;
END $postflight$;
COMMIT;
