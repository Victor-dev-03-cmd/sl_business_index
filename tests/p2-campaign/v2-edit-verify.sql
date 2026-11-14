\set ON_ERROR_STOP on
-- Run AFTER tests/p2-brand/bootstrap.sql, GrowthOS foundation,
-- tests/p2-campaign/bootstrap.sql, P2-05 security candidate, AND V2 SQL.
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $owner$
DECLARE id uuid; cnt integer; bad boolean := false;
BEGIN
  INSERT INTO public.marketing_campaigns(
    business_id,banner_text,banner_color,platforms,status,brief
  ) VALUES(
    '11111111-1111-4111-8111-111111111111',
    'Original test campaign','#193E30',ARRAY['facebook'],'drafted',
    '{"offer":"Test message","cta":"Call now","terms":"","language":"English","objective":"promotion","format":"portrait","palette":"forest"}'::jsonb
  ) RETURNING marketing_campaigns.id INTO id;
  UPDATE public.marketing_campaigns
    SET banner_text='Edited campaign',brief=jsonb_set(brief,'{offer}','"Edited message"'),is_archived=true
    WHERE marketing_campaigns.id=id;
  IF (SELECT count(*) FROM public.marketing_campaigns WHERE marketing_campaigns.id=id AND is_archived=true AND brief->>'offer'='Edited message')<>1
  THEN RAISE EXCEPTION 'Editable draft or archive failed';END IF;
  UPDATE public.marketing_campaigns SET is_archived=false WHERE marketing_campaigns.id=id;
  IF (SELECT count(*) FROM public.marketing_campaign_revisions WHERE campaign_id=id)<>3
  THEN RAISE EXCEPTION 'Edit/archive/restore revision history missing';END IF;
  bad:=false;
  BEGIN
    UPDATE public.marketing_campaigns SET brief='{"offer":"x"}'::jsonb WHERE marketing_campaigns.id=id;
  EXCEPTION WHEN check_violation THEN bad:=true; END;
  IF NOT bad THEN RAISE EXCEPTION 'Malformed browser brief accepted';END IF;
  bad:=false;
  BEGIN
    UPDATE public.marketing_campaigns SET status='posted' WHERE marketing_campaigns.id=id;
  EXCEPTION WHEN insufficient_privilege THEN bad:=true; END;
  IF NOT bad THEN RAISE EXCEPTION 'Browser can forge published status';END IF;
END $owner$;
SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $tenant$
DECLARE changed integer;
BEGIN
  UPDATE public.marketing_campaigns SET is_archived=true
   WHERE business_id='11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Owner B archived Owner A campaign';END IF;
END $tenant$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'Campaign V2 edit/restore audit + tenant isolation PASS' AS result;
