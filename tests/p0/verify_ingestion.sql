-- Integration tests for reviewed ingestion RPCs; synthetic only.
\set ON_ERROR_STOP on
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
SELECT set_config('request.jwt.claim.role','anon',false);
DO $$
BEGIN
 BEGIN
  PERFORM public.slbi_record_growth_event(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('a',64));
  RAISE EXCEPTION 'FAIL: anon analytics RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.slbi_submit_verified_lead(
    gen_random_uuid(),'20000000-0000-4000-8000-000000000003',
    'Anon Person','anon@testing.invalid','0700000000','A test enquiry',
    repeat('b',64),repeat('c',64));
  RAISE EXCEPTION 'FAIL: anon lead RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.analytics_logs(business_id,event_type)
    VALUES ('20000000-0000-4000-8000-000000000003','view');
  RAISE EXCEPTION 'FAIL: direct anonymous analytics INSERT still open';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
\echo 'PASS: anonymous client cannot bypass validated event/lead RPCs'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 BEGIN
  PERFORM public.slbi_record_growth_event(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('a',64));
  RAISE EXCEPTION 'FAIL: vendor analytics RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.slbi_submit_verified_lead(
    gen_random_uuid(),'20000000-0000-4000-8000-000000000003',
    'Vendor Person','vendor@testing.invalid','0711111111','A test enquiry',
    repeat('b',64),repeat('c',64));
  RAISE EXCEPTION 'FAIL: vendor lead RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.sub','',false);
SELECT set_config('request.jwt.claim.role','service_role',false);
DO $$
DECLARE e uuid := gen_random_uuid(); ok boolean;
BEGIN
 ok:=public.slbi_record_growth_event(e,
   '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('a',64));
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: valid approved event rejected'; END IF;
 ok:=public.slbi_record_growth_event(e,
   '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('a',64));
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: event retry should return success'; END IF;
 IF (SELECT count(*) FROM public.analytics_logs WHERE id=e)<>1 THEN
   RAISE EXCEPTION 'FAIL: duplicate event created multiple rows'; END IF;
 IF (SELECT event_count FROM public.growth_event_rate_limits
     WHERE bucket=repeat('a',64))<>1 THEN
   RAISE EXCEPTION 'FAIL: duplicate event charged the rate bucket twice'; END IF;
 ok:=public.slbi_record_growth_event(e,
   '20000000-0000-4000-8000-000000000003','call_click','business_detail',repeat('a',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: reused event ID with different type accepted'; END IF;
 ok:=public.slbi_record_growth_event(e,
   '20000000-0000-4000-8000-000000000001','view','business_detail',repeat('a',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: reused event ID with different listing accepted'; END IF;
 IF (SELECT event_count FROM public.growth_event_rate_limits
     WHERE bucket=repeat('a',64))<>1 THEN
   RAISE EXCEPTION 'FAIL: invalid ID reuse changed rate bucket'; END IF;
 ok:=public.slbi_record_growth_event(gen_random_uuid(),
   '20000000-0000-4000-8000-000000000001','view','business_detail',repeat('b',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: pending business accepted analytics'; END IF;
 ok:=public.slbi_record_growth_event(gen_random_uuid(),
   '20000000-0000-4000-8000-000000000003','invalid','business_detail',repeat('a',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: unsupported event type accepted'; END IF;
 ok:=public.slbi_record_growth_event(gen_random_uuid(),
   '20000000-0000-4000-8000-000000000003','view','bad_channel',repeat('a',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: unsupported channel accepted'; END IF;
 FOR i IN 1..60 LOOP
   ok:=public.slbi_record_growth_event(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('d',64));
   IF i<=60 AND ok IS DISTINCT FROM true THEN
     RAISE EXCEPTION 'FAIL: valid event rejected at %',i; END IF;
 END LOOP;
 ok:=public.slbi_record_growth_event(gen_random_uuid(),
   '20000000-0000-4000-8000-000000000003','view','business_detail',repeat('d',64));
 IF ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'FAIL: 61st view accepted'; END IF;
END $$;
\echo 'PASS: allowlist, approved-only, duplicate event, hourly rate limit'
DO $$
DECLARE rid uuid:=gen_random_uuid();a uuid;b uuid; c uuid;
BEGIN
 a:=public.slbi_submit_verified_lead(rid,
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid','0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF a IS NULL THEN RAISE EXCEPTION 'FAIL: verified lead not persisted'; END IF;
 b:=public.slbi_submit_verified_lead(rid,
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid','0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF b IS DISTINCT FROM a THEN RAISE EXCEPTION 'FAIL: retry inserted second CRM lead'; END IF;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000001',
    'Test Customer','customer@testing.invalid','0755555555','Pending not allowed',
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: lead accepted for pending business'; END IF;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid','0755555555',NULL,
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: blank lead message accepted'; END IF;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    NULL,'customer@testing.invalid','0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: NULL lead name accepted'; END IF;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    'Test Customer',NULL,'0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: NULL lead email accepted'; END IF;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid',NULL,'Customer message',
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: NULL lead phone accepted'; END IF;

 FOR i IN 1..4 LOOP
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid','0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF c IS NULL THEN RAISE EXCEPTION 'FAIL: legitimate lead rejected at %',i; END IF;
 END LOOP;
 c:=public.slbi_submit_verified_lead(gen_random_uuid(),
    '20000000-0000-4000-8000-000000000003',
    'Test Customer','customer@testing.invalid','0755555555','Customer message',
    repeat('e',64),repeat('f',64));
 IF c IS NOT NULL THEN RAISE EXCEPTION 'FAIL: >5 leads accepted per bucket/hour'; END IF;
 IF (SELECT count(*) FROM public.leads)<>5 THEN
    RAISE EXCEPTION 'FAIL: lead insert/rate/idempotency mismatch'; END IF;
END $$;
\echo 'PASS: secure leads, retry idempotency, pending rejection, rate caps'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.leads)<>5 THEN
   RAISE EXCEPTION 'FAIL: vendor A cannot view own leads'; END IF;
 IF (SELECT count(*) FROM public.analytics_logs)<60 THEN
   RAISE EXCEPTION 'FAIL: vendor A cannot view own events'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.leads) OR EXISTS(SELECT 1 FROM public.analytics_logs) THEN
   RAISE EXCEPTION 'FAIL: vendor B gained vendor A leads/events'; END IF;
END $$;
\echo 'PASS: vendor-owner lead and event reporting isolation'
RESET ROLE;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='leads'
   AND policyname='Anyone can insert leads') THEN
    RAISE EXCEPTION 'FAIL: legacy mobile form compatibility policy unexpectedly removed';
 END IF;
END $$;
\echo 'P0 RELEASE BLOCKER: legacy direct-write lead policy remains until mobile migration'
