-- SLBI Email V6 — only SEND TEST TO THE SAME CONNECTED GMAIL MAILBOX.
-- No third-party recipients, bulk sends, scheduled jobs or contact-list imports.
create table if not exists public.marketing_email_test_sends(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_id uuid not null references public.marketing_connections(id) on delete cascade,
  request_key uuid not null,
  target_email text not null check(char_length(target_email) between 3 and 220),
  state text not null default 'reserved'
    check(state in ('reserved','sent','failed','unknown')),
  provider_message_id text check(provider_message_id is null or char_length(provider_message_id)<=200),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(owner_id,request_key)
);
create index if not exists email_test_owner_business_day
  on public.marketing_email_test_sends(owner_id,business_id,created_at desc);
create index if not exists email_test_connection_fk
  on public.marketing_email_test_sends(connection_id);
create index if not exists email_test_business_fk
  on public.marketing_email_test_sends(business_id);
alter table public.marketing_email_test_sends enable row level security;
revoke all on public.marketing_email_test_sends from public,anon,authenticated;
-- Trusted service_role-only writes. Owner UI may receive aggregate counts from
-- an authenticated, owner-checked API, but never direct token or service rows.
grant usage on schema slbi_internal to service_role;
create or replace function slbi_internal.reserve_email_self_test(
  p_owner_id uuid,p_business_id uuid,p_connection_id uuid,
  p_request_key uuid,p_recipient text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_id uuid;v_total integer;v_business integer;v_day timestamptz;
begin
  if p_owner_id is null or p_business_id is null or p_connection_id is null
     or p_request_key is null or p_recipient is null
     or length(p_recipient) not between 3 and 220
     or p_recipient !~* '^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,30}$'
  then return null; end if;
  -- Never let the client submit a different recipient. Only the account that
  -- the actual OAuth callback verified may receive this test.
  if not exists(
    select 1 from public.marketing_connections c
    join public.businesses b on b.id=c.business_id
    where c.id=p_connection_id and c.user_id=p_owner_id
      and c.business_id=p_business_id and c.provider='google_mail'
      and c.status='connected' and c.account_display_name=p_recipient
      and b.owner_id=p_owner_id and b.status='approved'
      and 'https://www.googleapis.com/auth/gmail.send'=any(c.granted_scopes)
  ) then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('slbi_email_test|'||p_owner_id::text,0));
  if exists(select 1 from public.marketing_email_test_sends
    where owner_id=p_owner_id and request_key=p_request_key)
  then return null; end if;
  v_day:=pg_catalog.date_trunc('day',pg_catalog.now());
  select count(*) into v_total from public.marketing_email_test_sends
    where owner_id=p_owner_id and created_at>=v_day;
  select count(*) into v_business from public.marketing_email_test_sends
    where owner_id=p_owner_id and business_id=p_business_id
      and created_at>=v_day;
  if v_total>=8 or v_business>=3 then return null; end if;
  insert into public.marketing_email_test_sends(
    owner_id,business_id,connection_id,request_key,target_email,state
  ) values(p_owner_id,p_business_id,p_connection_id,p_request_key,p_recipient,'reserved')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function slbi_internal.reserve_email_self_test(uuid,uuid,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function slbi_internal.reserve_email_self_test(uuid,uuid,uuid,uuid,text)
 to service_role;

-- Public Data API wrapper exposed only to the server service_role.
-- slbi_internal is deliberately *not* a PostgREST exposed schema.
create or replace function public.slbi_reserve_email_self_test(
  p_owner_id uuid,p_business_id uuid,p_connection_id uuid,
  p_request_key uuid,p_recipient text
) returns uuid
language sql
security invoker
set search_path=''
as $EMAILTEST$
  select slbi_internal.reserve_email_self_test(
    p_owner_id,p_business_id,p_connection_id,p_request_key,p_recipient);
$EMAILTEST$;
revoke all on function public.slbi_reserve_email_self_test(uuid,uuid,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.slbi_reserve_email_self_test(uuid,uuid,uuid,uuid,text)
 to service_role;

-- Note: Future retention job should purge old self-test rows after 30 days;
-- do not add unreviewed automatic purge or public APIs now.
