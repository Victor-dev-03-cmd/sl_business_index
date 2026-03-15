-- Add sentiment column to reviews table
alter table reviews add column if not exists sentiment text;
alter table reviews add column if not exists is_approved boolean default true;
