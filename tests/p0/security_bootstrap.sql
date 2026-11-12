-- Synthetic reproduction of live SLBI schemas, policies and grants.
-- PostgreSQL 17 Docker service on GitHub Actions. No production credentials/data.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role',true),'');
$$;
GRANT EXECUTE ON FUNCTION auth.uid(),auth.role() TO anon,authenticated,service_role;

CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE TYPE public.user_role AS ENUM('customer','vendor','admin','ceo');
CREATE TABLE public.profiles(
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text, phone text, push_token text,
  role public.user_role DEFAULT 'customer',
  verification_status text DEFAULT 'unverified',
  verification_image_url text
);
CREATE TABLE public.businesses(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  is_verified boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  can_show_badge boolean DEFAULT false,
  verification_status text DEFAULT 'none',
  verified_at timestamptz,verified_by uuid REFERENCES public.profiles(id),
  admin_notes text,verification_remarks text,
  is_open boolean DEFAULT true,
  service_radius integer DEFAULT 5,
  seo_keywords text[] DEFAULT '{}'::text[],
  views integer DEFAULT 0,calls integer DEFAULT 0
);
CREATE TABLE public.verifications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id),
  status text DEFAULT 'pending',
  moderation_status text DEFAULT 'pending',
  document_url text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING(true);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING(auth.uid()=id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK(auth.uid()=id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING(auth.uid()=id);

CREATE POLICY "Admins can manage all businesses" ON public.businesses
  FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
    AND p.role IN('admin','ceo')));
CREATE POLICY "Approved businesses public" ON public.businesses
  FOR SELECT TO anon,authenticated USING(status='approved');
CREATE POLICY "Owners insert" ON public.businesses
  FOR INSERT TO authenticated WITH CHECK(auth.uid()=owner_id);
CREATE POLICY "Owners update" ON public.businesses
  FOR UPDATE TO authenticated USING(auth.uid()=owner_id) WITH CHECK(auth.uid()=owner_id);
CREATE POLICY "Owners view own" ON public.businesses
  FOR SELECT TO authenticated USING(auth.uid()=owner_id);
CREATE POLICY "Temporary Public View" ON public.businesses
  FOR SELECT TO anon,authenticated USING(true);

CREATE POLICY "Admins can manage all verifications" ON public.verifications
  FOR ALL USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
     AND p.role IN('admin','ceo')));
CREATE POLICY "Vendors manage own verifications" ON public.verifications
  FOR ALL USING(EXISTS(SELECT 1 FROM public.businesses b
    WHERE b.id=verifications.business_id AND b.owner_id=auth.uid()));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.businesses,public.verifications TO authenticated;
GRANT SELECT ON public.profiles,public.businesses TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.businesses,public.verifications TO service_role;

INSERT INTO auth.users(id,email) VALUES
('00000000-0000-4000-8000-000000000001','admin@testing.invalid'),
('00000000-0000-4000-8000-000000000002','vendor-a@testing.invalid'),
('00000000-0000-4000-8000-000000000003','vendor-b@testing.invalid'),
('00000000-0000-4000-8000-000000000004','customer@testing.invalid'),
('00000000-0000-4000-8000-000000000005','signup@testing.invalid');
INSERT INTO public.profiles(id,email,role,phone,push_token)
VALUES
('00000000-0000-4000-8000-000000000001','admin@testing.invalid','admin','0701111001','private-admin-token'),
('00000000-0000-4000-8000-000000000002','vendor-a@testing.invalid','vendor','0701111002','private-vendor-token'),
('00000000-0000-4000-8000-000000000003','vendor-b@testing.invalid','vendor','0701111003','private-other-token'),
('00000000-0000-4000-8000-000000000004','customer@testing.invalid','customer','0701111004','private-customer-token');
INSERT INTO public.businesses(id,owner_id,name,status,description)
VALUES
('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Pending vendor A','pending','Vendor A pending listing'),
('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','Pending vendor B','pending','Vendor B pending listing'),
('20000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Approved vendor A','approved','Published listing'),
('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003','Rejected vendor B','rejected','Rejected listing');
