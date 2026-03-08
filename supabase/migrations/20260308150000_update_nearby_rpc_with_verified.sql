-- 1. DROP the existing function
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision);

-- 2. CREATE the function with is_verified column
CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000
) RETURNS TABLE (
  id UUID,
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
  is_verified BOOLEAN,
  distance_meters DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  search_rank REAL
) AS $$
DECLARE
  formatted_query tsquery;
BEGIN
  IF trim(search_query) = '' THEN
    formatted_query := to_tsquery('english', '');
  ELSE
    SELECT to_tsquery('english', Array_to_string(string_to_array(trim(search_query), ' '), ':* | ') || ':*')
    INTO formatted_query;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.name, b.category, b.description, b.address, b.phone, b.email,
    b.website_name, b.website_url, b.rating, b.reviews_count, b.image_url, b.logo_url, b.is_verified,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude,
    CASE
      WHEN search_query = '' THEN 0.0::REAL
      ELSE ts_rank(b.fts, formatted_query)
    END as search_rank
  FROM public.businesses b
  WHERE
    b.status = 'approved' AND
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit)
    AND (
      search_query = ''
      OR b.fts @@ formatted_query
      OR b.name ILIKE '%' || search_query || '%'
      OR b.category ILIKE '%' || search_query || '%'
      OR b.description ILIKE '%' || search_query || '%'
    )
  ORDER BY
    search_rank DESC,
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) TO anon;
