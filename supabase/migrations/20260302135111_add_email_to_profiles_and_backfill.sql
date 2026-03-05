-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Update the trigger function to handle the email column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'username', 
    new.email,
    'customer'
  );
  RETURN new;
END;
$$;

-- 3. Backfill all existing users from auth.users into public.profiles
INSERT INTO public.profiles (id, full_name, username, email, role)
SELECT 
    id, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'username', 
    email,
    'customer'::public.user_role
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(profiles.username, EXCLUDED.username);
