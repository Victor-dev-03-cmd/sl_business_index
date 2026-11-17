\set ON_ERROR_STOP on
-- P2-30: disposable PostgreSQL-only regression after P2-05 -> V2 ->
-- P2-29 poster_asset_id -> P2-30 single-column grant.
-- Owner A and B are synthetic accounts from tests/p2-brand/bootstrap.sql.
DO $preflight$
BEGIN
 IF NOT has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','INSERT')
    OR has_column_privilege('authenticated','public.marketing_campaigns','poster_asset_id','UPDATE')
    OR has_table_privilege('authenticated','public.marketing_campaigns','INSERT')
    OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
    OR has_table_privilege('authenticated','public.marketing_campaigns','TRUNCATE')
    OR has_table_privilege('anon','public.marketing_campaigns','SELECT')
    OR has_table_privilege('anon','public.marketing_campaigns','INSERT')
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.marketing_campaigns'::regclass)
 THEN RAISE EXCEPTION 'Unsafe or incomplete campaign asset privileges'; END IF;
END $preflight$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $owner_a$
DECLARE v_id uuid; changed integer; denied boolean;
BEGIN
 INSERT INTO public.marketing_campaigns(
   business_id,banner_text,banner_color,platforms,scheduled_at,status,brief,poster_asset_id
 ) VALUES(
   '11111111-1111-4111-8111-111111111111'::uuid,
   'Original Tamil caption + #SLBI','caption-lab-connected-v1',
   ARRAY['facebook','instagram'],NULL,'drafted',
   '{"offer":"Offer from owner A","cta":"Contact us","terms":"","language":"English","objective":"promotion","format":"portrait","palette":"navy"}'::jsonb,
   '44444444-4444-4444-8444-444444444444'::uuid
 ) RETURNING id INTO v_id;
 IF NOT EXISTS(
   SELECT 1 FROM public.marketing_campaigns
   WHERE id=v_id AND poster_asset_id='44444444-4444-4444-8444-444444444444'::uuid
 ) THEN RAISE EXCEPTION 'Owner A cannot read the saved poster reference'; END IF;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=v_id)<>1
 THEN RAISE EXCEPTION 'Missing audit on caption campaign creation'; END IF;

 UPDATE public.marketing_campaigns
    SET banner_text='Updated manual campaign',
        brief=jsonb_set(brief,'{offer}','"Edited text"'),
        status='scheduled',
        scheduled_at=now()+interval '2 days'
  WHERE id=v_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Owner A cannot update/schedule'; END IF;
 UPDATE public.marketing_campaigns SET is_archived=true WHERE id=v_id;
 UPDATE public.marketing_campaigns SET is_archived=false WHERE id=v_id;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=v_id)<>4
 THEN RAISE EXCEPTION 'Edit/schedule/archive/restore not all audited'; END IF;

 denied:=false;
 BEGIN
   UPDATE public.marketing_campaigns SET poster_asset_id=NULL WHERE id=v_id;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Owner browser can rewrite protected poster asset association'; END IF;

 denied:=false;
 BEGIN
   INSERT INTO public.marketing_campaigns(
     business_id,banner_text,banner_color,status,brief,poster_asset_id
   ) VALUES(
     '11111111-1111-4111-8111-111111111111'::uuid,
     'Invalid brief must fail','caption-lab-connected-v1','drafted',
     '{"offer":"x","cta":"","terms":"","language":"English","objective":"promotion","format":"portrait","palette":"navy","captionBundle":{}}'::jsonb,NULL
   );
 EXCEPTION WHEN check_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Strict seven-key brief shape was weakened'; END IF;
END $owner_a$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $owner_b$
DECLARE visible integer;changed integer;denied boolean:=false;
BEGIN
 SELECT count(*) INTO visible FROM public.marketing_campaigns
  WHERE poster_asset_id='44444444-4444-4444-8444-444444444444'::uuid;
 IF visible<>0 THEN RAISE EXCEPTION 'Owner B can read owner A private asset association'; END IF;
 UPDATE public.marketing_campaigns SET is_archived=true
  WHERE business_id='11111111-1111-4111-8111-111111111111'::uuid;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Owner B can archive owner A campaign'; END IF;
 BEGIN
  INSERT INTO public.marketing_campaigns(
    business_id,banner_text,banner_color,status,brief,poster_asset_id
  ) VALUES(
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Cross tenant attempt','caption-lab-connected-v1','drafted',
    '{"offer":"x","cta":"","terms":"","language":"English","objective":"promotion","format":"portrait","palette":"navy"}'::jsonb,NULL
  );
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Owner B can save campaigns into owner A business'; END IF;
END $owner_b$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'P2-30 private poster caption Save + Planner edit/schedule/archive/restore/strict RLS PASS' AS result;
