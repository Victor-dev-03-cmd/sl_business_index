-- Ensure business-logos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Admins manage business-logos" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access to business-logos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload to business-logos" ON storage.objects;
END $$;

-- 1. Allow public access to business-logos
CREATE POLICY "Public Access to business-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- 2. Allow authenticated users to upload to business-logos
CREATE POLICY "Authenticated Upload to business-logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- 3. Allow admins to manage all objects in business-logos
CREATE POLICY "Admins manage business-logos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'business-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
)
WITH CHECK (
    bucket_id = 'business-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
);

-- Ensure site_settings table has correct RLS policies for admins
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage settings" ON public.site_settings;
    DROP POLICY IF EXISTS "Settings public view" ON public.site_settings;
END $$;

CREATE POLICY "Settings public view" ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'ceo')
);
