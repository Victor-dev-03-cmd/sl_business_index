-- Disposable PostgreSQL 17 test only; NO live database, customers, tokens or secrets.
\set ON_ERROR_STOP on
BEGIN;
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END
$roles$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $uid$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$uid$;
CREATE TABLE public.businesses (
 id uuid PRIMARY KEY, owner_id uuid, status text
);
CREATE TABLE public.chat_rooms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
 room_type text NOT NULL DEFAULT 'direct' CHECK(room_type IN('direct','support','vendor_group'))
);
CREATE TABLE public.chat_room_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 UNIQUE(room_id,user_id)
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
INSERT INTO public.businesses VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','approved'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','pending'),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','approved');
\ir ../../docs/growth/g0/candidates/CHAT_DIRECT_ROOM_TENANT_GUARD_REVIEW_ONLY.sql
-- Preserve existing production contract: authenticated role callable, anon denied.
REVOKE ALL ON FUNCTION public.get_or_create_direct_room(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_room(uuid,uuid) TO authenticated;
GRANT USAGE ON SCHEMA auth,public TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

DO $preflight$
DECLARE v_oid oid;
BEGIN
 SELECT oid INTO v_oid FROM pg_proc WHERE oid='public.get_or_create_direct_room(uuid,uuid)'::regprocedure;
 IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=v_oid) THEN
   RAISE EXCEPTION 'expected SECURITY DEFINER';
 END IF;
 IF NOT (SELECT proconfig @> ARRAY['search_path=']::text[] FROM pg_proc WHERE oid=v_oid) THEN
   RAISE EXCEPTION 'missing pinned path';
 END IF;
 IF has_function_privilege('anon',v_oid,'EXECUTE')
  OR NOT has_function_privilege('authenticated',v_oid,'EXECUTE') THEN
   RAISE EXCEPTION 'RPC grants out of contract';
 END IF;
END
$preflight$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

DO $positive$
DECLARE r1 uuid; r2 uuid; r3 uuid; v_unscoped uuid;
BEGIN
 r1 := public.get_or_create_direct_room(
  '00000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid);
 r2 := public.get_or_create_direct_room(
  '00000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid);
 IF r1 IS NULL OR r1 IS DISTINCT FROM r2 THEN
   RAISE EXCEPTION 'allowed business chat not idempotent';
 END IF;
 r3 := public.get_or_create_direct_room(
  '00000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000003'::uuid);
 IF r3 IS NULL OR r3 = r1 THEN
   RAISE EXCEPTION 'business-scoped rooms must not coalesce';
 END IF;
 v_unscoped := public.get_or_create_direct_room(
  '00000000-0000-4000-8000-000000000002'::uuid, NULL);
 IF v_unscoped IS NULL OR v_unscoped IN (r1,r3) THEN
   RAISE EXCEPTION 'unscoped direct room compatibility broken';
 END IF;
END
$positive$;

DO $negative$
BEGIN
  BEGIN
   PERFORM public.get_or_create_direct_room(
     '00000000-0000-4000-8000-000000000003'::uuid,
     '10000000-0000-4000-8000-000000000003'::uuid);
   RAISE EXCEPTION 'unrelated business allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.get_or_create_direct_room(
     '00000000-0000-4000-8000-000000000002'::uuid,
     '10000000-0000-4000-8000-000000000002'::uuid);
   RAISE EXCEPTION 'pending business allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.get_or_create_direct_room(
     '00000000-0000-4000-8000-000000000001'::uuid,
     '10000000-0000-4000-8000-000000000001'::uuid);
   RAISE EXCEPTION 'self-chat allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.get_or_create_direct_room(
     '00000000-0000-4000-8000-000000000002'::uuid,
     '10000000-0000-4000-8000-000000000099'::uuid);
   RAISE EXCEPTION 'missing business allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.get_or_create_direct_room(NULL::uuid,NULL::uuid);
   RAISE EXCEPTION 'null participant allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END
$negative$;

SELECT set_config('request.jwt.claim.sub','',true);
DO $unauthenticated$
BEGIN
  BEGIN
   PERFORM public.get_or_create_direct_room('00000000-0000-4000-8000-000000000002'::uuid,NULL::uuid);
   RAISE EXCEPTION 'missing JWT allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END
$unauthenticated$;
RESET ROLE;
DO $final$
BEGIN
 IF (SELECT count(*) FROM public.chat_rooms) != 3
    OR (SELECT count(*) FROM public.chat_room_members) != 6 THEN
   RAISE EXCEPTION 'rejected calls unexpectedly changed room counts';
 END IF;
END
$final$;
ROLLBACK;
\echo G0_CHAT_TENANT_BOUNDARY_DISPOSABLE_PASS
