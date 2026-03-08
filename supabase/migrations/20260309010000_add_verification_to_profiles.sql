-- Add verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
ADD COLUMN IF NOT EXISTS verification_image_url TEXT;

-- Create Verification Docs Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for verification-docs
-- Allow admins to see everything
CREATE POLICY "Admins can view all verification docs" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'verification-docs' AND 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
);

-- Allow users to see their own docs
CREATE POLICY "Users can view own verification docs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'verification-docs' AND auth.uid() = owner);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload verification docs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'verification-docs' AND auth.role() = 'authenticated');

-- Allow users to delete their own
CREATE POLICY "Users can delete own verification docs" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
