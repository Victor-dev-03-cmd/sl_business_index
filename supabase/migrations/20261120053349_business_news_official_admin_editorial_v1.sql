-- Separate official editorial publications from verified vendor dispatches.
-- Only the SL Business Index official admin account can publish these records.
ALTER TABLE public.business_news
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_news
  DROP CONSTRAINT IF EXISTS business_news_official_publication_shape;
ALTER TABLE public.business_news
  ADD CONSTRAINT business_news_official_publication_shape
  CHECK (NOT is_official OR (business_id IS NULL AND post_type = 'news'));

DROP POLICY IF EXISTS "Verified owners can publish news" ON public.business_news;
CREATE POLICY "Verified owners can publish news" ON public.business_news
FOR INSERT TO authenticated WITH CHECK (
  is_official IS FALSE
  AND owner_id = (select auth.uid())
  AND business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.owner_id = (select auth.uid())
      AND b.is_verified IS TRUE AND b.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Owners can edit own news" ON public.business_news;
CREATE POLICY "Owners can edit own news" ON public.business_news
FOR UPDATE TO authenticated
USING (is_official IS FALSE AND owner_id = (select auth.uid()))
WITH CHECK (
  is_official IS FALSE AND owner_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.owner_id = (select auth.uid())
      AND b.is_verified IS TRUE AND b.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Owners can remove own news" ON public.business_news;
CREATE POLICY "Owners can remove own news" ON public.business_news
FOR DELETE TO authenticated USING (
  is_official IS FALSE AND owner_id = (select auth.uid())
);

-- Require BOTH verified admin role in database and the exact official account.
-- The signed, server-verified JWT email is not user_metadata.
DROP POLICY IF EXISTS "Official SLBI admin can publish news" ON public.business_news;
CREATE POLICY "Official SLBI admin can publish news" ON public.business_news
FOR INSERT TO authenticated WITH CHECK (
  is_official IS TRUE
  AND business_id IS NULL
  AND owner_id = (select auth.uid())
  AND lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'slbusinessindex@gmail.com'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid()) AND p.role::text = 'admin'
  )
);
DROP POLICY IF EXISTS "Official SLBI admin can edit news" ON public.business_news;
CREATE POLICY "Official SLBI admin can edit news" ON public.business_news
FOR UPDATE TO authenticated
USING (
  is_official IS TRUE AND owner_id = (select auth.uid())
  AND lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'slbusinessindex@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = (select auth.uid()) AND p.role::text = 'admin')
)
WITH CHECK (
  is_official IS TRUE AND business_id IS NULL AND owner_id = (select auth.uid())
  AND lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'slbusinessindex@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = (select auth.uid()) AND p.role::text = 'admin')
);
DROP POLICY IF EXISTS "Official SLBI admin can delete news" ON public.business_news;
CREATE POLICY "Official SLBI admin can delete news" ON public.business_news
FOR DELETE TO authenticated USING (
  is_official IS TRUE AND owner_id = (select auth.uid())
  AND lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'slbusinessindex@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = (select auth.uid()) AND p.role::text = 'admin')
);

-- Correct the existing notification trigger for official news (no business_id).
CREATE OR REPLACE FUNCTION public.notify_all_on_business_news()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  account record;
  publication_name text;
BEGIN
  IF NEW.is_official THEN
    publication_name := 'SL Business Index Admin';
  ELSE
    SELECT b.name INTO publication_name FROM public.businesses b WHERE b.id = NEW.business_id;
  END IF;
  FOR account IN SELECT p.id FROM public.profiles p LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      account.id,
      'New Business Update: ' || coalesce(publication_name, 'Business News'),
      left(NEW.content, 1200),
      'info'
    );
  END LOOP;
  RETURN NEW;
END;
$$;
NOTIFY pgrst, 'reload schema';