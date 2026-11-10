-- Independent PostgreSQL Billing Core v1.1 (additive).
-- Never run on Supabase: these functions belong to the separate billing database.
BEGIN;
CREATE FUNCTION billing.cancel_request(p_user uuid,p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_order billing.orders%ROWTYPE;
BEGIN
 IF p_user IS NULL OR p_order IS NULL THEN
   RAISE EXCEPTION 'Verified account and order are required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_order FROM billing.orders WHERE id=p_order AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR v_order.status NOT IN('submitted','reviewing','awaiting_payment') THEN
   RAISE EXCEPTION 'Billing request cannot be cancelled' USING ERRCODE='22023';
 END IF;
 UPDATE billing.orders SET status='cancelled',updated_at=now() WHERE id=p_order;
 INSERT INTO billing.events(order_id,actor_id,kind,note)
 VALUES(p_order,p_user,'cancelled','Cancelled by the authenticated account owner');
END $$;
REVOKE ALL ON FUNCTION billing.cancel_request(uuid,uuid) FROM PUBLIC;

-- Two logical roles. Provider-specific LOGIN roles are created separately;
-- never put database passwords in migrations or repository files.
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='slbi_billing_app') THEN
   CREATE ROLE slbi_billing_app NOLOGIN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='slbi_billing_staff') THEN
   CREATE ROLE slbi_billing_staff NOLOGIN;
 END IF;
END $$;

GRANT USAGE ON SCHEMA billing TO slbi_billing_app,slbi_billing_staff;
GRANT EXECUTE ON FUNCTION billing.submit_request(uuid,uuid,text,text) TO slbi_billing_app;
GRANT EXECUTE ON FUNCTION billing.cancel_request(uuid,uuid) TO slbi_billing_app;
GRANT EXECUTE ON FUNCTION billing.account_snapshot(uuid) TO slbi_billing_app;
GRANT EXECUTE ON FUNCTION billing.published_plans() TO slbi_billing_app;
GRANT EXECUTE ON FUNCTION billing.staff_action(uuid,uuid,text,text,text,boolean) TO slbi_billing_staff;
GRANT EXECUTE ON FUNCTION billing.staff_queue() TO slbi_billing_staff;
GRANT EXECUTE ON FUNCTION billing.published_plans() TO slbi_billing_staff;
REVOKE ALL ON ALL TABLES IN SCHEMA billing FROM slbi_billing_app,slbi_billing_staff;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA billing FROM slbi_billing_app,slbi_billing_staff;
COMMIT;
