-- Create a global search suggestions RPC
-- This will return business names, IDs, slugs, and categories for autocomplete
CREATE OR REPLACE FUNCTION get_global_search_suggestions (
  search_query TEXT,
  suggestion_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  category TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  logo_url TEXT
) AS $$
BEGIN
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
    b.status = 'approved' AND (
      b.name ILIKE '%' || search_query || '%' OR
      b.category ILIKE '%' || search_query || '%' OR
      b.address ILIKE '%' || search_query || '%' OR
      b.city ILIKE '%' || search_query || '%'
    )
  ORDER BY
    CASE
      WHEN b.name ILIKE search_query || '%' THEN 1
      WHEN b.name ILIKE '%' || search_query || '%' THEN 2
      ELSE 3
    END,
    b.name ASC
  LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_global_search_suggestions(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_search_suggestions(TEXT, INTEGER) TO anon;
