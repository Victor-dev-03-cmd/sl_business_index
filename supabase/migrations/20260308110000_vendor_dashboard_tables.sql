-- ============================================
-- VENDOR DASHBOARD TABLES & SCHEMA ENHANCEMENTS
-- ============================================

-- 1. Enhance Businesses Table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT '{}';

-- 2. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Review Replies Table
CREATE TABLE IF NOT EXISTS public.review_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
    source TEXT DEFAULT 'Website Enquiry',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Lead Notes Table
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    banner_text TEXT NOT NULL,
    banner_color TEXT NOT NULL,
    platforms TEXT[] DEFAULT '{}',
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'drafted' CHECK (status IN ('drafted', 'scheduled', 'posted')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Subscriptions & Billing Tables
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL CHECK (plan_name IN ('Free', 'Pro', 'Enterprise')),
    price NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
    renews_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create Verifications Table
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    br_document_url TEXT,
    nic_passport_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Reviews Policies
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Review Replies Policies
CREATE POLICY "Replies viewable by everyone" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "Vendors can reply to their reviews" ON public.review_replies FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses b
        JOIN public.reviews r ON r.business_id = b.id
        WHERE r.id = review_id AND b.owner_id = auth.uid()
    )
);

-- Leads Policies
CREATE POLICY "Vendors view own leads" ON public.leads FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Vendors update own leads" ON public.leads FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- Lead Notes Policies
CREATE POLICY "Vendors view own lead notes" ON public.lead_notes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.businesses b ON l.business_id = b.id
        WHERE l.id = lead_id AND b.owner_id = auth.uid()
    )
);
CREATE POLICY "Vendors insert lead notes" ON public.lead_notes FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.businesses b ON l.business_id = b.id
        WHERE l.id = lead_id AND b.owner_id = auth.uid()
    )
);

-- Marketing Campaigns Policies
CREATE POLICY "Vendors manage own campaigns" ON public.marketing_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- Subscriptions Policies
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users view own invoices" ON public.invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
);

-- Verifications Policies
CREATE POLICY "Vendors manage own verifications" ON public.verifications FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
