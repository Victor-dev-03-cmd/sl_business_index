-- Add BR, TIN, and SVAT fields to verifications table
ALTER TABLE public.verifications 
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS br_number TEXT,
ADD COLUMN IF NOT EXISTS tin_number TEXT,
ADD COLUMN IF NOT EXISTS svat_number TEXT;

-- Update RLS for verifications if not already restrictive
-- Assuming the current policies are:
-- 1. Users can insert their own (handled by business_id ownership check)
-- 2. Users can view their own
-- 3. Admins can view all

-- Let's ensure the BR number isn't leaked to other users
-- (This should already be covered by RLS but good to be sure)
