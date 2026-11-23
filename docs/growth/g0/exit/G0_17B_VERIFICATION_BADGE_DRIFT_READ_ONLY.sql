-- G0-17B verification badge eligibility drift audit: SELECT-only.
-- Produces aggregated counts, never business IDs, personal info or documents.
-- Do not auto-update legacy flags: they are NOT authoritative verification.
SELECT
  COUNT(*) FILTER (WHERE status='approved') AS approved_listings,
  COUNT(*) FILTER (
    WHERE status='approved'
      AND is_verified IS TRUE
      AND lower(btrim(coalesce(verification_status,''))) IN ('approved','verified')
  ) AS eligible_verified_blue_ticks,
  COUNT(*) FILTER (
    WHERE status='approved'
      AND is_verified IS TRUE
      AND lower(btrim(coalesce(verification_status,''))) IN ('approved','verified')
      AND can_show_badge IS NOT TRUE
  ) AS wrongly_hidden_by_legacy_badge_flag,
  COUNT(*) FILTER (
    WHERE status='approved'
      AND can_show_badge IS TRUE
      AND (
        is_verified IS NOT TRUE OR
        lower(btrim(coalesce(verification_status,''))) NOT IN ('approved','verified')
      )
  ) AS badge_flag_without_actual_verification
FROM public.businesses;
