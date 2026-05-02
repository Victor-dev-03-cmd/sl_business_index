-- Update businesses status enum check to include 'active', 'inactive', 'under_investigation'
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_status_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'active', 'inactive', 'under_investigation'));

-- Add moderation_status to verifications
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
