#!/usr/bin/env bash
# Owner workstation only. Never run against a live connection.
set -euo pipefail
umask 077
cd "$(dirname "$0")"
c=slbi-restore-test
[[ "$(docker inspect --format '{{.HostConfig.NetworkMode}} {{json .HostConfig.PortBindings}}' "$c")" == 'none {}' ]] || { echo 'FAIL: container not isolated'; exit 1; }
[[ "$(docker inspect --format '{{.State.Running}} {{.Config.Image}}' "$c")" == 'true supabase/postgres:17.6.1.063' ]] || { echo 'FAIL: unexpected container/image'; exit 1; }
[[ "$(docker exec "$c" psql -XAt -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c 'SHOW cron.launch_active_jobs')" == 'off' ]] || { echo 'FAIL: cron enabled'; exit 1; }
log=$(mktemp "$HOME/slbi-private-backups/local-rehearsal.XXXXXXXX.log")
if (
  set -o pipefail
  {
    cat <<'SQL'
BEGIN;
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF current_user <> 'supabase_admin' OR current_database() <> 'postgres' OR inet_server_addr() IS NOT NULL OR current_setting('listen_addresses') <> '' OR current_setting('cron.launch_active_jobs') <> 'off' THEN RAISE EXCEPTION 'Not isolated local connection'; END IF;
 IF (SELECT count(*) FROM public.businesses)<>24 OR (SELECT count(*) FROM public.leads)<>15 OR (SELECT count(*) FROM public.reviews)<>3 OR (SELECT count(*) FROM supabase_migrations.schema_migrations)<>47 THEN RAISE EXCEPTION 'Unexpected restored baseline'; END IF;
END $$;
CREATE TEMP TABLE g0_private_snapshot AS
SELECT 'leads' AS key, (SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.leads x) AS val
UNION ALL SELECT 'receipts',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.slbi_lead_request_receipts x)
UNION ALL SELECT 'rate',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.slbi_lead_rate_limits x)
UNION ALL SELECT 'reviews',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.reviews x)
UNION ALL SELECT 'replies',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.review_replies x)
UNION ALL SELECT 'business',(SELECT jsonb_agg(to_jsonb(x)-'rating'-'reviews_count' ORDER BY id) FROM public.businesses x)
UNION ALL SELECT 'wallet',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.growth_credit_wallets x)
UNION ALL SELECT 'ledger',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.growth_credit_ledger x);
SET LOCAL ROLE postgres;
SQL
    cat LEAD_FORWARD_BODY.sql REVIEW_FORWARD_BODY.sql
    cat <<'SQL'

RESET ROLE;
CREATE TEMP TABLE g0_forward_hash AS SELECT encode(extensions.digest(convert_to(pg_get_functiondef('public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'::regprocedure),'UTF8'),'sha256'),'hex') AS hash;
DO $$ BEGIN
 IF (SELECT hash FROM g0_forward_hash)='0fbe5a6aeafa5f45351b523d28d6631b3dda7b010f9b70e2c1b32ea401feaf26' THEN RAISE EXCEPTION 'Lead definition unchanged'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='slbi_growth_internal.refresh_review_cache()'::regprocedure AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Review definer owner mismatch'; END IF;
 IF has_function_privilege('anon','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') OR has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') OR NOT has_function_privilege('service_role','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','execute') THEN RAISE EXCEPTION 'Lead ACL mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.businesses b LEFT JOIN (SELECT business_id,avg(rating) a,count(*)::integer n FROM public.reviews WHERE is_approved IS TRUE GROUP BY business_id) r ON r.business_id=b.id WHERE (b.rating,b.reviews_count) IS DISTINCT FROM (coalesce(r.a,0),coalesce(r.n,0))) THEN RAISE EXCEPTION 'Review mismatch'; END IF;
END $$;
\echo 'PASS forward deployment and zero review cache mismatch'
SAVEPOINT g0_synthetic_lead;
SET LOCAL ROLE service_role;
DO $$
DECLARE rid uuid:=gen_random_uuid(); b1 uuid; b2 uuid; l1 uuid; l2 uuid; bucket1 text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); bucket2 text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
BEGIN
 SELECT id INTO b1 FROM public.businesses WHERE status='approved' ORDER BY id LIMIT 1;
 SELECT id INTO b2 FROM public.businesses WHERE status='approved' AND id<>b1 ORDER BY id LIMIT 1;
 IF b1 IS NULL OR b2 IS NULL THEN RAISE EXCEPTION 'Need two approved listings'; END IF;
 l1:=public.slbi_submit_verified_lead(rid,b1,'G0 synthetic test','g0@testing.invalid','0755555555','Synthetic test only',bucket1,bucket2);
 l2:=public.slbi_submit_verified_lead(rid,b1,' G0 synthetic test ','g0@testing.invalid','0755555555','Synthetic test only',bucket1,bucket2);
 IF l1 IS NULL OR l2 IS DISTINCT FROM l1 THEN RAISE EXCEPTION 'Replay failed'; END IF;
 BEGIN
  PERFORM public.slbi_submit_verified_lead(rid,b1,'G0 synthetic test','g0@testing.invalid','0755555555','Changed synthetic',bucket1,bucket2);
  RAISE EXCEPTION 'Changed payload accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'lead-request-conflict' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.slbi_submit_verified_lead(rid,b2,'G0 synthetic test','g0@testing.invalid','0755555555','Synthetic test only',bucket1,bucket2);
  RAISE EXCEPTION 'Cross-business replay accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'lead-request-conflict' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM public.slbi_lead_request_receipts WHERE request_id=rid)<>1 OR (SELECT event_count FROM public.slbi_lead_rate_limits WHERE bucket=bucket1) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Replay quota or receipt mismatch'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT g0_synthetic_lead;
\echo 'PASS synthetic service-role lead replay and conflict rejection'
SET LOCAL ROLE postgres;
SQL
    cat LEAD_RECOVERY_BASELINE.sql REVIEW_RECOVERY_BODY.sql
    cat <<'SQL'

RESET ROLE;
DO $$ BEGIN
 IF encode(extensions.digest(convert_to(pg_get_functiondef('public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'::regprocedure),'UTF8'),'sha256'),'hex') IS DISTINCT FROM '0fbe5a6aeafa5f45351b523d28d6631b3dda7b010f9b70e2c1b32ea401feaf26' THEN RAISE EXCEPTION 'Lead recovery fingerprint mismatch'; END IF;
 IF to_regnamespace('slbi_growth_internal') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('slbi_growth_review_cache_guard','slbi_growth_review_cache_refresh') AND NOT tgisinternal) THEN RAISE EXCEPTION 'Review recovery incomplete'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='slbi_reviews_moderation_audit' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Existing moderation trigger missing'; END IF;
END $$;
\echo 'PASS exact recovery'
SET LOCAL ROLE postgres;
SQL
    cat LEAD_FORWARD_BODY.sql REVIEW_FORWARD_BODY.sql
    cat <<'SQL'

RESET ROLE;
DO $$
DECLARE z record;
BEGIN
 IF (SELECT hash FROM g0_forward_hash) IS DISTINCT FROM encode(extensions.digest(convert_to(pg_get_functiondef('public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)'::regprocedure),'UTF8'),'sha256'),'hex') THEN RAISE EXCEPTION 'Lead reapply fingerprint mismatch'; END IF;
 FOR z IN SELECT * FROM (
 SELECT 'leads' AS key,(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.leads x) AS val
 UNION ALL SELECT 'receipts',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.slbi_lead_request_receipts x)
 UNION ALL SELECT 'rate',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.slbi_lead_rate_limits x)
 UNION ALL SELECT 'reviews',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.reviews x)
 UNION ALL SELECT 'replies',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.review_replies x)
 UNION ALL SELECT 'business',(SELECT jsonb_agg(to_jsonb(x)-'rating'-'reviews_count' ORDER BY id) FROM public.businesses x)
 UNION ALL SELECT 'wallet',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.growth_credit_wallets x)
 UNION ALL SELECT 'ledger',(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.growth_credit_ledger x)
 ) a LOOP
 IF z.val IS DISTINCT FROM (SELECT val FROM g0_private_snapshot s WHERE s.key=z.key) THEN RAISE EXCEPTION 'Unexpected data change in %',z.key; END IF;
 END LOOP;
END $$;
\echo 'PASS guarded reapply and preserved source rows'
ROLLBACK;
\echo 'PASS outer transaction rolled back'
SQL
  } | docker exec -i "$c" psql -X -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1
) >"$log" 2>&1; then
  grep '^PASS ' "$log"
  echo 'LOCAL_REHEARSAL_SUCCESS'
else
  printf 'LOCAL_REHEARSAL_FAILED; inspect private log locally: %s\n' "$log"
  echo 'Do not send raw logs; send only sanitized error class/message without data or IDs.'
  exit 1
fi
