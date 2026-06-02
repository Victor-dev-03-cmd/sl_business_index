-- Fix signup trigger to handle username conflicts and prevent 500 errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_username TEXT;
  final_username TEXT;
BEGIN
  -- Get username from metadata
  user_username := new.raw_user_meta_data->>'username';

  -- Make username unique by appending part of user ID
  IF user_username IS NOT NULL THEN
    final_username := user_username || '_' || substring(new.id::text, 1, 8);
  ELSE
    final_username := NULL;
  END IF;

  -- Insert profile with conflict handling
  INSERT INTO public.profiles (id, full_name, username, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    final_username,
    new.email,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    username = COALESCE(EXCLUDED.username, profiles.username);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Emergency fallback: create profile without username
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.email,
      'customer'
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE WARNING 'Profile creation partially failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Backfill any orphaned users (users in auth.users but not in profiles)
INSERT INTO public.profiles (id, full_name, email, username, role)
SELECT
    u.id,
    u.raw_user_meta_data->>'full_name',
    u.email,
    (u.raw_user_meta_data->>'username') || '_' || substring(u.id::text, 1, 8),
    'customer'::public.user_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
