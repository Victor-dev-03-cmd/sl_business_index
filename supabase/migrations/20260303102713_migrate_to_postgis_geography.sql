-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Modify the location column to use Geography type
ALTER TABLE public.businesses
ALTER COLUMN location TYPE geography(POINT, 4326)
USING location::geography;

-- 3. Re-create the spatial index
DROP INDEX IF EXISTS idx_businesses_location_gist;
CREATE INDEX idx_businesses_location_gist ON public.businesses USING gist(location);

-- 4. DROP the existing function first to change the return signature safely
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision);

-- 5. Create the updated function with full return structure for frontend compatibility
CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit_meters DOUBLE PRECISION DEFAULT 5000
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
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit_meters)
  AND (
    search_query = ''
        OR b.name ILIKE '%' || search_query || '%'
      OR b.category ILIKE '%' || search_query || '%'
    )
ORDER BY b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
