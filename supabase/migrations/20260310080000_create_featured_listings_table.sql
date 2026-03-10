-- Create Featured Listings Table
CREATE TABLE IF NOT EXISTS public.featured_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Featured listings are public" ON public.featured_listings;
CREATE POLICY "Featured listings are public" ON public.featured_listings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage featured listings" ON public.featured_listings;
CREATE POLICY "Admins manage featured listings" ON public.featured_listings
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
    );

-- Helper to make existing 'is_featured' businesses into this table (Initial Data Migration)
INSERT INTO public.featured_listings (business_id)
SELECT id FROM public.businesses WHERE is_featured = true AND status = 'approved'
ON CONFLICT (business_id) DO NOTHING;
