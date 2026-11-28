-- Disposable PostgreSQL fixture. No production data, tokens, or provider access.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),role text NOT NULL DEFAULT 'customer');
CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid REFERENCES auth.users(id),name text NOT NULL,slug text,status text,is_verified boolean);
CREATE TABLE public.business_news(id uuid PRIMARY KEY,owner_id uuid REFERENCES auth.users(id),business_id uuid REFERENCES public.businesses(id),is_official boolean NOT NULL DEFAULT false,title text NOT NULL,content text NOT NULL);
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,title text,message text,type text,is_read boolean DEFAULT false);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_notifications_insert ON public.notifications FOR INSERT WITH CHECK(true);
CREATE TABLE public.fcm_devices(user_id uuid,token text,session_id uuid,updated_at timestamptz);
CREATE TABLE public.fcm_delivery_jobs(notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,token text,user_id uuid,session_id uuid,PRIMARY KEY(notification_id,token));
CREATE TABLE public.marketing_email_suppressions(business_id uuid REFERENCES public.businesses(id),email text,PRIMARY KEY(business_id,email));
CREATE FUNCTION public.notify_all_on_business_news() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER on_new_business_news AFTER INSERT ON public.business_news FOR EACH ROW EXECUTE FUNCTION public.notify_all_on_business_news();
CREATE FUNCTION public.slbi_enqueue_fcm_job() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER slbi_enqueue_fcm_job AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.slbi_enqueue_fcm_job();
INSERT INTO auth.users VALUES
('11111111-1111-4111-8111-111111111111','owner-a@example.invalid',now()),
('22222222-2222-4222-8222-222222222222','owner-b@example.invalid',now()),
('33333333-3333-4333-8333-333333333333','follower-a@example.invalid',now()),
('44444444-4444-4444-8444-444444444444','follower-b@example.invalid',now()),
('55555555-5555-4555-8555-555555555555','non-follower@example.invalid',now()),
('66666666-6666-4666-8666-666666666666','unverified@example.invalid',NULL),
('77777777-7777-4777-8777-777777777777','admin@example.invalid',now());
INSERT INTO public.profiles(id,role) SELECT id,CASE WHEN id='77777777-7777-4777-8777-777777777777' THEN 'admin' ELSE 'customer' END FROM auth.users;
INSERT INTO public.businesses VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Business A','business-a','approved',true),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Business B','business-b','approved',true),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222','Pending','pending','pending',false);
INSERT INTO public.fcm_devices VALUES
('33333333-3333-4333-8333-333333333333','fake-token-a',gen_random_uuid(),now()),
('44444444-4444-4444-8444-444444444444','fake-token-b',gen_random_uuid(),now());
