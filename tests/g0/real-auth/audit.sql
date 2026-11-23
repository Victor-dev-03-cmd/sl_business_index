-- Synthetic-only DB catalog check after real JWT integration.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF has_function_privilege('anon','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'G0 service-only RPC ACL failure'; END IF;
 IF has_schema_privilege('anon','slbi_growth_internal','USAGE')
 OR has_schema_privilege('authenticated','slbi_growth_internal','USAGE')
 OR has_function_privilege('anon','slbi_growth_internal.canonical_review_cache()','EXECUTE')
 OR has_function_privilege('authenticated','slbi_growth_internal.refresh_review_cache()','EXECUTE')
 THEN RAISE EXCEPTION 'G0 private trigger exposure'; END IF;
 IF EXISTS (SELECT 1 FROM public.businesses b LEFT JOIN
  (SELECT business_id,avg(rating) avg_rating,count(*)::integer n FROM public.reviews
   WHERE is_approved IS TRUE GROUP BY business_id) r ON r.business_id=b.id
  WHERE (b.rating,b.reviews_count) IS DISTINCT FROM (coalesce(r.avg_rating,0),coalesce(r.n,0)))
 THEN RAISE EXCEPTION 'G0 review cache mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='slbi_reviews_moderation_audit' AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'P1 moderation audit missing'; END IF;
END $$;
\echo 'PASS G0 real-auth DB-side service-only ACL, private review triggers and canonical cache'
