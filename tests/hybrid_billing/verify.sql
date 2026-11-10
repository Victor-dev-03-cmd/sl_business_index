-- Test only on ephemeral PostgreSQL 17 CI database.
\set ON_ERROR_STOP on
-- Roles and EXECUTE-only grants are applied by migration 002.

-- Production catalogue MUST be empty until final four-plan pricing approved.
DO $$ BEGIN IF (SELECT count(*) FROM billing.plans) <> 0 THEN
  RAISE EXCEPTION 'Unapproved production plans were seeded'; END IF; END $$;
-- Fixtures are legacy-priced test values, NEVER live new-plan pricing.
INSERT INTO billing.plans(id,slug,name,monthly_lkr,yearly_lkr,listing_limit,monthly_credits,published)
VALUES('10000000-0000-4000-8000-000000000002','professional','Professional',2500,25000,3,500,true);

SET ROLE slbi_billing_app;
SELECT billing.submit_request(
 '00000000-0000-4000-8000-000000000002'::uuid,
 '10000000-0000-4000-8000-000000000002'::uuid,'monthly',
 'test-idempotency-key-A-00001') AS first_order \gset
SELECT billing.submit_request(
 '00000000-0000-4000-8000-000000000002'::uuid,
 '10000000-0000-4000-8000-000000000002'::uuid,'monthly',
 'test-idempotency-key-A-00001') = :'first_order'::uuid AS duplicate_ok \gset
\if :duplicate_ok
 \echo 'PASS: duplicate request idempotency'
\else
 \echo 'FAIL: duplicate request idempotency'
 \quit 1
\endif
SELECT billing.submit_request(
 '00000000-0000-4000-8000-000000000002'::uuid,
 '10000000-0000-4000-8000-000000000002'::uuid,'yearly',
 'test-idempotency-key-B-00001') AS second_order \gset
DO $$ BEGIN
  BEGIN
    PERFORM billing.submit_request(
      '00000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,'weekly','test-INVALID-000000');
    RAISE EXCEPTION 'Invalid cycle accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
END $$;
DO $$ BEGIN
  BEGIN
    PERFORM billing.staff_action(
     '00000000-0000-4000-8000-000000000001'::uuid,
     '00000000-0000-4000-8000-000000000005'::uuid,'review');
    RAISE EXCEPTION 'Customer DB credential accessed staff action';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM billing.payments;
    RAISE EXCEPTION 'Customer credential read private payments';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT billing.submit_request(
 '00000000-0000-4000-8000-000000000003'::uuid,
 '10000000-0000-4000-8000-000000000002'::uuid,'monthly',
 'test-cancel-order-user-B-0001') AS cancel_order \gset
SELECT billing.cancel_request(
 '00000000-0000-4000-8000-000000000003'::uuid, :'cancel_order'::uuid);
SELECT billing.account_snapshot('00000000-0000-4000-8000-000000000003'::uuid)
 -> 'orders' @> '[{"status":"cancelled"}]'::jsonb AS cancelled_ok \gset
\if :cancelled_ok
 \echo 'PASS: vendor may cancel their own pending order'
\else
 \echo 'FAIL: cancellation'
 \quit 1
\endif
RESET ROLE;

SET ROLE slbi_billing_staff;
SELECT set_config('billing.test_first_order', :'first_order', false);
SELECT billing.staff_action(
 '00000000-0000-4000-8000-000000000001'::uuid,:'first_order'::uuid,'review','Reviewed');
SELECT billing.staff_action(
 '00000000-0000-4000-8000-000000000001'::uuid,:'first_order'::uuid,'request_payment','Awaiting bank transfer');
DO $$ BEGIN
  BEGIN
    PERFORM billing.staff_action(
      '00000000-0000-4000-8000-000000000001'::uuid,
      current_setting('billing.test_first_order')::uuid,'activate','No independent confirmation','TESTBANK1234',false);
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
SELECT billing.staff_action(
 '00000000-0000-4000-8000-000000000001'::uuid,:'first_order'::uuid,'activate',
 'Independently verified simulated bank transfer in test environment',
 'TESTBANK1234',true);
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM billing.subscriptions WHERE status='active') <> 1
    THEN RAISE EXCEPTION 'Expected one active subscription'; END IF;
  IF (SELECT count(*) FROM billing.payments) <> 1
    THEN RAISE EXCEPTION 'Expected one payment'; END IF;
  IF (SELECT count(*) FROM billing.receipts) <> 1
    THEN RAISE EXCEPTION 'Expected one receipt'; END IF;
  IF (SELECT credits_remaining FROM billing.credit_wallets
      WHERE user_id='00000000-0000-4000-8000-000000000002'::uuid) <> 500
    THEN RAISE EXCEPTION 'Credits not provisioned'; END IF;
  IF (SELECT count(*) FROM billing.events WHERE kind='activated') <> 1
    THEN RAISE EXCEPTION 'Audit event missing'; END IF;
END $$;
\echo 'PASS: atomic verified manual activation and credits'

SET ROLE slbi_billing_staff;
SELECT set_config('billing.test_second_order', :'second_order', false);
SELECT billing.staff_action(
 '00000000-0000-4000-8000-000000000001'::uuid,:'second_order'::uuid,'review','Reviewed second request');
SELECT billing.staff_action(
 '00000000-0000-4000-8000-000000000001'::uuid,:'second_order'::uuid,
 'request_payment','Second payment request');
DO $$
BEGIN
  BEGIN
    PERFORM billing.staff_action(
      '00000000-0000-4000-8000-000000000001'::uuid,
      current_setting('billing.test_second_order')::uuid,'activate',
      'Attempt to reuse same independently verified transfer','testbank1234',true);
    RAISE EXCEPTION 'Duplicate bank reference accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM billing.payments) <> 1
  OR (SELECT count(*) FROM billing.receipts) <> 1
  OR (SELECT count(*) FROM billing.subscriptions WHERE status='active') <> 1
  THEN RAISE EXCEPTION 'Duplicate bank payment produced partial writes'; END IF;
 IF (SELECT count(*) FROM billing.orders WHERE status='awaiting_payment') <> 1
  THEN RAISE EXCEPTION 'Duplicate bank payment changed order status'; END IF;
END $$;
\echo 'PASS: duplicate bank evidence rolls back every financial write'
