\set ON_ERROR_STOP on
-- G0-15: isolated PostgreSQL 17 fixture only. NEVER apply to live Supabase.
-- This reproduces the production-observed SQL logic on synthetic rows.
-- A PASS validates that the current exposure was reproduced; it does NOT
-- certify the security of a production RPC or approve a deployment.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  city text,
  status text NOT NULL,
  views integer NOT NULL DEFAULT 0
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY g0_approved_discovery ON public.businesses
  FOR SELECT TO anon, authenticated USING (status = 'approved');
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.businesses TO anon, authenticated;
-- There is intentionally no anon/authenticated UPDATE grant.

INSERT INTO public.businesses
  (id,owner_id,slug,name,category,address,city,status)
SELECT (lpad(to_hex(g),32,'0'))::uuid,
       '11111111-1111-4111-8111-111111111111',
       'jaffna-bakery-' || g,
       'Jaffna Bakery ' || g,
       'Food','Jaffna', 'Jaffna','approved'
FROM generate_series(1,12) AS g;
INSERT INTO public.businesses
  (id,owner_id,slug,name,category,address,city,status)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '22222222-2222-4222-8222-222222222222',
   'jaffna-hidden','Jaffna Bakery Hidden','Food','Jaffna','Jaffna','pending');

-- Function body intentionally mirrors observed public SQL behavior.
CREATE OR REPLACE FUNCTION public.get_global_search_suggestions(
  search_query text, suggestion_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, slug text, name text, category text,
  address text, latitude double precision, longitude double precision,
  logo_url text)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE clean_search TEXT;
BEGIN
  clean_search := lower(trim(search_query));
  RETURN QUERY
  SELECT b.id,b.slug,b.name,b.category,b.address,b.latitude,b.longitude,b.logo_url
  FROM public.businesses b
  WHERE b.status = 'approved'
    AND (
      b.name % clean_search OR b.city % clean_search
      OR lower(b.name) LIKE '%' || clean_search || '%'
      OR lower(b.city) LIKE '%' || clean_search || '%'
      OR lower(b.address) LIKE '%' || clean_search || '%'
    )
  ORDER BY
    (lower(b.name) LIKE clean_search || '%') DESC,
    similarity(lower(b.name), clean_search) DESC,
    b.name ASC
  LIMIT suggestion_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_business_views(business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.businesses
  SET views = COALESCE(views, 0) + 1
  WHERE id = business_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_global_search_suggestions(text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_business_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_search_suggestions(text,integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_business_views(uuid)
  TO anon, authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon','public.businesses','UPDATE')
    OR has_table_privilege('authenticated','public.businesses','UPDATE')
  THEN RAISE EXCEPTION 'Fixture unexpectedly granted direct table UPDATE'; END IF;
  IF NOT has_function_privilege('anon','public.increment_business_views(uuid)','EXECUTE')
    OR NOT has_function_privilege('anon','public.get_global_search_suggestions(text,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'Fixture RPC ACL not representative'; END IF;
  IF (SELECT p.proconfig IS NOT NULL FROM pg_proc p
      WHERE p.oid = 'public.increment_business_views(uuid)'::regprocedure)
  THEN RAISE EXCEPTION 'Fixture unexpectedly pinned counter search_path'; END IF;
END $$;

SET ROLE anon;
DO $$
DECLARE v_count integer; v_hidden integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.get_global_search_suggestions('jaffna',50);
  IF v_count <> 12 THEN
    RAISE EXCEPTION 'Expected 12 approved suggestions, got %',v_count;
  END IF;
  SELECT count(*) INTO v_count
    FROM public.get_global_search_suggestions('jaffna',1);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'User-supplied suggestion limit ignored';
  END IF;
  SELECT count(*) INTO v_hidden
    FROM public.get_global_search_suggestions('jaffna',50)
    WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_hidden <> 0 THEN
    RAISE EXCEPTION 'Unapproved business leaked into suggestions';
  END IF;
END $$;

-- Known-risk demonstration, NOT a desired pass condition.
-- A definer call is able to update an unapproved, other-owned listing,
-- despite the absence of anon UPDATE privileges on the underlying table.
SELECT public.increment_business_views('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT public.increment_business_views('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
RESET ROLE;

DO $$
DECLARE v_views integer;
BEGIN
  SELECT views INTO v_views FROM public.businesses
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_views <> 2 THEN
    RAISE EXCEPTION 'Known RPC abuse-capability baseline drifted: got %',v_views;
  END IF;
END $$;

SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.get_global_search_suggestions('jaffna',2);
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Authenticated suggestions regression: %',v_count;
  END IF;
END $$;
RESET ROLE;

\echo 'PASS G0-15 isolated: approved-only suggestions + caller limit; verified anon direct UPDATE denied; KNOWN-RISK definer view increment of other-owned pending row reproduced twice'
