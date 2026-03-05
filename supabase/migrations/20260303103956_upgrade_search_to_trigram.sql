-- 1. Ensure the trigram extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Update the RPC to use similarity-based search for better matching
-- This allows "schools" to match "preschool" even if the letters aren't an exact match
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
  distance_meters DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
RETURN QUERY
SELECT
    b.id, b.name, b.category, b.description, b.address, b.phone, b.email,
    b.website_name, b.website_url, b.rating, b.reviews_count, b.image_url, b.logo_url,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude
FROM public.businesses b
WHERE
    b.status = 'approved' AND
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit)
  AND (
    search_query = ''
        -- Use % operator for trigram similarity (threshold is usually 0.3)
        OR b.name % search_query
      OR b.category % search_query
      OR b.name ILIKE '%' || search_query || '%'
      OR b.category ILIKE '%' || search_query || '%'
    )
ORDER BY
    -- Prioritize exact matches, then similarity
    (b.name ILIKE '%' || search_query || '%') DESC,
    similarity(b.name, search_query) DESC,
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
