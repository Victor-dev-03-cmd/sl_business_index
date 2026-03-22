-- Simplify and fix storage policies for business-logos
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access to business-logos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload to business-logos" ON storage.objects;
    DROP POLICY IF EXISTS "Admins manage business-logos" ON storage.objects;
END $$;

-- 1. Public can read logos
CREATE POLICY "Public Access to business-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- 2. Authenticated users can insert (upload)
CREATE POLICY "Authenticated Upload to business-logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-logos');

-- 3. Admins can do anything (Update/Delete needed for upsert)
CREATE POLICY "Admins manage business-logos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'business-logos' AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
)
WITH CHECK (
    bucket_id = 'business-logos' AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
);

-- Ensure site_settings row 1 exists and has correct permissions
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Fix site_settings policies to be more robust
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage settings" ON public.site_settings;
    DROP POLICY IF EXISTS "Settings public view" ON public.site_settings;
END $$;

CREATE POLICY "Settings public view" ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);
