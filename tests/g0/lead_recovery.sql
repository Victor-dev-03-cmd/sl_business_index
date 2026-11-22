\set ON_ERROR_STOP on
-- Synthetic disposable fixture only, never run against a production connection.
CREATE TEMP TABLE g0_recovery_snapshot(table_name text PRIMARY KEY,snapshot jsonb NOT NULL);
INSERT INTO g0_recovery_snapshot VALUES
('leads',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.leads x)),
('slbi_lead_request_receipts',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_request_receipts x)),
('slbi_lead_rate_limits',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_rate_limits x)),
('analytics_logs',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.analytics_logs x)),
('growth_event_rate_limits',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_event_rate_limits x));
CREATE TEMP TABLE g0_forward_fingerprints AS SELECT signature,encode(extensions.digest(convert_to(pg_get_functiondef(to_regprocedure(signature)::oid),'UTF8'),'sha256'),'hex') fingerprint FROM (VALUES ('public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)')) v(signature);
BEGIN;
\ir ../../docs/growth/g0/release/LEAD_RECOVERY_BASELINE.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='leads') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.leads x) THEN RAISE EXCEPTION 'Recovery changed leads data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='slbi_lead_request_receipts') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_request_receipts x) THEN RAISE EXCEPTION 'Recovery changed slbi_lead_request_receipts data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='slbi_lead_rate_limits') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_rate_limits x) THEN RAISE EXCEPTION 'Recovery changed slbi_lead_rate_limits data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='analytics_logs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.analytics_logs x) THEN RAISE EXCEPTION 'Recovery changed analytics_logs data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_event_rate_limits') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_event_rate_limits x) THEN RAISE EXCEPTION 'Recovery changed growth_event_rate_limits data'; END IF;
 IF encode(extensions.digest(convert_to(pg_get_functiondef('public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'::regprocedure::oid),'UTF8'),'sha256'),'hex') IS DISTINCT FROM '0fbe5a6aeafa5f45351b523d28d6631b3dda7b010f9b70e2c1b32ea401feaf26' THEN RAISE EXCEPTION 'Recovery fingerprint mismatch: slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'; END IF;
 IF has_function_privilege('anon','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') OR has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') OR NOT has_function_privilege('service_role','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') THEN RAISE EXCEPTION 'Recovery ACL mismatch: slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: lead exact recovery preserved existing fixture rows and baseline contract'
BEGIN;
\ir ../../docs/growth/g0/release/LEAD_FORWARD_BODY.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='leads') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.leads x) THEN RAISE EXCEPTION 'Recovery changed leads data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='slbi_lead_request_receipts') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_request_receipts x) THEN RAISE EXCEPTION 'Recovery changed slbi_lead_request_receipts data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='slbi_lead_rate_limits') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.slbi_lead_rate_limits x) THEN RAISE EXCEPTION 'Recovery changed slbi_lead_rate_limits data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='analytics_logs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.analytics_logs x) THEN RAISE EXCEPTION 'Recovery changed analytics_logs data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_event_rate_limits') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_event_rate_limits x) THEN RAISE EXCEPTION 'Recovery changed growth_event_rate_limits data'; END IF;
 IF EXISTS(SELECT 1 FROM g0_forward_fingerprints f WHERE f.fingerprint IS DISTINCT FROM encode(extensions.digest(convert_to(pg_get_functiondef(to_regprocedure(f.signature)::oid),'UTF8'),'sha256'),'hex')) THEN RAISE EXCEPTION 'Reapply did not restore tested definition'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: lead guarded reapply preserved existing fixture rows'
