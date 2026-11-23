\set ON_ERROR_STOP on
-- G0-16 isolated PG17, loaded after p0 security + ingestion bootstrap,
-- secure growth event RPC + review-only verified-view additive body.
-- Test data is synthetic; no production traffic/data involved.

-- Stand in for the currently anonymous-callable legacy function.
-- Final privilege cutover must make this function inaccessible to browsers.
CREATE OR REPLACE FUNCTION public.increment_business_views(business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.businesses SET views=COALESCE(views,0)+1 WHERE id=business_id;
END $$;
GRANT EXECUTE ON FUNCTION public.increment_business_views(uuid) TO anon,authenticated;

INSERT INTO public.businesses(id,owner_id,name,status,description)
VALUES('20000000-0000-4000-8000-000000000005',
       '00000000-0000-4000-8000-000000000003',
       'Approved vendor B','approved','Vendor B approved fixture');

DO $$
BEGIN
  IF NOT has_function_privilege('anon','public.increment_business_views(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'legacy vulnerability fixture was not enabled';
  END IF;
  IF has_function_privilege('anon','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'untrusted verified RPC execute exposed'; END IF;
  IF NOT has_function_privilege('service_role','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'verified RPC not callable by service role'; END IF;
  IF has_table_privilege('anon','public.businesses','UPDATE') THEN
    RAISE EXCEPTION 'anon direct UPDATE permitted'; END IF;
  IF (SELECT p.prosecdef OR NOT ('search_path=""'=ANY(p.proconfig))
      FROM pg_proc p WHERE p.oid='public.slbi_record_verified_business_view(uuid,uuid,text,text)'::regprocedure)
  THEN RAISE EXCEPTION 'new RPC not SECURITY INVOKER / unpinned path'; END IF;
END $$;

SET ROLE service_role;
DO $$
DECLARE
  v_event uuid:='70000000-0000-4000-8000-000000000001';
  v_new uuid;
  v_count integer;
BEGIN
  IF NOT public.slbi_record_verified_business_view(v_event,
     '20000000-0000-4000-8000-000000000003','business_detail',repeat('a',64))
  THEN RAISE EXCEPTION 'first approved view did not count'; END IF;
  IF public.slbi_record_verified_business_view(v_event,
     '20000000-0000-4000-8000-000000000003','business_detail',repeat('a',64))
  THEN RAISE EXCEPTION 'duplicate event counted'; END IF;
  IF public.slbi_record_verified_business_view(v_event,
     '20000000-0000-4000-8000-000000000005','business_detail',repeat('b',64))
  THEN RAISE EXCEPTION 'cross-business event-ID replay accepted'; END IF;

  SELECT views INTO v_count FROM public.businesses
    WHERE id='20000000-0000-4000-8000-000000000003';
  IF v_count <> 1 THEN RAISE EXCEPTION 'idempotent counter expected 1 got %',v_count; END IF;

  SELECT count(*) INTO v_count FROM public.analytics_logs WHERE id=v_event;
  IF v_count <> 1 THEN RAISE EXCEPTION 'duplicate analytics event persisted'; END IF;
  SELECT event_count INTO v_count FROM public.growth_event_rate_limits
   WHERE bucket=repeat('a',64);
  IF v_count <> 1 THEN RAISE EXCEPTION 'duplicate spent quota'; END IF;

  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000001','business_detail',repeat('d',64))
  THEN RAISE EXCEPTION 'pending business view counted'; END IF;
  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000004','business_detail',repeat('d',64))
  THEN RAISE EXCEPTION 'rejected business view counted'; END IF;
  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '99999999-9999-4999-8999-999999999999','business_detail',repeat('d',64))
  THEN RAISE EXCEPTION 'missing business view counted'; END IF;
  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000003','malicious_channel',repeat('d',64))
  THEN RAISE EXCEPTION 'invalid channel accepted'; END IF;
  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000003','business_detail','bad-bucket')
  THEN RAISE EXCEPTION 'invalid HMAC bucket accepted'; END IF;
  IF public.slbi_record_verified_business_view(NULL,
     '20000000-0000-4000-8000-000000000003','business_detail',repeat('d',64))
  THEN RAISE EXCEPTION 'missing event ID accepted'; END IF;

  IF NOT public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000005','business_detail',repeat('b',64))
  THEN RAISE EXCEPTION 'approved tenant B view rejected'; END IF;

  FOR v_count IN 1..60 LOOP
    v_new:=gen_random_uuid();
    IF NOT public.slbi_record_verified_business_view(v_new,
       '20000000-0000-4000-8000-000000000003','business_detail',repeat('c',64))
    THEN RAISE EXCEPTION 'view rejected inside 60/hour quota at %',v_count; END IF;
  END LOOP;
  IF public.slbi_record_verified_business_view(gen_random_uuid(),
     '20000000-0000-4000-8000-000000000003','business_detail',repeat('c',64))
  THEN RAISE EXCEPTION '61st view exceeded hourly quota but was accepted'; END IF;
  SELECT views INTO v_count FROM public.businesses
   WHERE id='20000000-0000-4000-8000-000000000003';
  IF v_count<>61 THEN RAISE EXCEPTION 'expected 61 valid A views, got %',v_count; END IF;
  SELECT views INTO v_count FROM public.businesses
   WHERE id='20000000-0000-4000-8000-000000000005';
  IF v_count<>1 THEN RAISE EXCEPTION 'B counter drifted got %',v_count; END IF;
END $$;
RESET ROLE;

-- Real PostgreSQL RLS role switching, synthetic vendor JWT claims.
SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000002';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.analytics_logs WHERE
  business_id='20000000-0000-4000-8000-000000000005')
 THEN RAISE EXCEPTION 'Vendor A saw Vendor B analytics'; END IF;
 IF (SELECT count(*) FROM public.analytics_logs WHERE
  business_id='20000000-0000-4000-8000-000000000003')<>61
 THEN RAISE EXCEPTION 'Vendor A cannot see own 61 events'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000003';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.analytics_logs WHERE
  business_id='20000000-0000-4000-8000-000000000003')
 THEN RAISE EXCEPTION 'Vendor B saw Vendor A analytics'; END IF;
 IF (SELECT count(*) FROM public.analytics_logs WHERE
  business_id='20000000-0000-4000-8000-000000000005')<>1
 THEN RAISE EXCEPTION 'Vendor B cannot see own event'; END IF;
END $$;
RESET ROLE;

-- The cutover is a SEPARATE production release decision, tested here only.
\i docs/growth/g0/release/VIEW_COUNT_CUTOVER_BODY.sql

DO $$
BEGIN
 IF has_function_privilege('anon','public.increment_business_views(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.increment_business_views(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'legacy anonymous RPC still callable after cutover'; END IF;
 IF has_function_privilege('anon','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'verified view RPC leaked to browsers'; END IF;
 IF NOT has_function_privilege('service_role','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'service view RPC was revoked'; END IF;
END $$;

\echo 'PASS G0-16 isolated: atomic counted view + idempotent replay, pending/rejected/missing negatives, 60/hour cap, vendor A/B isolation and legacy anon ACL cutover'
