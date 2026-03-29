-- Unify get_nearby_businesses RPC by dropping all previous versions and creating a single robust one
-- Dropping versions with 4 and 5 parameters to avoid ambiguity
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision);
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision, text);

CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000,
  category_filter TEXT DEFAULT ''
) RETURNS TABLE (
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
  can_show_badge BOOLEAN
) AS $$
DECLARE
  formatted_query tsquery;
  clean_category TEXT;
  clean_search TEXT;
BEGIN
  clean_category := trim(COALESCE(category_filter, ''));
  clean_search := trim(COALESCE(search_query, ''));

  IF clean_search = '' THEN
    formatted_query := NULL;
  ELSE
    -- Improved query formatting: handles multiple words with prefix matching and OR logic
    SELECT to_tsquery('english', Array_to_string(string_to_array(clean_search, ' '), ':* | ') || ':*')
    INTO formatted_query;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.slug, b.name, b.category, b.description, b.address, b.phone, b.email,
    b.website_name, b.website_url, b.rating, b.reviews_count, b.image_url, b.logo_url,
    p.verification_status,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude,
    CASE
      WHEN clean_search = '' THEN 0.0::REAL
      ELSE ts_rank(b.fts, formatted_query)
    END as search_rank,
    COALESCE(b.can_show_badge, false) as can_show_badge
  FROM public.businesses b
  LEFT JOIN public.profiles p ON b.owner_id = p.id
  WHERE
    b.status = 'approved' AND
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit)
    AND (
      clean_category = ''
      OR b.category ILIKE clean_category
    )
    AND (
      clean_search = ''
      OR (formatted_query IS NOT NULL AND b.fts @@ formatted_query)
      OR b.name ILIKE '%' || clean_search || '%'
      OR b.category ILIKE '%' || clean_search || '%'
      OR b.description ILIKE '%' || clean_search || '%'
    )
  ORDER BY
    search_rank DESC,
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT) TO anon;
