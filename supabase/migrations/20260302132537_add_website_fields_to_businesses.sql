-- Rename web_url to website_url if it exists, or just ensure both are there correctly
ALTER TABLE public.businesses 
DROP COLUMN IF EXISTS web_url,
DROP COLUMN IF EXISTS website;

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website_name TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;
