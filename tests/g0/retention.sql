\set ON_ERROR_STOP on
-- The existing cleanup function only. No production scheduling or delete job.
BEGIN;
CREATE TEMP TABLE g0_cleanup_before AS SELECT count(*) AS leads FROM public.leads;
CREATE TEMP TABLE g0_cleanup_events AS SELECT count(*) AS events FROM public.analytics_logs;
INSERT INTO public.slbi_lead_request_receipts(request_id,lead_id,created_at)
SELECT 'f0123456-1234-4234-8234-123456789012',id,now()-interval '8 days' FROM public.leads LIMIT 1;
INSERT INTO public.slbi_lead_request_receipts(request_id,lead_id,created_at)
SELECT 'f0123456-1234-4234-8234-123456789013',id,now()-interval '6 days' FROM public.leads LIMIT 1;
INSERT INTO public.slbi_lead_rate_limits(bucket,window_hour,event_count,expires_at) VALUES
(repeat('a',63)||'1',now()-interval '49 hours',1,now()-interval '1 hour'),
(repeat('a',63)||'2',now()-interval '47 hours',1,now()+interval '1 hour');
INSERT INTO public.growth_event_rate_limits(bucket,window_hour,event_count,expires_at) VALUES
(repeat('b',63)||'1',now()-interval '49 hours',1,now()-interval '1 hour'),
(repeat('b',63)||'2',now()-interval '47 hours',1,now()+interval '1 hour');
SET LOCAL ROLE service_role;
SELECT public.slbi_cleanup_growth_ephemeral();
RESET ROLE;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.slbi_lead_request_receipts WHERE request_id='f0123456-1234-4234-8234-123456789012') OR NOT EXISTS(SELECT 1 FROM public.slbi_lead_request_receipts WHERE request_id='f0123456-1234-4234-8234-123456789013') THEN RAISE EXCEPTION 'Receipt retention mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.slbi_lead_rate_limits WHERE bucket=repeat('a',63)||'1') OR NOT EXISTS(SELECT 1 FROM public.slbi_lead_rate_limits WHERE bucket=repeat('a',63)||'2') THEN RAISE EXCEPTION 'Lead bucket retention mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.growth_event_rate_limits WHERE bucket=repeat('b',63)||'1') OR NOT EXISTS(SELECT 1 FROM public.growth_event_rate_limits WHERE bucket=repeat('b',63)||'2') THEN RAISE EXCEPTION 'Growth bucket retention mismatch'; END IF;
 IF (SELECT count(*) FROM public.leads)<>(SELECT leads FROM g0_cleanup_before) OR (SELECT count(*) FROM public.analytics_logs)<>(SELECT events FROM g0_cleanup_events) THEN RAISE EXCEPTION 'Cleanup deleted business records'; END IF;
 IF has_function_privilege('anon','public.slbi_cleanup_growth_ephemeral()','execute') OR has_function_privilege('authenticated','public.slbi_cleanup_growth_ephemeral()','execute') THEN RAISE EXCEPTION 'Cleanup exposed to client'; END IF;
END $verify$;
ROLLBACK;
\echo 'PASS: 7-day receipts, expired-only buckets, preserved CRM/events, service-only cleanup'
