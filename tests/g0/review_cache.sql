\set ON_ERROR_STOP on
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=5 AND reviews_count=1) THEN RAISE EXCEPTION 'backfill wrong'; END IF;
END $$;
-- Model owner write permission in disposable fixture, without touching live RLS.
CREATE POLICY g0_fixture_owner_write ON public.businesses FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
SET ROLE authenticated;
SET "request.jwt.claim.sub"='11111111-1111-4111-8111-111111111111';
UPDATE public.businesses SET rating=1,reviews_count=999 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=5 AND reviews_count=1) THEN RAISE EXCEPTION 'owner cache spoof accepted'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SET "request.jwt.claim.sub"='55555555-5555-4555-8555-555555555555';
UPDATE public.reviews SET is_approved=true,moderation_status='approved' WHERE id='aaaaeeee-aaaa-4aaa-8aaa-aaaaaaaeeeee';
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=4 AND reviews_count=2) THEN RAISE EXCEPTION 'moderation aggregate wrong'; END IF;
END $$;
-- Privileged correction/delete/move must also maintain derived fields.
UPDATE public.reviews SET rating=1 WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=2 AND reviews_count=2) THEN RAISE EXCEPTION 'edit aggregate wrong'; END IF;
END $$;
DELETE FROM public.reviews WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=3 AND reviews_count=1) THEN RAISE EXCEPTION 'delete aggregate wrong'; END IF;
END $$;
UPDATE public.reviews SET business_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id='aaaaeeee-aaaa-4aaa-8aaa-aaaaaaaeeeee';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=0 AND reviews_count=0) OR
 NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND rating=3.5 AND reviews_count=2)
 THEN RAISE EXCEPTION 'move aggregate wrong'; END IF;
 IF has_function_privilege('anon','slbi_growth_internal.refresh_review_cache()','EXECUTE') OR has_function_privilege('authenticated','slbi_growth_internal.canonical_review_cache()','EXECUTE') THEN RAISE EXCEPTION 'private trigger execute allowed'; END IF;
END $$;
\echo 'PASS: review cache backfill, owner spoof resistance, approval, edit, delete, move, private trigger grants'
