\set ON_ERROR_STOP on
-- Synthetic disposable fixture only, never run against a production connection.
CREATE TEMP TABLE g0_recovery_snapshot(table_name text PRIMARY KEY,snapshot jsonb NOT NULL);
INSERT INTO g0_recovery_snapshot VALUES
('businesses',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.businesses x)),
('reviews',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.reviews x)),
('review_replies',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.review_replies x));
BEGIN;
\ir ../../docs/growth/g0/release/REVIEW_RECOVERY_BODY.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='businesses') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.businesses x) THEN RAISE EXCEPTION 'Recovery changed businesses data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='reviews') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.reviews x) THEN RAISE EXCEPTION 'Recovery changed reviews data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='review_replies') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.review_replies x) THEN RAISE EXCEPTION 'Recovery changed review_replies data'; END IF;
 IF to_regnamespace('slbi_growth_internal') IS NOT NULL THEN RAISE EXCEPTION 'Review recovery did not remove its private schema'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('slbi_growth_review_cache_guard','slbi_growth_review_cache_refresh') AND NOT tgisinternal) THEN RAISE EXCEPTION 'Review recovery did not remove its triggers'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='slbi_reviews_moderation_audit' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Existing moderation audit removed'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: review exact recovery preserved existing fixture rows and baseline contract'
BEGIN;
\ir ../../docs/growth/g0/release/REVIEW_FORWARD_BODY.sql
DO $verify$
BEGIN
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='businesses') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.businesses x) THEN RAISE EXCEPTION 'Recovery changed businesses data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='reviews') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.reviews x) THEN RAISE EXCEPTION 'Recovery changed reviews data'; END IF;
 IF (SELECT snapshot FROM g0_recovery_snapshot WHERE table_name='review_replies') IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM public.review_replies x) THEN RAISE EXCEPTION 'Recovery changed review_replies data'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='slbi_growth_review_cache_refresh' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Reapply did not restore review trigger'; END IF;
END $verify$;
COMMIT;
\echo 'PASS: review guarded reapply preserved existing fixture rows'
