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

begin;

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

  -- FOUND reflects whether a new row was inserted; replays do not
  -- become false-positive accepted/recorded events.
  return found;
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

commit;

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
