-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Update handle_new_user function to handle new profile fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_sub_id UUID;
BEGIN
  -- Insert profile, allowing role and additional fields from metadata
  INSERT INTO public.profiles (id, full_name, email, username, avatar_url, phone, job_title, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'job_title',
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    phone = EXCLUDED.phone,
    job_title = EXCLUDED.job_title,
    role = EXCLUDED.role;

  -- Insert default Basic subscription if not exists
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = new.id) THEN
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
  END IF;

  RETURN new;
END;
$$;
