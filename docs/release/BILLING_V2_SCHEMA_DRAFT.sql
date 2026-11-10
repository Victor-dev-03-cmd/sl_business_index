-- SLBI Billing V2 — REVIEW-ONLY draft, NOT executed on the live database.
-- Convert to a timestamped migration using "supabase migration new" only after
-- staging database verification, pricing approval, backup and release review.
-- Existing subscriptions and invoices remain intact. No automatic checkout.
--
-- Security invariants:
-- (1) Vendor can read only their own requests.
-- (2) Browser roles cannot INSERT/UPDATE billing_requests or audit events.
-- (3) New requests use DB-validated plan snapshots and per-user throttling.
-- (4) Only DB-verified admin/CEO staff can complete manual settlement.
-- (5) Activation + subscription + paid record + audit are one transaction.
-- (6) "Paid" means an independent BANK SETTLEMENT verified manually
--     by a privileged staff member, NOT a browser request or automatic proof.

CREATE TABLE IF NOT EXISTS public.billing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  plan_name text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  quoted_lkr numeric(12,2) NOT NULL CHECK (quoted_lkr > 0),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','awaiting_payment','activated','rejected','cancelled')),
  staff_note text,
  payment_reference text,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  subscription_id uuid REFERENCES public.subscriptions(id),
  invoice_id text REFERENCES public.invoices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_requests_owner_created_idx
 ON public.billing_requests(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS billing_requests_staff_queue_idx
 ON public.billing_requests(status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS billing_requests_one_open_plan
 ON public.billing_requests(user_id,plan_id,billing_cycle)
 WHERE status IN ('submitted','reviewing','awaiting_payment');

CREATE TABLE IF NOT EXISTS public.billing_request_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES public.billing_requests(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 event_type text NOT NULL,
 note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_events_request_idx
 ON public.billing_request_events(request_id,created_at);

ALTER TABLE public.billing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_requests FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.billing_request_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.billing_requests TO authenticated;
GRANT SELECT ON public.billing_request_events TO authenticated;

CREATE POLICY "billing_requests_account_or_staff_read"
ON public.billing_requests FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id
 OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid())
 AND p.role IN ('admin','ceo')));

CREATE POLICY "billing_events_staff_read"
ON public.billing_request_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid())
 AND p.role IN ('admin','ceo')));

CREATE OR REPLACE FUNCTION public.slbi_submit_billing_request(p_plan_id uuid,p_cycle text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_plan public.subscription_plans%ROWTYPE;
 v_old_id uuid;
 v_amount numeric(12,2);
 v_id uuid;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_cycle NOT IN ('monthly','yearly') OR p_cycle IS NULL THEN
   RAISE EXCEPTION 'Unsupported billing cycle' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,144));
 SELECT * INTO v_plan FROM public.subscription_plans WHERE id=p_plan_id AND is_active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan not available' USING ERRCODE='22023'; END IF;
 v_amount := CASE WHEN p_cycle='yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END;
 IF v_amount IS NULL OR v_amount <= 0 THEN
   RAISE EXCEPTION 'This plan needs a staff quote' USING ERRCODE='22023';
 END IF;
 IF EXISTS (SELECT 1 FROM public.subscriptions s
  WHERE s.user_id=v_uid AND s.status='active'
   AND s.plan_name=v_plan.name AND s.billing_cycle=p_cycle
   AND (s.renews_at IS NULL OR s.renews_at>now())) THEN
   RAISE EXCEPTION 'This billing plan is already active' USING ERRCODE='22023';
 END IF;

 SELECT id INTO v_old_id FROM public.billing_requests
 WHERE user_id=v_uid AND plan_id=p_plan_id AND billing_cycle=p_cycle
 AND status IN ('submitted','reviewing','awaiting_payment')
 ORDER BY created_at DESC LIMIT 1;
 IF v_old_id IS NOT NULL THEN RETURN v_old_id; END IF;

 IF (SELECT count(*) FROM public.billing_requests WHERE user_id=v_uid
    AND created_at>now()-interval '24 hours') >= 3 THEN
   RAISE EXCEPTION 'Too many recent billing requests' USING ERRCODE='P0001';
 END IF;

 INSERT INTO public.billing_requests(user_id,plan_id,plan_name,billing_cycle,quoted_lkr)
 VALUES(v_uid,v_plan.id,v_plan.name,p_cycle,v_amount) RETURNING id INTO v_id;
 INSERT INTO public.billing_request_events(request_id,actor_id,event_type,note)
 VALUES(v_id,v_uid,'submitted','Plan quote request; NO PAYMENT TAKEN');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.slbi_submit_billing_request(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_submit_billing_request(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.slbi_cancel_billing_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_uid uuid := auth.uid(); v_req public.billing_requests%ROWTYPE;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_req FROM public.billing_requests
 WHERE id=p_id AND user_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_req.status NOT IN ('submitted','reviewing','awaiting_payment') THEN
   RAISE EXCEPTION 'Request cannot be cancelled' USING ERRCODE='22023';
 END IF;
 UPDATE public.billing_requests SET status='cancelled',updated_at=now() WHERE id=p_id;
 INSERT INTO public.billing_request_events(request_id,actor_id,event_type)
 VALUES(p_id,v_uid,'cancelled');
END $$;
REVOKE ALL ON FUNCTION public.slbi_cancel_billing_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_cancel_billing_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.slbi_admin_billing_action(
 p_id uuid,p_action text,p_note text DEFAULT NULL,
 p_payment_reference text DEFAULT NULL,p_verified boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_admin uuid := auth.uid();
 v_req public.billing_requests%ROWTYPE;
 v_subscription uuid;
 v_invoice text;
 v_status text;
BEGIN
 IF v_admin IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.id=v_admin AND p.role IN ('admin','ceo')
 ) THEN RAISE EXCEPTION 'Billing administrator access required' USING ERRCODE='42501'; END IF;

 SELECT * INTO v_req FROM public.billing_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='22023'; END IF;

 IF p_action='review' AND v_req.status='submitted' THEN v_status:='reviewing';
 ELSIF p_action='request_payment' AND v_req.status='reviewing' THEN v_status:='awaiting_payment';
 ELSIF p_action='reject' AND v_req.status IN ('submitted','reviewing','awaiting_payment') THEN v_status:='rejected';
 ELSIF p_action='activate' AND v_req.status='awaiting_payment' THEN v_status:='activated';
 ELSE RAISE EXCEPTION 'Invalid billing state transition' USING ERRCODE='22023';
 END IF;

 IF v_status='activated' THEN
   IF p_verified IS DISTINCT FROM true OR
      char_length(pg_catalog.btrim(coalesce(p_payment_reference,''))) < 6 OR
      char_length(pg_catalog.btrim(coalesce(p_note,''))) < 12 THEN
     RAISE EXCEPTION 'Independent settlement evidence, reference, and audit note required'
     USING ERRCODE='22023';
   END IF;
   IF NOT EXISTS (SELECT 1 FROM public.subscription_plans
                 WHERE id=v_req.plan_id AND is_active=true) THEN
     RAISE EXCEPTION 'Plan has been deactivated' USING ERRCODE='22023';
   END IF;

   -- Ensure this user never keeps two simultaneously active plan records.
   UPDATE public.subscriptions SET status='canceled'
    WHERE user_id=v_req.user_id AND status='active';
   INSERT INTO public.subscriptions(user_id,plan_name,price,billing_cycle,status,renews_at)
   VALUES(v_req.user_id,v_req.plan_name,v_req.quoted_lkr,v_req.billing_cycle,'active',
     CASE WHEN v_req.billing_cycle='yearly' THEN now()+interval '1 year'
          ELSE now()+interval '1 month' END)
   RETURNING id INTO v_subscription;
   v_invoice := 'SLBI-MANUAL-'||replace(gen_random_uuid()::text,'-','');
   INSERT INTO public.invoices(id,subscription_id,amount,status)
   VALUES(v_invoice,v_subscription,v_req.quoted_lkr,'paid');
 END IF;

 UPDATE public.billing_requests SET
  status=v_status,staff_note=left(coalesce(p_note,''),2000),
  payment_reference=CASE WHEN v_status='activated' THEN left(pg_catalog.btrim(p_payment_reference),160) ELSE payment_reference END,
  verified_by=CASE WHEN v_status='activated' THEN v_admin ELSE verified_by END,
  verified_at=CASE WHEN v_status='activated' THEN now() ELSE verified_at END,
  subscription_id=CASE WHEN v_status='activated' THEN v_subscription ELSE subscription_id END,
  invoice_id=CASE WHEN v_status='activated' THEN v_invoice ELSE invoice_id END,
  updated_at=now()
 WHERE id=p_id;

 INSERT INTO public.billing_request_events(request_id,actor_id,event_type,note)
 VALUES(p_id,v_admin,v_status,left(coalesce(p_note,''),2000));

 RETURN pg_catalog.jsonb_build_object('requestId',p_id,'status',v_status,
  'subscriptionId',v_subscription,'invoiceId',v_invoice);
END $$;
REVOKE ALL ON FUNCTION public.slbi_admin_billing_action(uuid,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_admin_billing_action(uuid,text,text,text,boolean) TO authenticated;

-- Existing invoice RLS allows own invoice reads only; add staff visibility.
CREATE POLICY "billing_admin_invoice_read" ON public.invoices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid())
AND p.role IN ('admin','ceo')));

-- app_settings currently has no RLS. Keep the known public feature-catalog
-- key readable; allow only administrator/CEO changes.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_safe_feature_definitions_public" ON public.app_settings
FOR SELECT TO anon,authenticated USING (key='advanced_feature_definitions');
CREATE POLICY "billing_app_settings_staff_all" ON public.app_settings
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p
 WHERE p.id=(select auth.uid()) AND p.role IN ('admin','ceo')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
 WHERE p.id=(select auth.uid()) AND p.role IN ('admin','ceo')));

-- Before apply: verify no policies with these names exist, inspect
-- role grants, code paths reading other app_settings keys, verify on isolated DB.
-- Manual settlement does not replace gateway signed webhook verification.
