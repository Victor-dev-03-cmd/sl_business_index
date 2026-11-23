-- G0 strictly read-only production pre-release snapshot. NO DDL/DML or customer row output.
-- Frozen baseline as of 2026-11-23; every BLOCKED must be manually reviewed.
-- A PASS here never substitutes for fresh backup, isolated restore, role/device tests or owner approval.
WITH expected_rpc(name,expected_sha256) AS (
 VALUES
 ('slbi_submit_verified_lead','0fbe5a6aeafa5f45351b523d28d6631b3dda7b010f9b70e2c1b32ea401feaf26'),
 ('_growth_ensure_wallet','0bce683434108013ccee6bccd6fb4539f273fa5bf93a12907b97fef547c18c74'),
 ('marketing_refund_ai_draft','372ef83ea302b42bde6885aeedd4ed4c155fda3903d83deed026c9da3641f823'),
 ('marketing_poster_refund','b1e7b73d78853aa2ca3dafd3ddcb96a2bb9354494229e526b7f52fa2c37cfa82')
), rpc_actual AS (
 SELECT e.name,e.expected_sha256,p.oid,
  CASE WHEN p.oid IS NOT NULL THEN encode(extensions.digest(convert_to(pg_get_functiondef(p.oid),'UTF8'),'sha256'),'hex') END AS current_sha256,
  pg_get_userbyid(p.proowner) AS owner,p.proconfig,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon',p.oid,'execute') END anon_exec,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated',p.oid,'execute') END auth_exec,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('service_role',p.oid,'execute') END service_exec
 FROM expected_rpc e LEFT JOIN pg_proc p ON p.pronamespace='public'::regnamespace AND p.proname=e.name
), expected_rls(name) AS (
 VALUES ('businesses'),('business_profile_content'),('profiles'),('leads'),
  ('lead_notes'),('lead_followups'),('reviews'),('review_replies'),
  ('social_brand_profiles'),('growth_credit_wallets'),('growth_credit_ledger'),
  ('growth_entitlements'),('slbi_lead_rate_limits'),('slbi_lead_request_receipts')
), rls_check AS (
 SELECT count(*) FILTER (WHERE c.relrowsecurity IS TRUE) AS enabled
 FROM expected_rls e LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||e.name)
), review_check AS (
 SELECT count(*) AS mismatch FROM public.businesses b
 LEFT JOIN (SELECT business_id,avg(rating) avg_rating,count(*)::integer n
 FROM public.reviews WHERE is_approved IS TRUE GROUP BY business_id) r ON b.id=r.business_id
 WHERE (b.rating,b.reviews_count) IS DISTINCT FROM (coalesce(r.avg_rating,0),coalesce(r.n,0))
), ledger AS (
 SELECT user_id,period_start,sum(delta) balance FROM public.growth_credit_ledger GROUP BY 1,2
), wallet_check AS (
 SELECT count(*) FILTER (WHERE w.credits_remaining<>coalesce(l.balance,0)) ledger_drift,
 count(*) FILTER (WHERE w.credits_remaining>greatest(0,w.credit_limit-w.credits_used)) overcap
 FROM public.growth_credit_wallets w LEFT JOIN ledger l USING(user_id,period_start)
), checks AS (
 SELECT 'rpc_definition_and_privileges' AS gate,
 CASE WHEN count(*)=4 AND count(oid)=4 AND coalesce(bool_and(current_sha256=expected_sha256 AND owner='postgres' AND proconfig @> ARRAY['search_path=""'] AND anon_exec IS FALSE AND auth_exec IS FALSE AND service_exec IS TRUE),false)
 THEN 'PASS' ELSE 'BLOCKED' END AS status,count(oid)::text||'/4 matching candidate RPC names found' AS detail
 FROM rpc_actual
 UNION ALL
 SELECT 'rls_scope',CASE WHEN enabled=14 THEN 'PASS' ELSE 'BLOCKED' END,enabled::text||'/14 scoped tables with RLS' FROM rls_check
 UNION ALL
 SELECT 'review_forward_baseline',CASE WHEN mismatch=2 AND to_regnamespace('slbi_growth_internal') IS NULL AND
 NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('slbi_growth_review_cache_guard','slbi_growth_review_cache_refresh') AND NOT tgisinternal)
 THEN 'PASS' ELSE 'BLOCKED' END,mismatch::text||' existing cache mismatches; baseline 2' FROM review_check
 UNION ALL
 SELECT 'wallet_no_drift',CASE WHEN ledger_drift=0 AND overcap=0 THEN 'PASS' ELSE 'BLOCKED' END,
 ledger_drift::text||' wallet-ledger drift; '||overcap::text||' overcap' FROM wallet_check
 UNION ALL
 SELECT 'legacy_anonymous_enquiry',CASE WHEN has_table_privilege('anon','public.leads','INSERT') AND EXISTS
 (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='SLBI legacy compatible enquiry insert' AND cmd='INSERT')
 THEN 'PASS' ELSE 'BLOCKED' END,'Legacy anonymous policy+grant only; physical mobile E2E still required'
 UNION ALL
 SELECT 'migration_history_frozen',CASE WHEN (SELECT count(*) FROM supabase_migrations.schema_migrations)=47 THEN 'PASS' ELSE 'BLOCKED' END,
 (SELECT count(*) FROM supabase_migrations.schema_migrations)::text||' migration entries; baseline 47'
)
SELECT gate,status,detail FROM checks ORDER BY gate;
