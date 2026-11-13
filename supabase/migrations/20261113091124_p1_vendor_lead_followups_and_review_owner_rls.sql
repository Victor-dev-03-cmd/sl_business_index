-- SLBI P1 RELEASE — DISPOSABLE SANDBOX CANDIDATE ONLY
-- Do not apply directly to production. Promote to an approved numbered
-- migration ONLY after cross-tenant auth, mobile, admin and legacy tests.
-- Tested against a minimal disposable Postgres 17 schema by P1 CI.
BEGIN;

-- CRM follow-ups are private to a business owner and never public API data.
CREATE TABLE IF NOT EXISTS public.lead_followups (
  lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_followups_done_after_create CHECK (done_at IS NULL OR done_at >= created_at)
);
CREATE INDEX IF NOT EXISTS lead_followups_open_due_idx ON public.lead_followups (due_at) WHERE done_at IS NULL;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_followups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_followups TO authenticated;

DROP POLICY IF EXISTS "vendor_followups_select" ON public.lead_followups;
CREATE POLICY "vendor_followups_select" ON public.lead_followups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.businesses b ON b.id=l.business_id
    WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "vendor_followups_insert" ON public.lead_followups;
CREATE POLICY "vendor_followups_insert" ON public.lead_followups
  FOR INSERT TO authenticated
  WITH CHECK (done_at IS NULL AND EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.businesses b ON b.id=l.business_id
    WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "vendor_followups_update" ON public.lead_followups;
CREATE POLICY "vendor_followups_update" ON public.lead_followups
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.businesses b ON b.id=l.business_id
    WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.businesses b ON b.id=l.business_id
    WHERE l.id=lead_followups.lead_id AND b.owner_id=(SELECT auth.uid())
  ));

-- An application-side duplicate check is inherently raceable: one reply per
-- review must be guaranteed atomically in Postgres.
CREATE UNIQUE INDEX IF NOT EXISTS review_replies_one_reply_per_review_idx
  ON public.review_replies (review_id);
DROP POLICY IF EXISTS "Vendors can reply to their reviews" ON public.review_replies;
DROP POLICY IF EXISTS "vendor_published_review_reply_insert" ON public.review_replies;
CREATE POLICY "vendor_published_review_reply_insert" ON public.review_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id=(SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.businesses b ON b.id=r.business_id
      WHERE r.id=review_replies.review_id AND r.is_approved IS TRUE
        AND b.owner_id=(SELECT auth.uid())
    )
  );

-- No customer should see unapproved reviews or replies from a rejected review.
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "approved_reviews_public" ON public.reviews;
CREATE POLICY "approved_reviews_public" ON public.reviews
  FOR SELECT TO anon,authenticated USING (is_approved IS TRUE);
DROP POLICY IF EXISTS "review_authors_read_own" ON public.reviews;
CREATE POLICY "review_authors_read_own" ON public.reviews
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "Replies viewable by everyone" ON public.review_replies;
DROP POLICY IF EXISTS "published_review_replies_public" ON public.review_replies;
CREATE POLICY "published_review_replies_public" ON public.review_replies
  FOR SELECT TO anon,authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id=review_replies.review_id AND r.is_approved IS TRUE
  ));

-- Preserve the existing review moderation fallback: a signed-in reviewer
-- may insert an unapproved review and view their own pending record.
-- Enforce a real user_id and never permit impersonation of another account.
DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "signed_in_reviewer_insert" ON public.reviews;
CREATE POLICY "signed_in_reviewer_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND rating BETWEEN 1 AND 5);

-- Remove rights RLS cannot possibly guard. Do not break legacy lead INSERT.
-- Direct review updates remain possible for customer-authored reviews, but
-- the client must NEVER change the moderation field is_approved.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON
  public.leads, public.lead_notes, public.reviews, public.review_replies,
  public.analytics_logs FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.reviews FROM PUBLIC, anon, authenticated;
GRANT UPDATE (rating, comment) ON public.reviews TO authenticated;
REVOKE UPDATE, DELETE ON public.review_replies FROM PUBLIC, anon, authenticated;
-- Vendor response path needs only SELECT and INSERT. No browser overwrites.
REVOKE INSERT ON public.review_replies FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.review_replies TO authenticated;

COMMIT;

-- Follow-up requirements before promotion:
-- [ ] Existing admin review moderation can still access pending records via
--     authenticated admin policy or server-side privileged API.
-- [ ] Confirm review submit UI requires login and can display pending result.
-- [ ] Confirm all source/mobile/desktop API consumers work without TRUNCATE.
-- [ ] Verify legacy customer enquiries still insert, and P0 safety preserved.
-- [ ] Test anonymous and multi-vendor A/B data isolation with real JWTs.
-- [ ] Verify duplicate legacy replies absent before unique index.
-- [ ] Prepare a rollback plan without relaxing user privacy.
