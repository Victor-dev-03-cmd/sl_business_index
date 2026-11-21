ALTER POLICY "business gallery owner upload" ON storage.objects TO authenticated WITH CHECK (
  bucket_id = 'business-gallery'
  AND storage.objects.name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = split_part(storage.objects.name, '/', 1)
      AND b.owner_id = (SELECT auth.uid())
  )
);
ALTER POLICY "business gallery owner select" ON storage.objects TO authenticated USING (
  bucket_id = 'business-gallery'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = split_part(storage.objects.name, '/', 1)
      AND b.owner_id = (SELECT auth.uid())
  )
);
ALTER POLICY "business gallery owner delete" ON storage.objects TO authenticated USING (
  bucket_id = 'business-gallery'
  AND EXISTS (
    SELECT 1 FROM public.businesses AS b
    WHERE b.id::text = split_part(storage.objects.name, '/', 1)
      AND b.owner_id = (SELECT auth.uid())
  )
);
