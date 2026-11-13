\set ON_ERROR_STOP on
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'pending',
  address text, detailed_address text, latitude double precision,
  longitude double precision, location geography(POINT,4326)
);
INSERT INTO public.businesses
 (id,status,address,detailed_address,latitude,longitude,location)
VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','approved',
  'Jaffna, Northern Province, Sri Lanka','No 12, Main Street, Jaffna',
  9.6615,80.0255,ST_SetSRID(ST_MakePoint(80.0255,9.6615),4326)::geography),
 -- Existing legacy data must not block unrelated status/admin changes.
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','approved',
  'Jaffna, Northern Province, Sri Lanka',NULL,
  9.6615,80.0255,ST_SetSRID(ST_MakePoint(80.0255,9.6615),4326)::geography);
