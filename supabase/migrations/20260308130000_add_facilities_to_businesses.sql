-- Add facilities to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}';

-- Create table for tracking business views if not exists
CREATE TABLE IF NOT EXISTS public.business_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Policy for viewing views (admin only)
ALTER TABLE public.business_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view business views" ON public.business_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);
CREATE POLICY "Anyone can insert business views" ON public.business_views FOR INSERT WITH CHECK (true);
