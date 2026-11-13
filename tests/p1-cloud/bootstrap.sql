-- P1 Full Stack (Docker Supabase Auth + PostgREST + PostGIS)
-- All rows and accounts are synthetic and exist ONLY in the GitHub runner.
\set ON_ERROR_STOP on
CREATE TYPE public.user_role AS ENUM ('customer','vendor','admin','ceo');
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text,full_name text,phone text,push_token text,
 role public.user_role NOT NULL DEFAULT 'customer'
);

CREATE TABLE public.businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid REFERENCES auth.users(id),
 name text NOT NULL,description text,status text NOT NULL DEFAULT 'pending',
 address text,detailed_address text,latitude double precision,
 longitude double precision,location public.geography(POINT,4326)
);
CREATE TABLE public.leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid REFERENCES public.businesses(id),
 name text NOT NULL,email text,phone text,message text,
 status text DEFAULT 'new',source text DEFAULT 'Website Enquiry',
 created_at timestamptz DEFAULT now()
);
CREATE TABLE public.lead_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lead_id uuid REFERENCES public.leads(id),
 note text NOT NULL,created_at timestamptz DEFAULT now()
);
CREATE TABLE public.analytics_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid REFERENCES public.businesses(id),
 event_type text NOT NULL,created_at timestamptz DEFAULT now()
);
CREATE TABLE public.reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid REFERENCES public.businesses(id),
 user_id uuid REFERENCES auth.users(id),
 user_name text NOT NULL,rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text,created_at timestamptz DEFAULT now(),
 sentiment text,is_approved boolean DEFAULT true
);
CREATE TABLE public.review_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_id uuid REFERENCES public.reviews(id),
 vendor_id uuid REFERENCES auth.users(id),
 reply_text text NOT NULL,created_at timestamptz DEFAULT now()
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles, public.businesses, public.leads, public.lead_notes,
 public.analytics_logs,public.reviews,public.review_replies TO anon,authenticated,service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
 USING(id=(SELECT auth.uid()));
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved businesses public" ON public.businesses FOR SELECT
 TO anon,authenticated USING(status='approved');
CREATE POLICY "Owners view own" ON public.businesses FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()));
CREATE POLICY "Owners insert" ON public.businesses FOR INSERT TO authenticated
 WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY "Owners update" ON public.businesses FOR UPDATE TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY "Admins can manage all businesses" ON public.businesses FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid())
  AND p.role IN('admin','ceo')))
 WITH CHECK(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid())
  AND p.role IN('admin','ceo')));

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SLBI legacy compatible enquiry insert" ON public.leads
 FOR INSERT TO anon,authenticated
 WITH CHECK (
  business_id IS NOT NULL AND status='new' AND name IS NOT NULL
  AND length(btrim(name)) BETWEEN 2 AND 100
  AND (email IS NOT NULL OR phone IS NOT NULL)
  AND EXISTS(SELECT 1 FROM public.businesses b
    WHERE b.id=leads.business_id AND b.status='approved')
 );
CREATE POLICY "Vendors view own leads" ON public.leads FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=leads.business_id AND b.owner_id=(SELECT auth.uid())));
CREATE POLICY "Vendors update own leads" ON public.leads FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=leads.business_id AND b.owner_id=(SELECT auth.uid())));
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors insert lead notes" ON public.lead_notes FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.leads l JOIN public.businesses b
  ON b.id=l.business_id WHERE l.id=lead_notes.lead_id AND b.owner_id=(SELECT auth.uid())));
CREATE POLICY "Vendors view own lead notes" ON public.lead_notes FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.leads l JOIN public.businesses b
  ON b.id=l.business_id WHERE l.id=lead_notes.lead_id AND b.owner_id=(SELECT auth.uid())));
ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view logs for their businesses" ON public.analytics_logs
 FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=analytics_logs.business_id AND b.owner_id=(SELECT auth.uid())));

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING(true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT
 WITH CHECK((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE
 USING(user_id=(SELECT auth.uid()));
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies viewable by everyone" ON public.review_replies FOR SELECT USING(true);
CREATE POLICY "Vendors can reply to their reviews" ON public.review_replies FOR INSERT
 WITH CHECK(EXISTS(SELECT 1 FROM public.reviews r
 JOIN public.businesses b ON b.id=r.business_id
 WHERE r.id=review_replies.review_id AND b.owner_id=(SELECT auth.uid())));

-- Service-level fixtures deliberately inserted BEFORE candidate migrations
-- to prove grandfathered reviews and older incomplete listings remain usable.
