-- SLBI P1-03 / REVIEW ONLY — Vendor CRM in-app follow-up reminders.
-- DO NOT EXECUTE ON PRODUCTION until the staging JWT + RLS matrix passes.
-- The Next.js UI degrades safely while this table is absent.
-- No external email, SMS, or WhatsApp messages are sent by this feature.
--
-- This SQL is staged as a review document and must become an official,
-- versioned migration via the approved Supabase CLI workflow before release.
BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_followups (
  lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_followups_valid_done_at
    CHECK (done_at IS NULL OR done_at >= created_at)
);
CREATE INDEX IF NOT EXISTS lead_followups_due_at_idx
  ON public.lead_followups (due_at) WHERE done_at IS NULL;

ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_followups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_followups TO authenticated;

-- This is the vendor's own CRM, joined through the existing leads -> businesses
-- authorization relationship. No anonymous contact or cross-tenant access.
DROP POLICY IF EXISTS "Vendor read own followups" ON public.lead_followups;
CREATE POLICY "Vendor read own followups" ON public.lead_followups
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.businesses b ON b.id=l.business_id
      WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS "Vendor insert own followups" ON public.lead_followups;
CREATE POLICY "Vendor insert own followups" ON public.lead_followups
  FOR INSERT TO authenticated WITH CHECK (
    done_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.businesses b ON b.id=l.business_id
      WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS "Vendor update own followups" ON public.lead_followups;
CREATE POLICY "Vendor update own followups" ON public.lead_followups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.businesses b ON b.id=l.business_id
      WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.businesses b ON b.id=l.business_id
      WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
    )
  );

-- Prevent a user from inventing a due date more than a year into the
-- future. Existing completed tasks remain valid after that interval passes.
-- Client-side validation is UX only: this CHECK is a last-resort DB cap
-- but cannot express a volatile now() check safely.
COMMENT ON TABLE public.lead_followups IS
  'Private vendor in-app follow-up reminders, one per CRM lead; not a message-delivery queue.';

-- The following grants are a SECURITY HARDENING CANDIDATE and are deliberately
-- NOT coupled to the table migration: they require legacy Expo and admin
-- regression review before use. Current production grants are overbroad:
-- anon/authenticated have TRUNCATE and other unnecessary privileges on leads
-- and lead_notes. RLS does NOT protect TRUNCATE statements.
--
-- STAGING FOLLOW-UP (not executable in this block):
-- REVOKE TRUNCATE, DELETE, UPDATE, REFERENCES, TRIGGER
--    ON public.leads, public.lead_notes FROM PUBLIC, anon, authenticated;
-- GRANT SELECT, INSERT ON public.leads TO anon, authenticated;
-- GRANT UPDATE (status) ON public.leads TO authenticated;
-- GRANT SELECT, INSERT ON public.lead_notes TO authenticated;
-- REVOKE SELECT, INSERT ON public.lead_notes FROM anon;
-- Review whether any admin UI edits non-status lead fields before rollout.
-- Keep the existing legacy anon leads INSERT policy until mobile compatibility
-- is demonstrated, and retain service_role privileges.

COMMIT;

-- REQUIRED STAGING TESTS:
-- [ ] auth Vendor A select/insert/upsert/mark-done own lead
-- [ ] auth Vendor B cannot SELECT/INSERT/UPDATE A's followups
-- [ ] anon cannot SELECT/INSERT/UPDATE any followup
-- [ ] linked lead deletion cascades followup only
-- [ ] insert/upsert works under the current RLS SELECT policy
-- [ ] prior leads, notes, admin and mobile enquiry writes still work
-- [ ] no service-role key or PII exposed to the client
-- [ ] expected local time -> UTC conversion + DST tests
-- [ ] reminder badges truthful; no notification-delivery claim
