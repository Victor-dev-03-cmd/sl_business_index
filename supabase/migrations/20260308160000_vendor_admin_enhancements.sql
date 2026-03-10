-- Fix Category Images mapping
UPDATE public.categories SET image_url = '/icons/Agriculture Products.png' WHERE name = 'Agriculture Products';
UPDATE public.categories SET image_url = '/icons/Arts, Entertainment & Leisure.png' WHERE name = 'Arts, Entertainment & Leisure';
UPDATE public.categories SET image_url = '/icons/Baby Care.png' WHERE name = 'Baby Care';
UPDATE public.categories SET image_url = '/icons/Banking & Finance.png' WHERE name = 'Banking & Finance';
UPDATE public.categories SET image_url = '/icons/Beauty & Health.png' WHERE name = 'Beauty & Health';
UPDATE public.categories SET image_url = '/icons/Construction Services.png' WHERE name = 'Construction Services';
UPDATE public.categories SET image_url = '/icons/Educational institutes & Services.png' WHERE name = 'Educational institutes & Services';
UPDATE public.categories SET image_url = '/icons/Electrical Equipment and Services.png' WHERE name = 'Electrical Equipment and Services';
UPDATE public.categories SET image_url = '/icons/Electronic Pheripherals.png' WHERE name = 'Electronic Pheripherals';
UPDATE public.categories SET image_url = '/icons/Embassies & High commision.png' WHERE name = 'Embassies & High commision';
UPDATE public.categories SET image_url = '/icons/Emergency Services.png' WHERE name = 'Emergency Services';
UPDATE public.categories SET image_url = '/icons/Financial Services.png' WHERE name = 'Financial Services';
UPDATE public.categories SET image_url = '/icons/Food & Dining.png' WHERE name = 'Food & Dining';
UPDATE public.categories SET image_url = '/icons/Government & Services.png' WHERE name = 'Government & Services';
UPDATE public.categories SET image_url = '/icons/Hardware Equipment.png' WHERE name = 'Hardware Equipment';
UPDATE public.categories SET image_url = '/icons/Health & Medical.png' WHERE name = 'Health & Medical';
UPDATE public.categories SET image_url = '/icons/Home Appliances & Services.png' WHERE name = 'Home Appliances & Services';
UPDATE public.categories SET image_url = '/icons/Hotels & Restaurants.png' WHERE name = 'Hotels & Restaurants';
UPDATE public.categories SET image_url = '/icons/Industry & Manufacturing.png' WHERE name = 'Industry & Manufacturing';
UPDATE public.categories SET image_url = '/icons/Insurance Services.png' WHERE name = 'Insurance Services';
UPDATE public.categories SET image_url = '/icons/Interior Design Services.png' WHERE name = 'Interior Design Services';
UPDATE public.categories SET image_url = '/icons/Media & Advertising.png' WHERE name = 'Media & Advertising';
UPDATE public.categories SET image_url = '/icons/Media & Communications.png' WHERE name = 'Media & Communications';
UPDATE public.categories SET image_url = '/icons/Office Equipment & Services.png' WHERE name = 'Office Equipment & Services';
UPDATE public.categories SET image_url = '/icons/Pet Care.png' WHERE name = 'Pet Care';
UPDATE public.categories SET image_url = '/icons/Professional Services.png' WHERE name = 'Professional Services';
UPDATE public.categories SET image_url = '/icons/Religious Organization.png' WHERE name = 'Religious Organization';
UPDATE public.categories SET image_url = '/icons/Repairing & Services.png' WHERE name = 'Repairing & Services';
UPDATE public.categories SET image_url = '/icons/Shopping & Retail.png' WHERE name = 'Shopping & Retail';
UPDATE public.categories SET image_url = '/icons/Sports & Recreation.png' WHERE name = 'Sports & Recreation';
UPDATE public.categories SET image_url = '/icons/Telecommunication Services.png' WHERE name = 'Telecommunication Services';
UPDATE public.categories SET image_url = '/icons/Travel & Tourism.png' WHERE name = 'Travel & Tourism';
UPDATE public.categories SET image_url = '/icons/Travel & Transportation.png' WHERE name = 'Travel & Transportation';
UPDATE public.categories SET image_url = '/icons/Vehicles & Automative.png' WHERE name = 'Vehicles & Automative';
UPDATE public.categories SET image_url = '/icons/Weddings Services.png' WHERE name = 'Weddings Services';

-- Ensure all root categories have these image URLs
-- (The above updates already cover them if the names match)

-- Add missing columns to businesses if they don't exist
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS calls INTEGER DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create function to notify vendor when business status changes
CREATE OR REPLACE FUNCTION public.handle_business_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.owner_id,
            'Business Listing Update',
            'Your business "' || NEW.name || '" has been ' || NEW.status || '.',
            CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'info' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for business status change
DROP TRIGGER IF EXISTS on_business_status_change ON public.businesses;
CREATE TRIGGER on_business_status_change
    AFTER UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_business_status_notification();

-- Create function to notify vendor when verification status changes
CREATE OR REPLACE FUNCTION public.handle_verification_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    business_owner_id UUID;
    business_name TEXT;
BEGIN
    SELECT owner_id, name INTO business_owner_id, business_name 
    FROM public.businesses 
    WHERE id = NEW.business_id;

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            business_owner_id,
            'Verification Update',
            'Verification request for "' || business_name || '" has been ' || NEW.status || '.',
            CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'info' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for verification status change
DROP TRIGGER IF EXISTS on_verification_status_change ON public.verifications;
CREATE TRIGGER on_verification_status_change
    AFTER UPDATE ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_verification_status_notification();

-- Create Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    banner_text TEXT NOT NULL,
    banner_color TEXT,
    platforms TEXT[],
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for marketing_campaigns
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Marketing Campaigns Policies
DO $$
BEGIN
    -- Drop policy if exists to ensure clean update
    DROP POLICY IF EXISTS "Vendors manage own campaigns" ON public.marketing_campaigns;
    
    CREATE POLICY "Vendors manage own campaigns" ON public.marketing_campaigns FOR ALL USING (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    );
END $$;

-- Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'active',
    renews_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
    
    CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
    );
END $$;

-- Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoices Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
    
    CREATE POLICY "Users view own invoices" ON public.invoices FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
    );
END $$;
