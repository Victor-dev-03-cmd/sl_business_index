-- Standalone PostgreSQL (not Supabase): Billing V1 schema, staging only.
-- Supabase continues to own user identities, roles, businesses and geolocation.
-- All user_id values here are external, server-verified Supabase Auth UUIDs.
BEGIN;
CREATE SCHEMA IF NOT EXISTS billing;
REVOKE ALL ON SCHEMA billing FROM PUBLIC;
CREATE TABLE billing.plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code ~ '^[a-z][a-z0-9_-]{1,60}$'),
 name text NOT NULL,
 features jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(features)='object'),
 monthly_credits integer NOT NULL DEFAULT 0 CHECK(monthly_credits BETWEEN 0 AND 1000000),
 active boolean NOT NULL DEFAULT false
);
CREATE TABLE billing.prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES billing.plans(id),
 cycle text NOT NULL CHECK(cycle IN ('monthly','yearly','one_time')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 currency char(3) NOT NULL DEFAULT 'LKR' CHECK(currency='LKR'),
 version int NOT NULL CHECK(version>=1),
 active boolean NOT NULL DEFAULT false,
 UNIQUE(plan_id,cycle,version)
);
CREATE UNIQUE INDEX billing_one_active_price ON billing.prices(plan_id,cycle) WHERE active;
CREATE TABLE billing.requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 plan_id uuid NOT NULL REFERENCES billing.plans(id),
 price_id uuid NOT NULL REFERENCES billing.prices(id),
 plan_snapshot text NOT NULL,
 cycle_snapshot text NOT NULL CHECK(cycle_snapshot IN ('monthly','yearly','one_time')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 128),
 state text NOT NULL DEFAULT 'submitted'
 CHECK(state IN ('submitted','reviewing','awaiting_payment','activated','rejected','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key)
);
CREATE INDEX billing_requests_account ON billing.requests(user_id,created_at DESC);
CREATE UNIQUE INDEX billing_request_open_once ON billing.requests(user_id,plan_id,cycle_snapshot)
 WHERE state IN ('submitted','reviewing','awaiting_payment');
CREATE TABLE billing.payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES billing.requests(id),
 method text NOT NULL CHECK(method IN ('manual_bank','gateway')),
 reference text NOT NULL CHECK(length(btrim(reference))>=6),
 state text NOT NULL CHECK(state IN ('pending','verified','failed','refunded')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 verified_by uuid,
 verified_at timestamptz,
 CHECK(state<>'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
 UNIQUE(method,reference)
);
CREATE TABLE billing.subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE REFERENCES billing.requests(id),
 plan_id uuid NOT NULL REFERENCES billing.plans(id),
 state text NOT NULL CHECK(state IN ('active','expired','cancelled')),
 starts_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK(expires_at>starts_at)
);
CREATE UNIQUE INDEX billing_one_active_sub ON billing.subscriptions(user_id) WHERE state='active';
CREATE TABLE billing.invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE REFERENCES billing.requests(id),
 subscription_id uuid NOT NULL REFERENCES billing.subscriptions(id),
 payment_id uuid NOT NULL UNIQUE REFERENCES billing.payments(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 currency char(3) NOT NULL DEFAULT 'LKR',
 document_kind text NOT NULL DEFAULT 'payment_record'
 CHECK(document_kind IN ('payment_record','tax_invoice')),
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing.entitlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 subscription_id uuid NOT NULL REFERENCES billing.subscriptions(id),
 feature_key text NOT NULL,
 valid_until timestamptz NOT NULL,
 UNIQUE(subscription_id,feature_key)
);
CREATE TABLE billing.credit_wallets (
 user_id uuid NOT NULL, period_start date NOT NULL,
 credit_limit int NOT NULL CHECK(credit_limit>=0),
 credits_remaining int NOT NULL CHECK(credits_remaining>=0),
 used int NOT NULL DEFAULT 0 CHECK(used>=0),
 PRIMARY KEY(user_id,period_start)
);
CREATE TABLE billing.credit_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL, period_start date NOT NULL,
 delta int NOT NULL CHECK(delta<>0),
 balance_after int NOT NULL CHECK(balance_after>=0),
 request_key text NOT NULL,
 FOREIGN KEY(user_id,period_start) REFERENCES billing.credit_wallets(user_id,period_start),
 UNIQUE(user_id,period_start,request_key)
);
CREATE TABLE billing.events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid REFERENCES billing.requests(id),
 actor_id uuid,
 event_type text NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing.outbox (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic text NOT NULL,
 payload jsonb NOT NULL,
 dedupe_key text NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed'))
);
REVOKE ALL ON ALL TABLES IN SCHEMA billing FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA billing FROM PUBLIC;

-- Payment activation is allowed ONLY after separately verified bank/provider
-- evidence exists. The caller is a trusted server-side finance role which has
-- independently checked Supabase admin/CEO identity.
CREATE FUNCTION billing.activate_verified(
 p_request uuid,p_payment uuid,p_actor uuid,p_note text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE r billing.requests%ROWTYPE; pay billing.payments%ROWTYPE;
 plan_row billing.plans%ROWTYPE;
 s_id uuid; start_time timestamptz := now(); expires timestamptz;
 v_credit_period date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 v_feature text;
BEGIN
 IF p_actor IS NULL OR length(btrim(coalesce(p_note,'')))<12
 THEN RAISE EXCEPTION 'Staff audit evidence required' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM billing.requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.state<>'awaiting_payment'
 THEN RAISE EXCEPTION 'Invalid request state' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.user_id::text,144));
 SELECT * INTO pay FROM billing.payments WHERE id=p_payment FOR UPDATE;
 IF NOT FOUND OR pay.request_id<>r.id OR pay.state<>'verified'
   OR pay.verified_by<>p_actor OR pay.amount_minor<>r.amount_minor
 THEN RAISE EXCEPTION 'Payment is not independently verified' USING ERRCODE='22023'; END IF;
 IF r.cycle_snapshot NOT IN ('monthly','yearly')
 THEN RAISE EXCEPTION 'Not a recurring subscription' USING ERRCODE='22023'; END IF;
 SELECT * INTO plan_row FROM billing.plans WHERE id=r.plan_id AND active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paid plan is not active' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(coalesce(plan_row.features->'enabled','[]'::jsonb)) <> 'array'
 THEN RAISE EXCEPTION 'Invalid plan feature configuration' USING ERRCODE='22023'; END IF;
 expires := start_time + CASE WHEN r.cycle_snapshot='yearly' THEN interval '1 year'
 ELSE interval '1 month' END;
 UPDATE billing.subscriptions SET state='cancelled' WHERE user_id=r.user_id AND state='active';
 INSERT INTO billing.subscriptions(user_id,request_id,plan_id,state,starts_at,expires_at)
 VALUES(r.user_id,r.id,r.plan_id,'active',start_time,expires) RETURNING id INTO s_id;
 INSERT INTO billing.invoices(request_id,subscription_id,payment_id,amount_minor)
 VALUES(r.id,s_id,pay.id,r.amount_minor);
 -- Provision entitlements and monthly AI credits inside the SAME transaction
 -- as verified bank/provider settlement, avoiding split-brain paid features.
 FOR v_feature IN SELECT jsonb_array_elements_text(coalesce(plan_row.features->'enabled','[]'::jsonb)) LOOP
  IF v_feature !~ '^[a-z][a-z0-9_.-]{1,127}
 INSERT INTO billing.events(request_id,actor_id,event_type,detail)
 VALUES(r.id,p_actor,'activated',jsonb_build_object('payment_id',pay.id,'note',left(p_note,1400)));
 INSERT INTO billing.outbox(topic,payload,dedupe_key)
 VALUES('billing.activated',jsonb_build_object('user_id',r.user_id,'subscription_id',s_id),
 'activated:'||r.id::text);
 -- Production cutover still requires provider verification, test accounts,
 -- legal payment/invoice policy and server-only entitlement enforcement.
 RETURN s_id;
END $$;
REVOKE ALL ON FUNCTION billing.activate_verified(uuid,uuid,uuid,text) FROM PUBLIC;
COMMIT;

  THEN RAISE EXCEPTION 'Invalid entitlement key' USING ERRCODE='22023'; END IF;
  INSERT INTO billing.entitlements(user_id,subscription_id,feature_key,valid_until)
  VALUES(r.user_id,s_id,v_feature,expires);
 END LOOP;
 INSERT INTO billing.credit_wallets(user_id,period_start,credit_limit,credits_remaining)
 VALUES(r.user_id,v_credit_period,plan_row.monthly_credits,plan_row.monthly_credits)
 ON CONFLICT(user_id,period_start) DO UPDATE SET
   credit_limit=EXCLUDED.credit_limit,
   credits_remaining=GREATEST(0,EXCLUDED.credit_limit-billing.credit_wallets.used);
 UPDATE billing.requests SET state='activated',updated_at=now() WHERE id=r.id;
 INSERT INTO billing.events(request_id,actor_id,event_type,detail)
 VALUES(r.id,p_actor,'activated',jsonb_build_object('payment_id',pay.id,'note',left(p_note,1400)));
 INSERT INTO billing.outbox(topic,payload,dedupe_key)
 VALUES('billing.activated',jsonb_build_object('user_id',r.user_id,'subscription_id',s_id),
 'activated:'||r.id::text);
 -- Entitlement + credit provisioning must be implemented and tested before
 -- enabling any paid features or production financial cutover.
 RETURN s_id;
END $$;
REVOKE ALL ON FUNCTION billing.activate_verified(uuid,uuid,uuid,text) FROM PUBLIC;
COMMIT;
