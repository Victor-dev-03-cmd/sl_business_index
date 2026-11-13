-- SLBI GrowthOS P2-05 Marketing Campaign Library — STAGING / DOCKER ONLY
-- Restricts client-forged "posted" claims, preserves previous campaign rows,
-- appends immutable revision records for creation, copy and approval transitions.
-- Do NOT apply directly to live Supabase before reviewed versioned migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_campaign_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK(revision_no>0),
  actor_id uuid,
  event_type text NOT NULL CHECK(event_type IN ('created','changed')),
  old_status text,
  new_status text NOT NULL,
  old_text text,
  new_text text NOT NULL,
  old_scheduled_at timestamptz,
  new_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id,revision_no)
);
CREATE INDEX IF NOT EXISTS marketing_campaign_revision_history
  ON public.marketing_campaign_revisions(campaign_id,created_at DESC);

ALTER TABLE public.marketing_campaign_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_campaign_revisions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.marketing_campaign_revisions TO service_role;
GRANT SELECT ON public.marketing_campaign_revisions TO authenticated;

DROP POLICY IF EXISTS marketing_campaign_revisions_owner_read
  ON public.marketing_campaign_revisions;
CREATE POLICY marketing_campaign_revisions_owner_read
  ON public.marketing_campaign_revisions FOR SELECT TO authenticated
  USING(EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    JOIN public.businesses b ON b.id=c.business_id
    WHERE c.id=campaign_id AND b.owner_id=(SELECT auth.uid())
  ));

-- Legacy "Vendors manage own campaigns" FOR ALL allowed browser-invented
-- status='posted'. New writes permit only draft/review/planning states.
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendors manage own campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaign_owner_read ON public.marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaign_owner_insert ON public.marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaign_owner_update ON public.marketing_campaigns;

CREATE POLICY marketing_campaign_owner_read ON public.marketing_campaigns
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
  );
CREATE POLICY marketing_campaign_owner_insert ON public.marketing_campaigns
  FOR INSERT TO authenticated WITH CHECK (
    status IN ('drafted','scheduled')
    AND business_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
  );
CREATE POLICY marketing_campaign_owner_update ON public.marketing_campaigns
  FOR UPDATE TO authenticated USING (
    status IN ('drafted','scheduled','approved','rejected')
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
  ) WITH CHECK (
    status IN ('drafted','scheduled','approved','rejected')
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
  );

REVOKE ALL ON public.marketing_campaigns FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketing_campaigns TO authenticated;
GRANT INSERT (business_id,banner_text,banner_color,platforms,scheduled_at,status)
  ON public.marketing_campaigns TO authenticated;
GRANT UPDATE (banner_text,banner_color,platforms,scheduled_at,status)
  ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

CREATE OR REPLACE FUNCTION public.slbi_capture_marketing_campaign_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_next integer;
BEGIN
  IF TG_OP='UPDATE' AND NEW.banner_text IS NOT DISTINCT FROM OLD.banner_text
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
    AND NEW.platforms IS NOT DISTINCT FROM OLD.platforms
  THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(revision_no),0)+1 INTO v_next
    FROM public.marketing_campaign_revisions WHERE campaign_id=NEW.id;
  -- The modified marketing_campaigns row is locked by the caller, so
  -- simultaneous edits on the same campaign serialize revision allocation.
  INSERT INTO public.marketing_campaign_revisions(
    campaign_id,revision_no,actor_id,event_type,
    old_status,new_status,old_text,new_text,
    old_scheduled_at,new_scheduled_at
  ) VALUES (
    NEW.id,v_next,auth.uid(),
    CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'changed' END,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,
    COALESCE(NEW.status,'drafted'),
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.banner_text END,
    NEW.banner_text,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.scheduled_at END,
    NEW.scheduled_at
  );
  RETURN NEW;
END;$fn$;
REVOKE ALL ON FUNCTION public.slbi_capture_marketing_campaign_revision()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS slbi_marketing_campaign_history ON public.marketing_campaigns;
CREATE TRIGGER slbi_marketing_campaign_history
  AFTER INSERT OR UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.slbi_capture_marketing_campaign_revision();

COMMIT;

-- Prior one-off campaign rows may have a historical status of "posted".
-- Do NOT rewrite them or present them as provider-verified publications.
-- P2-07 needs an immutable provider receipt signed by authorized platform code.
