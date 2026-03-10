-- Function to notify admins of new business registrations
CREATE OR REPLACE FUNCTION public.notify_admins_new_business()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Loop through all admins/ceos and insert notification
    FOR admin_id IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'ceo')) LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            admin_id,
            'New Business Registration',
            'A new business "' || NEW.name || '" has registered and is pending approval.',
            'info'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new business registration
DROP TRIGGER IF EXISTS on_new_business_registration ON public.businesses;
CREATE TRIGGER on_new_business_registration
    AFTER INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_new_business();

-- Function to notify admins of new verification requests
CREATE OR REPLACE FUNCTION public.notify_admins_new_verification()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    business_name TEXT;
BEGIN
    SELECT name INTO business_name FROM public.businesses WHERE id = NEW.business_id;
    
    FOR admin_id IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'ceo')) LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            admin_id,
            'New Verification Request',
            'Verification requested for "' || business_name || '".',
            'warning'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new verification request
DROP TRIGGER IF EXISTS on_new_verification_request ON public.verifications;
CREATE TRIGGER on_new_verification_request
    AFTER INSERT ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_new_verification();

-- Function to notify admins of new subscription
CREATE OR REPLACE FUNCTION public.notify_admins_new_subscription()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    user_name TEXT;
BEGIN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
    
    FOR admin_id IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'ceo')) LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            admin_id,
            'New Subscription! 💰',
            user_name || ' subscribed to the ' || NEW.plan_name || ' plan.',
            'success'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new subscription
DROP TRIGGER IF EXISTS on_new_subscription ON public.subscriptions;
CREATE TRIGGER on_new_subscription
    AFTER INSERT ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_new_subscription();
