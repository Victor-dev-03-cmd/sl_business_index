-- SLBI review moderation lockdown — STAGING / DISPOSABLE DB ONLY.
-- Apply AFTER P1_VENDOR_DATA_GUARDS_STAGING_ONLY.sql.
-- NEVER deploy this in production before validated JWT, admin E2E and rollback.
-- Current public policy allows users to forge is_approved on INSERT; this
-- migration changes the DATABASE authority, not merely the browser UI.
BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderation_note text;

-- Preserve already-published historical reviews; private legacy rows
-- become pending for explicit moderation. No reviews are deleted.
UPDATE public.reviews
SET is_approved = COALESCE(is_approved, false);
UPDATE public.reviews
SET moderation_status = CASE WHEN is_approved IS TRUE THEN 'approved' ELSE 'pending' END;
ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT false;
ALTER TABLE public.reviews ALTER COLUMN is_approved SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN moderation_status SET DEFAULT 'pending';
ALTER TABLE public.reviews ALTER COLUMN moderation_status SET NOT NULL;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS slbi_reviews_moderation_consistent;
ALTER TABLE public.reviews ADD CONSTRAINT slbi_reviews_moderation_consistent CHECK (
  (moderation_status = 'approved' AND is_approved IS TRUE)
  OR (moderation_status IN ('pending', 'rejected') AND is_approved IS FALSE)
);
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS slbi_reviews_moderation_note_size;
ALTER TABLE public.reviews ADD CONSTRAINT slbi_reviews_moderation_note_size
  CHECK (moderation_note IS NULL OR char_length(moderation_note) <= 500);

-- A real index makes double-submission races fail atomically. Existing
-- duplicate (business_id,user_id) groups must be remediated in staging first.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_signed_in_user_and_business
  ON public.reviews (business_id, user_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "signed_in_reviewer_insert" ON public.reviews;
CREATE POLICY "signed_in_reviewer_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND rating BETWEEN 1 AND 5
    AND is_approved IS FALSE
    AND moderation_status = 'pending'
    AND moderated_at IS NULL AND moderated_by IS NULL AND moderation_note IS NULL
    AND char_length(btrim(user_name)) BETWEEN 2 AND 100
    AND char_length(btrim(coalesce(comment, ''))) BETWEEN 3 AND 3000
    AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id
        AND b.status='approved'
        AND b.owner_id IS DISTINCT FROM (SELECT auth.uid())
    )
  );

-- An author may read their own pending review; public queries see ONLY
-- approved review rows. Staff can see the private moderation queue.
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "review_staff_select" ON public.reviews;
CREATE POLICY "review_staff_select" ON public.reviews
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id=(SELECT auth.uid()) AND p.role IN ('admin','ceo')
    )
  );
DROP POLICY IF EXISTS "review_staff_decide_pending" ON public.reviews;
CREATE POLICY "review_staff_decide_pending" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    moderation_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id=(SELECT auth.uid()) AND p.role IN ('admin','ceo')
    )
  )
  WITH CHECK (
    moderation_status IN ('approved','rejected')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id=(SELECT auth.uid()) AND p.role IN ('admin','ceo')
    )
  );

-- Use a DB clock + verified JWT for audit. Ignore any spoofed user-supplied
-- moderated_at / moderated_by from an authenticated staff client.
CREATE OR REPLACE FUNCTION public.slbi_review_moderation_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.moderation_status IS DISTINCT FROM 'pending'
    OR NEW.moderation_status NOT IN ('approved','rejected')
    OR NEW.moderation_status = OLD.moderation_status
  THEN
    RAISE EXCEPTION 'Only pending reviews can be decided'
      USING ERRCODE = '22023';
  END IF;
  NEW.moderated_at := now();
  NEW.moderated_by := (SELECT auth.uid());
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS slbi_reviews_moderation_audit ON public.reviews;
CREATE TRIGGER slbi_reviews_moderation_audit
  BEFORE UPDATE OF moderation_status, is_approved, moderated_at, moderated_by, moderation_note
  ON public.reviews FOR EACH ROW
  EXECUTE FUNCTION public.slbi_review_moderation_audit();
REVOKE ALL ON FUNCTION public.slbi_review_moderation_audit()
  FROM PUBLIC, anon, authenticated;

-- Remove table-wide dangerous privileges, including TRUNCATE (RLS does
-- not protect it). Anonymous users only read approved public reviews.
REVOKE ALL ON public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT UPDATE (is_approved, moderation_status, moderated_at, moderated_by, moderation_note)
  ON public.reviews TO authenticated;

COMMIT;

-- SAFE RELEASE GATES:
-- [ ] Preflight existing duplicates, user_id=NULL, review column grants
-- [ ] Temporary Postgres roles A/B/anon/admin JWT-RLS tests
-- [ ] Real SSR auth cookie / browser review submit and private pending view
-- [ ] Admin queue loads unapproved reviews; approval/rejection audit trustworthy
-- [ ] No direct Data API is_approved=true bypass; no owner self-reviews
-- [ ] Existing 2 approved reviews remain approved and visible after upgrade
-- [ ] New user review only pending; auto-public Groq endpoint retired
-- [ ] DB migration recorded in official Supabase migration history
-- [ ] Staff/admin role checks preserved; P0 roles and mobile enquiry intact
-- [ ] Set SLBI_REVIEW_MODERATION_READY=true only AFTER migration passes
-- [ ] Production deploy is a separate approved release with rollback plan
