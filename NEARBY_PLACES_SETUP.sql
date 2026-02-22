-- ============================================
-- NEARBY PLACES FEATURE - SUPABASE SQL SETUP
-- ============================================
-- Run these SQL commands in your Supabase SQL Editor
-- to enable geospatial queries for the nearby places feature.

-- Step 1: Enable PostGIS Extension
create extension if not exists postgis;

-- Step 2: Create businesses table (if not exists) with location column
-- If your businesses table already exists, skip to Step 3
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  location geography(POINT, 4326),
  address text,
  phone text,
  email text,
  website text,
  rating numeric,
  reviews_count integer default 0,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Step 3: Add missing columns to existing businesses table (if they don't exist)
alter table businesses add column if not exists location geography(POINT, 4326);
alter table businesses add column if not exists description text;
alter table businesses add column if not exists rating numeric;
alter table businesses add column if not exists reviews_count integer default 0;
alter table businesses add column if not exists image_url text;
alter table businesses add column if not exists phone text;
alter table businesses add column if not exists email text;
alter table businesses add column if not exists website text;

-- Step 4: Create an index for faster geospatial queries
create index if not exists idx_businesses_location on businesses using gist(location);

-- Step 5: Create the RPC function to find nearby businesses
drop function if exists get_nearby_businesses(double precision, double precision, text, double precision);

create or replace function get_nearby_businesses (
  user_lat double precision, 
  user_lng double precision, 
  search_query text default '',
  dist_limit double precision default 5000
) returns table (
  id bigint,
  name text,
  category text,
  description text,
  address text,
  phone text,
  email text,
  website text,
  rating numeric,
  reviews_count integer,
  image_url text,
  distance_meters double precision,
  latitude double precision,
  longitude double precision
) as $$
begin
  return query
  select 
    b.id,
    b.name,
    b.category,
    b.description,
    b.address,
    b.phone,
    b.email,
    b.website,
    b.rating,
    b.reviews_count,
    b.image_url,
    st_distance(
      b.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters,
    st_y(b.location::geometry) as latitude,
    st_x(b.location::geometry) as longitude
  from businesses b
  where 
    st_dwithin(
      b.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      dist_limit
    )
    and (search_query = '' or b.name ilike '%' || search_query || '%' or b.category ilike '%' || search_query || '%')
  order by 
    b.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
end;
$$ language plpgsql;

-- Step 6: Sample data insertion (optional - for testing)
-- Insert a few test businesses with locations (latitude, longitude)
insert into businesses (name, category, description, location, address, rating, reviews_count, image_url) values
('City Medical Center', 'Medical', 'Full service medical center', 'SRID=4326;POINT(79.8612 6.9271)', 'Colombo 03', 4.8, 125, '/business-1.jpg'),
('The Golden Fork', 'Hotel', 'Premium restaurant and lounge', 'SRID=4326;POINT(79.8527 6.9324)', 'Colombo 04', 4.9, 89, '/business-2.jpg'),
('Victoria Luxury Villa', 'Tourism', 'Luxury villa accommodation', 'SRID=4326;POINT(80.7891 6.9497)', 'Nuwara Eliya', 4.7, 156, '/business-3.jpg'),
('Central Dental Clinic', 'Medical', 'Modern dental services', 'SRID=4326;POINT(79.8641 6.9218)', 'Colombo 05', 4.6, 78, '/business-1.jpg'),
('Downtown Hotel', 'Hotel', 'Business hotel with conference facilities', 'SRID=4326;POINT(79.8456 6.9155)', 'Colombo 01', 4.5, 203, '/business-2.jpg')
on conflict do nothing;

-- Step 7: Verify setup
-- Run this query to test the RPC function
select * from get_nearby_businesses(6.9271, 79.8612, 'medical', 5000);

-- Notes:
-- - Latitude comes BEFORE Longitude in your app (6.9271, 79.8612)
-- - But st_makepoint takes (longitude, latitude) - notice the order is reversed!
-- - distance_limit in meters: 5000 = 5km, 1000 = 1km
-- - Use SRID=4326 for GPS coordinates (WGS84)
