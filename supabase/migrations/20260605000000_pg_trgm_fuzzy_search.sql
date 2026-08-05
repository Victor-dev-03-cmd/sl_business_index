-- ─────────────────────────────────────────────────────────────────────────────
-- Fuzzy search upgrade: pg_trgm GIN indexes + updated RPCs
-- Both get_nearby_businesses and get_global_search_suggestions now use
-- trigram similarity so typos like "Colobo Cafe" match "Colombo Cafe".
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure extension is enabled (safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN indexes for trigram similarity on the columns we search most
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
  ON public.businesses USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_category_trgm
  ON public.businesses USING gin (category gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_city_trgm
  ON public.businesses USING gin (city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_address_trgm
  ON public.businesses USING gin (address gin_trgm_ops);

-- 3. Set similarity threshold — 0.2 is permissive enough for short Sri Lankan
--    place names while still filtering out pure garbage
SET pg_trgm.similarity_threshold = 0.2;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Upgrade get_nearby_businesses
--    Search ranking:  trigram similarity (typo-tolerant) > ILIKE prefix > distance
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_nearby_businesses(double precision, double precision, text, double precision, text);

CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat       DOUBLE PRECISION,
  user_lng       DOUBLE PRECISION,
  search_query   TEXT    DEFAULT '',
  dist_limit     DOUBLE PRECISION DEFAULT 5000,
  category_filter TEXT   DEFAULT ''
) RETURNS TABLE (
  id                 UUID,
  slug               TEXT,
  name               TEXT,
  category           TEXT,
  description        TEXT,
  address            TEXT,
  phone              TEXT,
  email              TEXT,
  website_name       TEXT,
  website_url        TEXT,
  rating             NUMERIC,
  reviews_count      INTEGER,
  image_url          TEXT,
  logo_url           TEXT,
  verification_status TEXT,
  distance_meters    DOUBLE PRECISION,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  search_rank        REAL,
  can_show_badge     BOOLEAN
) AS $$
DECLARE
  clean_search   TEXT;
  clean_category TEXT;
BEGIN
  clean_search   := lower(trim(COALESCE(search_query, '')));
  clean_category := trim(COALESCE(category_filter, ''));

  RETURN QUERY
  SELECT
    b.id,
    b.slug,
    b.name,
    b.category,
    b.description,
    b.address,
    b.phone,
    b.email,
    b.website_name,
    b.website_url,
    b.rating,
    b.reviews_count,
    b.image_url,
    b.logo_url,
    p.verification_status,
    st_distance(
      b.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
    )::DOUBLE PRECISION AS distance_meters,
    st_y(b.location::geometry)::DOUBLE PRECISION AS latitude,
    st_x(b.location::geometry)::DOUBLE PRECISION AS longitude,
    -- search_rank: best trigram score across name / category / description
    CASE
      WHEN clean_search = '' THEN 0.0::REAL
      ELSE GREATEST(
        similarity(lower(b.name),        clean_search),
        similarity(lower(b.category),    clean_search),
        similarity(lower(COALESCE(b.description, '')), clean_search)
      )
    END::REAL AS search_rank,
    COALESCE(b.can_show_badge, false) AS can_show_badge
  FROM public.businesses b
  LEFT JOIN public.profiles p ON b.owner_id = p.id
  WHERE
    b.status = 'approved'
    AND st_dwithin(
      b.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      dist_limit
    )
    AND (
      clean_category = ''
      OR lower(b.category) = lower(clean_category)
      OR b.category ILIKE '%' || clean_category || '%'
    )
    AND (
      clean_search = ''
      -- Trigram similarity match (handles typos, e.g. "Colobo" → "Colombo")
      OR b.name        % clean_search
      OR b.category    % clean_search
      -- ILIKE fallback for short queries that may not reach trigram threshold
      OR lower(b.name)        LIKE '%' || clean_search || '%'
      OR lower(b.category)    LIKE '%' || clean_search || '%'
      OR lower(COALESCE(b.description, '')) LIKE '%' || clean_search || '%'
    )
  ORDER BY
    -- Exact/prefix matches first, then fuzzy, then distance
    (lower(b.name) LIKE clean_search || '%')      DESC,
    (lower(b.name) LIKE '%' || clean_search || '%') DESC,
    search_rank                                     DESC,
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT)
  TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Upgrade get_global_search_suggestions
--    Used by HomeScreen autocomplete — must be fast and typo-tolerant
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_global_search_suggestions (
  search_query     TEXT,
  suggestion_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id         UUID,
  slug       TEXT,
  name       TEXT,
  category   TEXT,
  address    TEXT,
  latitude   DOUBLE PRECISION,
  longitude  DOUBLE PRECISION,
  logo_url   TEXT
) AS $$
DECLARE
  clean_search TEXT;
BEGIN
  clean_search := lower(trim(search_query));

  RETURN QUERY
  SELECT
    b.id,
    b.slug,
    b.name,
    b.category,
    b.address,
    b.latitude,
    b.longitude,
    b.logo_url
  FROM public.businesses b
  WHERE
    b.status = 'approved'
    AND (
      b.name     % clean_search
      OR b.city  % clean_search
      OR lower(b.name)    LIKE '%' || clean_search || '%'
      OR lower(b.city)    LIKE '%' || clean_search || '%'
      OR lower(b.address) LIKE '%' || clean_search || '%'
    )
  ORDER BY
    -- Prefix match first, then trigram score, then alphabetical
    (lower(b.name) LIKE clean_search || '%')         DESC,
    similarity(lower(b.name), clean_search)          DESC,
    b.name                                           ASC
  LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_global_search_suggestions(TEXT, INTEGER)
  TO authenticated, anon;
