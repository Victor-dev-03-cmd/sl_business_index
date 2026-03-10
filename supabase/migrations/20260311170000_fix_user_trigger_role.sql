-- Update handle_new_user function to allow role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_sub_id UUID;
BEGIN
  -- Insert profile, allowing role from metadata (useful for admins/initial setup)
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
