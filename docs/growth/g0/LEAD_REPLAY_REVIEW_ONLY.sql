-- G0 candidate: disposable PostgreSQL only until reviewed production migration.
-- Existing RPC signature, RLS, legacy insert policy and 7-day receipt TTL unchanged.
BEGIN;
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
  if found then
    -- Compare the existing CRM record rather than storing another copy of PII.
    -- If an authorized retention/edit operation changed it, fail closed.
    if exists (select 1 from public.leads l
      where l.id=v_existing and l.business_id=p_business_id
        and l.name=pg_catalog.btrim(p_name) and l.email=pg_catalog.btrim(p_email)
        and l.phone=pg_catalog.btrim(p_phone) and l.message=pg_catalog.btrim(p_message))
    then return v_existing; end if;
    raise exception 'lead-request-conflict' using errcode='22023';
  end if;

  if not exists (select 1 from public.businesses
    where id=p_business_id and status='approved') then return null; end if;

  insert into public.slbi_lead_rate_limits as rate
    (bucket,window_hour,event_count,expires_at)
    values (p_rate_bucket,v_hour,1,v_hour+interval '48 hours')
  on conflict (bucket) do update
    set event_count=case when rate.window_hour=excluded.window_hour then rate.event_count+1 else 1 end,
        window_hour=excluded.window_hour,expires_at=excluded.expires_at
  returning event_count into v_ip_count;

  insert into public.slbi_lead_rate_limits as rate
    (bucket,window_hour,event_count,expires_at)
    values (p_business_bucket,v_hour,1,v_hour+interval '48 hours')
  on conflict (bucket) do update
    set event_count=case when rate.window_hour=excluded.window_hour then rate.event_count+1 else 1 end,
        window_hour=excluded.window_hour,expires_at=excluded.expires_at
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


COMMIT;
