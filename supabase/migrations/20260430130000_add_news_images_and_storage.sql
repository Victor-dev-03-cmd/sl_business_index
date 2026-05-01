-- Add images column to business_news
ALTER TABLE public.business_news 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Create Storage Bucket for News Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "News images are public" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can upload news images" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'news-images' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own news images" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'news-images' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);
