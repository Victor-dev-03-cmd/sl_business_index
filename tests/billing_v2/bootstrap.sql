-- Isolated CI fixtures only. DO NOT apply to a live Supabase project.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.role',true),'')
$$;
GRANT EXECUTE ON FUNCTION auth.uid(),auth.role() TO anon,authenticated,service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE TYPE public.user_role AS ENUM ('customer','vendor','admin','ceo');
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),email text,role public.user_role DEFAULT 'customer');
CREATE TABLE public.subscription_plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text UNIQUE NOT NULL,
 price_monthly integer NOT NULL,price_yearly integer NOT NULL,is_active boolean DEFAULT true
);
CREATE TABLE public.subscriptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),
 plan_name text NOT NULL,price numeric NOT NULL,billing_cycle text NOT NULL,
 status text DEFAULT 'active',renews_at timestamptz,created_at timestamptz DEFAULT now()
);
CREATE TABLE public.invoices(
 id text PRIMARY KEY,subscription_id uuid REFERENCES public.subscriptions(id),
 amount numeric NOT NULL,status text DEFAULT 'paid',created_at timestamptz DEFAULT now()
);
CREATE TABLE public.app_settings(key text PRIMARY KEY,value jsonb NOT NULL);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_read ON public.subscription_plans FOR SELECT USING(true);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_own ON public.subscriptions FOR SELECT USING(user_id=auth.uid());
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_own ON public.invoices FOR SELECT
 USING(EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.user_id=auth.uid()));
GRANT SELECT ON public.profiles,public.subscription_plans,public.subscriptions,public.invoices TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_settings TO authenticated,anon;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-4000-8000-000000000001','admin@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','vendor-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','vendor-b@example.invalid');
INSERT INTO public.profiles(id,email,role)
 SELECT id,email,CASE WHEN id='00000000-0000-4000-8000-000000000001'::uuid
 THEN 'admin'::public.user_role ELSE 'vendor'::public.user_role END FROM auth.users;
INSERT INTO public.subscription_plans(id,name,price_monthly,price_yearly)
VALUES ('10000000-0000-4000-8000-000000000001','Basic',0,0),
 ('10000000-0000-4000-8000-000000000002','Professional',2500,25000),
 ('10000000-0000-4000-8000-000000000003','Enterprise',7500,75000);
INSERT INTO public.app_settings(key,value) VALUES ('advanced_feature_definitions','[]'::jsonb);
