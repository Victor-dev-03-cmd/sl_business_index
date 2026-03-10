-- Create Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    price_yearly INTEGER NOT NULL DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    discount_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Announcements Table (Global Notifications)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'promotion'
    target_role TEXT DEFAULT 'all', -- 'all', 'vendor', 'customer'
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ DEFAULT now(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies for Subscription Plans
CREATE POLICY "Plans are public viewable" ON public.subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Admins manage plans" ON public.subscription_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
    );

-- Policies for Announcements
CREATE POLICY "Announcements are public viewable" ON public.announcements
    FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
    );

-- Insert Default Plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features)
VALUES 
('Basic', 'Essential tools for small businesses', 0, 0, ARRAY['1 Business Listing', 'Basic Analytics', 'Standard Support']),
('Professional', 'Advanced features for growing businesses', 2500, 25000, ARRAY['3 Business Listings', 'Advanced Analytics', 'Priority Support', 'Verified Badge']),
('Enterprise', 'Full power for large scale operations', 7500, 75000, ARRAY['Unlimited Listings', 'Real-time Leads', 'Premium Analytics', 'Account Manager', 'Featured Placement'])
ON CONFLICT (name) DO NOTHING;
