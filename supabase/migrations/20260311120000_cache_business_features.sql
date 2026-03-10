-- Add cached feature column to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS can_show_badge BOOLEAN DEFAULT false;

-- Function to update business feature cache
CREATE OR REPLACE FUNCTION public.update_business_feature_cache()
RETURNS TRIGGER AS $$
DECLARE
    plan_record RECORD;
BEGIN
    -- Get the feature settings for the new/updated subscription plan
    SELECT sp.show_verified_badge 
    INTO plan_record
    FROM public.subscription_plans sp
    WHERE sp.name = NEW.plan_name;

    -- Update all businesses owned by this user
    UPDATE public.businesses 
    SET can_show_badge = COALESCE(plan_record.show_verified_badge, false)
    WHERE owner_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for subscription changes
DROP TRIGGER IF EXISTS on_subscription_change_update_features ON public.subscriptions;
CREATE TRIGGER on_subscription_change_update_features
    AFTER INSERT OR UPDATE OF plan_name, status ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_business_feature_cache();

-- Backfill existing businesses
UPDATE public.businesses b
SET can_show_badge = COALESCE(sp.show_verified_badge, false)
FROM public.subscriptions s
JOIN public.subscription_plans sp ON s.plan_name = sp.name
WHERE b.owner_id = s.user_id AND s.status = 'active';
