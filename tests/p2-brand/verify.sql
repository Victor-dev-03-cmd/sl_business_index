\set ON_ERROR_STOP on
DO $grants$
BEGIN
  IF has_table_privilege('anon','public.social_brand_profiles','SELECT')
     OR has_table_privilege('anon','public.social_brand_profiles','INSERT')
     OR has_table_privilege('anon','public.social_brand_profiles','TRUNCATE')
     OR has_table_privilege('authenticated','public.social_brand_profiles','TRUNCATE')
     OR has_table_privilege('authenticated','public.social_brand_profiles','DELETE')
     OR has_column_privilege('authenticated','public.social_brand_profiles','owner_id','UPDATE')
     OR has_column_privilege('authenticated','public.social_brand_profiles','business_id','UPDATE')
     OR NOT has_column_privilege('authenticated','public.social_brand_profiles','brand_name','UPDATE')
  THEN RAISE EXCEPTION 'Unsafe brand profile role or immutable tenant column grants'; END IF;
END
$grants$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $vendor_a$
DECLARE denied boolean := false;
BEGIN
  INSERT INTO public.social_brand_profiles(
    business_id,owner_id,brand_name,primary_color,secondary_color,accent_color,
    languages,offers
  ) VALUES (
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Jaffna Store','#202024','#FFFFFF','#FF7900',
    ARRAY['en','ta','si'],'[{"title":"Delivery","details":"Within city","validUntil":null}]'
  );
  IF (SELECT count(*) FROM public.social_brand_profiles)<>1
  THEN RAISE EXCEPTION 'Vendor A should only see own brand profile'; END IF;

  BEGIN
    INSERT INTO public.social_brand_profiles(business_id,owner_id,brand_name)
    VALUES ('22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Cross-owner spoof');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Vendor A inserted profile for Vendor B business'; END IF;

  denied:=false;
  BEGIN
    INSERT INTO public.social_brand_profiles(business_id,owner_id,brand_name)
    VALUES ('22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Forged B identity');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Vendor A impersonated Vendor B'; END IF;

  UPDATE public.social_brand_profiles SET brand_name='Updated by owner'
  WHERE business_id='11111111-1111-4111-8111-111111111111';
  IF (SELECT brand_name FROM public.social_brand_profiles) <> 'Updated by owner'
  THEN RAISE EXCEPTION 'Vendor A cannot edit own brand'; END IF;

  denied:=false;
  BEGIN
    UPDATE public.social_brand_profiles SET owner_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    WHERE business_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Business owner can rewrite immutable tenant ID'; END IF;

  denied:=false;
  BEGIN
    UPDATE public.social_brand_profiles SET primary_color='red'
    WHERE business_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid brand color passed SQL guard'; END IF;

  denied:=false;
  BEGIN
    UPDATE public.social_brand_profiles SET languages=ARRAY['en','en']
    WHERE business_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Duplicate languages passed SQL guard'; END IF;
END $vendor_a$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $vendor_b$
DECLARE changed integer;
BEGIN
  IF (SELECT count(*) FROM public.social_brand_profiles)<>0
  THEN RAISE EXCEPTION 'Vendor B can read Vendor A brand'; END IF;
  UPDATE public.social_brand_profiles SET brand_name='Stolen'
  WHERE business_id='11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Vendor B changed Vendor A brand'; END IF;

  INSERT INTO public.social_brand_profiles(business_id,owner_id,brand_name)
  VALUES ('22222222-2222-4222-8222-222222222222',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Colombo Studio');
  IF (SELECT count(*) FROM public.social_brand_profiles)<>1
  THEN RAISE EXCEPTION 'Vendor B cannot read own brand'; END IF;
END $vendor_b$;
RESET ROLE;

SET ROLE anon;
DO $anonymous$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM public.social_brand_profiles;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous user read private brand profiles'; END IF;
END $anonymous$;
RESET ROLE;

DO $final$
BEGIN
  IF (SELECT count(*) FROM public.social_brand_profiles)<>2
  THEN RAISE EXCEPTION 'Synthetic business profiles unexpectedly lost'; END IF;
END $final$;
SELECT 'P2-01 Docker brand profile tenant RLS, permissions and SQL guards PASS' AS result;
