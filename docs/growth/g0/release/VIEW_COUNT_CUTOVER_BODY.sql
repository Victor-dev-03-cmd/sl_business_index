-- G0-16 FINAL PRIVILEGE CUTOVER — REVIEW ONLY, NEVER RUN ON ITS OWN.
-- Run only after the new backend RPC is deployed + verified and the
-- G0_VERIFIED_VIEW_COUNT_ENABLED and NEXT_PUBLIC_G0_VERIFIED_VIEW_COUNT_ENABLED
-- flags are correctly configured on the same production release.
-- Existing cached/older browser clients may keep calling the legacy RPC:
-- they must fail closed rather than regain anonymous counter mutation.
-- Requires explicit owner acceptance, independently verified backup,
-- rollback plan, production SQL authorization and cutover window.
BEGIN;
DO $assert$
BEGIN
  IF to_regprocedure('public.slbi_record_verified_business_view(uuid,uuid,text,text)') IS NULL
     OR NOT has_function_privilege('service_role',
          'public.slbi_record_verified_business_view(uuid,uuid,text,text)', 'EXECUTE')
     OR has_function_privilege('anon',
          'public.slbi_record_verified_business_view(uuid,uuid,text,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'G0-16 verified counter not installed securely';
  END IF;
END
$assert$;

REVOKE EXECUTE ON FUNCTION public.increment_business_views(uuid)
  FROM PUBLIC, anon, authenticated;

DO $verify$
BEGIN
  IF has_function_privilege('anon','public.increment_business_views(uuid)','EXECUTE')
     OR has_function_privilege('authenticated','public.increment_business_views(uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.slbi_record_verified_business_view(uuid,uuid,text,text)','EXECUTE')
  THEN
    RAISE EXCEPTION 'G0-16 legacy public mutation still exposed';
  END IF;
END
$verify$;
COMMIT;
