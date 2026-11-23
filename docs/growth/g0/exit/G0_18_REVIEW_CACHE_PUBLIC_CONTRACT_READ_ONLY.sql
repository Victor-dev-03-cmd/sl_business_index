-- G0-18 production-safe SELECT-only review cache / public moderation audit.
-- No row IDs, names, comments, user fields, or sensitive data returned.
-- DO NOT add writes to this file. Never infer migration acceptance from results.
WITH expected AS (
  SELECT b.id, b.rating AS cached_rating, b.reviews_count AS cached_count,
    COALESCE(AVG(r.rating) FILTER(
      WHERE r.is_approved IS TRUE AND r.moderation_status='approved'),0)
      AS public_avg,
    COUNT(r.id) FILTER(
      WHERE r.is_approved IS TRUE AND r.moderation_status='approved')::integer
      AS public_count,
    COUNT(r.id) FILTER(
      WHERE (r.is_approved IS TRUE) IS DISTINCT FROM
            (r.moderation_status='approved'))::integer
      AS inconsistent_flags
  FROM public.businesses b
  LEFT JOIN public.reviews r ON r.business_id=b.id
  GROUP BY b.id,b.rating,b.reviews_count
)
SELECT
  COUNT(*)::integer AS business_rows,
  COUNT(*) FILTER(
    WHERE (cached_rating,cached_count)
       IS DISTINCT FROM (public_avg,public_count))::integer
    AS stale_public_review_caches,
  COUNT(*) FILTER(WHERE inconsistent_flags>0)::integer
    AS businesses_with_moderation_flag_conflict,
  COUNT(*) FILTER(WHERE cached_count=0 AND public_count>0)::integer
    AS zero_caches_with_public_reviews,
  COUNT(*) FILTER(WHERE cached_count>0 AND public_count=0)::integer
    AS inflated_caches_without_public_reviews,
  COALESCE((SELECT COUNT(*) FROM pg_trigger t
    WHERE t.tgrelid='public.reviews'::regclass
      AND t.tgname='slbi_growth_review_cache_refresh'
      AND NOT t.tgisinternal AND t.tgenabled='O'),0)::integer
    AS enabled_g0_review_refresh_triggers,
  COALESCE((SELECT COUNT(*) FROM pg_trigger t
    WHERE t.tgrelid='public.businesses'::regclass
      AND t.tgname='slbi_growth_review_cache_guard'
      AND NOT t.tgisinternal AND t.tgenabled='O'),0)::integer
    AS enabled_g0_cache_guard_triggers,
  to_regnamespace('slbi_growth_internal') IS NOT NULL
    AS g0_private_review_schema_exists,
  (SELECT c.relrowsecurity FROM pg_class c
    WHERE c.oid='public.reviews'::regclass) AS reviews_rls_enabled,
  (SELECT c.relrowsecurity FROM pg_class c
    WHERE c.oid='public.businesses'::regclass) AS businesses_rls_enabled
FROM expected;
