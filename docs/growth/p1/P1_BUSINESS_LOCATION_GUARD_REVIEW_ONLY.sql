-- SLBI P1-02 | Business Location Data Guard | REVIEW ONLY
-- DO NOT run on production until owner-approved staging RLS, registration,
-- editing, admin moderation and legacy-data tests have passed.
--
-- Aggregate production audit (read-only, 2026-11-13):
-- 24 rows; 2 missing detailed_address; 1 pin outside the broad LK envelope.
-- This trigger does not backfill, delete or automatically change existing rows.
--
-- Rationale: client-side form checks can be bypassed by direct Data API calls.
-- Database verifies new inserts and address/pin changes, while allowing existing
-- legacy rows to receive unrelated admin/status updates without regressions.
--
-- Limitations:
-- This is a plausible Sri Lankan coordinate envelope, NOT exact island geometry.
-- Database cannot independently confirm the real-world business occupies the
-- street address. Keep vendor attestation and manual verification workflows.
--
-- Preconditions: PostGIS is installed in schema public; businesses.location is
-- geography(POINT,4326), confirmed by read-only schema check.
BEGIN;

CREATE OR REPLACE FUNCTION public.slbi_p1_guard_business_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  area_text text := btrim(coalesce(NEW.address, ''));
  street_text text := btrim(coalesce(NEW.detailed_address, ''));
BEGIN
  IF char_length(area_text) < 5
     OR lower(area_text) IN ('unknown', 'n/a', 'sri lanka')
     OR area_text ~ '^[[:space:]]*[+-]?[0-9]{1,2}([.][0-9]+)?[[:space:]]*[,;][[:space:]]*[+-]?[0-9]{1,3}([.][0-9]+)?[[:space:]]*$'
  THEN
    RAISE EXCEPTION 'A readable Sri Lankan mapped area is required'
      USING ERRCODE='22023';
  END IF;

  IF char_length(street_text) < 10 OR char_length(street_text) > 240
     OR lower(street_text) IN ('unknown', 'n/a', 'sri lanka')
  THEN
    RAISE EXCEPTION 'A physical shop/street/landmark address (10-240 characters) is required'
      USING ERRCODE='22023';
  END IF;

  IF NEW.latitude IS NULL OR NEW.longitude IS NULL OR
     NEW.latitude NOT BETWEEN 5.5 AND 10.3 OR
     NEW.longitude NOT BETWEEN 79.2 AND 82.3 OR
     NEW.location IS NULL
  THEN
    RAISE EXCEPTION 'Business coordinates must be within Sri Lanka with a map point'
      USING ERRCODE='22023';
  END IF;

  IF public.ST_Distance(
       NEW.location,
       public.ST_SetSRID(public.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::public.geography
     ) > 25.0
  THEN
    RAISE EXCEPTION 'Business map point and latitude/longitude disagree'
      USING ERRCODE='22023';
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.slbi_p1_guard_business_location()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS slbi_p1_business_location_guard ON public.businesses;
CREATE TRIGGER slbi_p1_business_location_guard
BEFORE INSERT OR UPDATE OF address, detailed_address, latitude, longitude, location
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.slbi_p1_guard_business_location();

COMMIT;

-- Staging acceptance matrix, required before promotion:
-- 1. Vendor A valid INSERT + valid pin, required physical address: succeeds.
-- 2. Missing physical text / coordinate-only address / swapped lat/lng: rejected.
-- 3. Deliberately inconsistent geography vs latitude/longitude: rejected.
-- 4. Vendor B cannot edit A's row (RLS still applies independently).
-- 5. Admin status change on an old incomplete listing is not blocked.
-- 6. Owner changing an old incomplete listing's address must correct it.
-- 7. Valid Tamil/Sinhala street and rural landmark addresses accepted.
-- 8. Existing P0 business protections, leads, billing, approval unaffected.
--
-- Rollback for staging only, if required:
-- DROP TRIGGER IF EXISTS slbi_p1_business_location_guard ON public.businesses;
-- DROP FUNCTION IF EXISTS public.slbi_p1_guard_business_location();
