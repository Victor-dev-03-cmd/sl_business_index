-- One atomic integrated migration: P0 release structural/role acceptance.
\set ON_ERROR_STOP on
DO $$
DECLARE fn record;
BEGIN
 IF (SELECT count(*) FROM public.businesses)<>4 THEN
   RAISE EXCEPTION 'FAIL: existing business records lost'; END IF;
 IF (SELECT count(*) FROM public.profiles)<>4 THEN
   RAISE EXCEPTION 'FAIL: existing profiles lost'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND ((tablename='profiles' AND policyname='Profiles viewable by all')
      OR (tablename='businesses' AND policyname='Temporary Public View')
      OR (tablename='leads' AND policyname='Anyone can insert leads')
      OR (tablename='analytics_logs' AND policyname='Anyone can insert logs')
      OR (tablename='verifications' AND policyname='Vendors manage own verifications'))) THEN
   RAISE EXCEPTION 'FAIL: unsafe old access policies remain'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
   AND tablename='leads' AND policyname='SLBI legacy compatible enquiry insert')
 THEN RAISE EXCEPTION 'FAIL: old mobile leads cannot be received'; END IF;
 IF has_function_privilege('anon','public.slbi_record_growth_event(uuid,uuid,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE')
 OR has_function_privilege('anon','public.get_or_create_direct_room(uuid,uuid)','EXECUTE')
 OR has_function_privilege('anon','public.is_room_member(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'FAIL: privileged RPC exposed to visitor'; END IF;
 IF NOT has_function_privilege('authenticated','public.get_or_create_direct_room(uuid,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'FAIL: authenticated chat access removed'; END IF;
 IF has_table_privilege('anon','public.growth_entitlements','SELECT')
 OR has_table_privilege('anon','public.growth_credit_wallets','UPDATE') THEN
   RAISE EXCEPTION 'FAIL: growth entitlements or wallet exposed'; END IF;
 IF (SELECT count(*) FROM public.growth_credit_actions WHERE is_enabled)<>0 THEN
   RAISE EXCEPTION 'FAIL: future AI features accidentally activated'; END IF;
 FOR fn IN
  SELECT p.oid FROM pg_proc p
  WHERE p.pronamespace='public'::regnamespace
   AND p.prosecdef AND p.prorettype='trigger'::regtype
 LOOP
   IF has_function_privilege('anon',fn.oid,'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anonymous EXECUTE on internal trigger %',fn.oid::regprocedure;
   END IF;
 END LOOP;
END $$;
\echo 'PASS: atomic migration, privacy, protected RPCs, anonymous legacy mobile and no premature feature activation'
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>0
  OR (SELECT count(*) FROM public.businesses)<>1 THEN
  RAISE EXCEPTION 'FAIL: anonymous profiles/approved businesses visibility'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1
    OR (SELECT count(*) FROM public.businesses)<>2 THEN
  RAISE EXCEPTION 'FAIL: vendor A profile/business read scope'; END IF;
 IF (SELECT count(*) FROM public.verifications)<>0 THEN
  RAISE EXCEPTION 'FAIL: unexpected verification requests'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles)<>4
 OR (SELECT count(*) FROM public.businesses)<>4 THEN
  RAISE EXCEPTION 'FAIL: admin RLS access lost'; END IF;
END $$;
RESET ROLE;
\echo 'PASS: final integrated role matrix with live-like synthetic data'
