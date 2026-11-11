\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 fixture ONLY: no production data or service keys.
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable set search_path = '' as $$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.role() returns text language sql stable set search_path = '' as $$
  select pg_catalog.current_setting('request.jwt.claim.role',true)
$$;
create function storage.foldername(name text) returns text[] language sql stable
  set search_path = '' as $$ select pg_catalog.string_to_array(name,'/') $$;
create table storage.buckets (
 id text primary key,
 public boolean not null default true,
 file_size_limit bigint,
 allowed_mime_types text[]
);
create table storage.objects (
 id uuid primary key default gen_random_uuid(),
 bucket_id text not null references storage.buckets(id),
 name text not null
);
insert into storage.buckets(id,public) values ('verification-docs',true);
create table public.profiles (
 id uuid primary key references auth.users(id),
 role text not null default 'vendor',
 verification_status text default 'unverified',
 full_name text,
 phone text
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references auth.users(id),
 status text default 'pending',
 name text,
 verified_by uuid,
 verified_at timestamptz,
 admin_notes text,
 rating numeric default 0,
 reviews_count int default 0,
 views int default 0,
 calls int default 0,
 is_verified bool default false,
 is_featured bool default false,
 can_show_badge bool default false,
 verification_status text default 'none',
 service_radius int default 5,
 seo_keywords text[] default '{}'
);
create table public.verifications (
 id uuid primary key default gen_random_uuid(),
 business_id uuid references public.businesses(id),
 status text default 'pending',
 moderation_status text default 'pending',
 br_number text,
 br_document_url text
);
create table public.analytics_logs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid references public.businesses(id),
 event_type text not null,
 city text,
 metadata jsonb default '{}'::jsonb,
 created_at timestamptz default now()
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 business_id uuid references public.businesses(id),
 name text not null,
 email text,
 phone text,
 message text,
 source text,
 status text default 'new',
 created_at timestamptz default now()
);
alter table public.analytics_logs enable row level security;
alter table public.leads enable row level security;
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.verifications enable row level security;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
grant select on public.businesses to anon,authenticated,service_role;
grant select,insert on public.analytics_logs to anon,authenticated,service_role;
grant select,insert on public.leads to anon,authenticated,service_role;
grant select,insert,update on public.profiles,public.verifications to authenticated,service_role;
grant insert,update on public.businesses to authenticated,service_role;
grant select on public.profiles to authenticated,service_role;
grant select on public.verifications to authenticated,service_role;
create policy "Anyone can insert logs" on public.analytics_logs for insert to public with check(true);
create policy "Anyone can insert leads" on public.leads for insert to public with check(true);
create policy "Vendors view own leads" on public.leads for select to authenticated
 using (exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy "Owners view own" on public.businesses for select to authenticated using (owner_id=(select auth.uid()));
create policy "Vendors own profile" on public.profiles for all to authenticated
 using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy "Owners manage verifications" on public.verifications for all to authenticated
 using (exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())))
 with check (exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy "Authenticated users can upload verification docs" on storage.objects
  for insert to authenticated with check(bucket_id='verification-docs');

-- Rehearse the exact reviewed SQL; do not silently replace it with an easier
-- copy just to make this test pass. These files remain REVIEW ONLY.
\ir ../../docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql
\ir ../../docs/growth/SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql
\ir ../../docs/growth/VENDOR_SETTINGS_PRIVACY_REVIEW_ONLY.sql
\ir ../../docs/growth/PRIVILEGE_ESCALATION_GUARD_REVIEW_ONLY.sql

do $verify_permissions$
begin
 if has_function_privilege('anon','public.slbi_record_growth_event(uuid,uuid,text,text,text)','EXECUTE') then
   raise exception 'anon can execute event ingestion RPC';
 end if;
 if has_function_privilege('authenticated','public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)','EXECUTE') then
   raise exception 'vendor can execute protected lead RPC';
 end if;
 if has_table_privilege('anon','public.analytics_logs','INSERT') then
   raise exception 'anon can bypass secure event collector';
 end if;
 if has_table_privilege('authenticated','public.slbi_lead_rate_limits','SELECT') then
   raise exception 'vendor can read anti-abuse tokens';
 end if;
 if exists (select 1 from storage.buckets where id='verification-docs' and public=true) then
   raise exception 'verification documents still publicly accessible';
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='vendor_notification_preferences' and policyname='Vendor reads own preferences') then
   raise exception 'notification owner select policy missing';
 end if;
end
$verify_permissions$;

-- Service role bypasses RLS like Supabase's protected key; this is still
-- a clean ephemeral fixture with fake UUIDs and no user information.
set role service_role;
do $verify_ingestion$
declare
 b uuid := '4a0c426a-25e8-42f8-94c3-0a844e97d002';
 owner_id uuid := '7dbeff28-8c02-4838-a1eb-57e2ba6e7a20';
 ev uuid := 'f727f0ad-6731-4b3a-9de6-27d7dd389a33';
 receipt uuid := 'a6720a4a-72a8-4651-9258-315c13945d19';
 hash text:=repeat('b',64);
 person text:=repeat('a',64);
 listing text:=repeat('c',64);
 initial_lead uuid;
 duplicate_lead uuid;
 outcome boolean;
 i integer;
begin
 insert into auth.users(id) values(owner_id);
 insert into public.profiles(id,role,verification_status) values(owner_id,'vendor','unverified');
 insert into public.businesses(id,owner_id,status,name) values(b,owner_id,'approved','Fixture listing');
 outcome:=public.slbi_record_growth_event(ev,b,'view','business_detail',hash);
 if outcome is distinct from true then raise exception 'valid view was rejected';end if;
 outcome:=public.slbi_record_growth_event(ev,b,'view','business_detail',hash);
 if outcome is distinct from true then raise exception 'replayed event did not dedupe cleanly';end if;
 if (select count(*) from public.analytics_logs where id=ev)<>1 then
  raise exception 'duplicate view was inserted';
 end if;
 if public.slbi_record_growth_event(gen_random_uuid(),b,'purchase','business_detail',hash) then
  raise exception 'unapproved event type accepted';
 end if;
 if public.slbi_record_growth_event(gen_random_uuid(),gen_random_uuid(),'view','business_detail',hash) then
  raise exception 'unapproved listing accepted';
 end if;
 for i in 1..59 loop
  outcome:=public.slbi_record_growth_event(gen_random_uuid(),b,'view','business_detail',hash);
 end loop;
 if public.slbi_record_growth_event(gen_random_uuid(),b,'view','business_detail',hash) then
  raise exception 'event rate limit failed';
 end if;
 initial_lead:=public.slbi_submit_verified_lead(
   receipt,b,'Customer','customer@example.com','+94770000000',
   'Please share your service details',person,listing);
 if initial_lead is null then raise exception 'valid lead rejected';end if;
 duplicate_lead:=public.slbi_submit_verified_lead(
   receipt,b,'Customer','customer@example.com','+94770000000',
   'Please share your service details',person,listing);
 if initial_lead is distinct from duplicate_lead then
  raise exception 'lead idempotency not preserved';
 end if;
 for i in 1..4 loop
  duplicate_lead:=public.slbi_submit_verified_lead(
   gen_random_uuid(),b,'Customer','customer@example.com','+94770000000',
   'Please share your service details',person,listing);
  if duplicate_lead is null then raise exception 'allowed lead rejected';end if;
 end loop;
 if public.slbi_submit_verified_lead(
   gen_random_uuid(),b,'Customer','customer@example.com','+94770000000',
   'Please share your service details',person,listing) is not null then
  raise exception 'lead rate limit failed';
 end if;
 if (select count(*) from public.leads where business_id=b)<>5 then
  raise exception 'incorrect number of leads';
 end if;
 if public.slbi_submit_verified_lead(
   gen_random_uuid(),gen_random_uuid(),'Customer','customer@example.com','+94770000000',
   'Please share your service details',repeat('d',64),repeat('e',64)) is not null then
  raise exception 'unapproved listing accepted lead';
 end if;
end
$verify_ingestion$;
reset role;
\echo 'Growth security SQL integration checks passed on disposable PostgreSQL 17'
