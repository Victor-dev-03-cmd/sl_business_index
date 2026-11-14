\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 test of the EXACT production migration bundle.
DO $catalogue$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.marketing_studio_app_rollouts;
  IF v_count <> 12 THEN RAISE EXCEPTION 'Expected 12 launch records, got %', v_count; END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_studio_app_rollouts WHERE launch_status<>'coming_soon')
  THEN RAISE EXCEPTION 'Unapproved Marketing app launch'; END IF;
  IF has_table_privilege('anon','public.marketing_studio_app_rollouts','SELECT')
     OR has_table_privilege('authenticated','public.marketing_studio_app_rollouts','INSERT')
     OR has_table_privilege('authenticated','public.marketing_studio_app_rollouts','UPDATE')
     OR has_table_privilege('authenticated','public.marketing_studio_app_rollouts','DELETE')
  THEN RAISE EXCEPTION 'Untrusted app release mutation'; END IF;
  IF has_table_privilege('authenticated','public.marketing_connection_secrets','SELECT')
    OR has_table_privilege('authenticated','public.marketing_oauth_intents','SELECT')
  THEN RAISE EXCEPTION 'OAuth secret/intents exposed'; END IF;
  IF has_function_privilege('authenticated',
    'public.slbi_store_claimed_google_mail_connection(uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE')
    OR has_function_privilege('service_role',
    'public.slbi_store_verified_marketing_connection(uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Forbidden browser or legacy callback access'; END IF;
  IF (SELECT count(*) FROM public.marketing_connections)>0
    OR (SELECT count(*) FROM public.marketing_oauth_intents)>0
    OR (SELECT count(*) FROM public.marketing_connection_secrets)>0
  THEN RAISE EXCEPTION 'Unexpected fake provider connection'; END IF;
END $catalogue$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $owner$
BEGIN
  IF (SELECT count(*) FROM public.marketing_studio_app_rollouts)<>12
  THEN RAISE EXCEPTION 'Owner could not read catalogue'; END IF;
  IF EXISTS(SELECT 1 FROM public.social_brand_profiles WHERE owner_id<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  THEN RAISE EXCEPTION 'Cross-owner brand profile exposed'; END IF;
END $owner$;
RESET ROLE;
SELECT 'P2 global marketing 12 coming-soon apps / RLS / OAuth disabled PASS' result;
