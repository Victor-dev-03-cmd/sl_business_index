-- Add appearance related columns to site_settings
alter table site_settings add column if not exists primary_font text default 'Inter';
alter table site_settings add column if not exists button_border_radius integer default 6;
