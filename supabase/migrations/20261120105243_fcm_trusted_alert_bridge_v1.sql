-- Server-only allowlisted inbox bridge for cross-database events and critical errors.
CREATE TABLE IF NOT EXISTS slbi_push_internal.event_receipts (
 recipient uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_key text NOT NULL CHECK(length(event_key)<=200),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(recipient,event_key)
);
ALTER TABLE slbi_push_internal.event_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_push_internal.event_receipts FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.slbi_emit_trusted_alert(p_user uuid,p_event text,p_reference text DEFAULT '')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE heading text; detail text; kind text; eventkey text; target uuid; targets uuid[]; emitted integer:=0;
BEGIN
 IF p_event IN ('billing_submitted','billing_cancelled','billing_reviewing','billing_awaiting_payment','billing_rejected','billing_activated') THEN
  IF p_user IS NULL OR p_reference IS NULL OR p_reference !~ '^[0-9a-fA-F-]{36}$' THEN RETURN 0; END IF;
  eventkey:=p_event||':'||lower(p_reference); targets:=ARRAY[p_user];
  heading:=CASE p_event WHEN 'billing_submitted' THEN 'Billing request received' WHEN 'billing_cancelled' THEN 'Billing request cancelled' WHEN 'billing_reviewing' THEN 'Billing request under review' WHEN 'billing_awaiting_payment' THEN 'Payment instructions available' WHEN 'billing_rejected' THEN 'Billing request update' ELSE 'Subscription activated' END;
  detail:='Open Billing to view your current request status.'; kind:=CASE WHEN p_event='billing_rejected' THEN 'warning' ELSE 'success' END;
 ELSIF p_event IN ('critical_billing','critical_server','critical_frontend') THEN
  -- At most one alert per recipient/category per 30-minute UTC bucket.
  eventkey:=p_event||':'||floor(extract(epoch FROM now())/1800)::text;
  IF p_user IS NULL THEN
   IF p_event='critical_frontend' THEN RETURN 0; END IF;
   SELECT array_agg(id) INTO targets FROM public.profiles WHERE role::text IN ('admin','ceo');
  ELSE targets:=ARRAY[p_user]; END IF;
  heading:=CASE p_event WHEN 'critical_billing' THEN 'Billing service needs attention' WHEN 'critical_frontend' THEN 'Website operation interrupted' ELSE 'Website service needs attention' END;
  detail:='An operation could not be completed. Open SLBI to review the status.'; kind:='error';
 ELSE RETURN 0; END IF;
 FOREACH target IN ARRAY coalesce(targets,ARRAY[]::uuid[]) LOOP
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=target) THEN
   INSERT INTO slbi_push_internal.event_receipts(recipient,event_key) VALUES(target,eventkey) ON CONFLICT DO NOTHING;
   IF FOUND THEN
    INSERT INTO public.notifications(user_id,title,message,type) VALUES(target,heading,detail,kind);
    emitted:=emitted+1;
   END IF;
  END IF;
 END LOOP;
 RETURN emitted;
END $$;
REVOKE ALL ON FUNCTION public.slbi_emit_trusted_alert(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_emit_trusted_alert(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION slbi_push_internal.notify_promotion_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF OLD.status='pending' AND NEW.status IN ('approved','rejected')
    AND OLD.vendor_id IS NOT DISTINCT FROM NEW.vendor_id AND OLD.business_id IS NOT DISTINCT FROM NEW.business_id
    AND NEW.vendor_id IS NOT NULL
    AND (auth.role()='service_role' OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role::text IN ('admin','ceo'))) THEN
  INSERT INTO public.notifications(user_id,title,message,type)
  VALUES(NEW.vendor_id,'Promotion request update',CASE WHEN NEW.status='approved' THEN 'Your promotion request was approved.' ELSE 'Your promotion request was not approved.' END,CASE WHEN NEW.status='approved' THEN 'success' ELSE 'warning' END);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION slbi_push_internal.notify_promotion_decision() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS slbi_push_promotion_decision ON public.promotions;
CREATE TRIGGER slbi_push_promotion_decision AFTER UPDATE OF status ON public.promotions FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_promotion_decision();
NOTIFY pgrst,'reload schema';
