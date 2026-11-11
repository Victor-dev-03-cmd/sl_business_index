-- REVIEW-ONLY schema plan — not applied to the production Supabase project.
-- Precondition: code changes on draft PR #29 checked, admin/vendor signed-URL
-- proof viewers verified, owner/admin storage read policies verified.
-- Start with the storage migration AFTER all public URL consumers are replaced.

begin;

-- Persist vendor-configured optional notification preferences.
create table if not exists public.vendor_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reviews boolean not null default true,
  leads boolean not null default true,
  weekly_digest boolean not null default false,
  marketing_tips boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vendor_notification_preferences enable row level security;
revoke all on public.vendor_notification_preferences from public,anon,authenticated;
grant select,insert,update on public.vendor_notification_preferences to authenticated;

drop policy if exists "Vendor reads own preferences" on public.vendor_notification_preferences;
create policy "Vendor reads own preferences"
on public.vendor_notification_preferences for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "Vendor inserts own preferences" on public.vendor_notification_preferences;
create policy "Vendor inserts own preferences"
on public.vendor_notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists "Vendor updates own preferences" on public.vendor_notification_preferences;
create policy "Vendor updates own preferences"
on public.vendor_notification_preferences for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

-- CRITICAL: this bucket currently has PUBLIC access to uploaded identity/BR docs.
-- After admin and vendor signed URL consumers are deployed in the same release,
-- change the bucket to PRIVATE. Existing objects are retained.
update storage.buckets set public=false,
  file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','application/pdf']::text[]
where id='verification-docs';

-- Restrict future uploads to authenticated business owners with path
-- user_uuid/business_uuid/random_uuid.ext; do not disturb existing objects.
drop policy if exists "Authenticated users can upload verification docs" on storage.objects;
drop policy if exists "Vendor uploads own business verification docs" on storage.objects;
create policy "Vendor uploads own business verification docs"
on storage.objects for insert to authenticated
with check (
  bucket_id='verification-docs'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.businesses as business
    where business.id::text=(storage.foldername(name))[2]
      and business.owner_id=(select auth.uid())
  )
);

-- Keep existing vendor-own-document and admin-read policies.
-- Do not add any public SELECT policy to the bucket.

commit;

-- REVIEW CHECKS REQUIRED ON STAGING:
-- 1. anon read of known verification file URL returns 403/404.
-- 2. vendor A can sign own stored object and cannot sign vendor B object.
-- 3. admin can sign all verification objects.
-- 4. new upload validates path + MIME + file size; no arbitrary user path.
-- 5. Legacy proof URLs in verifications.br_document_url still preview via signed URL.
-- 6. Vendor update of verification status must be separately audited and locked
--    before launch (RLS currently grants own verification rows ALL rights).
-- 7. In-app preferences are NOT yet synonymous with actual email/push delivery.
--    The message dispatch pipeline must check these settings before send.
