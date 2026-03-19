-- 1. Create Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    social_platforms TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- 3. Promotions Policies
CREATE POLICY "Vendors manage own promotions" ON public.promotions FOR ALL USING (
    auth.uid() = vendor_id
);

CREATE POLICY "Admins can view all promotions" ON public.promotions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "Admins can update all promotions" ON public.promotions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- 4. Create Promotions Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage Policies for Promotions Bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Anyone can view promotions'
    ) THEN
        CREATE POLICY "Anyone can view promotions"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'promotions');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Authenticated users can upload promotions'
    ) THEN
        CREATE POLICY "Authenticated users can upload promotions"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'promotions' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND policyname = 'Users can delete own promotions'
    ) THEN
        CREATE POLICY "Users can delete own promotions"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'promotions' AND auth.uid() = owner);
    END IF;
END $$;

GRANT ALL ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
