-- APPROVAL REQUIRED. Transaction body for a NEW migration; never replay history.
-- G0-18: cache must follow public reviews requiring both approved flags;
-- never count pending/staff-only rows or silently reconcile inconsistent flags.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.reviews,public.businesses IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF to_regnamespace('slbi_growth_internal') IS NOT NULL THEN RAISE EXCEPTION 'G0 internal schema already exists: reconcile before release'; END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='moderation_status' AND data_type='text') OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='rating' AND udt_name='numeric' AND numeric_scale IS NULL) OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='reviews_count' AND udt_name='int4') OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='is_approved' AND udt_name='bool') THEN RAISE EXCEPTION 'G0 review column contract changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.reviews r WHERE (r.is_approved IS TRUE) IS DISTINCT FROM (r.moderation_status = 'approved')) THEN RAISE EXCEPTION 'G0 public review moderation flags inconsistent: reconcile before release'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('slbi_growth_review_cache_guard','slbi_growth_review_cache_refresh') AND NOT tgisinternal) THEN RAISE EXCEPTION 'G0 review trigger collision'; END IF;
END $preflight$;
CREATE SCHEMA IF NOT EXISTS slbi_growth_internal;
REVOKE ALL ON SCHEMA slbi_growth_internal FROM PUBLIC, anon, authenticated;
-- A business row's cache is derived, including when an owner tries to set it.
-- Trigger-only definer functions need full approved-row visibility under RLS.
CREATE OR REPLACE FUNCTION slbi_growth_internal.canonical_review_cache()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  SELECT coalesce(avg(r.rating),0), count(*)::integer
    INTO NEW.rating, NEW.reviews_count
    FROM public.reviews r WHERE r.business_id=NEW.id AND r.is_approved IS TRUE AND r.moderation_status = 'approved';
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION slbi_growth_internal.canonical_review_cache() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS slbi_growth_review_cache_guard ON public.businesses;
CREATE TRIGGER slbi_growth_review_cache_guard
BEFORE INSERT OR UPDATE OF rating,reviews_count ON public.businesses
FOR EACH ROW EXECUTE FUNCTION slbi_growth_internal.canonical_review_cache();

CREATE OR REPLACE FUNCTION slbi_growth_internal.refresh_review_cache()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old uuid; v_new uuid; v_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old:=OLD.business_id; END IF;
  IF TG_OP <> 'DELETE' THEN v_new:=NEW.business_id; END IF;
  -- Sort IDs for a moved review. UPDATE takes the business-row lock;
  -- the volatile BEFORE trigger recalculates under effective owner privileges.
  -- No cache update for pending-only insertion/deletion.
  IF TG_OP='INSERT' THEN IF NEW.is_approved IS NOT TRUE OR NEW.moderation_status IS DISTINCT FROM 'approved' THEN RETURN NULL; END IF;
  ELSIF TG_OP='DELETE' THEN IF OLD.is_approved IS NOT TRUE OR OLD.moderation_status IS DISTINCT FROM 'approved' THEN RETURN NULL; END IF;
  ELSIF (OLD.is_approved IS NOT TRUE OR OLD.moderation_status IS DISTINCT FROM 'approved')
     AND (NEW.is_approved IS NOT TRUE OR NEW.moderation_status IS DISTINCT FROM 'approved') THEN RETURN NULL;
  END IF;
  FOR v_id IN SELECT DISTINCT id FROM unnest(ARRAY[v_old,v_new]) AS ids(id)
               WHERE id IS NOT NULL ORDER BY id
  LOOP
    -- Separate row-lock statement ensures the subsequent volatile aggregate
    -- sees commits by prior writer in READ COMMITTED, including after waiting.
    PERFORM 1 FROM public.businesses b WHERE b.id=v_id FOR NO KEY UPDATE;
    UPDATE public.businesses b SET rating=b.rating,reviews_count=b.reviews_count WHERE b.id=v_id;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION slbi_growth_internal.refresh_review_cache() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS slbi_growth_review_cache_refresh ON public.reviews;
CREATE TRIGGER slbi_growth_review_cache_refresh
AFTER INSERT OR DELETE OR UPDATE OF business_id,rating,is_approved,moderation_status ON public.reviews
FOR EACH ROW EXECUTE FUNCTION slbi_growth_internal.refresh_review_cache();
-- Reconcile only inconsistent rows; guard computes from approved reviews.
UPDATE public.businesses b SET rating=b.rating,reviews_count=b.reviews_count
FROM (SELECT own.id,coalesce(avg(r.rating),0) AS avg_rating,count(r.id)::integer AS review_count
 FROM public.businesses own LEFT JOIN public.reviews r ON r.business_id=own.id AND r.is_approved IS TRUE AND r.moderation_status='approved'
 GROUP BY own.id) expected
WHERE b.id=expected.id
 AND (b.rating,b.reviews_count) IS DISTINCT FROM (expected.avg_rating,expected.review_count);
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.businesses b LEFT JOIN (SELECT business_id,avg(rating) avg_rating,count(*)::integer n FROM public.reviews WHERE is_approved IS TRUE AND moderation_status='approved' GROUP BY business_id) r ON r.business_id=b.id WHERE (b.rating,b.reviews_count) IS DISTINCT FROM (coalesce(r.avg_rating,0),coalesce(r.n,0))) THEN RAISE EXCEPTION 'G0 review backfill mismatch'; END IF;
 IF has_function_privilege('anon','slbi_growth_internal.refresh_review_cache()','EXECUTE') OR has_function_privilege('authenticated','slbi_growth_internal.canonical_review_cache()','EXECUTE') THEN RAISE EXCEPTION 'G0 private function exposed'; END IF;
END $verify$;
