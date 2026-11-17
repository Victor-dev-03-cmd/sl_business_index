-- P2-30: Restore authenticated planner writes; retain existing owner-only RLS.
-- RLS policies already restrict inserts/updates to businesses.owner_id = auth.uid().
-- No anon access, no direct client DELETE, no access to private credit/storage tables.
BEGIN;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.marketing_campaigns FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.marketing_campaigns TO authenticated;
COMMIT;
