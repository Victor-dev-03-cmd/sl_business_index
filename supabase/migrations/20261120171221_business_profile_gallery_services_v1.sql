CREATE TABLE public.business_profile_content (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
 services text[] NOT NULL DEFAULT '{}',
 gallery_paths text[] NOT NULL DEFAULT '{}',
 CONSTRAINT business_profile_services_limit CHECK(cardinality(services)<=10 AND array_position(services,NULL) IS NULL AND length(array_to_string(services,','))<=1009),
 CONSTRAINT business_profile_gallery_limit CHECK(cardinality(gallery_paths)<=12 AND array_position(gallery_paths,NULL) IS NULL AND (cardinality(gallery_paths)=0 OR array_to_string(gallery_paths,',') ~ ('^('||business_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp))(,'||business_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp))*$')))
);
ALTER TABLE public.business_profile_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_profile_content FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.business_profile_content TO anon,authenticated;
GRANT INSERT,UPDATE ON public.business_profile_content TO authenticated;
GRANT ALL ON public.business_profile_content TO service_role;
CREATE POLICY "profile content public approved or owner" ON public.business_profile_content FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id AND (b.status='approved' OR b.owner_id=(SELECT auth.uid()))));
CREATE POLICY "profile content owner insert" ON public.business_profile_content FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id AND b.owner_id=(SELECT auth.uid())));
CREATE POLICY "profile content owner update" ON public.business_profile_content FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id AND b.owner_id=(SELECT auth.uid()))) WITH CHECK(EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id AND b.owner_id=(SELECT auth.uid())));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('business-gallery','business-gallery',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY "business gallery owner upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='business-gallery' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id::text=split_part(name,'/',1) AND b.owner_id=(SELECT auth.uid())));
CREATE POLICY "business gallery owner select" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='business-gallery' AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id::text=split_part(name,'/',1) AND b.owner_id=(SELECT auth.uid())));
CREATE POLICY "business gallery owner delete" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='business-gallery' AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id::text=split_part(name,'/',1) AND b.owner_id=(SELECT auth.uid())));
NOTIFY pgrst,'reload schema';
