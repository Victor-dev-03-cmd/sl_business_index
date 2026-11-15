-- SLBI P2-08: quota on Gemini voice transcriptions.
-- Staging migration for production review. This does not enable voice or
-- Gemini spending; the application feature flag defaults OFF.
BEGIN;
CREATE TABLE IF NOT EXISTS public.marketing_poster_voice_quotas(
  user_id uuid NOT NULL,
  day_utc date NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0 AND attempts<=12),
  PRIMARY KEY(user_id,day_utc)
);
ALTER TABLE public.marketing_poster_voice_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_poster_voice_quotas FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.marketing_poster_voice_quotas TO service_role;

CREATE OR REPLACE FUNCTION public.marketing_poster_voice_try_reserve(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_attempts integer;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.marketing_poster_voice_quotas(user_id,day_utc,attempts)
  VALUES(p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT(user_id,day_utc) DO UPDATE
    SET attempts=public.marketing_poster_voice_quotas.attempts+1
    WHERE public.marketing_poster_voice_quotas.attempts<12
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.marketing_poster_voice_try_reserve(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_voice_try_reserve(uuid) TO service_role;
COMMIT;
