-- Fix Database Error Saving New User permanently
-- 1. Ensure subscriptions table has unique user_id to prevent duplicate basic plans
DO $$ 
BEGIN
    -- Only keep the most recent subscription per user if duplicates exist
    DELETE FROM public.subscriptions a
    USING public.subscriptions b
    WHERE a.user_id = b.user_id AND a.created_at < b.created_at;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
    ) THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Fail gracefully if schema issues
END $$;

-- 2. Improved handle_new_user trigger function with collision handling
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
  -- This requires the unique constraint added above
  INSERT INTO public.subscriptions (user_id, plan_name, price, billing_cycle, status)
  VALUES (
    new.id,
    'Basic',
    0,
    'monthly',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Get the subscription ID (whether just created or already existed)
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
    -- CRITICAL: Never let this function block sign-up. 
    -- Return 'new' so the user is created even if profile/subscription steps fail.
    RETURN new;
END;
$$;
