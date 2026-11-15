\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 only; verifies voice endpoint usage reservation
-- cannot be called by Basic/anonymous/browser roles, and cap is atomic.
DO $guard$
BEGIN
  IF has_function_privilege('anon',
      'public.marketing_poster_voice_try_reserve(uuid)','EXECUTE')
     OR has_function_privilege('authenticated',
      'public.marketing_poster_voice_try_reserve(uuid)','EXECUTE')
     OR has_table_privilege('authenticated',
      'public.marketing_poster_voice_quotas','INSERT')
  THEN RAISE EXCEPTION 'Anonymous/vendor can bypass Gemini quota'; END IF;
END $guard$;

DO $cap$
DECLARE i integer; ok boolean;
BEGIN
  FOR i IN 1..12 LOOP
    SELECT public.marketing_poster_voice_try_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) INTO ok;
    IF ok IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Valid voice quota attempt % was denied',i;
    END IF;
  END LOOP;
  SELECT public.marketing_poster_voice_try_reserve(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) INTO ok;
  IF ok IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Voice quota allowed attempt 13';
  END IF;
  IF (SELECT attempts FROM public.marketing_poster_voice_quotas
      WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      AND day_utc=(now() AT TIME ZONE 'UTC')::date) <> 12
  THEN RAISE EXCEPTION 'Voice counter corrupted'; END IF;

  SELECT public.marketing_poster_voice_try_reserve(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) INTO ok;
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Independent owner quota denied'; END IF;
END $cap$;

SET ROLE authenticated;
DO $browser$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM public.marketing_poster_voice_try_reserve(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Authenticated browser called service-only voice RPC'; END IF;
END $browser$;
RESET ROLE;
