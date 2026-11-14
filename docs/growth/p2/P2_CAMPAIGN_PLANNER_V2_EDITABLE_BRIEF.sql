-- P2 Campaign Planner V2: structured draft editing + reversible archive.
-- Requires live P2-05 owner RLS, revision table and audit trigger.
-- No automatic publishing, no direct user deletion, no extra Pro rights.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';

DO $preflight$
BEGIN
  IF to_regclass('public.marketing_campaigns') IS NULL
     OR to_regclass('public.marketing_campaign_revisions') IS NULL
     OR NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename='marketing_campaigns' AND policyname='marketing_campaign_owner_update'
     ) OR EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename='marketing_campaigns' AND cmd='ALL'
     ) THEN
    RAISE EXCEPTION 'P2 draft editing preflight: P2-05 owner-only security must be applied first';
  END IF;
END $preflight$;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS brief jsonb,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaign_brief_shape_v2;
ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaign_brief_shape_v2 CHECK(
    brief IS NULL OR
    (jsonb_typeof(brief)='object'
     AND jsonb_typeof(brief->'offer')='string'
     AND jsonb_typeof(brief->'cta')='string'
     AND jsonb_typeof(brief->'terms')='string'
     AND jsonb_typeof(brief->'language')='string'
     AND jsonb_typeof(brief->'objective')='string'
     AND jsonb_typeof(brief->'format')='string'
     AND jsonb_typeof(brief->'palette')='string'
     AND brief->>'language' IN ('English','தமிழ்','සිංහල')
     AND brief->>'objective' IN ('awareness','promotion','enquiries','announcement')
     AND brief->>'format' IN ('square','portrait','story','landscape')
     AND brief->>'palette' IN ('forest','navy','cream')
     AND char_length(brief->>'offer') <=240
     AND char_length(brief->>'cta') <=130
     AND char_length(brief->>'terms') <=220
     AND (brief - ARRAY['offer','cta','terms','language','objective','format','palette']) = '{}'::jsonb
    )
  );

-- Grant ONLY the new editable fields. Existing P2-05 column grants remain.
GRANT INSERT (brief) ON public.marketing_campaigns TO authenticated;
GRANT UPDATE (brief,is_archived) ON public.marketing_campaigns TO authenticated;

ALTER TABLE public.marketing_campaign_revisions
  ADD COLUMN IF NOT EXISTS old_brief jsonb,
  ADD COLUMN IF NOT EXISTS new_brief jsonb,
  ADD COLUMN IF NOT EXISTS old_archived boolean,
  ADD COLUMN IF NOT EXISTS new_archived boolean;

CREATE OR REPLACE FUNCTION public.slbi_capture_marketing_campaign_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_next integer;
BEGIN
  IF TG_OP='UPDATE'
    AND NEW.banner_text IS NOT DISTINCT FROM OLD.banner_text
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
    AND NEW.platforms IS NOT DISTINCT FROM OLD.platforms
    AND NEW.brief IS NOT DISTINCT FROM OLD.brief
    AND NEW.is_archived IS NOT DISTINCT FROM OLD.is_archived
  THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(revision_no),0)+1 INTO v_next
    FROM public.marketing_campaign_revisions WHERE campaign_id=NEW.id;
  INSERT INTO public.marketing_campaign_revisions(
    campaign_id,revision_no,actor_id,event_type,
    old_status,new_status,old_text,new_text,
    old_scheduled_at,new_scheduled_at,
    old_brief,new_brief,old_archived,new_archived
  ) VALUES (
    NEW.id,v_next,auth.uid(),
    CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'changed' END,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,
    COALESCE(NEW.status,'drafted'),
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.banner_text END,
    NEW.banner_text,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.scheduled_at END,
    NEW.scheduled_at,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.brief END,
    NEW.brief,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.is_archived END,
    NEW.is_archived
  );
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.slbi_capture_marketing_campaign_revision()
  FROM PUBLIC,anon,authenticated;

DO $postflight$
BEGIN
  IF has_table_privilege('anon','public.marketing_campaigns','SELECT')
     OR has_table_privilege('authenticated','public.marketing_campaigns','DELETE')
     OR has_column_privilege('authenticated','public.marketing_campaigns','business_id','UPDATE')
     OR has_table_privilege('authenticated','public.marketing_campaign_revisions','INSERT')
     OR NOT has_column_privilege('authenticated','public.marketing_campaigns','brief','INSERT')
     OR NOT has_column_privilege('authenticated','public.marketing_campaigns','is_archived','UPDATE')
  THEN RAISE EXCEPTION 'P2 draft editing postflight privileges invalid'; END IF;
END $postflight$;
COMMIT;
