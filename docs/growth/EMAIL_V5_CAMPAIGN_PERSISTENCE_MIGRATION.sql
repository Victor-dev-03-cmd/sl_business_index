-- SLBI Email V5: isolated email campaign drafts (not the existing social marketing_campaigns).
-- Additive only. Does not dispatch email, import contacts or alter OAuth flows.
-- Verified in separate role-context tests before applying to production.
begin;

create table if not exists public.marketing_email_campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  state text not null default 'draft' check (state='draft'),
  draft jsonb not null check (
    jsonb_typeof(draft)='object'
    and pg_catalog.octet_length(draft::text) <= 40000
    and draft->>'status'='local_draft'
    and draft->>'id'=id::text
    and draft->>'ownerScope'=owner_id::text
    and draft->>'businessId'=business_id::text
    and jsonb_typeof(draft->'blocks')='array'
    and jsonb_array_length(draft->'blocks') between 1 and 20
  ),
  revision integer not null default 1 check (revision>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_drafts_owner_business_updated
  on public.marketing_email_campaign_drafts(owner_id,business_id,updated_at desc);
alter table public.marketing_email_campaign_drafts enable row level security;
revoke all on public.marketing_email_campaign_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.marketing_email_campaign_drafts to authenticated;

create policy email_draft_owner_select on public.marketing_email_campaign_drafts
 for select to authenticated using (owner_id=(select auth.uid()));
create policy email_draft_owner_insert on public.marketing_email_campaign_drafts
 for insert to authenticated with check (
  owner_id=(select auth.uid())
  and exists(select 1 from public.businesses b
    where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved')
 );
create policy email_draft_owner_update on public.marketing_email_campaign_drafts
 for update to authenticated using (owner_id=(select auth.uid()))
 with check (
  owner_id=(select auth.uid())
  and exists(select 1 from public.businesses b
    where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved')
 );
create policy email_draft_owner_delete on public.marketing_email_campaign_drafts
 for delete to authenticated using (owner_id=(select auth.uid()));

-- Append-only revision history. The invoker cannot fabricate history rows.
create table if not exists public.marketing_email_campaign_draft_history (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.marketing_email_campaign_drafts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  revision integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(campaign_id,revision)
);
create index if not exists email_draft_history_owner_id
  on public.marketing_email_campaign_draft_history(owner_id,campaign_id,revision desc);
alter table public.marketing_email_campaign_draft_history enable row level security;
revoke all on public.marketing_email_campaign_draft_history from public,anon,authenticated;
grant select on public.marketing_email_campaign_draft_history to authenticated;
create policy email_draft_history_owner_select
 on public.marketing_email_campaign_draft_history for select to authenticated
 using (owner_id=(select auth.uid()));

-- Trigger is deliberately non-exposed, no direct caller EXECUTE. It only records
-- changes already authorized by the campaign RLS and optimistic lock.
create schema if not exists slbi_internal;
revoke all on schema slbi_internal from public,anon,authenticated;
create or replace function slbi_internal.email_draft_audit()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.marketing_email_campaign_draft_history(
    campaign_id,owner_id,business_id,revision,snapshot
  ) values(new.id,new.owner_id,new.business_id,new.revision,new.draft);
  return new;
end;
$$;
revoke all on function slbi_internal.email_draft_audit()
 from public,anon,authenticated;
drop trigger if exists email_draft_audit_insert on public.marketing_email_campaign_drafts;
create trigger email_draft_audit_insert
 after insert or update of draft on public.marketing_email_campaign_drafts
 for each row execute function slbi_internal.email_draft_audit();

-- SECURITY INVOKER: auth.uid() and RLS apply to all reads/writes.
-- New draft: expected_revision=0; existing: exact current revision required.
-- Concurrent tabs cannot silently overwrite each other's work.
create or replace function public.slbi_email_save_draft(
 p_id uuid,p_business_id uuid,p_title text,p_draft jsonb,p_expected_revision integer
) returns table(saved_id uuid,saved_revision integer,saved_updated_at timestamptz)
language plpgsql
security invoker
set search_path=''
as $$
declare v_owner uuid:=(select auth.uid());v_count int;
begin
 if v_owner is null or p_id is null or p_business_id is null
   or p_title is null or char_length(pg_catalog.btrim(p_title)) not between 1 and 100
   or p_draft is null or pg_catalog.octet_length(p_draft::text)>40000
   or p_draft->>'id'<>p_id::text or p_draft->>'businessId'<>p_business_id::text
   or p_draft->>'ownerScope'<>v_owner::text
   or p_draft->>'status'<>'local_draft'
   or pg_catalog.jsonb_typeof(p_draft->'blocks')<>'array'
   or pg_catalog.jsonb_array_length(p_draft->'blocks') not between 1 and 20
   or p_expected_revision is null or p_expected_revision<0
 then
   return;
 end if;
 if p_expected_revision=0 then
   select count(*) into v_count from public.marketing_email_campaign_drafts
     where owner_id=v_owner and business_id=p_business_id;
   if v_count >= 200 then return; end if;
   return query
   insert into public.marketing_email_campaign_drafts(
     id,owner_id,business_id,title,draft,revision
   ) values(p_id,v_owner,p_business_id,pg_catalog.btrim(p_title),p_draft,1)
   on conflict(id) do nothing
   returning id,revision,updated_at;
 else
   return query
   update public.marketing_email_campaign_drafts as c
   set title=pg_catalog.btrim(p_title),draft=p_draft,revision=c.revision+1,
       updated_at=now()
   where c.id=p_id and c.owner_id=v_owner and c.business_id=p_business_id
         and c.state='draft' and c.revision=p_expected_revision
   returning c.id,c.revision,c.updated_at;
 end if;
end;
$$;
revoke all on function public.slbi_email_save_draft(uuid,uuid,text,jsonb,integer)
 from public,anon,authenticated;
grant execute on function public.slbi_email_save_draft(uuid,uuid,text,jsonb,integer)
 to authenticated;
commit;

-- Postmigration verification:
-- select relrowsecurity from pg_class where relname='marketing_email_campaign_drafts';
-- select policyname,cmd,qual,with_check from pg_policies where tablename like 'marketing_email_campaign_draft%';
-- select * from public.slbi_email_save_draft(... authenticated user's signed JWT context);
-- assert anon write denied, vendor B cannot see/update vendor A, concurrent revision mismatch returns [].
