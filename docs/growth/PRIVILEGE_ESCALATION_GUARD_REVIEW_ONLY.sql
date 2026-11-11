-- CRITICAL SECURITY AUDIT — REVIEW ONLY / NOT APPLIED.
-- Live Supabase currently grants table-wide UPDATE on public.profiles.role,
-- businesses.status/is_verified/can_show_badge and verifications.status to
-- authenticated. RLS ownership checks DO NOT constrain allowed columns.
-- A vendor/customer could attempt to assign themselves privileged roles or
-- mark their own business verified. This plan enforces privileged invariants
-- at the database BEFORE row mutations. Must test with real auth contexts.
--
-- The triggers are SECURITY DEFINER because they inspect trusted role
-- values from profiles without RLS recursion; they do NOT authorize a write
-- by themselves and preserve all existing row-level ownership policies.
--
-- Review business/admin workflows before applying. The user requested one
-- coordinated production release; no production DDL should run yet.
begin;

create or replace function public.slbi_guard_privileged_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
declare
  v_actor uuid := (select auth.uid());
  v_admin boolean := false;
  v_claim_role text := (select auth.role());
begin
  -- Server-only service credentials remain privileged, but are never exposed
  -- to any browser, middleware or NEXT_PUBLIC_* configuration.
  if v_claim_role = 'service_role' then return new; end if;

  if v_actor is not null then
    select exists (
      select 1 from public.profiles p
      where p.id = v_actor and p.role::text in ('admin','ceo')
    ) into v_admin;
  end if;
  if v_admin then return new; end if;

  if TG_TABLE_NAME = 'profiles' then
    if TG_OP = 'INSERT' then
      -- New users must enter with the default non-privileged role.
      if new.role is distinct from 'customer'::public.user_role
        or new.verification_status is distinct from 'unverified'
        then raise exception 'privileged profile fields cannot be assigned by the client' using errcode='42501';
      end if;
    elsif TG_OP = 'UPDATE' then
      if new.role is distinct from old.role
        or new.verification_status is distinct from old.verification_status
        or new.id is distinct from old.id
        then raise exception 'profile role, identity and verification are protected' using errcode='42501';
      end if;
    end if;
  elsif TG_TABLE_NAME = 'businesses' then
    if TG_OP = 'INSERT' then
      if new.status is distinct from 'pending'
        or coalesce(new.is_verified,false)
        or coalesce(new.is_featured,false)
        or coalesce(new.can_show_badge,false)
        or new.verification_status is distinct from 'none'
        or coalesce(new.views,0) <> 0
        or coalesce(new.calls,0) <> 0
        then raise exception 'new listing cannot self-approve or invent metrics' using errcode='42501';
      end if;
    elsif TG_OP = 'UPDATE' then
      if new.owner_id is distinct from old.owner_id
        or new.status is distinct from old.status
        or new.verification_status is distinct from old.verification_status
        or new.is_verified is distinct from old.is_verified
        or new.can_show_badge is distinct from old.can_show_badge
        or new.is_featured is distinct from old.is_featured
        or new.verified_by is distinct from old.verified_by
        or new.verified_at is distinct from old.verified_at
        or new.rating is distinct from old.rating
        or new.reviews_count is distinct from old.reviews_count
        or new.views is distinct from old.views
        or new.calls is distinct from old.calls
        or new.id is distinct from old.id
        then raise exception 'listing moderation and engagement fields are protected' using errcode='42501';
      end if;
    end if;
  elsif TG_TABLE_NAME = 'verifications' then
    if TG_OP = 'INSERT' then
      if new.status is distinct from 'pending'
        or new.moderation_status is distinct from 'pending'
        then raise exception 'verification must begin in pending review' using errcode='42501';
      end if;
    elsif TG_OP = 'UPDATE' then
      -- Existing vendors submit a NEW verification request after rejection.
      -- Existing review rows cannot be altered or deleted by owners. The
      -- UI already only INSERTs and admin actions UPDATE via verified admin.
      raise exception 'business owners cannot edit verification review decisions' using errcode='42501';
    end if;
  end if;
  return new;
end
$guard$;

revoke execute on function public.slbi_guard_privileged_writes() from public,anon,authenticated;

drop trigger if exists slbi_guard_profiles_before_write on public.profiles;
create trigger slbi_guard_profiles_before_write
before insert or update on public.profiles
for each row execute function public.slbi_guard_privileged_writes();

drop trigger if exists slbi_guard_businesses_before_write on public.businesses;
create trigger slbi_guard_businesses_before_write
before insert or update on public.businesses
for each row execute function public.slbi_guard_privileged_writes();

drop trigger if exists slbi_guard_verifications_before_write on public.verifications;
create trigger slbi_guard_verifications_before_write
before insert or update on public.verifications
for each row execute function public.slbi_guard_privileged_writes();

-- Legacy RLS "Temporary Public View" exposes all businesses, even rejected
-- or pending. Once verified that no legacy route needs these rows, remove
-- the permissive public read policy. Vendor owner and approved public SELECT
-- policies still exist:
-- drop policy if exists "Temporary Public View" on public.businesses;

commit;

-- MANDATORY STAGING TEST MATRIX
-- [ ] authenticated customer cannot UPDATE own profiles.role to admin.
-- [ ] authenticated vendor cannot self-assign verified profile status.
-- [ ] authenticated vendor cannot approve listing/verification or grant badge.
-- [ ] authenticated vendor can still update allowed service_radius/SEO and profile.
-- [ ] owner cannot change another person's owner_id, status or metrics.
-- [ ] new customer can create own profile as default 'customer'.
-- [ ] new vendor registration path (vendor role assignment by trusted server)
--     works without treating untrusted browser claims as privileged.
-- [ ] admin/ceo approval actions and automated verified badge still work.
-- [ ] trust service_role only in server code; never NEXT_PUBLIC_*.
-- [ ] if an app trigger writes protected metrics on behalf of an ordinary
--     client, stage a trusted, validated RPC or adjust trigger conditions
--     based on authenticated admin role, not browser-supplied metadata.
-- [ ] verification status transitions and RLS isolation to other vendor.
--
-- TODO: after this priority patch, remove RLS "Profiles viewable by all",
-- protect PII and remove public notification spam INSERT. These must be
-- reviewed alongside existing admin account tooling before a safe rollout.
