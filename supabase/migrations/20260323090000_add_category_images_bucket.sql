-- Create storage bucket for category images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for category-images
CREATE POLICY "Public Access to category-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Admins manage category-images"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'category-images' AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
)
WITH CHECK (
    bucket_id = 'category-images' AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo')))
);
