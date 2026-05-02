-- Add audit trail fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_remarks TEXT;

-- Update RLS for businesses to allow admins to update these fields (already covered by "Admins manage all" policy)
