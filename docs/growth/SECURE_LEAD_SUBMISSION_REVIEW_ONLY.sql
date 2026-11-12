-- REVIEW ONLY. NEVER apply before legacy mobile submission compatibility is verified.
-- This must be converted into a numbered Supabase migration before the final
-- coordinated release with web/mobile clients and server-only secrets.
begin;

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

commit;

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
