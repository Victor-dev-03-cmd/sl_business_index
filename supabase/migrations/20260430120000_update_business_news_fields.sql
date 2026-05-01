-- Add category, district and post_type to business_news
ALTER TABLE public.business_news 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'hiring' CHECK (post_type IN ('hiring', 'looking'));

-- Update RLS if needed (already enabled, just adding fields)
