-- P0 hotfix: already applied and verified on Production Supabase using
-- migration version 20261112194811. Retained in source for migration parity.
-- Non-destructive: no stored objects changed, no public image SELECT removed.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='business-logos' AND public=true) THEN
   RAISE EXCEPTION 'Expected public business-logos bucket absent';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass) THEN
   RAISE EXCEPTION 'storage.objects RLS must be enabled';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='Owner can upload a logo.') OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='Owner can update their own logo.') OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='Owner can delete their own logo.') OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='Admins manage business-logos')
 THEN RAISE EXCEPTION 'Owner or staff storage protections missing; abort';
 END IF;
END $preflight$;
DROP POLICY IF EXISTS "Authenticated Upload to business-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update to business-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete from business-logos" ON storage.objects;
COMMIT;
