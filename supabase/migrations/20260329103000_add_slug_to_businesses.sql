-- Migration: Add slug column to businesses table if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='slug') THEN
    ALTER TABLE businesses ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name TEXT, business_id UUID) 
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  -- Basic slugify: lowercase, replace non-alphanumeric with hyphen, trim hyphens
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  
  -- If empty name or all special chars
  IF base_slug = '' THEN
    base_slug := 'business';
  END IF;

  -- Append short ID to ensure uniqueness across all records during migration
  final_slug := base_slug || '-' || substring(business_id::text, 1, 8);
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing businesses
UPDATE businesses SET slug = generate_business_slug(name, id) WHERE slug IS NULL;

-- Create an index for faster slug-based lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (slug);

-- Update get_nearby_businesses RPC to include slug
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision);

CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000
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
BEGIN
  IF trim(search_query) = '' THEN
    formatted_query := to_tsquery('english', '');
  ELSE
    SELECT to_tsquery('english', Array_to_string(string_to_array(trim(search_query), ' '), ':* | ') || ':*')
    INTO formatted_query;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.slug, b.name, b.category, b.description, b.address, b.phone,
    b.website_name, b.website_url, b.rating, b.reviews_count, b.image_url, b.logo_url,
    p.verification_status,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude,
    CASE
      WHEN search_query = '' THEN 0.0::REAL
      ELSE ts_rank(b.fts, formatted_query)
    END as search_rank,
    b.can_show_badge
  FROM public.businesses b
  LEFT JOIN public.profiles p ON b.owner_id = p.id
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
