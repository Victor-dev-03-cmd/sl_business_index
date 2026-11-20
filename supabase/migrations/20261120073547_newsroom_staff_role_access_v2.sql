-- Use protected database staff role for newsroom authorization; no business
-- ownership or hard-coded email is necessary. Keep vendor RLS unchanged.
DROP POLICY IF EXISTS "Official SLBI admin can publish news" ON public.business_news;
CREATE POLICY "Official SLBI admin can publish news" ON public.business_news FOR INSERT TO authenticated
WITH CHECK (
  is_official IS TRUE AND business_id IS NULL AND owner_id = (select auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.role::text IN ('admin','ceo'))
);
DROP POLICY IF EXISTS "Official SLBI admin can edit news" ON public.business_news;
CREATE POLICY "Official SLBI admin can edit news" ON public.business_news FOR UPDATE TO authenticated
USING (is_official IS TRUE AND owner_id=(select auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.role::text IN ('admin','ceo')))
WITH CHECK (is_official IS TRUE AND business_id IS NULL AND owner_id=(select auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.role::text IN ('admin','ceo')));
DROP POLICY IF EXISTS "Official SLBI admin can delete news" ON public.business_news;
CREATE POLICY "Official SLBI admin can delete news" ON public.business_news FOR DELETE TO authenticated
USING (is_official IS TRUE AND owner_id=(select auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.role::text IN ('admin','ceo')));
DROP POLICY IF EXISTS "Authorized publishers upload their own news images" ON storage.objects;
CREATE POLICY "Authorized publishers upload their own news images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='news-images' AND (storage.foldername(name))[1]='posts'
  AND (storage.foldername(name))[2]=(select auth.uid())::text
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.role::text IN ('admin','ceo'))
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id=(select auth.uid()) AND b.is_verified IS TRUE AND b.status='approved')
  ));
NOTIFY pgrst,'reload schema';
