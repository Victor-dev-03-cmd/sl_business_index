-- Extend the proven SEO ownership ledger without affecting existing DNS claims.
-- Old records retain verification_method='dns_txt' automatically.
alter table public.seo_domain_connections
  add column if not exists verification_method text not null default 'dns_txt';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='seo_domain_verification_method_check'
      and conrelid='public.seo_domain_connections'::regclass
  ) then
    alter table public.seo_domain_connections
      add constraint seo_domain_verification_method_check
      check (verification_method in ('dns_txt','http_file'));
  end if;
end $$;
comment on column public.seo_domain_connections.verification_method is
'Exact ownership-proof type. dns_txt uses _slbi-verify.host; http_file uses a fixed HTTPS /.well-known/slbi-verification.txt path with safe pinned-IP verification. No website write rights.';
-- Client INSERT/UPDATE/DELETE remain revoked; RLS SELECT remains owner-scoped.
revoke insert, update, delete on public.seo_domain_connections from anon,authenticated;
