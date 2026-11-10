-- SLBI Independent PostgreSQL Billing Core v1 (NOT a Supabase migration).
-- Supabase remains the identity, profiles, businesses, PostGIS and media source.
-- All user UUIDs must be verified through Supabase Auth by the calling backend.
-- IMPORTANT: No commercial prices are seeded until owner signs off.
BEGIN;
CREATE SCHEMA IF NOT EXISTS billing;
REVOKE ALL ON SCHEMA billing FROM PUBLIC;
CREATE TABLE billing.plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE,
 name text NOT NULL, description text NOT NULL DEFAULT '',
 monthly_lkr numeric(12,2) NOT NULL CHECK(monthly_lkr>=0),
 yearly_lkr numeric(12,2) NOT NULL CHECK(yearly_lkr>=0),
 listing_limit integer NOT NULL CHECK(listing_limit>0),
 monthly_credits integer NOT NULL DEFAULT 0 CHECK(monthly_credits>=0),
 entitlements jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(entitlements)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing.orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL, plan_id uuid NOT NULL REFERENCES billing.plans(id),
 plan_name text NOT NULL, plan_version integer NOT NULL,
 cycle text NOT NULL CHECK(cycle IN('monthly','yearly')),
 quoted_lkr numeric(12,2) NOT NULL CHECK(quoted_lkr>0),
 credit_allowance integer NOT NULL DEFAULT 0,
 entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 12 AND 128),
 status text NOT NULL DEFAULT 'submitted'
 CHECK(status IN('submitted','reviewing','awaiting_payment','activated','rejected','cancelled')),
 staff_note text,staff_actor uuid,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key)
);
CREATE INDEX billing_orders_user_idx ON billing.orders(user_id,created_at DESC);
CREATE UNIQUE INDEX billing_open_order_once ON billing.orders(user_id,plan_id,cycle)
 WHERE status IN('submitted','reviewing','awaiting_payment');

CREATE TABLE billing.payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES billing.orders(id),
 user_id uuid NOT NULL, amount_lkr numeric(12,2) NOT NULL CHECK(amount_lkr>0),
 payment_method text NOT NULL CHECK(payment_method='manual_bank'),
 bank_reference text NOT NULL CHECK(length(btrim(bank_reference)) BETWEEN 6 AND 160),
 verified_by uuid NOT NULL, evidence_note text NOT NULL
 CHECK(length(btrim(evidence_note)) BETWEEN 20 AND 2000),
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX billing_verified_bank_ref_once ON billing.payments(lower(btrim(bank_reference)));

CREATE TABLE billing.subscriptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,plan_id uuid NOT NULL REFERENCES billing.plans(id),
 plan_name text NOT NULL,cycle text NOT NULL CHECK(cycle IN('monthly','yearly')),
 price_lkr numeric(12,2) NOT NULL, status text NOT NULL
 CHECK(status IN('active','replaced','cancelled','expired')),
 started_at timestamptz NOT NULL DEFAULT now(),ends_at timestamptz NOT NULL,
 originating_order uuid NOT NULL UNIQUE REFERENCES billing.orders(id),
 CHECK(ends_at>started_at)
);
CREATE UNIQUE INDEX billing_single_active_sub ON billing.subscriptions(user_id) WHERE status='active';

CREATE TABLE billing.receipts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL UNIQUE REFERENCES billing.orders(id),
 payment_id uuid NOT NULL UNIQUE REFERENCES billing.payments(id),
 subscription_id uuid NOT NULL UNIQUE REFERENCES billing.subscriptions(id),
 user_id uuid NOT NULL,amount_lkr numeric(12,2) NOT NULL,
 document_type text NOT NULL DEFAULT 'payment_record' CHECK(document_type='payment_record'),
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE billing.receipts IS 'Verified payment record; not a certified tax invoice.';

CREATE TABLE billing.credit_wallets(
 user_id uuid NOT NULL,period_start date NOT NULL,credit_limit integer NOT NULL,
 credits_remaining integer NOT NULL CHECK(credits_remaining>=0),
 credits_used integer NOT NULL DEFAULT 0 CHECK(credits_used>=0),
 PRIMARY KEY(user_id,period_start)
);
CREATE TABLE billing.events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES billing.orders(id),actor_id uuid NOT NULL,
 kind text NOT NULL,note text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_events_order_idx ON billing.events(order_id,created_at);
REVOKE ALL ON ALL TABLES IN SCHEMA billing FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA billing FROM PUBLIC;

-- Invariant: a server-validated Supabase user ID is passed by backend, not by browser.
CREATE FUNCTION billing.submit_request(
 p_user uuid,p_plan uuid,p_cycle text,p_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_plan billing.plans%ROWTYPE;v_old billing.orders%ROWTYPE;v_amount numeric;v_id uuid;
BEGIN
 IF p_user IS NULL OR p_plan IS NULL OR p_cycle IS NULL
   OR p_cycle NOT IN('monthly','yearly') OR p_key IS NULL
   OR length(p_key) NOT BETWEEN 12 AND 128 THEN
   RAISE EXCEPTION 'Invalid billing request' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,611));
 SELECT * INTO v_old FROM billing.orders WHERE user_id=p_user AND idempotency_key=p_key;
 IF FOUND THEN
   IF v_old.plan_id<>p_plan OR v_old.cycle<>p_cycle THEN
     RAISE EXCEPTION 'Conflicting idempotency key' USING ERRCODE='23505';END IF;
   RETURN v_old.id;END IF;
 SELECT * INTO v_plan FROM billing.plans WHERE id=p_plan AND published;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan not published' USING ERRCODE='22023';END IF;
 v_amount:=CASE WHEN p_cycle='monthly' THEN v_plan.monthly_lkr ELSE v_plan.yearly_lkr END;
 IF v_amount<=0 THEN RAISE EXCEPTION 'Paid quote unavailable' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM billing.subscriptions WHERE user_id=p_user
      AND status='active' AND ends_at>now() AND plan_id=p_plan AND cycle=p_cycle) THEN
   RAISE EXCEPTION 'Already subscribed' USING ERRCODE='22023';END IF;
 SELECT id INTO v_id FROM billing.orders WHERE user_id=p_user AND plan_id=p_plan
   AND cycle=p_cycle AND status IN('submitted','reviewing','awaiting_payment') LIMIT 1;
 IF FOUND THEN RETURN v_id;END IF;
 IF (SELECT count(*) FROM billing.orders WHERE user_id=p_user
    AND created_at>now()-interval '24 hours')>=3 THEN
    RAISE EXCEPTION 'Request rate limit' USING ERRCODE='P0001';END IF;
 INSERT INTO billing.orders(user_id,plan_id,plan_name,plan_version,cycle,quoted_lkr,
   credit_allowance,entitlements,idempotency_key)
 VALUES(p_user,p_plan,v_plan.name,v_plan.version,p_cycle,v_amount,v_plan.monthly_credits,
   v_plan.entitlements,p_key) RETURNING id INTO v_id;
 INSERT INTO billing.events(order_id,actor_id,kind,note)
 VALUES(v_id,p_user,'submitted','No payment collected');
 RETURN v_id;
END $$;

CREATE FUNCTION billing.staff_action(p_actor uuid,p_order uuid,p_action text,
 p_note text DEFAULT NULL,p_bank_reference text DEFAULT NULL,p_verified boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_order billing.orders%ROWTYPE;v_status text;
 v_payment uuid;v_subscription uuid;v_receipt uuid;
 v_period date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 v_old_limit integer;v_old_remaining integer;v_old_used integer;
 v_remaining integer;v_end timestamptz;
BEGIN
 -- Role verification is the job of the separately credentialed backend,
 -- which must fetch Supabase profiles.role after verifying Supabase Auth.
 IF p_actor IS NULL THEN RAISE EXCEPTION 'Staff ID required' USING ERRCODE='42501';END IF;
 SELECT * INTO v_order FROM billing.orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='22023';END IF;
 IF p_action='review' AND v_order.status='submitted' THEN v_status:='reviewing';
 ELSIF p_action='request_payment' AND v_order.status='reviewing' THEN v_status:='awaiting_payment';
 ELSIF p_action='reject' AND v_order.status IN('submitted','reviewing','awaiting_payment')
 THEN v_status:='rejected';
 ELSIF p_action='activate' AND v_order.status='awaiting_payment' THEN v_status:='activated';
 ELSE RAISE EXCEPTION 'Invalid state transition' USING ERRCODE='22023';END IF;
 IF v_status='activated' THEN
   PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_order.user_id::text,611));
   IF p_verified IS DISTINCT FROM true OR length(btrim(coalesce(p_bank_reference,'')))<6
     OR length(btrim(coalesce(p_note,'')))<20 THEN
     RAISE EXCEPTION 'Independent bank reconciliation required' USING ERRCODE='22023';END IF;
   v_end:=CASE WHEN v_order.cycle='yearly' THEN now()+interval '1 year'
     ELSE now()+interval '1 month' END;
   UPDATE billing.subscriptions SET status='replaced'
     WHERE user_id=v_order.user_id AND status='active';
   INSERT INTO billing.subscriptions(user_id,plan_id,plan_name,cycle,price_lkr,
     status,ends_at,originating_order)
   VALUES(v_order.user_id,v_order.plan_id,v_order.plan_name,v_order.cycle,
     v_order.quoted_lkr,'active',v_end,v_order.id) RETURNING id INTO v_subscription;
   INSERT INTO billing.payments(order_id,user_id,amount_lkr,payment_method,
     bank_reference,verified_by,evidence_note)
   VALUES(v_order.id,v_order.user_id,v_order.quoted_lkr,'manual_bank',
     btrim(p_bank_reference),p_actor,left(p_note,2000)) RETURNING id INTO v_payment;
   INSERT INTO billing.receipts(order_id,payment_id,subscription_id,user_id,amount_lkr)
   VALUES(v_order.id,v_payment,v_subscription,v_order.user_id,v_order.quoted_lkr)
   RETURNING id INTO v_receipt;
   INSERT INTO billing.credit_wallets(user_id,period_start,credit_limit,credits_remaining)
   VALUES(v_order.user_id,v_period,v_order.credit_allowance,v_order.credit_allowance)
   ON CONFLICT(user_id,period_start) DO NOTHING;
   SELECT credit_limit,credits_remaining,credits_used
     INTO v_old_limit,v_old_remaining,v_old_used FROM billing.credit_wallets
     WHERE user_id=v_order.user_id AND period_start=v_period FOR UPDATE;
   v_remaining:=CASE WHEN v_order.credit_allowance>=v_old_limit
     THEN v_old_remaining+v_order.credit_allowance-v_old_limit
     ELSE least(v_old_remaining,greatest(0,v_order.credit_allowance-v_old_used)) END;
   UPDATE billing.credit_wallets SET credit_limit=v_order.credit_allowance,
      credits_remaining=v_remaining WHERE user_id=v_order.user_id AND period_start=v_period;
 END IF;
 UPDATE billing.orders SET status=v_status,staff_actor=p_actor,
   staff_note=left(coalesce(p_note,''),2000),updated_at=now() WHERE id=p_order;
 INSERT INTO billing.events(order_id,actor_id,kind,note)
 VALUES(p_order,p_actor,v_status,left(coalesce(p_note,''),2000));
 RETURN jsonb_build_object('status',v_status,'paymentId',v_payment,
   'subscriptionId',v_subscription,'receiptId',v_receipt);
END $$;

CREATE FUNCTION billing.account_snapshot(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT jsonb_build_object(
  'orders',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC)
    FROM (SELECT id,plan_name,cycle,quoted_lkr,status,created_at
      FROM billing.orders WHERE user_id=p_user ORDER BY created_at DESC LIMIT 30) o),'[]'::jsonb),
  'subscriptions',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.started_at DESC)
    FROM (SELECT id,plan_name,cycle,price_lkr,status,started_at,ends_at
      FROM billing.subscriptions WHERE user_id=p_user ORDER BY started_at DESC LIMIT 30) s),'[]'::jsonb),
  'receipts',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
    FROM (SELECT id,amount_lkr,document_type,created_at
      FROM billing.receipts WHERE user_id=p_user ORDER BY created_at DESC LIMIT 30) r),'[]'::jsonb))
$$;
CREATE FUNCTION billing.published_plans() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.monthly_lkr),'[]'::jsonb)
 FROM(SELECT id,slug,name,monthly_lkr,yearly_lkr,listing_limit,monthly_credits,
      entitlements,version FROM billing.plans WHERE published ORDER BY monthly_lkr) p
$$;
CREATE FUNCTION billing.staff_queue() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC),'[]'::jsonb)
 FROM(SELECT id,user_id,plan_name,cycle,quoted_lkr,status,created_at,staff_note
      FROM billing.orders ORDER BY created_at DESC LIMIT 250)o
$$;

REVOKE ALL ON FUNCTION billing.submit_request(uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing.staff_action(uuid,uuid,text,text,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing.account_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing.published_plans() FROM PUBLIC;
REVOKE ALL ON FUNCTION billing.staff_queue() FROM PUBLIC;
COMMIT;
