\set ON_ERROR_STOP on
-- G0-18 STRICTLY DISPOSABLE POSTGRES 17 TEST.
-- Transaction-local removal of fixture consistency/audit triggers is only to
-- reproduce corrupted historical moderation columns; ROLLBACK restores both.
-- DO NOT EXECUTE ON PRODUCTION OR ANY SHARED DATABASE.
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger WHERE tgrelid='public.reviews'::regclass
   AND tgname='slbi_growth_review_cache_refresh' AND NOT tgisinternal
   AND pg_get_triggerdef(oid) ILIKE '%moderation_status%'
 ) THEN RAISE EXCEPTION 'G0 cache refresh trigger ignores moderation_status-only writes'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint WHERE conrelid='public.reviews'::regclass
   AND conname='slbi_reviews_moderation_consistent'
 ) THEN RAISE EXCEPTION 'Disposable review moderation contract missing'; END IF;
END $preflight$;

BEGIN;
ALTER TABLE public.reviews DISABLE TRIGGER slbi_reviews_moderation_audit;
ALTER TABLE public.reviews DROP CONSTRAINT slbi_reviews_moderation_consistent;

INSERT INTO public.businesses(id,owner_id,name,status,rating,reviews_count)
VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '11111111-1111-4111-8111-111111111111',
        'Synthetic moderation-contract business','approved',0,0);
INSERT INTO public.reviews(id,business_id,user_name,rating,comment,is_approved,moderation_status)
VALUES ('cccc0000-0000-4000-8000-000000000001',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'Fixture reviewer',4,'Fixture approved',true,'approved');

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.businesses
  WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    AND reviews_count=1 AND rating=4)
 THEN RAISE EXCEPTION 'approved review not counted'; END IF;
END $$;

-- An inconsistent true/false combination must NOT be shown to the public.
-- Change moderation_status ALONE to verify the trigger watches that field.
UPDATE public.reviews SET moderation_status='pending'
WHERE id='cccc0000-0000-4000-8000-000000000001';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.businesses
  WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    AND reviews_count=0 AND rating=0)
 THEN RAISE EXCEPTION 'true/pending review leaked into public cache'; END IF;
END $$;

UPDATE public.reviews SET moderation_status='approved'
WHERE id='cccc0000-0000-4000-8000-000000000001';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.businesses
  WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    AND reviews_count=1 AND rating=4)
 THEN RAISE EXCEPTION 'moderation-only publication did not restore cache'; END IF;
END $$;

UPDATE public.reviews SET is_approved=false
WHERE id='cccc0000-0000-4000-8000-000000000001';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.businesses
  WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    AND reviews_count=0 AND rating=0)
 THEN RAISE EXCEPTION 'false/approved review leaked into public cache'; END IF;
END $$;

-- This mismatched combination must also be excluded at INSERT, not only UPDATE.
INSERT INTO public.reviews(id,business_id,user_name,rating,comment,is_approved,moderation_status)
VALUES ('cccc0000-0000-4000-8000-000000000002',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'Historical fixture',5,'Pending but flagged',true,'pending');
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.businesses
  WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    AND reviews_count=0 AND rating=0)
 THEN RAISE EXCEPTION 'inconsistent inserted review leaked into cache'; END IF;
END $$;

ROLLBACK;

DO $after$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.reviews'::regclass
      AND tgname='slbi_reviews_moderation_audit' AND tgenabled='O') THEN
   RAISE EXCEPTION 'G0 fixture moderation audit was not restored'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint
    WHERE conrelid='public.reviews'::regclass
      AND conname='slbi_reviews_moderation_consistent') THEN
   RAISE EXCEPTION 'G0 fixture moderation consistency check was not restored'; END IF;
 IF EXISTS(SELECT 1 FROM public.businesses
    WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN
   RAISE EXCEPTION 'G0 fixture temporary test business persisted'; END IF;
END $after$;
\echo 'PASS G0-18 isolated public review cache: dual approved flags, moderation-only transitions, bad-row INSERT rejection, rollback restored all fixture protections'
