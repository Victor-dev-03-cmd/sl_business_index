-- SLBI P0 / STAGING ONLY — Compatibility RLS for legacy direct public enquiries.
-- Does not revoke INSERT from old mobile installs; not anti-bot equivalence.
-- Explicitly permits legitimate approved-business enquiries while rejecting
-- forged conversion status, unapproved listing IDs and oversized payloads.
-- No production execution without cloud + mobile acceptance review.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='leads' AND policyname='Anyone can insert leads') THEN
   RAISE EXCEPTION 'Unexpected legacy lead policy; require manual review';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='businesses' AND policyname='Approved businesses public') THEN
   RAISE EXCEPTION 'Approved public business policy absent';
 END IF;
END $preflight$;

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "SLBI legacy compatible enquiry insert" ON public.leads;
CREATE POLICY "SLBI legacy compatible enquiry insert" ON public.leads
 FOR INSERT TO anon,authenticated
 WITH CHECK (
  business_id IS NOT NULL
  AND status='new'
  AND name IS NOT NULL
  AND pg_catalog.length(pg_catalog.btrim(name)) BETWEEN 2 AND 100
  AND (email IS NULL OR pg_catalog.length(email) <= 254)
  AND (phone IS NULL OR pg_catalog.length(phone) <= 40)
  AND (message IS NULL OR pg_catalog.length(message) <= 5000)
  AND (source IS NULL OR pg_catalog.length(source) <= 120)
  AND (email IS NOT NULL OR phone IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=leads.business_id AND b.status='approved'
  )
 );
-- The existing vendors SELECT/UPDATE policies and all existing lead records
-- are preserved. Old mobile installs can still use anon INSERT.
COMMIT;