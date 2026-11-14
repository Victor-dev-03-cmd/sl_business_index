\set ON_ERROR_STOP on
-- Preserve legacy manual drafts for Basic AND Professional; no public/tenant
-- writes, forged publication or client-side approval transitions.
DO $grants$
BEGIN
 IF has_table_privilege('anon','public.marketing_campaigns','SELECT')
 OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
 OR has_table_privilege('authenticated','public.marketing_campaigns','TRUNCATE')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','INSERT')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','UPDATE')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','TRUNCATE')
 OR has_column_privilege('authenticated','public.marketing_campaigns','business_id','UPDATE')
 THEN RAISE EXCEPTION 'Unsafe marketing campaign privileges'; END IF;
END $grants$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $owner_a$
DECLARE campaign uuid;rejected boolean;updated_count int;
BEGIN
 IF (SELECT status FROM public.marketing_campaigns
     WHERE id='33333333-3333-4333-8333-333333333333')<>'posted'
 THEN RAISE EXCEPTION 'Historic posted status changed'; END IF;
 INSERT INTO public.marketing_campaigns(
   business_id,banner_text,banner_color,platforms,scheduled_at,status
 ) VALUES (
   '11111111-1111-4111-8111-111111111111',
   'Real draft for manual review','#FF7900',
   ARRAY['facebook'],now()+interval '3 days','drafted'
 ) RETURNING id INTO campaign;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=campaign)<>1
 THEN RAISE EXCEPTION 'Creation audit missing'; END IF;
 UPDATE public.marketing_campaigns
   SET status='scheduled',banner_text='Manual planning - no automatic publish'
   WHERE id=campaign;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=campaign)<>2
 THEN RAISE EXCEPTION 'Manual draft edit not audited'; END IF;
 IF (SELECT actor_id FROM public.marketing_campaign_revisions
     WHERE campaign_id=campaign AND revision_no=2)<>
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
 THEN RAISE EXCEPTION 'Revision actor wrong'; END IF;
 rejected:=false;
 BEGIN
   INSERT INTO public.marketing_campaigns(business_id,banner_text,banner_color,status)
     VALUES('11111111-1111-4111-8111-111111111111','Forged publication','red','posted');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Forged published INSERT'; END IF;
 rejected:=false;
 BEGIN
   UPDATE public.marketing_campaigns SET status='posted' WHERE id=campaign;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Forged published UPDATE'; END IF;
 rejected:=false;
 BEGIN
   UPDATE public.marketing_campaigns SET status='approved' WHERE id=campaign;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Browser forged human approval'; END IF;
 rejected:=false;
 BEGIN
   UPDATE public.marketing_campaigns
     SET business_id='22222222-2222-4222-8222-222222222222'
     WHERE id=campaign;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Campaign reassign allowed'; END IF;
END $owner_a$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $basic_owner_b$
DECLARE own_campaign uuid; count_rows int; rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.marketing_campaigns)<>0
 THEN RAISE EXCEPTION 'Basic B sees A campaigns'; END IF;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions)<>0
 THEN RAISE EXCEPTION 'Basic B sees A revisions'; END IF;
 INSERT INTO public.marketing_campaigns(
   business_id,banner_text,banner_color,status
 ) VALUES(
   '22222222-2222-4222-8222-222222222222',
   'Existing Basic manual campaign','#FF7900','drafted'
 ) RETURNING id INTO own_campaign;
 IF own_campaign IS NULL THEN RAISE EXCEPTION 'Basic legacy manual draft blocked'; END IF;
 UPDATE public.marketing_campaigns
   SET banner_text='Basic manual edit',status='scheduled'
   WHERE id=own_campaign;
 IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=own_campaign)<>2
 THEN RAISE EXCEPTION 'Basic draft edit audit missing'; END IF;
 UPDATE public.marketing_campaigns SET banner_text='Attack A campaign'
   WHERE business_id='11111111-1111-4111-8111-111111111111';
 GET DIAGNOSTICS count_rows=ROW_COUNT;
 IF count_rows<>0 THEN RAISE EXCEPTION 'Cross-tenant write allowed'; END IF;
 rejected:=false;
 BEGIN
  INSERT INTO public.marketing_campaigns(
    business_id,banner_text,banner_color,status
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Attempt create A draft','#FF7900','drafted'
  );
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Basic B created A campaign'; END IF;
END $basic_owner_b$;
RESET ROLE;
RESET "request.jwt.claim.sub";

-- Expiry cannot remove the existing manual campaign composer; premium
-- connector/agent/AI paths continue independently gated by current Pro.
UPDATE public.growth_entitlements SET expires_at=now()-interval '5 minutes'
 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $expired$
DECLARE id uuid;
BEGIN
 INSERT INTO public.marketing_campaigns(business_id,banner_text,banner_color,status)
 VALUES('11111111-1111-4111-8111-111111111111',
        'Expired Pro still has legacy manual drafts','#FF7900','drafted')
 RETURNING public.marketing_campaigns.id INTO id;
 IF id IS NULL THEN RAISE EXCEPTION 'Expired Pro lost legacy manual drafting'; END IF;
END $expired$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'P2-05 Basic manual continuity, owner RLS, no forged publication, audit PASS' result;
