-- Migration: Standardize and update RLS policies for businesses table
-- Description: Consolidates admin management, public view for approved businesses, and owner actions.

-- First, drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Approved businesses public" ON public.businesses;
DROP POLICY IF EXISTS "Owners view own" ON public.businesses;
DROP POLICY IF EXISTS "Owners insert" ON public.businesses;
DROP POLICY IF EXISTS "Owners update" ON public.businesses;
DROP POLICY IF EXISTS "Admins manage all" ON public.businesses;
DROP POLICY IF EXISTS "Admins can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Temporary Public View" ON public.businesses;

-- 1. Admins can manage all businesses
CREATE POLICY "Admins can manage all businesses" ON public.businesses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'ceo')
  )
);

-- 2. Approved businesses are public
CREATE POLICY "Approved businesses public" ON public.businesses
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- 3. Owners can insert their own businesses
CREATE POLICY "Owners insert" ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- 4. Owners can update their own businesses
CREATE POLICY "Owners update" ON public.businesses
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 5. Owners can view their own businesses (including pending/rejected)
CREATE POLICY "Owners view own" ON public.businesses
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- 6. Temporary Public View (Allowing public to see all businesses if needed, but strictly for SELECT)
-- Note: This is currently redundant if "Approved businesses public" is the main one, 
-- but added as requested by the user.
CREATE POLICY "Temporary Public View" ON public.businesses
FOR SELECT
TO anon, authenticated
USING (true);
