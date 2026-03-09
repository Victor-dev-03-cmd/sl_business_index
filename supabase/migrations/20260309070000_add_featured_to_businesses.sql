-- Add is_featured column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
