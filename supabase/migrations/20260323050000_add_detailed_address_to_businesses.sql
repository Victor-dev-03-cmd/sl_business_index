-- Add detailed_address column to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS detailed_address TEXT;
