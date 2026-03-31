-- Create testimonials storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('testimonials', 'testimonials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Testimonials Storage Policies
DO $$
BEGIN
    -- Public read access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Testimonial images are public'
    ) THEN
        CREATE POLICY "Testimonial images are public" ON storage.objects
        FOR SELECT USING (bucket_id = 'testimonials');
    END IF;

    -- Admin manage access (Insert)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Admins can upload testimonial images'
    ) THEN
        CREATE POLICY "Admins can upload testimonial images" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'testimonials' AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND (role = 'admin' OR role = 'ceo')
                )
            )
        );
    END IF;

    -- Admin manage access (Update)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Admins can update testimonial images'
    ) THEN
        CREATE POLICY "Admins can update testimonial images" ON storage.objects
        FOR UPDATE USING (
            bucket_id = 'testimonials' AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND (role = 'admin' OR role = 'ceo')
                )
            )
        );
    END IF;

    -- Admin manage access (Delete)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Admins can delete testimonial images'
    ) THEN
        CREATE POLICY "Admins can delete testimonial images" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'testimonials' AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND (role = 'admin' OR role = 'ceo')
                )
            )
        );
    END IF;
END $$;
