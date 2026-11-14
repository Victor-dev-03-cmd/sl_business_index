-- SLBI P2-05 Campaign Planner hardening — PRODUCTION CANDIDATE ONLY
-- Reviewed from docs/growth/p2/P2_05_CAMPAIGN_REVISIONS_STAGING_ONLY.sql
-- DO NOT APPLY until exact candidate is rehearsed in disposable PostgreSQL 17,
-- Node/Next CI passes, Basic A/B tenant acceptance and rollback are approved.
-- Replacing legacy FOR ALL policy is a sensitive authorization change.
-- This is atomic: any preflight or postflight mismatch rolls back ALL DDL.

BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
DECLARE policy_count integer;
BEGIN
  IF to_regclass('public.marketing_campaigns') IS NULL
     OR to_regclass('public.businesses') IS NULL
     OR to_regclass('public.growth_entitlements') IS NULL THEN
    RAISE EXCEPTION 'P2-05 preflight: required existing production table absent';
  END IF;
  IF to_regclass('public.marketing_campaign_revisions') IS NOT NULL THEN
    RAISE EXCEPTION 'P2-05 preflight: revisions table already exists; review before reapply';
  END IF;
  SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_campaigns';
  IF policy_count<>1 OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_campaigns'
      AND policyname='Vendors manage own campaigns' AND cmd='ALL'
  ) THEN
    RAISE EXCEPTION 'P2-05 preflight: unexpected live campaign policy layout';
  END IF;
END $preflight$;

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

-- Preserve existing manual draft/planning for every authenticated owner.
-- Only NEW premium automation, connectors, agents and provider actions require
-- verified Professional/Enterprise; no free vendor loses their legacy composer.
-- Advanced campaign approvals and publishing must be handled by a separate,
-- trusted server API with verified Pro and immutable provider receipts.
-- Keep helper available for future trusted features, but do not use it to
-- restrict the legacy drafted/scheduled browser writes.
CREATE OR REPLACE FUNCTION public.slbi_has_marketing_pro()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $pro$
  SELECT EXISTS (
    SELECT 1 FROM public.growth_entitlements e
    WHERE e.user_id=(SELECT auth.uid())
      AND e.plan_name IN ('Professional','Enterprise')
      AND e.verified_at<=now() AND e.expires_at>now()
      AND char_length(btrim(e.payment_reference))>=3
  );
$pro$;
REVOKE ALL ON FUNCTION public.slbi_has_marketing_pro() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.slbi_has_marketing_pro() TO authenticated;

-- Legacy "Vendors manage own campaigns" FOR ALL allowed browser-invented
-- status='posted'. New browser writes permit ONLY existing draft/planning states.
-- Approval/rejection/publishing are reserved for future trusted server actions.
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
    status IN ('drafted','scheduled')
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
  ) WITH CHECK (
    status IN ('drafted','scheduled')
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


DO $postflight$
BEGIN
  IF EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_campaigns'
      AND cmd='ALL'
  ) THEN
    RAISE EXCEPTION 'P2-05 postflight: untrusted broad campaign policy remains';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_campaigns'
      AND policyname='marketing_campaign_owner_insert'
  ) OR NOT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_campaigns'
      AND policyname='marketing_campaign_owner_update'
  ) OR NOT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.marketing_campaigns'::regclass
      AND tgname='slbi_marketing_campaign_history' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'P2-05 postflight: campaign guard or audit trigger missing';
  END IF;
  IF has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
     OR has_table_privilege('anon','public.marketing_campaigns','SELECT')
     OR has_table_privilege('authenticated','public.marketing_campaign_revisions','INSERT')
     OR has_column_privilege('authenticated','public.marketing_campaigns','business_id','UPDATE')
  THEN
    RAISE EXCEPTION 'P2-05 postflight: unsafe direct browser privileges remain';
  END IF;
END $postflight$;
COMMIT;

-- Existing campaign rows (including historical 'posted' labels) are PRESERVED.
-- A historical posted label is not a provider receipt and must not be treated
-- as proof that external publishing occurred.
