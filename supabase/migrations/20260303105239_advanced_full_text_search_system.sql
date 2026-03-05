-- 1. Create a dedicated Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
                                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
    );

-- 2. Add Full-Text Search Vector to Businesses
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(address, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_businesses_fts ON public.businesses USING gin(fts);

-- 3. DROP the existing function first to change the return signature safely
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision);

-- 4. Re-create the Advanced Search RPC with search_rank included
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
  longitude DOUBLE PRECISION,
  search_rank REAL
) AS $$
DECLARE
query_tokens text;
BEGIN
  -- Handle empty or single word queries safely
  IF trim(search_query) = '' THEN
    query_tokens := '';
ELSE
    -- Format for tsquery (e.g. 'jaffna computer' -> 'jaffna & computer')
    query_tokens := array_to_string(string_to_array(trim(search_query), ' '), ' & ') || ':*';
END IF;

RETURN QUERY
SELECT
    b.id, b.name, b.category, b.description, b.address, b.phone, b.email,
    b.website_name, b.website_url, b.rating, b.reviews_count, b.image_url, b.logo_url,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude,
    CASE
        WHEN query_tokens = '' THEN 0.0::REAL
      ELSE ts_rank(b.fts, to_tsquery('english', query_tokens))
END as search_rank
  FROM public.businesses b
  WHERE
    b.status = 'approved' AND
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit)
    AND (
      search_query = ''
      OR (query_tokens != '' AND b.fts @@ to_tsquery('english', query_tokens))
      OR b.name ILIKE '%' || search_query || '%'
      OR b.category ILIKE '%' || search_query || '%'
    )
  ORDER BY
    search_rank DESC,
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_nearby_businesses TO anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_businesses TO authenticated;

-- 5. Seed initial data
INSERT INTO public.categories (name, keywords) VALUES
                                                   ('Technology & IT', ARRAY['computer', 'pc', 'laptop', 'repairing', 'software', 'hardware', 'shop']),
                                                   ('Hospitality & Leisure', ARRAY['hotel', 'villa', 'rooms', 'stay', 'resort', 'tourism']),
                                                   ('Health & Wellness', ARRAY['doctor', 'clinic', 'medical', 'pharmacy', 'hospital', 'care'])
    ON CONFLICT (name) DO NOTHING;
