-- SLBI P0 INTEGRATED RELEASE CANDIDATE · REVIEW-ONLY · 2026-11-13
-- DO NOT APPLY TO PRODUCTION UNTIL FULL CLOUD+REAL-APP ACCEPTANCE AND BACKUP.
-- No direct edits/deletes of existing customer, business or billing records.
-- Assembled from stage-tested component SQL. This is one atomic transaction.
BEGIN;

-- ============== 1. docs/growth/p0/P0_SECURITY_STAGE_REVIEW_ONLY.sql ==============
-- SLBI P0 · STAGING-ONLY security hardening candidate (2026-11-12).
-- REVIEW ONLY: not in supabase/migrations and NEVER run against production
-- until authenticated vendor A/B, admin, anon, signup and legacy client tests pass.
--
-- Existing triggers protect profiles.role and business approval/badges. Preserve them.
-- This script deliberately does NOT touch public analytics/lead INSERT grants,
-- vendor views/calls counters, billing, or GrowthOS credit allocation.

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Approved businesses public')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Owners view own')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='businesses' AND policyname='Admins can manage all businesses')
  THEN
    RAISE EXCEPTION 'Required business access policies missing; abort without changes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t
       WHERE t.tgrelid='public.businesses'::regclass
         AND t.tgname='protect_business_approval' AND NOT t.tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger t
       WHERE t.tgrelid='public.profiles'::regclass
         AND t.tgname='prevent_profile_role_escalation' AND NOT t.tgisinternal)
  THEN
    RAISE EXCEPTION 'Existing privilege guards absent; abort';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='verifications'
       AND policyname='Admins can manage all verifications')
  THEN
    RAISE EXCEPTION 'Verification staff policy missing; abort';
  END IF;
END
$preflight$;

-- Existing approved/owner/staff policies remain intact.
DROP POLICY IF EXISTS "Temporary Public View" ON public.businesses;

-- Restrict vendors to only their own review request READ and pending INSERT.
-- Staff retains its separate admin/ceo ALL policy. No vendor review UPDATE/DELETE.
DROP POLICY IF EXISTS "Vendors manage own verifications" ON public.verifications;
DROP POLICY IF EXISTS "SLBI vendor read own verification requests" ON public.verifications;
CREATE POLICY "SLBI vendor read own verification requests" ON public.verifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=verifications.business_id
        AND b.owner_id=(SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS "SLBI vendor submit pending verification" ON public.verifications;
CREATE POLICY "SLBI vendor submit pending verification" ON public.verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    status='pending'
    AND COALESCE(moderation_status,'pending')='pending'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=verifications.business_id
        AND b.owner_id=(SELECT auth.uid())
    )
  );

-- Defense in depth for owner-editable profile identity/verification fields.
CREATE OR REPLACE FUNCTION public.slbi_p0_guard_profile_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE v_admin boolean;
BEGIN
  IF (SELECT auth.role())='service_role' THEN RETURN NEW; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.role::text IN ('admin','ceo')
  ) INTO v_admin;
  IF v_admin THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.verification_status IS DISTINCT FROM 'unverified'
       OR NEW.verification_image_url IS NOT NULL THEN
      RAISE EXCEPTION 'Profile verification must be reviewed by staff'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verification_image_url IS DISTINCT FROM OLD.verification_image_url THEN
      RAISE EXCEPTION 'Profile identity/verification fields require staff review'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;
REVOKE ALL ON FUNCTION public.slbi_p0_guard_profile_verification()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS slbi_p0_profile_review_guard ON public.profiles;
CREATE TRIGGER slbi_p0_profile_review_guard
  BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.slbi_p0_guard_profile_verification();

-- Prevent owners spoofing review audit attribution, without blocking existing
-- view/call counters or the admin's business status/verification triggers.
CREATE OR REPLACE FUNCTION public.slbi_p0_guard_business_review_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE v_admin boolean;
BEGIN
  IF (SELECT auth.role())='service_role' THEN RETURN NEW; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.role::text IN ('admin','ceo')
  ) INTO v_admin;
  IF v_admin THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.verified_by IS NOT NULL OR NEW.verified_at IS NOT NULL
       OR NEW.admin_notes IS NOT NULL OR NEW.verification_remarks IS NOT NULL THEN
      RAISE EXCEPTION 'Business audit fields require staff review'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.verification_remarks IS DISTINCT FROM OLD.verification_remarks THEN
      RAISE EXCEPTION 'Business identity/audit fields require staff review'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;
REVOKE ALL ON FUNCTION public.slbi_p0_guard_business_review_audit()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS slbi_p0_business_review_guard ON public.businesses;
CREATE TRIGGER slbi_p0_business_review_guard
  BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW
  EXECUTE FUNCTION public.slbi_p0_guard_business_review_audit();


-- ============== 2. docs/growth/p0/P0_PROFILE_PRIVACY_STAGE_REVIEW_ONLY.sql ==============
-- SLBI P0 · PRIVATE PROFILE READ RESTRICTIONS · STAGING ONLY.
-- NOT A PRODUCTION MIGRATION. Requires public UI, auth and admin E2E tests.
-- Objective: remove the currently unrestricted "Profiles viewable by all"
-- policy while preserving own-profile reads and admin/ceo user-management access.
--
-- Why an internal SECURITY DEFINER helper? Querying public.profiles inside a
-- policy on public.profiles itself causes infinite recursion. This helper is
-- deliberately in a NON-exposed schema, returns only a boolean, fixes
-- search_path, restricts EXECUTE, and never exposes profile data.

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can view own profile'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users update own profile'
  ) THEN
    RAISE EXCEPTION 'Expected owner policies absent: do not continue';
  END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS slbi_p0_internal;
REVOKE ALL ON SCHEMA slbi_p0_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA slbi_p0_internal TO authenticated;

CREATE OR REPLACE FUNCTION slbi_p0_internal.current_actor_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $helper$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid())
      AND p.role::text IN ('admin','ceo')
  )
$helper$;
REVOKE ALL ON FUNCTION slbi_p0_internal.current_actor_is_staff()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION slbi_p0_internal.current_actor_is_staff()
  TO authenticated;

DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;

DROP POLICY IF EXISTS "SLBI staff read account profiles" ON public.profiles;
CREATE POLICY "SLBI staff read account profiles" ON public.profiles
 FOR SELECT TO authenticated
 USING ((SELECT slbi_p0_internal.current_actor_is_staff()));

DROP POLICY IF EXISTS "SLBI staff update account profiles" ON public.profiles;
CREATE POLICY "SLBI staff update account profiles" ON public.profiles
 FOR UPDATE TO authenticated
 USING ((SELECT slbi_p0_internal.current_actor_is_staff()))
 WITH CHECK ((SELECT slbi_p0_internal.current_actor_is_staff()));

-- Public Data API should never return private user profiles.
-- This grant is unnecessary for own-profile queries (authenticated retains it).
-- Keep SELECT table GRANT for legacy RLS policies on public tables that
-- reference the current user's profile; SELECT on profiles still yields ZERO
-- rows to anon because no policy allows anon to read profiles.
-- Removing the GRANT is a separate migration after compatibility testing.

-- TEST BEFORE RELEASE: anonymous select denied, cross-user authenticated
-- select empty, owner read/update, admin user-management select/update,
-- account creation/trigger, password reset, navbar, notification state,
-- business-news article/review authors, Hono API and mobile clients.


-- ============== 3. docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql ==============
-- SLBI Growth Intelligence v1 — REVIEW ONLY; NOT APPLIED TO PRODUCTION.
-- This is the proposed SQL for a future reviewed Supabase migration.
-- Apply ONLY when the server-side ingestion endpoint, keys, consent rules and
-- rollback/anonymous/vendor tests are ready. Do not break legacy lead forms.
--
-- Prior dependency: configure server-only SUPABASE_SECRET_KEY (or legacy
-- SUPABASE_SERVICE_ROLE_KEY) and GROWTH_RATE_LIMIT_SECRET. The secret is never
-- exposed in NEXT_PUBLIC_* config. Enable GROWTH_EVENT_INGESTION_ENABLED only
-- after the migration is verified in staging.
--
-- This DDL must be reviewed for privilege changes before it is promoted from
-- docs to an actual generated migration in supabase/migrations/.

create table if not exists public.growth_event_rate_limits (
  bucket text primary key check (bucket ~ '^[a-f0-9]{64}$'),
  window_hour timestamptz not null,
  event_count integer not null default 0 check (event_count >= 0),
  expires_at timestamptz not null
);
create index if not exists growth_event_rate_limits_expiry
  on public.growth_event_rate_limits (expires_at);

alter table public.growth_event_rate_limits enable row level security;
revoke all on public.growth_event_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.growth_event_rate_limits to service_role;

-- Function runs with the CALLER's privileges, not SECURITY DEFINER.
-- No role other than the backend service_role is granted EXECUTE.
create or replace function public.slbi_record_growth_event(
  p_event_id uuid,
  p_business_id uuid,
  p_event_type text,
  p_channel text,
  p_rate_bucket text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $growth$
declare
  v_approved boolean;
  v_count integer;
  v_max integer;
  v_hour timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now());
begin
  if p_event_id is null or p_business_id is null
     or p_rate_bucket is null or p_rate_bucket !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  if p_event_type not in ('view', 'call_click', 'location_click') or
     p_channel not in ('business_detail', 'nearby_search', 'home_featured',
                       'category_browse', 'mobile_detail', 'direct', 'unknown') then
    return false;
  end if;

  -- Serialize retries for a request UUID before consuming rate quota.
  -- A duplicate with different business/type/channel must never be accepted.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_event_id::text,0));
  if exists(select 1 from public.analytics_logs where id=p_event_id) then
    return exists (
      select 1 from public.analytics_logs
      where id=p_event_id and business_id=p_business_id
        and event_type=p_event_type
        and metadata->>'channel'=p_channel
        and metadata->>'ingestion'='growth-v1'
    );
  end if;

  select exists (
    select 1 from public.businesses
    where id = p_business_id and status = 'approved'
  ) into v_approved;
  if not v_approved then return false; end if;

  v_max := case p_event_type
    when 'view' then 60 when 'call_click' then 30 else 30 end;

  insert into public.growth_event_rate_limits as limits
    (bucket, window_hour, event_count, expires_at)
    values (p_rate_bucket, v_hour, 1, v_hour + interval '48 hours')
  on conflict (bucket) do update
     set event_count = case
           when limits.window_hour = excluded.window_hour then limits.event_count + 1
           else 1 end,
         window_hour = excluded.window_hour,
         expires_at = excluded.expires_at
  returning event_count into v_count;

  if v_count > v_max then return false; end if;

  insert into public.analytics_logs
    (id, business_id, event_type, city, metadata)
    values (p_event_id, p_business_id, p_event_type, null,
      pg_catalog.jsonb_build_object('channel', p_channel, 'ingestion', 'growth-v1'))
  on conflict (id) do nothing;

  return true;
end
$growth$;

revoke all on function public.slbi_record_growth_event(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.slbi_record_growth_event(uuid,uuid,text,text,text)
  to service_role;
grant select on public.businesses to service_role;
grant insert on public.analytics_logs to service_role;

-- Disable direct browser bypass of server-side validation ONLY with the
-- above API endpoint configured. Existing vendor/admin SELECT policies remain.
drop policy if exists "Anyone can insert logs" on public.analytics_logs;
revoke insert on public.analytics_logs from public, anon, authenticated;

-- FUTURE RETENTION: schedule controlled expiry cleanup (48h+) for
-- growth_event_rate_limits. The HMAC bucket is pseudonymous; no raw IP,
-- stable visitor ID or precise coordinates are stored by this pipeline.
-- Existing untrusted analytics_logs rows stay intact for legacy reporting.
--
-- TEST BEFORE RELEASE:
-- anon/authenticated cannot INSERT analytics_logs or access rate limit table.
-- anon/authenticated cannot EXECUTE slbi_record_growth_event.
-- service_role can invoke function on approved business.
-- unapproved business returns false; invalid type/channel/bucket returns false.
-- 61st view per bucket/hour returns false; duplicate p_event_id inserts once.
-- vendor-owned logs SELECT works; vendor B cannot read vendor A.
-- existing business detail lead submission unchanged; client logging fail-open
-- to UI but server fails closed for writes when deployment is unconfigured.


-- ============== 4. docs/growth/SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql ==============
-- REVIEW ONLY. NEVER apply before legacy mobile submission compatibility is verified.
-- This must be converted into a numbered Supabase migration before the final
-- coordinated release with web/mobile clients and server-only secrets.

create table if not exists public.slbi_lead_request_receipts (
  request_id uuid primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists slbi_lead_request_receipts_created_at_idx
  on public.slbi_lead_request_receipts(created_at);

create table if not exists public.slbi_lead_rate_limits (
  bucket text primary key check (bucket ~ '^[a-f0-9]{64}$'),
  window_hour timestamptz not null,
  event_count integer not null check (event_count >= 0),
  expires_at timestamptz not null
);
create index if not exists slbi_lead_rate_limits_expires_at_idx
  on public.slbi_lead_rate_limits(expires_at);

alter table public.slbi_lead_request_receipts enable row level security;
alter table public.slbi_lead_rate_limits enable row level security;
revoke all on public.slbi_lead_request_receipts from public,anon,authenticated;
revoke all on public.slbi_lead_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.slbi_lead_request_receipts to service_role;
grant select,insert,update,delete on public.slbi_lead_rate_limits to service_role;

-- Called ONLY after successful, bound-hostname Cloudflare Turnstile Siteverify.
-- Caller is the isolated service-role key in Next.js server code.
create or replace function public.slbi_submit_verified_lead(
  p_request_id uuid,
  p_business_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_rate_bucket text,
  p_business_bucket text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $verified_lead$
declare
  v_existing uuid;
  v_lead uuid;
  v_hour timestamptz := pg_catalog.date_trunc('hour',pg_catalog.now());
  v_ip_count integer;
  v_business_count integer;
begin
  if p_request_id is null or p_business_id is null
    or p_name is null or p_email is null
    or p_phone is null or p_message is null
    or p_rate_bucket is null or p_rate_bucket !~ '^[a-f0-9]{64}$'
    or p_business_bucket is null or p_business_bucket !~ '^[a-f0-9]{64}$'
    or p_rate_bucket = p_business_bucket
    or pg_catalog.length(pg_catalog.btrim(p_name)) not between 2 and 100
    or pg_catalog.length(pg_catalog.btrim(p_email)) not between 3 and 160
    or pg_catalog.length(pg_catalog.btrim(p_phone)) not between 5 and 24
    or pg_catalog.length(pg_catalog.btrim(p_message)) not between 3 and 3000
  then return null; end if;

  -- Prevent concurrent retries of the same request ID from inserting two rows.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));

  select lead_id into v_existing
  from public.slbi_lead_request_receipts
  where request_id=p_request_id;
  if found then return v_existing; end if;

  if not exists (select 1 from public.businesses
    where id=p_business_id and status='approved') then return null; end if;

  insert into public.slbi_lead_rate_limits as rate
    (bucket,window_hour,event_count,expires_at)
    values (p_rate_bucket,v_hour,1,v_hour+interval '48 hours')
  on conflict (bucket) do update
    set event_count=rate.event_count+1
  returning event_count into v_ip_count;

  insert into public.slbi_lead_rate_limits as rate
    (bucket,window_hour,event_count,expires_at)
    values (p_business_bucket,v_hour,1,v_hour+interval '48 hours')
  on conflict (bucket) do update
    set event_count=rate.event_count+1
  returning event_count into v_business_count;

  -- At most 5 enquiries per client/listing and 200/listing per hour.
  if v_ip_count > 5 or v_business_count > 200 then return null; end if;

  insert into public.leads
    (business_id,name,email,phone,message,source,status)
    values (
      p_business_id,pg_catalog.btrim(p_name),
      pg_catalog.btrim(p_email),pg_catalog.btrim(p_phone),
      pg_catalog.btrim(p_message),'Business Detail Page','new'
    )
  returning id into v_lead;

  insert into public.slbi_lead_request_receipts (request_id,lead_id)
  values (p_request_id,v_lead);
  return v_lead;
end
$verified_lead$;

revoke execute on function public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text)
to service_role;
grant insert on public.leads to service_role;

-- DO NOT uncomment until the legacy Expo/React Native app has moved to the
-- verified mobile-compatible endpoint or has been retired:
-- drop policy if exists "Anyone can insert leads" on public.leads;
-- revoke insert on public.leads from public,anon,authenticated;

-- Service role can clean only ephemeral anti-abuse buckets + receipts.
-- CRM leads are NEVER removed by this function.
create or replace function public.slbi_cleanup_growth_ephemeral()
returns jsonb language plpgsql security invoker set search_path = ''
as $cleanup$
declare v_lead_buckets integer:=0; v_event_buckets integer:=0;
        v_receipts integer:=0;
begin
  delete from public.slbi_lead_rate_limits where expires_at < pg_catalog.now();
  get diagnostics v_lead_buckets = row_count;

  delete from public.slbi_lead_request_receipts
    where created_at < pg_catalog.now() - interval '7 days';
  get diagnostics v_receipts = row_count;

  -- If growth_event_rate_limits migration is not yet present, the CALLER
  -- must apply that migration first. This is a coordinated release.
  delete from public.growth_event_rate_limits
    where expires_at < pg_catalog.now();
  get diagnostics v_event_buckets = row_count;

  return pg_catalog.jsonb_build_object(
    'lead_buckets',v_lead_buckets,
    'event_buckets',v_event_buckets,
    'lead_receipts',v_receipts
  );
end
$cleanup$;
revoke execute on function public.slbi_cleanup_growth_ephemeral()
from public,anon,authenticated;
grant execute on function public.slbi_cleanup_growth_ephemeral()
to service_role;

-- TEST ON STAGING BEFORE PRODUCTION
-- [ ] Anon cannot call RPC or read lead receipt/rate tables.
-- [ ] Unapproved / forged business IDs cannot create CRM leads.
-- [ ] First request -> lead; same request UUID retried -> same lead UUID.
-- [ ] Different request IDs in same 1h bucket -> denied after 5.
-- [ ] Email/phone/message length and whitespace validation.
-- [ ] Vendor A cannot read vendor B leads or notes under existing RLS.
-- [ ] Retention cleanup deletes only expired rate rows & 7+ day receipts.
-- [ ] No raw IP, challenge token or GPS is written to either rate table.
-- [ ] Existing mobile lead submissions still work BEFORE policy revocation.


-- ============== 5. docs/growth/p0/P0_LEGACY_LEADS_STAGE_REVIEW_ONLY.sql ==============
-- SLBI P0 / STAGING ONLY — Compatibility RLS for legacy direct public enquiries.
-- Does not revoke INSERT from old mobile installs; not anti-bot equivalence.
-- Explicitly permits legitimate approved-business enquiries while rejecting
-- forged conversion status, unapproved listing IDs and oversized payloads.
-- No production execution without cloud + mobile acceptance review.

DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='leads' AND policyname='Anyone can insert leads') THEN
   RAISE EXCEPTION 'Unexpected legacy lead policy; require manual review';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='businesses' AND policyname='Approved businesses public') THEN
   RAISE EXCEPTION 'Approved public business policy absent';
 END IF;
END $preflight$;

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "SLBI legacy compatible enquiry insert" ON public.leads;
CREATE POLICY "SLBI legacy compatible enquiry insert" ON public.leads
 FOR INSERT TO anon,authenticated
 WITH CHECK (
  business_id IS NOT NULL
  AND status='new'
  AND name IS NOT NULL
  AND pg_catalog.length(pg_catalog.btrim(name)) BETWEEN 2 AND 100
  AND (email IS NULL OR pg_catalog.length(email) <= 254)
  AND (phone IS NULL OR pg_catalog.length(phone) <= 40)
  AND (message IS NULL OR pg_catalog.length(message) <= 5000)
  AND (source IS NULL OR pg_catalog.length(source) <= 120)
  AND (email IS NOT NULL OR phone IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=leads.business_id AND b.status='approved'
  )
 );
-- The existing vendors SELECT/UPDATE policies and all existing lead records
-- are preserved. Old mobile installs can still use anon INSERT.


-- ============== 6. supabase/migrations/20261110010000_growth_os_credit_foundation.sql ==============
-- Growth OS phase 1: secure, non-destructive credit wallet foundation.
-- Existing subscriptions/invoices are not rewritten.
-- Browser users must never grant themselves paid plans or paid invoices.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.growth_credit_plans (
  plan_name text PRIMARY KEY,
  monthly_credits integer NOT NULL CHECK (monthly_credits BETWEEN 0 AND 1000000)
);
INSERT INTO public.growth_credit_plans(plan_name,monthly_credits)
VALUES ('Basic',30),('Professional',500),('Enterprise',1500)
ON CONFLICT(plan_name) DO NOTHING;

-- Only trusted service-role backend may assign verified Growth OS entitlements.
-- Legacy client-generated subscription invoices do not unlock Growth credits.
CREATE TABLE IF NOT EXISTS public.growth_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL REFERENCES public.growth_credit_plans(plan_name)
    CHECK (plan_name <> 'Basic'),
  payment_reference text NOT NULL CHECK (length(payment_reference) BETWEEN 3 AND 200),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > verified_at)
);

CREATE TABLE IF NOT EXISTS public.growth_credit_wallets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  plan_name text NOT NULL REFERENCES public.growth_credit_plans(plan_name),
  credit_limit integer NOT NULL CHECK(credit_limit>=0),
  credits_remaining integer NOT NULL CHECK(credits_remaining>=0),
  credits_used integer NOT NULL DEFAULT 0 CHECK(credits_used>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,period_start)
);
CREATE TABLE IF NOT EXISTS public.growth_credit_actions (
  action_key text PRIMARY KEY,
  credit_cost integer NOT NULL CHECK(credit_cost>0),
  is_enabled boolean NOT NULL DEFAULT false
);
-- Do not enable deductions before actual SEO/AI backend jobs exist.
INSERT INTO public.growth_credit_actions(action_key,credit_cost,is_enabled)
VALUES ('seo_basic_audit',10,false),('ai_social_draft',2,false),('ai_email_draft',3,false)
ON CONFLICT(action_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.growth_credit_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  action_key text NOT NULL,
  delta integer NOT NULL CHECK(delta<>0),
  balance_after integer NOT NULL CHECK(balance_after>=0),
  request_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,period_start) REFERENCES
    public.growth_credit_wallets(user_id,period_start) ON DELETE CASCADE,
  UNIQUE(user_id,period_start,request_key)
);
CREATE INDEX IF NOT EXISTS growth_credit_history_idx
  ON public.growth_credit_ledger(user_id,created_at DESC);

ALTER TABLE public.growth_credit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY growth_plans_read ON public.growth_credit_plans
  FOR SELECT TO authenticated USING(true);
CREATE POLICY growth_actions_read ON public.growth_credit_actions
  FOR SELECT TO authenticated USING(true);
CREATE POLICY growth_entitlements_read ON public.growth_entitlements
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY growth_wallets_read ON public.growth_credit_wallets
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY growth_ledger_read ON public.growth_credit_ledger
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger TO authenticated;
GRANT ALL ON public.growth_credit_plans, public.growth_entitlements,
  public.growth_credit_wallets, public.growth_credit_actions,
  public.growth_credit_ledger TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.growth_credit_ledger_id_seq TO service_role;

-- Row-locked wallet creation/reconciliation. Month boundaries are UTC.
-- Upgrades top up immediately. Downgrades and expired entitlements reclaim
-- unspent paid credits while preserving usage history.
CREATE FUNCTION public._growth_ensure_wallet(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_period date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_plan text := 'Basic';
  v_allowance integer;
  v_wallet public.growth_credit_wallets%ROWTYPE;
  v_balance integer;
  v_delta integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user'; END IF;
  SELECT e.plan_name INTO v_plan FROM public.growth_entitlements e
  WHERE e.user_id=p_user_id AND e.expires_at>now()
  ORDER BY e.verified_at DESC LIMIT 1;
  v_plan:=COALESCE(v_plan,'Basic');
  SELECT p.monthly_credits INTO v_allowance FROM public.growth_credit_plans p
  WHERE p.plan_name=v_plan;
  IF v_allowance IS NULL THEN RAISE EXCEPTION 'Growth plan configuration missing'; END IF;

  INSERT INTO public.growth_credit_wallets
    (user_id,period_start,plan_name,credit_limit,credits_remaining)
  VALUES(p_user_id,v_period,v_plan,v_allowance,v_allowance)
  ON CONFLICT(user_id,period_start) DO NOTHING;

  SELECT * INTO v_wallet FROM public.growth_credit_wallets
  WHERE user_id=p_user_id AND period_start=v_period FOR UPDATE;

  INSERT INTO public.growth_credit_ledger
    (user_id,period_start,action_key,delta,balance_after,request_key)
  VALUES(p_user_id,v_period,'monthly_grant',v_wallet.credit_limit,
    v_wallet.credit_limit,'monthly-grant')
  ON CONFLICT(user_id,period_start,request_key) DO NOTHING;

  IF v_wallet.credit_limit<>v_allowance OR v_wallet.plan_name<>v_plan THEN
    IF v_allowance>v_wallet.credit_limit THEN
      v_balance:=v_wallet.credits_remaining+v_allowance-v_wallet.credit_limit;
    ELSE
      v_balance:=LEAST(v_wallet.credits_remaining,
        GREATEST(0,v_allowance-v_wallet.credits_used));
    END IF;
    v_delta:=v_balance-v_wallet.credits_remaining;
    UPDATE public.growth_credit_wallets SET
      plan_name=v_plan,credit_limit=v_allowance,
      credits_remaining=v_balance,updated_at=now()
    WHERE user_id=p_user_id AND period_start=v_period;
    IF v_delta<>0 THEN
      INSERT INTO public.growth_credit_ledger
        (user_id,period_start,action_key,delta,balance_after)
      VALUES(p_user_id,v_period,'entitlement_adjustment',v_delta,v_balance);
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._growth_ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._growth_ensure_wallet(uuid) TO service_role;

-- Signed-in users can only read/provision their own wallet.
CREATE FUNCTION public.growth_wallet_status()
RETURNS TABLE(plan_name text,monthly_allowance integer,credits_remaining integer,
  credits_used integer,period_start date,resets_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  PERFORM public._growth_ensure_wallet(v_uid);
  RETURN QUERY SELECT w.plan_name,w.credit_limit,w.credits_remaining,
    w.credits_used,w.period_start,
    (w.period_start + INTERVAL '1 month') AT TIME ZONE 'UTC'
  FROM public.growth_credit_wallets w
  WHERE w.user_id=v_uid
    AND w.period_start=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_wallet_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.growth_wallet_status() TO authenticated;

-- Future services must validate user/workspace and real operation success
-- before calling this function with service-role credentials.
-- Action cost is NOT supplied by clients. Retries use an idempotency key.
CREATE FUNCTION public.growth_consume_credits(
  p_user_id uuid,p_action_key text,p_request_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_period date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  v_cost integer;
  v_balance integer;
  v_existing text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted server only' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_request_key IS NULL
     OR length(p_request_key)<8 OR length(p_request_key)>120 THEN
    RAISE EXCEPTION 'Invalid credit request' USING ERRCODE='22023';
  END IF;
  SELECT credit_cost INTO v_cost FROM public.growth_credit_actions
  WHERE action_key=p_action_key AND is_enabled;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'Feature not enabled'; END IF;

  PERFORM public._growth_ensure_wallet(p_user_id);
  SELECT credits_remaining INTO v_balance FROM public.growth_credit_wallets
  WHERE user_id=p_user_id AND period_start=v_period FOR UPDATE;

  SELECT action_key INTO v_existing FROM public.growth_credit_ledger
  WHERE user_id=p_user_id AND period_start=v_period AND request_key=p_request_key;
  IF FOUND THEN
    IF v_existing<>p_action_key THEN RAISE EXCEPTION 'Idempotency conflict'; END IF;
    RETURN v_balance;
  END IF;
  IF v_balance<v_cost THEN
    RAISE EXCEPTION 'Insufficient growth credits' USING ERRCODE='P0001';
  END IF;
  v_balance:=v_balance-v_cost;
  UPDATE public.growth_credit_wallets SET
    credits_remaining=v_balance,credits_used=credits_used+v_cost,
    updated_at=now()
  WHERE user_id=p_user_id AND period_start=v_period;
  INSERT INTO public.growth_credit_ledger
    (user_id,period_start,action_key,delta,balance_after,request_key)
  VALUES(p_user_id,v_period,p_action_key,-v_cost,v_balance,p_request_key);
  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.growth_consume_credits(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.growth_consume_credits(uuid,text,text)
  TO service_role;

-- Harden the 100% internal trigger-only SECURITY DEFINER routines.
-- These remain executable as installed triggers. Exempt legitimate public
-- discovery/read RPCs (which require separate interface-specific audit).
DO $p0_trigger_exec$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname,pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.prorettype='trigger'::regtype
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END $p0_trigger_exec$;

-- Chat-room mutation should not be invokable anonymously. Existing
-- authenticated chat API remains authorized; RLS/identity checks still apply.
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_room(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_room(uuid,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid) TO authenticated;

COMMIT;
