-- Add extra site settings for notifications, web blocker, and customization
alter table site_settings add column if not exists email_notifications boolean default true;
alter table site_settings add column if not exists push_notifications boolean default false;
alter table site_settings add column if not exists admin_email text default 'admin@example.com';
alter table site_settings add column if not exists spam_protection_enabled boolean default true;
alter table site_settings add column if not exists ip_blocking_enabled boolean default false;
alter table site_settings add column if not exists blocked_ips text[] default '{}';
alter table site_settings add column if not exists custom_css text;
alter table site_settings add column if not exists custom_js text;
