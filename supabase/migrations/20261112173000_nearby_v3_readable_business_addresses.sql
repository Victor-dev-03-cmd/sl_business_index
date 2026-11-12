-- SmartSearch v3: preserve v2 ranking, filters, search and invoker security while
-- including the business-provided human-readable address used by Business Details.
-- This wrapper is additive: all v2 consumers retain their unchanged response.
CREATE OR REPLACE FUNCTION public.get_nearby_businesses_v3(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000,
  filter_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  related_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  specific_service BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  category TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website_name TEXT,
  website_url TEXT,
  rating NUMERIC,
  reviews_count INTEGER,
  image_url TEXT,
  logo_url TEXT,
  verification_status TEXT,
  distance_meters DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  search_rank REAL,
  can_show_badge BOOLEAN,
  match_type TEXT,
  lexical_rank REAL,
  detailed_address TEXT,
  city TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT v2.*, b.detailed_address, b.city
  FROM public.get_nearby_businesses_v2(
    user_lat, user_lng, search_query, dist_limit,
    filter_categories, related_categories, specific_service
  ) AS v2
  JOIN public.businesses AS b ON b.id = v2.id AND b.status = 'approved';
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_businesses_v3(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_nearby_businesses_v3(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_nearby_businesses_v3(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) IS 'SmartSearch v2-compatible result fields with business-provided detailed_address and city. RLS enforced.';
NOTIFY pgrst, 'reload schema';
