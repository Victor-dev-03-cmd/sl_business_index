\set ON_ERROR_STOP on
INSERT INTO billing.plans(code,name,features,monthly_credits,active)
VALUES('test_plan','Test Plan','{"enabled":["ai_social_draft","seo_basic_audit"]}'::jsonb,500,true);
INSERT INTO billing.prices(plan_id,cycle,amount_minor,version,active)
 SELECT id,'monthly',250000,1,true FROM billing.plans;
INSERT INTO billing.requests(user_id,plan_id,price_id,plan_snapshot,cycle_snapshot,amount_minor,idempotency_key,state)
 SELECT '00000000-0000-4000-8000-000000000002',p.id,pr.id,p.code,
 'monthly',pr.amount_minor,'test-request-key-0001','awaiting_payment'
 FROM billing.plans p JOIN billing.prices pr ON pr.plan_id=p.id;
INSERT INTO billing.payments(request_id,method,reference,state,amount_minor,verified_by,verified_at)
 SELECT id,'manual_bank','TEST-SETTLED-0001','verified',amount_minor,
 '00000000-0000-4000-8000-000000000001',now() FROM billing.requests;
DO $$
DECLARE req uuid; pay uuid;
BEGIN
 SELECT id INTO req FROM billing.requests;
 SELECT id INTO pay FROM billing.payments;
 PERFORM billing.activate_verified(req,pay,'00000000-0000-4000-8000-000000000001',
  'Bank statement independently confirmed in simulated database');
 IF (SELECT count(*) FROM billing.subscriptions WHERE state='active')<>1
 OR (SELECT count(*) FROM billing.invoices)<>1
 OR (SELECT count(*) FROM billing.entitlements WHERE feature_key IN ('ai_social_draft','seo_basic_audit'))<>2
 OR (SELECT count(*) FROM billing.credit_wallets WHERE credit_limit=500 AND credits_remaining=500)<>1
 OR (SELECT count(*) FROM billing.events WHERE event_type='activated')<>1
 OR (SELECT count(*) FROM billing.outbox WHERE topic='billing.activated')<>1
 THEN RAISE EXCEPTION 'Atomic settlement failed'; END IF;
 BEGIN
  PERFORM billing.activate_verified(req,pay,'00000000-0000-4000-8000-000000000001',
   'Attempted duplicate activation blocked');
  RAISE EXCEPTION 'Replay accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
END $$;
\echo 'PASS: independent PostgreSQL billing tables and transactional activation'
