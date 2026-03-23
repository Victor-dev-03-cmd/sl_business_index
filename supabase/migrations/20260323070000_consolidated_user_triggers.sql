-- Consolidated and improved user triggers for Profile creation and Vendor transition
-- 1. Ensure Profiles are created on every new Auth User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_sub_id UUID;
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
BEGIN
  -- Insert profile, with basic collision handling for username
  base_username := COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1));
  final_username := base_username;
  
  -- Simple loop to find a unique username if it already exists
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
      counter := counter + 1;
      final_username := base_username || counter::text;
  END LOOP;

  -- Profile Insertion with ON CONFLICT for robustness
  INSERT INTO public.profiles (id, full_name, email, username, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email,
    final_username,
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    username = EXCLUDED.username;

  -- Default Basic subscription, handling if it already exists
  INSERT INTO public.subscriptions (user_id, plan_name, price, billing_cycle, status)
  VALUES (
    new.id,
    'Basic',
    0,
    'monthly',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Get the subscription ID
  SELECT id INTO new_sub_id FROM public.subscriptions WHERE user_id = new.id LIMIT 1;

  -- If we have a subscription, ensure an invoice exists for the free plan
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

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Ensure the Auth trigger is present (it might already be, but let's be sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Ensure Business Approval triggers Role Change to 'vendor'
CREATE OR REPLACE FUNCTION public.handle_business_approval_consolidated()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if business is newly approved (either inserted as approved or status changed to approved)
  IF (new.status = 'approved' AND (TG_OP = 'INSERT' OR old.status != 'approved')) THEN
    -- A. Update Profile Role from 'customer' to 'vendor'
    UPDATE public.profiles
    SET role = 'vendor'
    WHERE id = new.owner_id AND role = 'customer';

    -- B. Send Approval Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.owner_id,
      'Business Approved! 🎉',
      'Congratulations! Your business "' || new.name || '" has been approved. You are now a verified vendor.',
      'success'
    );
  
  -- Handle rejection notifications
  ELSIF (new.status = 'rejected' AND (TG_OP = 'INSERT' OR old.status != 'rejected')) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.owner_id,
      'Business Status Update',
      'Your business application for "' || new.name || '" was not approved at this time.',
      'error'
    );
  
  -- Handle other status changes
  ELSIF (TG_OP = 'UPDATE' AND new.status != old.status) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.owner_id,
      'Business Status Changed',
      'Your business "' || new.name || '" status has been changed to ' || new.status || '.',
      'info'
    );
  END IF;

  RETURN new;
END;
$$;

-- Consolidate triggers on businesses table
DROP TRIGGER IF EXISTS on_business_approved ON public.businesses;
DROP TRIGGER IF EXISTS on_business_status_change ON public.businesses;

CREATE TRIGGER on_business_status_change_consolidated
  AFTER INSERT OR UPDATE OF status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_business_approval_consolidated();
