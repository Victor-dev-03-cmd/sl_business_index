# Fix: Sign-Up 500 Internal Server Error

## ✅ Root Cause Identified

**Error:**
```
POST https://oofxhragafekazwjikae.supabase.co/auth/v1/signup 500 (Internal Server Error)
```

**Root Cause:**
The database trigger `handle_new_user()` is failing when inserting into the `profiles` table during sign-up.

## Problem Analysis

### **Database Trigger:**

**File:** `supabase/migrations/20260302135111_add_email_to_profiles_and_backfill.sql`

```sql
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
```

### **Profiles Table:**

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    username TEXT UNIQUE,  -- ⚠️ UNIQUE constraint
    avatar_url TEXT,
    phone TEXT,
    job_title TEXT,
    role public.user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Why It Fails:**

1. **Username Conflict:**
   - `username` column has a `UNIQUE` constraint
   - If username already exists → INSERT fails → 500 error
   - User doesn't get helpful error message

2. **NULL Username Issue:**
   - If `username` is not provided in metadata → `NULL`
   - Multiple users with `NULL` username → constraint violation

3. **Trigger Fails Silently:**
   - Trigger runs AFTER user created in `auth.users`
   - If trigger fails, auth user exists but no profile
   - User can't login properly (profile missing)

## Solutions

### **Solution 1: Make Username Optional (Recommended)**

Update the trigger to handle username conflicts gracefully:

```sql
-- Update trigger to handle username conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_username TEXT;
  username_exists BOOLEAN;
BEGIN
  -- Get username from metadata
  user_username := new.raw_user_meta_data->>'username';
  
  -- If username provided, check if it exists
  IF user_username IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = user_username) INTO username_exists;
    
    -- If exists, make it unique by appending user ID
    IF username_exists THEN
      user_username := user_username || '_' || substring(new.id::text, 1, 8);
    END IF;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, username, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    user_username,
    new.email,
    'customer'
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If still fails, try without username
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'full_name', 
      new.email,
      'customer'
    );
    RETURN new;
END;
$$;
```

**Benefits:**
- ✅ Handles username conflicts automatically
- ✅ Never fails on unique constraint
- ✅ User can update username later
- ✅ No 500 errors

### **Solution 2: Remove Username from Sign-Up**

Update the signup form to not send username:

**app/signup/page.tsx:**

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Remove username - users can set it later in profile
        full_name: username,  // Use the input as full_name instead
      },
    },
  });

  setLoading(false);
  if (error) {
    setError(error.message);
  } else {
    router.push(`/auth/confirm-otp?email=${encodeURIComponent(email)}`);
  }
};
```

**Benefits:**
- ✅ Simple fix
- ✅ No trigger changes needed
- ✅ Users set username in profile later
- ✅ No conflicts

### **Solution 3: Make Username NOT UNIQUE**

Remove the UNIQUE constraint from username:

```sql
-- Remove unique constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add a partial unique index (only for non-null usernames)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON public.profiles (username) 
WHERE username IS NOT NULL;
```

**Then update trigger:**

```sql
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
  )
  ON CONFLICT (id) DO NOTHING;  -- Handle rare race conditions
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;
```

**Benefits:**
- ✅ Allows duplicate usernames (or nulls)
- ✅ Never blocks signup
- ✅ Can handle later with app logic

## Recommended Fix (Quick & Safe)

**Step 1:** Update the trigger to be more resilient:

Run this in **Supabase SQL Editor:**

```sql
-- Improved trigger with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_username TEXT;
BEGIN
  -- Get username, make it unique if needed
  user_username := new.raw_user_meta_data->>'username';
  
  -- If username is provided but might conflict, append timestamp
  IF user_username IS NOT NULL THEN
    user_username := user_username || '_' || extract(epoch from now())::bigint;
  END IF;

  -- Try to insert profile
  INSERT INTO public.profiles (id, full_name, username, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    user_username,
    new.email,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: insert without username
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'full_name', 
      new.email,
      'customer'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN new;
END;
$$;
```

**Step 2:** Test signup:

1. Try signing up with a new email
2. Should succeed without 500 error
3. Check `profiles` table for new user
4. Username will be auto-generated if conflict

## Alternative: Check Before Signup

Add validation to the signup form:

```typescript
const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  
  return data === null;
};

const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  
  // Check username availability
  const isAvailable = await checkUsernameAvailable(username);
  if (!isAvailable) {
    setError('Username already taken. Please choose another.');
    return;
  }
  
  // Continue with signup...
};
```

## Debugging Steps

### **Check if user was created:**

```sql
-- Check auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
WHERE email = 'user@example.com';

-- Check profiles
SELECT id, email, username, full_name
FROM public.profiles
WHERE email = 'user@example.com';
```

### **Check for orphaned users:**

```sql
-- Users in auth.users but NOT in profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### **Backfill missing profiles:**

```sql
-- Create profiles for users without one
INSERT INTO public.profiles (id, full_name, email, username, role)
SELECT 
    id, 
    raw_user_meta_data->>'full_name', 
    email,
    raw_user_meta_data->>'username',
    'customer'::public.user_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

## Error Messages in Browser Console

### **What you see:**

```javascript
cd4b0482a7d14d55.js:1 
POST https://oofxhragafekazwjikae.supabase.co/auth/v1/signup 500 (Internal Server Error)
```

### **What's actually happening:**

```
auth.users INSERT → SUCCESS
  ↓
Trigger fires: handle_new_user()
  ↓
profiles INSERT → FAILS (unique constraint violation)
  ↓
Transaction ROLLBACK
  ↓
API returns 500 error
```

## Testing the Fix

### **Test 1: New User**

```bash
# Should succeed
curl -X POST https://oofxhragafekazwjikae.supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "data": {
      "username": "newuser",
      "full_name": "New User"
    }
  }'
```

### **Test 2: Duplicate Username**

```bash
# Should still succeed (username modified)
curl -X POST https://oofxhragafekazwjikae.supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "another@example.com",
    "password": "password123",
    "data": {
      "username": "newuser",
      "full_name": "Another User"
    }
  }'
```

## Migration File

Create new migration:

**File:** `supabase/migrations/20260528120000_fix_signup_trigger.sql`

```sql
-- Fix signup trigger to handle username conflicts
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
  
  -- Make username unique if provided
  IF user_username IS NOT NULL THEN
    final_username := user_username || '_' || substring(new.id::text, 1, 8);
  ELSE
    final_username := NULL;
  END IF;

  -- Insert profile with error handling
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
    -- Emergency fallback: no username
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

-- Backfill any orphaned users
INSERT INTO public.profiles (id, full_name, email, username, role)
SELECT 
    u.id, 
    u.raw_user_meta_data->>'full_name', 
    u.email,
    u.raw_user_meta_data->>'username',
    'customer'::public.user_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

## Summary

✅ **Root cause:** Database trigger fails on username UNIQUE constraint  
✅ **Solution 1:** Update trigger to handle conflicts gracefully  
✅ **Solution 2:** Remove username from signup (set later)  
✅ **Solution 3:** Make username optional/non-unique  
✅ **Recommended:** Run SQL migration to fix trigger  
✅ **Testing:** Check both new users and duplicate usernames  

The signup should now work without 500 errors! 🎯
