-- SQL integration tests against ephemeral PostgreSQL, not production users.
\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT public.slbi_submit_billing_request(
 '10000000-0000-4000-8000-000000000002'::uuid,'monthly') AS req_a \gset
SELECT public.slbi_submit_billing_request(
 '10000000-0000-4000-8000-000000000002'::uuid,'monthly') = :'req_a'::uuid AS duplicate_safe \gset
\if :duplicate_safe
 \echo 'PASS: duplicate vendor request returns existing ID'
\else
 \echo 'FAIL: duplicate requests'
 \quit 1
\endif
DO $$ BEGIN
 BEGIN
  PERFORM public.slbi_submit_billing_request('10000000-0000-4000-8000-000000000002'::uuid,'weekly');
  RAISE EXCEPTION 'Invalid cycle allowed';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.billing_requests)<>0
 THEN RAISE EXCEPTION 'Cross-tenant request leaked'; END IF;
 BEGIN
  PERFORM public.slbi_admin_billing_action('00000000-0000-4000-8000-000000000001'::uuid,'review');
  RAISE EXCEPTION 'Vendor may invoke staff action';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
END $$;
SELECT public.slbi_submit_billing_request(
 '10000000-0000-4000-8000-000000000002'::uuid,'yearly') AS req_b \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT public.slbi_admin_billing_action(:'req_a'::uuid,'review','Review accepted');
SELECT public.slbi_admin_billing_action(:'req_a'::uuid,'request_payment','Awaiting bank transfer');
DO $$ BEGIN
 BEGIN
  PERFORM public.slbi_admin_billing_action(
   (SELECT id FROM public.billing_requests WHERE billing_cycle='monthly'),
   'activate','No bank confirmation','TEST-BANK-0001',false);
  RAISE EXCEPTION 'Unverified payment activated';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
END $$;
SELECT public.slbi_admin_billing_action(
 :'req_a'::uuid,'activate','Independently checked simulated bank entry for testing',
 'TEST-BANK-0001',true);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.subscriptions WHERE status='active')<>1
 THEN RAISE EXCEPTION 'Expected exactly one active subscription'; END IF;
 IF (SELECT count(*) FROM public.invoices WHERE status='paid')<>1
 THEN RAISE EXCEPTION 'Expected exactly one invoice'; END IF;
 IF (SELECT count(*) FROM public.growth_entitlements WHERE plan_name='Professional')<>1
 THEN RAISE EXCEPTION 'Growth entitlement missing'; END IF;
 IF (SELECT count(*) FROM public.billing_request_events WHERE event_type='activated')<>1
 THEN RAISE EXCEPTION 'Activation audit missing'; END IF;
END $$;
\echo 'PASS: verified manual activation writes subscription, invoice, entitlements and audit'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT public.slbi_admin_billing_action(:'req_b'::uuid,'review','Reviewed second request');
SELECT public.slbi_admin_billing_action(:'req_b'::uuid,'request_payment','Awaiting second transfer');
DO $$ BEGIN
 BEGIN
  PERFORM public.slbi_admin_billing_action(
   (SELECT id FROM public.billing_requests WHERE billing_cycle='yearly'),
   'activate','Second simulated bank entry for testing',
   'test-bank-0001',true);
  RAISE EXCEPTION 'Reused settlement evidence accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.invoices)<>1
 THEN RAISE EXCEPTION 'Duplicate settlement created an invoice'; END IF;
 IF (SELECT count(*) FROM public.subscriptions WHERE status='active')<>1
 THEN RAISE EXCEPTION 'Duplicate settlement changed subscription'; END IF;
 IF (SELECT count(*) FROM public.growth_entitlements)<>1
 THEN RAISE EXCEPTION 'Duplicate settlement changed entitlement'; END IF;
 IF (SELECT count(*) FROM public.billing_requests WHERE status='awaiting_payment')<>1
 THEN RAISE EXCEPTION 'Failed settlement did not roll back request'; END IF;
END $$;
\echo 'PASS: reused bank reference rejected with atomic rollback'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
UPDATE public.app_settings SET value='[{"unsafe":true}]'::jsonb
 WHERE key='advanced_feature_definitions';
RESET ROLE;
DO $$ BEGIN
 IF (SELECT value FROM public.app_settings WHERE key='advanced_feature_definitions') <> '[]'::jsonb
 THEN RAISE EXCEPTION 'Vendor changed app settings'; END IF;
END $$;
\echo 'PASS: vendor cannot modify app settings'
