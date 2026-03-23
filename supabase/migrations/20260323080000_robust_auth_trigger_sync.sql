-- Ultimate robust fix for Auth User Signup -> Profiles Table sync
-- 1. Ensure Profiles table has correct permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO authenticated, service_role;

-- 2. Improved Trigger Function with Maximum Resilience
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    final_username TEXT;
    base_username TEXT;
    new_sub_id UUID;
BEGIN
    -- Log start (if you check postgres logs, this will show)
    -- RAISE NOTICE 'Starting handle_new_user for user %', new.id;

    -- A. Robust Username Determination
    base_username := COALESCE(NULLIF(new.raw_user_meta_data->>'username', ''), SPLIT_PART(new.email, '@', 1));
    final_username := base_username;

    -- If username exists, add a unique suffix (don't loop too many times, keep it fast)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
        final_username := base_username || '_' || substr(new.id::text, 1, 4);
    END IF;

    -- B. Profile Insertion (The most critical part)
    -- We use ON CONFLICT (id) DO UPDATE to ensure we always have a profile record
    INSERT INTO public.profiles (id, full_name, email, username, role)
    VALUES (
        new.id, 
        COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), 'New User'), 
        new.email,
        final_username,
        'customer'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN profiles.full_name = 'New User' OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

    -- C. Secondary Tasks (Wrapped in a nested block so they cannot break profile creation)
    BEGIN
        -- Insert default subscription
        INSERT INTO public.subscriptions (user_id, plan_name, price, billing_cycle, status)
        VALUES (new.id, 'Basic', 0, 'monthly', 'active')
        ON CONFLICT (user_id) DO NOTHING;

        -- Ensure an invoice exists
        SELECT id INTO new_sub_id FROM public.subscriptions WHERE user_id = new.id LIMIT 1;
        IF new_sub_id IS NOT NULL THEN
            INSERT INTO public.invoices (id, subscription_id, amount, status)
            VALUES (
                'INV-FREE-' || TO_CHAR(now(), 'YYYYMMDDHH24MISS') || '-' || substr(new.id::text, 1, 8),
                new_sub_id,
                0,
                'paid'
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Secondary tasks failed, but we still have the profile, so we're good
        -- RAISE WARNING 'Secondary tasks in handle_new_user failed: %', SQLERRM;
    END;

    -- Log success
    -- RAISE NOTICE 'Successfully created profile for user %', new.id;

    RETURN new;
END;
$$;

-- 3. Re-Attach the Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure handle_business_approval still works correctly
CREATE OR REPLACE FUNCTION public.handle_business_approval_consolidated()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (new.status = 'approved' AND (TG_OP = 'INSERT' OR old.status != 'approved')) THEN
    UPDATE public.profiles SET role = 'vendor' WHERE id = new.owner_id AND role = 'customer';
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (new.owner_id, 'Business Approved! 🎉', 'Your business "' || new.name || '" has been approved. You are now a vendor.', 'success');
  
  ELSIF (new.status = 'rejected' AND (TG_OP = 'INSERT' OR old.status != 'rejected')) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (new.owner_id, 'Business Application Update', 'Unfortunately, your application for "' || new.name || '" was not approved.', 'error');
  END IF;

  RETURN new;
END;
$$;
