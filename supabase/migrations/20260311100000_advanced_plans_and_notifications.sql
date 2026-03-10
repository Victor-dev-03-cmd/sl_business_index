-- Add Advanced Feature Fields to Subscription Plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS show_verified_badge BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS advanced_analytics BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_social_sharing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_boost BOOLEAN DEFAULT false;

-- Function to Notify Users of New Announcements
CREATE OR REPLACE FUNCTION public.notify_on_new_announcement()
RETURNS TRIGGER AS $$
DECLARE
    target_user_record RECORD;
BEGIN
    -- Only notify if the announcement is active and starting now
    IF NEW.is_active = true AND NEW.starts_at <= now() THEN
        -- Select users based on target_role
        FOR target_user_record IN 
            SELECT id FROM public.profiles 
            WHERE 
                (NEW.target_role = 'all') OR 
                (NEW.target_role = 'vendor' AND role = 'vendor') OR 
                (NEW.target_role = 'customer' AND role = 'customer')
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (target_user_record.id, NEW.title, NEW.message, NEW.type);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New Announcements
DROP TRIGGER IF EXISTS on_new_announcement ON public.announcements;
CREATE TRIGGER on_new_announcement
    AFTER INSERT ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_announcement();

-- Update existing plans with professional values
UPDATE public.subscription_plans SET 
    max_listings = 1, 
    show_verified_badge = false, 
    priority_support = false, 
    advanced_analytics = false 
WHERE name = 'Basic';

UPDATE public.subscription_plans SET 
    max_listings = 3, 
    show_verified_badge = true, 
    priority_support = true, 
    advanced_analytics = true,
    has_social_sharing = true
WHERE name = 'Professional';

UPDATE public.subscription_plans SET 
    max_listings = 9999, 
    show_verified_badge = true, 
    priority_support = true, 
    advanced_analytics = true,
    has_social_sharing = true,
    featured_boost = true
WHERE name = 'Enterprise';
