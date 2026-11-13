\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE TABLE public.businesses(
  id uuid PRIMARY KEY, owner_id uuid, name text, status text NOT NULL
);
CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text NOT NULL);
INSERT INTO public.profiles VALUES
 ('55555555-5555-4555-8555-555555555555','admin'),
 ('11111111-1111-4111-8111-111111111111','vendor');
GRANT SELECT ON public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self-read" ON public.profiles
 FOR SELECT TO authenticated USING (id=auth.uid());
CREATE TABLE public.leads(
  id uuid PRIMARY KEY, business_id uuid REFERENCES public.businesses(id),
  name text, status text NOT NULL DEFAULT 'new'
);
CREATE TABLE public.lead_notes(id uuid PRIMARY KEY, lead_id uuid REFERENCES public.leads(id), note text);
CREATE TABLE public.analytics_logs(
  id uuid PRIMARY KEY, business_id uuid REFERENCES public.businesses(id), event_type text
);
CREATE TABLE public.reviews(
  id uuid PRIMARY KEY, business_id uuid REFERENCES public.businesses(id),
  user_id uuid, user_name text NOT NULL DEFAULT 'Legacy reviewer',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text, is_approved boolean DEFAULT true
);
CREATE TABLE public.review_replies(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id),
  vendor_id uuid, reply_text text NOT NULL
);
INSERT INTO public.businesses VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Vendor A','approved'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Vendor B','approved');
INSERT INTO public.leads(id,business_id,name) VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B');
INSERT INTO public.reviews(id,business_id,user_id,rating,comment,is_approved) VALUES
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',5,'Published A',true),
('ffffffff-ffff-4fff-8fff-ffffffffffff','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444',4,'Published B',true),
('aaaaeeee-aaaa-4aaa-8aaa-aaaaaaaeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',3,'Pending A',false);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.businesses, public.leads, public.lead_notes, public.analytics_logs,
  public.reviews, public.review_replies TO anon, authenticated;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved businesses public" ON public.businesses FOR SELECT TO anon,authenticated USING (status='approved');
CREATE POLICY "vendor business owner" ON public.businesses FOR SELECT TO authenticated USING (owner_id=auth.uid());
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors view own leads" ON public.leads FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=leads.business_id AND b.owner_id=auth.uid()));
CREATE POLICY "SLBI legacy compatible enquiry insert" ON public.leads FOR INSERT TO anon,authenticated
 WITH CHECK (status='new' AND EXISTS(SELECT 1 FROM public.businesses b
 WHERE b.id=leads.business_id AND b.status='approved'));
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies viewable by everyone" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "Vendors can reply to their reviews" ON public.review_replies FOR INSERT
 WITH CHECK (EXISTS(SELECT 1 FROM public.reviews r JOIN public.businesses b ON b.id=r.business_id
 WHERE r.id=review_replies.review_id AND b.owner_id=auth.uid()));
