-- Create analytics_logs table
CREATE TABLE IF NOT EXISTS public.analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'call_click', 'lead_form_submit', 'location_click')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    city TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone can insert logs
CREATE POLICY "Anyone can insert logs" ON public.analytics_logs
    FOR INSERT WITH CHECK (true);

-- 2. Vendors can view logs for their businesses
CREATE POLICY "Vendors can view logs for their businesses" ON public.analytics_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = analytics_logs.business_id
            AND b.owner_id = auth.uid()
        )
    );

-- 3. Admins can view all logs
CREATE POLICY "Admins can view all logs" ON public.analytics_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_business_id ON public.analytics_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_logs(created_at);

-- Grant permissions
GRANT ALL ON public.analytics_logs TO authenticated;
GRANT ALL ON public.analytics_logs TO anon;
GRANT ALL ON public.analytics_logs TO service_role;
