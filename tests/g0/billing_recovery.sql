\set ON_ERROR_STOP on
-- Synthetic disposable fixture only, never run against a production connection.
CREATE TEMP TABLE g0_recovery_snapshot(table_name text PRIMARY KEY,snapshot jsonb NOT NULL);
INSERT INTO g0_recovery_snapshot VALUES
('growth_credit_wallets',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_wallets x)),
('growth_credit_ledger',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_ledger x)),
('growth_entitlements',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_entitlements x)),
('marketing_credit_jobs',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_credit_jobs x)),
('marketing_poster_jobs',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_poster_jobs x));
CREATE TEMP TABLE g0_forward_fingerprints AS SELECT signature,encode(extensions.digest(convert_to(pg_get_functiondef(to_regprocedure(signature)::oid),'UTF8'),'sha256'),'hex') fingerprint FROM (VALUES ('public._growth_ensure_wallet(uuid)'),('public.marketing_poster_refund(uuid)'),('public.marketing_refund_ai_draft(uuid)')) v(signature);
BEGIN;
\ir ../../docs/growth/g0/release/WALLET_RECOVERY_BASELINE.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_credit_wallets') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_wallets x) THEN RAISE EXCEPTION 'Recovery changed growth_credit_wallets data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_credit_ledger') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_ledger x) THEN RAISE EXCEPTION 'Recovery changed growth_credit_ledger data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_entitlements') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_entitlements x) THEN RAISE EXCEPTION 'Recovery changed growth_entitlements data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='marketing_credit_jobs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_credit_jobs x) THEN RAISE EXCEPTION 'Recovery changed marketing_credit_jobs data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='marketing_poster_jobs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_poster_jobs x) THEN RAISE EXCEPTION 'Recovery changed marketing_poster_jobs data'; END IF;
 IF encode(extensions.digest(convert_to(pg_get_functiondef('public._growth_ensure_wallet(uuid)'::regprocedure::oid),'UTF8'),'sha256'),'hex') IS DISTINCT FROM '0bce683434108013ccee6bccd6fb4539f273fa5bf93a12907b97fef547c18c74' THEN RAISE EXCEPTION 'Recovery fingerprint mismatch: _growth_ensure_wallet(uuid)'; END IF;
 IF has_function_privilege('anon','public._growth_ensure_wallet(uuid)','execute') OR has_function_privilege('authenticated','public._growth_ensure_wallet(uuid)','execute') OR NOT has_function_privilege('service_role','public._growth_ensure_wallet(uuid)','execute') THEN RAISE EXCEPTION 'Recovery ACL mismatch: _growth_ensure_wallet(uuid)'; END IF;
 IF encode(extensions.digest(convert_to(pg_get_functiondef('public.marketing_poster_refund(uuid)'::regprocedure::oid),'UTF8'),'sha256'),'hex') IS DISTINCT FROM 'b1e7b73d78853aa2ca3dafd3ddcb96a2bb9354494229e526b7f52fa2c37cfa82' THEN RAISE EXCEPTION 'Recovery fingerprint mismatch: marketing_poster_refund(uuid)'; END IF;
 IF has_function_privilege('anon','public.marketing_poster_refund(uuid)','execute') OR has_function_privilege('authenticated','public.marketing_poster_refund(uuid)','execute') OR NOT has_function_privilege('service_role','public.marketing_poster_refund(uuid)','execute') THEN RAISE EXCEPTION 'Recovery ACL mismatch: marketing_poster_refund(uuid)'; END IF;
 IF encode(extensions.digest(convert_to(pg_get_functiondef('public.marketing_refund_ai_draft(uuid)'::regprocedure::oid),'UTF8'),'sha256'),'hex') IS DISTINCT FROM '372ef83ea302b42bde6885aeedd4ed4c155fda3903d83deed026c9da3641f823' THEN RAISE EXCEPTION 'Recovery fingerprint mismatch: marketing_refund_ai_draft(uuid)'; END IF;
 IF has_function_privilege('anon','public.marketing_refund_ai_draft(uuid)','execute') OR has_function_privilege('authenticated','public.marketing_refund_ai_draft(uuid)','execute') OR NOT has_function_privilege('service_role','public.marketing_refund_ai_draft(uuid)','execute') THEN RAISE EXCEPTION 'Recovery ACL mismatch: marketing_refund_ai_draft(uuid)'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: billing exact recovery preserved existing fixture rows and baseline contract'
BEGIN;
\ir ../../docs/growth/g0/release/WALLET_FORWARD_BODY.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_credit_wallets') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_wallets x) THEN RAISE EXCEPTION 'Recovery changed growth_credit_wallets data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_credit_ledger') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_credit_ledger x) THEN RAISE EXCEPTION 'Recovery changed growth_credit_ledger data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='growth_entitlements') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.growth_entitlements x) THEN RAISE EXCEPTION 'Recovery changed growth_entitlements data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='marketing_credit_jobs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_credit_jobs x) THEN RAISE EXCEPTION 'Recovery changed marketing_credit_jobs data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='marketing_poster_jobs') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.marketing_poster_jobs x) THEN RAISE EXCEPTION 'Recovery changed marketing_poster_jobs data'; END IF;
 IF EXISTS(SELECT 1 FROM g0_forward_fingerprints f WHERE f.fingerprint IS DISTINCT FROM encode(extensions.digest(convert_to(pg_get_functiondef(to_regprocedure(f.signature)::oid),'UTF8'),'sha256'),'hex')) THEN RAISE EXCEPTION 'Reapply did not restore tested definition'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: billing guarded reapply preserved existing fixture rows'
