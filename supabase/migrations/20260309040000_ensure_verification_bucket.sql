-- Ensure the verification-docs bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add policies for the verification-docs bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Admins can view all verification docs'
    ) THEN
        CREATE POLICY "Admins can view all verification docs"
        ON storage.objects FOR SELECT
        USING (
          bucket_id = 'verification-docs' AND
          (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Users can view own verification docs'
    ) THEN
        CREATE POLICY "Users can view own verification docs"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Authenticated users can upload verification docs'
    ) THEN
        CREATE POLICY "Authenticated users can upload verification docs"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'verification-docs' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Users can delete own verification docs'
    ) THEN
        CREATE POLICY "Users can delete own verification docs"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
    END IF;
END $$;
