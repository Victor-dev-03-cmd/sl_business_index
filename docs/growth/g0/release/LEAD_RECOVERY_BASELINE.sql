-- Captured live baseline for reviewed emergency recovery. Security defect returns if restored.
-- Do not use after intervening RPC edits. Generate a NEW migration; no data deletion.
CREATE OR REPLACE FUNCTION public.slbi_submit_verified_lead(p_request_id uuid, p_business_id uuid, p_name text, p_email text, p_phone text, p_message text, p_rate_bucket text, p_business_bucket text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;
REVOKE ALL ON FUNCTION public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_submit_verified_lead(uuid,uuid,text,text,text,text,text,text) TO service_role;
