-- ============================================
-- 1. EXTENSIONS & TYPES
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Custom Role Type
DO $$ BEGIN
CREATE TYPE public.user_role AS ENUM ('admin', 'vendor', 'customer', 'ceo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. TABLES
-- ============================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    username TEXT UNIQUE,
    role public.user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
                                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    image_url TEXT,
    email TEXT,
    owner_name TEXT,
    phone TEXT,
    website_name TEXT,
    website_url TEXT,
    working_hours TEXT,
    is_registered BOOLEAN DEFAULT false,
    registration_number TEXT,
    owner_id UUID REFERENCES auth.users ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    );

-- SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
                                                    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    site_name TEXT DEFAULT 'Business Index',
    site_description TEXT,
    theme_primary_color TEXT DEFAULT '#10b981',
    theme_accent_color TEXT DEFAULT '#3b82f6',
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
    );

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for Notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Insert default settings
INSERT INTO public.site_settings (id, site_name)
VALUES (1, 'Business Index')
    ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. INDEXES & RLS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_businesses_location ON public.businesses USING gist(location);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON public.businesses USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_category_trgm ON public.businesses USING gin (category gin_trgm_ops);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Businesses Policies
CREATE POLICY "Approved businesses public" ON public.businesses FOR SELECT USING (status = 'approved');
CREATE POLICY "Owners view own" ON public.businesses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Owners update" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins manage all" ON public.businesses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- Site Settings Policies
CREATE POLICY "Settings public view" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- Notifications Policies
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

-- Role Update Trigger when Business Approved
CREATE OR REPLACE FUNCTION public.handle_business_approval()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (new.status = 'approved' AND (old.status IS NULL OR old.status != 'approved')) THEN
    -- Update Profile Role
    UPDATE public.profiles
    SET role = 'vendor'
    WHERE id = new.owner_id AND role = 'customer';

    -- Insert Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.owner_id,
      'Business Approved! 🎉',
      'Congratulations! Your business "' || new.name || '" has been approved. You are now a verified vendor.',
      'success'
    );
  ELSIF (new.status = 'rejected' AND (old.status IS NULL OR old.status != 'rejected')) THEN
    -- Insert Rejection Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.owner_id,
      'Business Application Update',
      'Unfortunately, your application for "' || new.name || '" was not approved at this time.',
      'error'
    );
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_business_approved ON public.businesses;
CREATE TRIGGER on_business_approved
  AFTER UPDATE OF status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_business_approval();

-- Auth Link Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, username, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    new.raw_user_meta_data->>'username', 
    'customer'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Nearby Search RPC
CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000
) RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website_name TEXT,
  website_url TEXT,
  rating NUMERIC,
  reviews_count INTEGER,
  image_url TEXT,
  logo_url TEXT,
  distance_meters DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
RETURN QUERY
SELECT
    b.id, b.name, b.category, b.description, b.address, b.phone, b.email, b.website_name, b.website_url,
    b.rating, b.reviews_count, b.image_url, b.logo_url,
    st_distance(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    st_y(b.location::geometry) AS latitude,
    st_x(b.location::geometry) AS longitude
FROM businesses b
WHERE
    b.status = 'approved' AND
    st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, dist_limit)
  AND (search_query = '' OR b.name ILIKE '%' || search_query || '%' OR b.category ILIKE '%' || search_query || '%')
ORDER BY b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. PERMISSIONS & STORAGE
-- ============================================

-- Create Storage Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
