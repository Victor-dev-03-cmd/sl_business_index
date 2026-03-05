-- Clean up website fields to match "only website_name and website_url"
ALTER TABLE public.businesses DROP COLUMN IF EXISTS web_url CASCADE;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS website CASCADE;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS website_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS website_url TEXT;
