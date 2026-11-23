-- G0-16 VERIFIED VIEW COUNTER — REVIEW ONLY / ADDITIVE SQL.
-- Do NOT apply to production until owner-approved backup, versioned migration,
-- backend flag + browser flag release and rollback/cutover plan are accepted.
-- Depends on docs/growth/SECURE_EVENT_INGESTION_REVIEW_ONLY.sql, installed first.
-- No anonymous/authenticated EXECUTE. No direct client-supplied IP or identity.
-- This wrapper is SECURITY INVOKER, pinned search_path, service-role only.
BEGIN;

CREATE OR REPLACE FUNCTION public.slbi_record_verified_business_view(
  p_event_id uuid,
  p_business_id uuid,
  p_channel text,
  p_rate_bucket text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $view$
DECLARE
  v_accepted boolean;
  v_updated integer;
BEGIN
  IF p_event_id IS NULL OR p_business_id IS NULL THEN
    RETURN false;
  END IF;

  -- Same transaction-scoped lock/key as slbi_record_growth_event.
  -- Taking it before checking history removes concurrent duplicate races.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_event_id::text, 0)
  );

  -- A successfully recorded event can increment the counter *once*.
  -- We deliberately reject historical events and requests already processed
  -- via the shared ingestion pipeline, even if they were previously counted.
  IF EXISTS (SELECT 1 FROM public.analytics_logs WHERE id = p_event_id) THEN
    RETURN false;
  END IF;

  -- Reuse the verified rate-limited, HMAC-bucket-based telemetry RPC.
  -- It checks approved listing, event type, channel, bucket and quota.
  SELECT public.slbi_record_growth_event(
    p_event_id, p_business_id, 'view', p_channel, p_rate_bucket
  ) INTO v_accepted;

  IF v_accepted IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  -- Because the event and increment are in the same database transaction,
  -- an error aborts both and avoids a separately committed phantom event.
  UPDATE public.businesses
     SET views = COALESCE(views, 0) + 1
   WHERE id = p_business_id AND status = 'approved';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'view-counter-integrity-check-failed'
      USING ERRCODE = '23514';
  END IF;

  RETURN true;
END
$view$;

REVOKE ALL ON FUNCTION public.slbi_record_verified_business_view(uuid,uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_record_verified_business_view(uuid,uuid,text,text)
  TO service_role;

COMMIT;
