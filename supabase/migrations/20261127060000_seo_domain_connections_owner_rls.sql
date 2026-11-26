-- SEO-03: real owner-bound domain proof via DNS TXT; independent of Google Search Console.
-- Deliberately no user-write grants. All writes are authenticated and authorized
-- in a server-only service-role route; RLS remains a second line of defense.
create table if not exists public.seo_domain_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  hostname text not null unique,
  provider text not null check (provider in ('Vercel','Cloudflare','GoDaddy','Namecheap','Hostinger','Other provider')),
  verification_token text not null unique check (char_length(verification_token) between 40 and 110),
  txt_record_name text not null,
  state text not null default 'pending' check (state in ('pending','verified')),
  verified_at timestamptz,
  verification_expires_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id),
  constraint verified_state_has_time check (
    (state = 'pending' and verified_at is null and verification_expires_at is null)
    or (state = 'verified' and verified_at is not null and verification_expires_at is not null)
  ),
  constraint hostname_lowercase check (hostname = lower(hostname)),
  constraint txt_name_matches_host check (txt_record_name = '_slbi-verify.' || hostname)
);
create index if not exists seo_domain_connections_owner_idx on public.seo_domain_connections (owner_id,business_id);
alter table public.seo_domain_connections enable row level security;
-- Make explicit that client identities NEVER create or self-verify a claim.
revoke all on public.seo_domain_connections from public, anon, authenticated;
grant select on public.seo_domain_connections to authenticated;
grant all on public.seo_domain_connections to service_role;
drop policy if exists seo_domain_owner_read on public.seo_domain_connections;
create policy seo_domain_owner_read on public.seo_domain_connections
for select to authenticated
using (
 owner_id = (select auth.uid())
 and exists (
  select 1 from public.businesses b
  where b.id = business_id and b.owner_id = (select auth.uid())
 )
);
comment on table public.seo_domain_connections is
'Verified DNS TXT ownership for SEO setup only. This is NOT authorization to edit a site, manage Google Search Console, or deploy customer code.';
