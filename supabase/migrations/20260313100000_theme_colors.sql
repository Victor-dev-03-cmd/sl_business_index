-- Add granular theme color columns to site_settings
alter table site_settings add column if not exists theme_dark_color text default '#053765';
alter table site_settings add column if not exists theme_blue_color text default '#2a7db4';
alter table site_settings add column if not exists theme_gold_color text default '#b4863b';
alter table site_settings add column if not exists theme_gold_light_color text default '#c09a54';
alter table site_settings add column if not exists theme_sand_color text default '#dfb85d';
alter table site_settings add column if not exists theme_text_color text default '#124272';
