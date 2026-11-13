\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 fixture only, no live customer records or secrets.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $f$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
INSERT INTO auth.users(id) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
CREATE TABLE public.businesses(
  id uuid PRIMARY KEY,owner_id uuid REFERENCES auth.users(id),
  name text NOT NULL,category text,logo_url text,city text,status text
);
INSERT INTO public.businesses(id,owner_id,name,category,city,status) VALUES
('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Vendor A Shop','Retail','Jaffna','approved'),
('22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Vendor B Shop','Services','Colombo','approved');
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_owner_read ON public.businesses
  FOR SELECT TO authenticated USING(owner_id=auth.uid());
GRANT SELECT ON public.businesses TO authenticated;
