-- Disposable GitHub cloud Supabase Auth/Storage/PostgREST fixtures.
\set ON_ERROR_STOP on
CREATE TYPE public.user_role AS ENUM ('customer','vendor','admin','ceo');
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text,full_name text,phone text,push_token text,
 role public.user_role NOT NULL DEFAULT 'customer',
 verification_status text NOT NULL DEFAULT 'unverified',
 verification_image_url text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 name text NOT NULL,description text,status text NOT NULL DEFAULT 'pending',
 is_verified boolean NOT NULL DEFAULT false,
 is_featured boolean NOT NULL DEFAULT false,
 can_show_badge boolean NOT NULL DEFAULT false,
 verification_status text NOT NULL DEFAULT 'none',
 verified_at timestamptz,verified_by uuid REFERENCES public.profiles(id),
 admin_notes text,verification_remarks text,
 is_open boolean DEFAULT true,service_radius integer DEFAULT 5,
 seo_keywords text[] DEFAULT ARRAY[]::text[],views int DEFAULT 0,calls int DEFAULT 0
);
CREATE TABLE public.verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid REFERENCES public.businesses(id),
 status text NOT NULL DEFAULT 'pending',moderation_status text DEFAULT 'pending',
 br_document_url text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING(true);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING(auth.uid()=id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK(auth.uid()=id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
 USING(auth.uid()=id) WITH CHECK(auth.uid()=id);
CREATE POLICY "Admins can manage all businesses" ON public.businesses FOR ALL
 TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles p
 WHERE p.id=auth.uid() AND p.role IN('admin','ceo')));
CREATE POLICY "Approved businesses public" ON public.businesses FOR SELECT
 TO anon,authenticated USING(status='approved');
CREATE POLICY "Owners view own" ON public.businesses FOR SELECT TO authenticated USING(auth.uid()=owner_id);
CREATE POLICY "Owners insert" ON public.businesses FOR INSERT TO authenticated WITH CHECK(auth.uid()=owner_id);
CREATE POLICY "Owners update" ON public.businesses FOR UPDATE TO authenticated
 USING(auth.uid()=owner_id) WITH CHECK(auth.uid()=owner_id);
CREATE POLICY "Temporary Public View" ON public.businesses FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY "Admins can manage all verifications" ON public.verifications FOR ALL
 USING(EXISTS(SELECT 1 FROM public.profiles p
 WHERE p.id=auth.uid() AND p.role IN('admin','ceo')));
CREATE POLICY "Vendors manage own verifications" ON public.verifications FOR ALL
 USING(EXISTS(SELECT 1 FROM public.businesses b
 WHERE b.id=verifications.business_id AND b.owner_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.businesses,public.verifications
 TO authenticated,service_role;
GRANT SELECT ON public.profiles,public.businesses TO anon;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('verification-docs','verification-docs',false,10485760,ARRAY['text/plain'])
 ON CONFLICT(id) DO UPDATE SET public=false;
CREATE POLICY "P0 owner files INSERT" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='verification-docs' AND
 (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "P0 owner files SELECT" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='verification-docs' AND
 (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "P0 staff files SELECT" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='verification-docs' AND EXISTS(SELECT 1 FROM public.profiles p
 WHERE p.id=(SELECT auth.uid()) AND p.role IN('admin','ceo')));
