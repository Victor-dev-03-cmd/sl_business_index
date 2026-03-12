-- Create site_settings table if not exists
create table if not exists site_settings (
  id integer primary key default 1,
  site_name text default 'SL Business Index',
  site_description text default 'The most comprehensive business directory in Sri Lanka.',
  logo_url text,
  logo_text text default 'SL Business',
  logo_width integer default 150,
  logo_height integer default 50,
  theme_primary_color text default '#053765',
  theme_accent_color text default '#b4863b',
  updated_at timestamp with time zone default now(),
  constraint single_row check (id = 1)
);

-- Insert default row if not exists
insert into site_settings (id) values (1) on conflict (id) do nothing;

-- Add new columns if table exists but columns are missing
alter table site_settings add column if not exists logo_text text default 'SL Business';
alter table site_settings add column if not exists logo_width integer default 150;
alter table site_settings add column if not exists logo_height integer default 50;
