-- SLBI SmartSearch v1.0.0 — additive RPC. Existing get_nearby_businesses stays unchanged.
-- Candidate retrieval is guarded by approved status and PostGIS radius, and uses
-- RLS/security invoker rather than introducing another public SECURITY DEFINER.
-- No new tables, paid Elasticsearch service, or proprietary external API.

CREATE OR REPLACE FUNCTION public.get_nearby_businesses_v2(
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
  lexical_rank REAL
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  WITH request AS (
    SELECT
      LEFT(LOWER(TRIM(COALESCE(search_query, ''))), 100) AS keyword,
      websearch_to_tsquery('english', LEFT(COALESCE(search_query, ''), 100)) AS query_fts,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography AS origin,
      LEAST(500000.0, GREATEST(1000.0, COALESCE(dist_limit, 5000))) AS radius,
      ARRAY(SELECT LOWER(TRIM(cat)) FROM UNNEST(COALESCE(filter_categories, ARRAY[]::TEXT[])) cat) AS strict_categories,
      ARRAY(SELECT LOWER(TRIM(cat)) FROM UNNEST(COALESCE(related_categories, ARRAY[]::TEXT[])) cat) AS suggested_categories
  ),
  candidates AS (
    SELECT
      b.id, b.slug, b.name, b.category, b.description, b.address,
      b.phone, b.email, b.website_name, b.website_url,
      b.rating, b.reviews_count, b.image_url, b.logo_url,
      p.verification_status AS owner_verification,
      ST_Distance(b.location, req.origin)::DOUBLE PRECISION AS distance_meters,
      ST_Y(b.location::geometry)::DOUBLE PRECISION AS latitude,
      ST_X(b.location::geometry)::DOUBLE PRECISION AS longitude,
      COALESCE(b.can_show_badge, FALSE) AS can_show_badge,
      GREATEST(
        COALESCE(similarity(LOWER(b.name), req.keyword), 0),
        COALESCE(similarity(LOWER(b.category), req.keyword), 0),
        COALESCE(ts_rank_cd(b.fts, req.query_fts), 0)
      ) AS lexical_score,
      CASE
        WHEN req.keyword = '' THEN 'nearby'
        WHEN LOWER(b.name) LIKE '%' || req.keyword || '%'
          OR LOWER(COALESCE(b.description,'')) LIKE '%' || req.keyword || '%'
          THEN 'exact_service'
        WHEN LOWER(b.category) = ANY(req.suggested_categories) AND specific_service
          THEN 'category_related'
        WHEN LOWER(b.category) = ANY(req.suggested_categories)
          THEN 'category'
        ELSE 'lexical'
      END AS matched_as,
      req.keyword AS keyword
    FROM public.businesses AS b
    CROSS JOIN request AS req
    LEFT JOIN public.profiles AS p ON p.id = b.owner_id
    WHERE b.status = 'approved'
      AND b.location IS NOT NULL
      AND ST_DWithin(b.location, req.origin, req.radius)
      AND (
        CARDINALITY(req.strict_categories) = 0
        OR LOWER(b.category) = ANY(req.strict_categories)
      )
      AND (
        req.keyword = ''
        OR LOWER(b.name) LIKE '%' || req.keyword || '%'
        OR LOWER(b.category) LIKE '%' || req.keyword || '%'
        OR LOWER(COALESCE(b.description, '')) LIKE '%' || req.keyword || '%'
        OR b.fts @@ req.query_fts
        OR LOWER(b.name) % req.keyword
        OR LOWER(b.category) % req.keyword
        OR LOWER(b.category) = ANY(req.suggested_categories)
      )
  )
  SELECT
    c.id, c.slug, c.name, c.category, c.description, c.address,
    c.phone, c.email, c.website_name, c.website_url,
    c.rating, c.reviews_count, c.image_url, c.logo_url,
    c.owner_verification,
    c.distance_meters, c.latitude, c.longitude,
    LEAST(1.0, CASE
      WHEN c.matched_as = 'exact_service' THEN GREATEST(0.90, c.lexical_score)
      WHEN c.matched_as = 'category' THEN GREATEST(0.72, c.lexical_score)
      WHEN c.matched_as = 'category_related' THEN LEAST(0.48, 0.32 + c.lexical_score * 0.20)
      ELSE c.lexical_score
    END)::REAL AS search_rank,
    c.can_show_badge,
    c.matched_as AS match_type,
    LEAST(1.0, c.lexical_score)::REAL AS lexical_rank
  FROM candidates c
  ORDER BY
    CASE c.matched_as
      WHEN 'exact_service' THEN 0 WHEN 'category' THEN 1
      WHEN 'lexical' THEN 2 WHEN 'category_related' THEN 3
      ELSE 4
    END,
    c.lexical_score DESC,
    c.distance_meters ASC
  LIMIT 250;
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_businesses_v2(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_businesses_v2(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_nearby_businesses_v2(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], BOOLEAN
) IS 'SLBI SmartSearch 1.0.0. Approved, geofenced public business candidates; explicit vs related service evidence, PostgreSQL FTS/trigram retrieval. No external search cluster.';
