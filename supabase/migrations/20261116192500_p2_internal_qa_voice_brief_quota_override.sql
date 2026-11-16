-- SLBI P2: Bounded, one-day Gemini voice + creative brief QA allowance.
-- User-requested internal QA recovery on 2026-11-17 Sri Lanka (UTC date 2026-11-16).
-- Remaining Growth Credits are independent; this does not mint or alter credits.
-- The default stays 12/day for every user. Only the trusted QA entitlement
-- holder receives six extra requests for THIS UTC day, capped at 18.
BEGIN;
ALTER TABLE public.marketing_poster_voice_quotas
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 12;
ALTER TABLE public.marketing_poster_voice_quotas
  DROP CONSTRAINT IF EXISTS marketing_poster_voice_quotas_attempts_check;
ALTER TABLE public.marketing_poster_voice_quotas
  ADD CONSTRAINT marketing_poster_voice_quotas_attempts_check
  CHECK (attempts BETWEEN 0 AND 18 AND attempts <= max_attempts);
ALTER TABLE public.marketing_poster_voice_quotas
  ADD CONSTRAINT marketing_poster_voice_quotas_max_attempts_check
  CHECK (max_attempts BETWEEN 0 AND 18);

-- Server-only reservation. Client sessions cannot reserve or increase quotas.
CREATE OR REPLACE FUNCTION public.marketing_poster_voice_try_reserve(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $quota$
DECLARE v_attempts integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.marketing_poster_voice_quotas(user_id,day_utc,attempts)
    VALUES(p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT(user_id,day_utc) DO UPDATE
    SET attempts=public.marketing_poster_voice_quotas.attempts+1
    WHERE public.marketing_poster_voice_quotas.attempts <
          public.marketing_poster_voice_quotas.max_attempts
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts IS NOT NULL;
END;
$quota$;
REVOKE ALL ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  TO service_role;
ALTER TABLE public.marketing_poster_voice_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_poster_voice_quotas FROM PUBLIC,anon,authenticated;

-- Temporary, verified internal QA-only allocation. Avoid broad resets and
-- avoid extending tomorrow's default allowance automatically.
UPDATE public.marketing_poster_voice_quotas q
SET max_attempts=18
FROM public.growth_entitlements e
WHERE e.user_id=q.user_id
  AND e.payment_reference='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'
  AND e.plan_name IN ('Professional','Enterprise')
  AND e.verified_at<=now()
  AND e.expires_at>now()
  AND q.day_utc=DATE '2026-11-16'
  AND q.attempts=12 AND q.max_attempts=12;
COMMIT;
