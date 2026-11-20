-- Keep publisher image uploads owner-scoped. The prior policy allowed any
-- authenticated user to upload to the public news bucket.
DROP POLICY IF EXISTS "Authenticated users can upload news images" ON storage.objects;
CREATE POLICY "Authorized publishers upload their own news images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'news-images'
  AND (storage.foldername(name))[1] = 'posts'
  AND (storage.foldername(name))[2] = (select auth.uid())::text
  AND (
    (
      lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'slbusinessindex@gmail.com'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid()) AND p.role::text = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = (select auth.uid())
        AND b.is_verified IS TRUE AND b.status = 'approved'
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own news images" ON storage.objects;
CREATE POLICY "News publishers delete their own uploaded images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'news-images'
  AND (storage.foldername(name))[1] = 'posts'
  AND (storage.foldername(name))[2] = (select auth.uid())::text
);

NOTIFY pgrst, 'reload schema';