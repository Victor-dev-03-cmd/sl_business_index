\set ON_ERROR_STOP on
SET ROLE service_role;
DO $$
DECLARE rid uuid:=gen_random_uuid(); a uuid; b uuid; before_count integer;
BEGIN
 a:=public.slbi_submit_verified_lead(rid,'20000000-0000-4000-8000-000000000003','Test Customer','customer@testing.invalid','0755555555','Original message',repeat('e',64),repeat('f',64));
 IF a IS NULL THEN RAISE EXCEPTION 'first request failed'; END IF;
 b:=public.slbi_submit_verified_lead(rid,'20000000-0000-4000-8000-000000000003',' Test Customer ','customer@testing.invalid','0755555555','Original message',repeat('e',64),repeat('f',64));
 IF b IS DISTINCT FROM a THEN RAISE EXCEPTION 'exact normalized retry failed'; END IF;
 BEGIN
   PERFORM public.slbi_submit_verified_lead(rid,'20000000-0000-4000-8000-000000000003','Test Customer','customer@testing.invalid','0755555555','Changed message',repeat('e',64),repeat('f',64));
   RAISE EXCEPTION 'modified payload accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
   IF SQLERRM <> 'lead-request-conflict' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM public.slbi_submit_verified_lead(rid,'20000000-0000-4000-8000-000000000001','Test Customer','customer@testing.invalid','0755555555','Original message',repeat('e',64),repeat('f',64));
   RAISE EXCEPTION 'cross-business replay accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
   IF SQLERRM <> 'lead-request-conflict' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM public.slbi_lead_request_receipts WHERE request_id=rid)<>1 OR
    (SELECT event_count FROM public.slbi_lead_rate_limits WHERE bucket=repeat('e',64))<>1
 THEN RAISE EXCEPTION 'replay consumed quota or duplicate receipt'; END IF;
 -- Rate-window defense even if a bucket is retained/reused.
 UPDATE public.slbi_lead_rate_limits SET window_hour=now()-interval '2 hours',expires_at=now()-interval '1 hour',event_count=100 WHERE bucket IN (repeat('e',64),repeat('f',64));
 b:=public.slbi_submit_verified_lead(gen_random_uuid(),'20000000-0000-4000-8000-000000000003','Test Customer','customer@testing.invalid','0755555555','New message',repeat('e',64),repeat('f',64));
 IF b IS NULL OR (SELECT event_count FROM public.slbi_lead_rate_limits WHERE bucket=repeat('e',64))<>1 THEN RAISE EXCEPTION 'rate window not reset'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'untrusted execute allowed'; END IF;
END $$;
\echo 'PASS: normalized replay, changed payload, cross-business replay, hourly reset and RPC grants'
