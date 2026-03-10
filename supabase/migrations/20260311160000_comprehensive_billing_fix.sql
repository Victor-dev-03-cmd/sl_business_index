-- 1. Fix Subscription Plan Name Constraint
-- Drop existing check constraint if it exists (it has several names depending on the migration that created it)
DO $$
BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check1;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add a more flexible constraint or just remove it (relying on subscription_plans table for validation is better)
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_name_check 
CHECK (plan_name IS NOT NULL);

-- 2. Ensure subscription_plans has all requested professional fields
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS show_verified_badge BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS advanced_analytics BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_social_sharing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_boost BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;

-- 3. Update handle_new_user function to correctly assign 'Basic' plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_sub_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, username, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );

  -- Insert default Basic subscription
  INSERT INTO public.subscriptions (user_id, plan_name, price, billing_cycle, status)
  VALUES (
    new.id,
    'Basic',
    0,
    'monthly',
    'active'
  ) RETURNING id INTO new_sub_id;

  -- Insert initial "invoice" for the free plan
  INSERT INTO public.invoices (id, subscription_id, amount, status)
  VALUES (
    'INV-FREE-' || extract(epoch from now())::text || '-' || substr(new.id::text, 1, 4),
    new_sub_id,
    0,
    'paid'
  );

  RETURN new;
END;
$$;

-- 4. Backfill Basic subscription for users without any subscription
INSERT INTO public.subscriptions (user_id, plan_name, price, billing_cycle, status)
SELECT p.id, 'Basic', 0, 'monthly', 'active'
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id
WHERE s.id IS NULL
ON CONFLICT DO NOTHING;

-- 5. Ensure the Basic, Professional, and Enterprise plans exist with correct initial values
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, max_listings, show_verified_badge, priority_support, advanced_analytics, has_social_sharing, featured_boost)
VALUES 
('Basic', 'Essential tools for small businesses', 0, 0, ARRAY['1 Business Listing', 'Basic Analytics', 'Standard Support'], 1, false, false, false, false, false),
('Professional', 'Advanced features for growing businesses', 2500, 25000, ARRAY['3 Business Listings', 'Advanced Analytics', 'Priority Support', 'Verified Badge'], 3, true, true, true, true, false),
('Enterprise', 'Full power for large scale operations', 7500, 75000, ARRAY['Unlimited Listings', 'Real-time Leads', 'Premium Analytics', 'Account Manager', 'Featured Placement'], 9999, true, true, true, true, true)
ON CONFLICT (name) DO UPDATE SET
    max_listings = EXCLUDED.max_listings,
    show_verified_badge = EXCLUDED.show_verified_badge,
    priority_support = EXCLUDED.priority_support,
    advanced_analytics = EXCLUDED.advanced_analytics,
    has_social_sharing = EXCLUDED.has_social_sharing,
    featured_boost = EXCLUDED.featured_boost;
