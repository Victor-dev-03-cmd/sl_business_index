-- EMAIL-V6: Provider-independent owner-scoped do-not-email registry.
-- Review and CI gate required before production migration. Add-only; no legacy contacts backfill.
-- A suppression NEVER means the recipient gave marketing consent.
BEGIN;
CREATE TABLE public.marketing_email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (
    length(email) BETWEEN 5 AND 254
    AND email=lower(btrim(email))
    AND email ~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+[.][^[:space:]@,;<>]+$'
  ),
  reason text NOT NULL DEFAULT 'manual' CHECK (reason='manual'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_email_suppressions_business_email_unique UNIQUE (business_id,email)
);
CREATE INDEX marketing_email_suppressions_owner_business_created_idx
  ON public.marketing_email_suppressions (owner_id,business_id,created_at DESC);
ALTER TABLE public.marketing_email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_email_suppressions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.marketing_email_suppressions TO authenticated;
CREATE POLICY marketing_email_suppressions_owner_read
  ON public.marketing_email_suppressions FOR SELECT TO authenticated
  USING (owner_id=(select auth.uid()) AND EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=business_id AND b.owner_id=(select auth.uid())
  ));
CREATE POLICY marketing_email_suppressions_owner_manual_insert
  ON public.marketing_email_suppressions FOR INSERT TO authenticated
  WITH CHECK (
    owner_id=(select auth.uid()) AND reason='manual'
    AND EXISTS (SELECT 1 FROM public.businesses b
      WHERE b.id=business_id AND b.owner_id=(select auth.uid()) AND b.status='approved')
  );
-- Intentionally NO UPDATE/DELETE grants or policies: do not silently erase opt-out records.
-- Deliverability provider must consult this registry AND its own provider-native suppressions.
-- Does not activate public subscription, unsubscribe tokens, queue, sending or analytics.
COMMIT;
