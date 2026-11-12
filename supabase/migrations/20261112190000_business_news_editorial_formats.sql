-- SL Business Journal: additive editorial formats with verified business-owner publishing.
-- Existing hiring/looking posts remain readable and default to a brief format.
ALTER TABLE public.business_news
  ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'brief';

ALTER TABLE public.business_news
  DROP CONSTRAINT IF EXISTS business_news_post_type_check;
ALTER TABLE public.business_news
  ADD CONSTRAINT business_news_post_type_check
  CHECK (post_type IN ('news', 'hiring', 'looking'));

ALTER TABLE public.business_news
  DROP CONSTRAINT IF EXISTS business_news_content_format_check;
ALTER TABLE public.business_news
  ADD CONSTRAINT business_news_content_format_check
  CHECK (content_format IN ('article', 'poster', 'brief'));

-- An ALL-policy previously allowed its ownership predicate to satisfy INSERT
-- even when the verified-owner policy was false (permissive RLS OR semantics).
-- Explicit operation-scoped policies ensure verification is actually required.
DROP POLICY IF EXISTS "Owners can update/delete own news" ON public.business_news;
DROP POLICY IF EXISTS "Verified owners can post news" ON public.business_news;
DROP POLICY IF EXISTS "Verified owners can publish news" ON public.business_news;
DROP POLICY IF EXISTS "Owners can edit own news" ON public.business_news;
DROP POLICY IF EXISTS "Owners can remove own news" ON public.business_news;

CREATE POLICY "Verified owners can publish news" ON public.business_news
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
        AND b.is_verified IS TRUE AND b.status = 'approved'
    )
  );

CREATE POLICY "Owners can edit own news" ON public.business_news
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id
        AND b.owner_id = (SELECT auth.uid())
        AND b.is_verified IS TRUE AND b.status = 'approved'
    )
  );

CREATE POLICY "Owners can remove own news" ON public.business_news
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

COMMENT ON COLUMN public.business_news.content_format IS
  'Editor-selected layout: article (long-form blog), poster (image-led), brief (short business bulletin).';

NOTIFY pgrst, 'reload schema';
