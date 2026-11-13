\set ON_ERROR_STOP on
-- Synthetic schema matching the existing production marketing_campaigns shape.
CREATE TABLE public.marketing_campaigns(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id),
  banner_text text NOT NULL,
  banner_color text NOT NULL,
  platforms text[] DEFAULT ARRAY[]::text[],
  scheduled_at timestamptz,
  status text DEFAULT 'drafted',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own campaigns" ON public.marketing_campaigns
 FOR ALL TO authenticated
 USING(EXISTS (SELECT 1 FROM public.businesses b
 WHERE b.id=business_id AND b.owner_id=auth.uid()));
GRANT ALL ON public.marketing_campaigns TO authenticated;
INSERT INTO public.marketing_campaigns(
 id,business_id,banner_text,banner_color,platforms,status
) VALUES (
 '33333333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111',
 'Existing historic record with unverified publishing state',
 '#FF7900',ARRAY['facebook'],'posted'
);
