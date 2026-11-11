-- SLBI GROWTH/PORTAL SECURITY — REVIEW ONLY / NOT APPLIED.
--
-- VERIFIED 2026-11-11 (read-only pg_trigger + pg_get_functiondef):
-- Existing BEFORE triggers ALREADY BLOCK most direct browser privilege writes:
-- * growth_prevent_profile_role_escalation guards profiles.role.
-- * growth_protect_business_approval guards businesses.status, owner_id,
--   is_verified, is_featured, can_show_badge, verification_status.
-- Do NOT recreate/drop/replace those working triggers in this release.
--
-- Remaining defense-in-depth gaps to audit and protect:
-- * profile.verification_status, id and audit fields
-- * business verification audit attribution, computed rating/engagement data
-- * vendor UPDATE of verification review rows (the public RLS policy is ALL);
--   although existing AFTER trigger/cascade may prevent status self-approval
--   through the business guard, explicit BEFORE guard is preferable.
-- * public.notifications arbitrary INSERT and exposed verification documents
--   are covered by separate review tasks.
--
-- This additive migration is STAGED ONLY. Test on an isolated Supabase branch.
begin;

create or replace function public.slbi_guard_remaining_privileged_writes()
returns trigger
language plpgsql
security definer
set search_path=''
as $guard$
declare
  v_actor uuid := (select auth.uid());
  v_admin boolean := false;
begin
  if (select auth.role())='service_role' then return new; end if;

  select exists (
    select 1 from public.profiles p
    where p.id=v_actor and p.role::text in ('admin','ceo')
  ) into v_admin;
  if v_admin then return new; end if;

  if TG_TABLE_NAME='profiles' then
    if TG_OP='INSERT' then
      if new.verification_status is distinct from 'unverified' then
        raise exception 'untrusted profile cannot self-verify' using errcode='42501';
      end if;
    else
      if new.id is distinct from old.id
        or new.verification_status is distinct from old.verification_status
        then raise exception 'account identity and verification need staff review' using errcode='42501';
      end if;
    end if;
  elsif TG_TABLE_NAME='businesses' then
    if TG_OP='INSERT' then
      if new.verified_by is not null or new.verified_at is not null
        or new.admin_notes is not null
        or coalesce(new.rating,0)<>0
        or coalesce(new.reviews_count,0)<>0
        or coalesce(new.views,0)<>0
        or coalesce(new.calls,0)<>0
        then raise exception 'new listing cannot set trusted audit or engagement metrics' using errcode='42501';
      end if;
    else
      if new.verified_by is distinct from old.verified_by
        or new.verified_at is distinct from old.verified_at
        or new.admin_notes is distinct from old.admin_notes
        or new.rating is distinct from old.rating
        or new.reviews_count is distinct from old.reviews_count
        or new.views is distinct from old.views
        or new.calls is distinct from old.calls
        or new.id is distinct from old.id
        then raise exception 'listing audit and engagement fields are protected' using errcode='42501';
      end if;
    end if;
  elsif TG_TABLE_NAME='verifications' then
    if TG_OP='INSERT' then
      if new.status is distinct from 'pending'
        or new.moderation_status is distinct from 'pending'
        then raise exception 'verification begins in pending state' using errcode='42501';
      end if;
    else
      -- Vendor may submit a new request after rejection, never alter an
      -- existing review row's status, BR metadata or attached documents.
      raise exception 'business owner cannot edit submitted verification review' using errcode='42501';
    end if;
  end if;
  return new;
end
$guard$;

revoke execute on function public.slbi_guard_remaining_privileged_writes()
from public,anon,authenticated;

drop trigger if exists slbi_guard_secondary_profile_writes on public.profiles;
create trigger slbi_guard_secondary_profile_writes before insert or update
on public.profiles for each row execute function public.slbi_guard_remaining_privileged_writes();

drop trigger if exists slbi_guard_secondary_business_writes on public.businesses;
create trigger slbi_guard_secondary_business_writes before insert or update
on public.businesses for each row execute function public.slbi_guard_remaining_privileged_writes();

drop trigger if exists slbi_guard_secondary_verification_writes on public.verifications;
create trigger slbi_guard_secondary_verification_writes before insert or update
on public.verifications for each row execute function public.slbi_guard_remaining_privileged_writes();

commit;

-- STAGING COMPATIBILITY / SECURITY MATRIX
-- [ ] Existing growth_prevent_profile_role_escalation and
--     growth_protect_business_approval still remain installed.
-- [ ] Own-profile ordinary user cannot set 'verified', but can save name/phone.
-- [ ] Existing signup with role='customer' and default verification works.
-- [ ] Admin/ceo can still approve/reject verification records.
-- [ ] Existing increment_business_views SECURITY DEFINER RPC still increments
--     views; confirm that the caller's JWT cannot spoof privileges and that
--     view rate is bounded (it is a separate abuse/control problem).
-- [ ] Ordinary owner can change service_radius / seo_keywords / is_open.
-- [ ] Ordinary owner cannot fabricate ratings or engagement counters.
-- [ ] Existing auth/storage triggers execute normally (no hidden new blockers).
-- [ ] Vendor cannot modify an approved or pending verification review row.
-- [ ] Admin portal direct status changes still work.
-- [ ] Verify nullable defaults on existing profile/business rows.
--
-- Separate pending audit: 'Temporary Public View' business RLS policy,
-- public profile PII select policy, and public notification INSERT.
-- Do not remove these without a compatibility test for public/admin/mobile
-- clients and a migration rollback plan.
