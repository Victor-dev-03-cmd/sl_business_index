CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),role text);
CREATE TABLE public.announcements(id uuid PRIMARY KEY,title text,message text,type text,target_role text,is_active boolean,starts_at timestamptz,ends_at timestamptz,created_at timestamptz);
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.profiles VALUES ('11111111-1111-4111-8111-111111111111','customer'),('22222222-2222-4222-8222-222222222222','vendor');
INSERT INTO public.announcements VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Public notice','Hello','info','all',true,now()-interval '1 day',NULL,now()-interval '1 day'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Vendor notice','Hello','info','vendor',true,now()-interval '1 day',NULL,now()),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Future notice','Hello','info','all',true,now()+interval '1 day',NULL,now()+interval '1 day');
