\set ON_ERROR_STOP on
DO $grants$
BEGIN
 IF has_table_privilege('anon','public.marketing_campaigns','SELECT')
 OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
 OR has_table_privilege('authenticated','public.marketing_campaigns','TRUNCATE')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','INSERT')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','UPDATE')
 OR has_table_privilege('authenticated','public.marketing_campaign_revisions','TRUNCATE')
 OR has_column_privilege('authenticated','public.marketing_campaigns','business_id','UPDATE')
 THEN RAISE EXCEPTION 'Marketing campaign library has unsafe role privileges'; END IF;
END $grants$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $owner_a$
DECLARE campaign uuid;revisions integer;rows_updated integer;rejected boolean:=false;
BEGIN
  -- Existing published row is readable but not reasserted as a provider proof.
  IF (SELECT status FROM public.marketing_campaigns
      WHERE id='33333333-3333-4333-8333-333333333333')<>'posted'
  THEN RAISE EXCEPTION 'Migration rewrote historic posted record'; END IF;
  INSERT INTO public.marketing_campaigns(
    business_id,banner_text,banner_color,platforms,scheduled_at,status
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Our real product promotion, please review','#FF7900',
    ARRAY['facebook'],now()+interval '3 days','drafted'
  ) RETURNING id INTO campaign;
  IF (SELECT COUNT(*) FROM public.marketing_campaign_revisions WHERE campaign_id=campaign)<>1
  THEN RAISE EXCEPTION 'New campaign missing creation audit event'; END IF;

  UPDATE public.marketing_campaigns
    SET status='approved',banner_text='Approved and checked vendor caption'
    WHERE id=campaign;
  IF (SELECT COUNT(*) FROM public.marketing_campaign_revisions WHERE campaign_id=campaign)<>2
  THEN RAISE EXCEPTION 'Manual human approval did not append revision'; END IF;
  IF (SELECT actor_id FROM public.marketing_campaign_revisions
      WHERE campaign_id=campaign AND revision_no=2)<>
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  THEN RAISE EXCEPTION 'Approval actor not stamped from auth.uid()'; END IF;

  rejected:=false;
  BEGIN
    INSERT INTO public.marketing_campaigns(business_id,banner_text,banner_color,status)
      VALUES('11111111-1111-4111-8111-111111111111','Fake publication','red','posted');
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Vendor forged published status via INSERT'; END IF;

  rejected:=false;
  BEGIN
    UPDATE public.marketing_campaigns SET status='posted' WHERE id=campaign;
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Vendor forged published status via UPDATE'; END IF;
  rejected:=false;
  BEGIN
    UPDATE public.marketing_campaigns
      SET business_id='22222222-2222-4222-8222-222222222222' WHERE id=campaign;
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Campaign business reassignment allowed'; END IF;
END $owner_a$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $owner_b$
DECLARE updated_count integer;revisions_count integer;rejected boolean:=false;
BEGIN
  IF (SELECT COUNT(*) FROM public.marketing_campaigns)<>0
  THEN RAISE EXCEPTION 'Vendor B can see Vendor A campaigns'; END IF;
  IF (SELECT COUNT(*) FROM public.marketing_campaign_revisions)<>0
  THEN RAISE EXCEPTION 'Vendor B can read Vendor A revision history'; END IF;
  UPDATE public.marketing_campaigns SET banner_text='Cross tenant update';
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  IF updated_count<>0 THEN RAISE EXCEPTION 'Vendor B edited Vendor A campaign'; END IF;
  -- Vendor B owns a real listing but has no verified Pro entitlement.
  BEGIN
    INSERT INTO public.marketing_campaigns(business_id,banner_text,banner_color,status)
      VALUES('22222222-2222-4222-8222-222222222222',
      'Basic plan attempted campaign','#FF7900','drafted');
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Basic user bypassed server Pro plan restriction via direct Supabase write'; END IF;
END $owner_b$;
RESET ROLE;
RESET "request.jwt.claim.sub";
-- After a verified Pro entitlement expires, direct edits become impossible.
UPDATE public.growth_entitlements SET expires_at=now()-interval '5 minutes'
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $expired$
DECLARE rows_changed integer;rejected boolean:=false;
BEGIN
  UPDATE public.marketing_campaigns SET banner_text='Expired plan changed a draft'
    WHERE status='approved';
  GET DIAGNOSTICS rows_changed=ROW_COUNT;
  IF rows_changed<>0 THEN RAISE EXCEPTION 'Expired Pro entitlement still allowed campaign UPDATE'; END IF;
  BEGIN
    INSERT INTO public.marketing_campaigns(business_id,banner_text,banner_color,status)
      VALUES('11111111-1111-4111-8111-111111111111','Expired Pro attempted new draft','#FF7900','drafted');
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Expired Pro could create a campaign'; END IF;
END $expired$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'P2-05 campaign Pro gating, history, approval audit and fake publishing defense PASS' result;
