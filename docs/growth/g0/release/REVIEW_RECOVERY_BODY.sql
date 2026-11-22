-- Remove ONLY G0 triggers/functions. Keep correctly derived ratings and review rows.
-- Review later dependencies and use a NEW migration. Never CASCADE.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DROP TRIGGER IF EXISTS slbi_growth_review_cache_refresh ON public.reviews;
DROP TRIGGER IF EXISTS slbi_growth_review_cache_guard ON public.businesses;
DROP FUNCTION IF EXISTS slbi_growth_internal.refresh_review_cache();
DROP FUNCTION IF EXISTS slbi_growth_internal.canonical_review_cache();
DROP SCHEMA IF EXISTS slbi_growth_internal;
