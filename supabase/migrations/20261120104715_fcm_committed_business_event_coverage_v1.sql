-- Route durable user-relevant events to the existing notifications/FCM outbox.
CREATE SCHEMA IF NOT EXISTS slbi_push_internal;
REVOKE ALL ON SCHEMA slbi_push_internal FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION slbi_push_internal.notify_committed_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE recipient uuid; business_owner uuid; heading text; detail text; kind text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' THEN RETURN NEW; END IF;
 CASE TG_TABLE_NAME
 WHEN 'businesses' THEN
  IF TG_OP='INSERT' AND NEW.status='pending' THEN
   recipient:=NEW.owner_id; heading:='Business registration received'; detail:='Your business application has been received and is awaiting review.'; kind:='success';
  END IF;
 WHEN 'verifications' THEN
  IF TG_OP='INSERT' AND NEW.status='pending' THEN
   SELECT b.owner_id INTO recipient FROM public.businesses b WHERE b.id=NEW.business_id;
   heading:='Verification request received'; detail:='Your verification request is awaiting review.'; kind:='success';
  END IF;
 WHEN 'slbi_lead_request_receipts' THEN
  SELECT b.owner_id INTO recipient FROM public.leads l JOIN public.businesses b ON b.id=l.business_id WHERE l.id=NEW.lead_id AND b.status='approved';
  IF recipient IS NOT NULL AND NOT coalesce((SELECT p.leads FROM public.vendor_notification_preferences p WHERE p.user_id=recipient LIMIT 1),true) THEN RETURN NEW; END IF;
  heading:='New business enquiry'; detail:='A new verified enquiry is available in your Leads dashboard.'; kind:='info';
 WHEN 'reviews' THEN
  IF TG_OP='INSERT' AND NEW.moderation_status='pending' THEN
   recipient:=NEW.user_id; heading:='Review submitted'; detail:='Your review was received and is awaiting moderation.'; kind:='success';
  ELSIF TG_OP='UPDATE' THEN
   IF OLD.moderation_status='pending' AND NEW.moderation_status IN ('approved','rejected') AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id AND OLD.business_id IS NOT DISTINCT FROM NEW.business_id THEN
    recipient:=NEW.user_id;
    IF NEW.moderation_status='approved' AND NEW.is_approved THEN
     heading:='Review approved'; detail:='Your review has been approved.'; kind:='success';
     SELECT b.owner_id INTO business_owner FROM public.businesses b WHERE b.id=NEW.business_id;
     IF business_owner IS NOT NULL AND business_owner IS DISTINCT FROM recipient AND coalesce((SELECT p.reviews FROM public.vendor_notification_preferences p WHERE p.user_id=business_owner LIMIT 1),true) THEN
      INSERT INTO public.notifications(user_id,title,message,type) VALUES(business_owner,'New approved review','An approved review is available in your Reviews dashboard.','info');
     END IF;
    ELSIF NEW.moderation_status='rejected' AND NOT NEW.is_approved THEN
     heading:='Review status updated'; detail:='Your review was not approved. Open your account to view the update.'; kind:='warning';
    END IF;
   END IF;
  END IF;
 WHEN 'qr_inventory' THEN
  IF NEW.status::text='assigned' AND NEW.business_id IS NOT NULL THEN
   IF TG_OP='UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.business_id IS NOT DISTINCT FROM NEW.business_id THEN RETURN NEW; END IF;
   END IF;
   SELECT b.owner_id INTO recipient FROM public.businesses b WHERE b.id=NEW.business_id AND b.status='approved';
   heading:='Business QR assigned'; detail:='Your business QR code is ready in your dashboard.'; kind:='success';
  END IF;
 WHEN 'marketing_credit_jobs','marketing_poster_jobs' THEN
  IF TG_OP='UPDATE' THEN
   IF OLD.state IS DISTINCT FROM NEW.state AND OLD.state IN ('reserved','processing') AND NEW.state IN ('completed','refunded') THEN
    recipient:=NEW.user_id;
    IF NEW.state='completed' THEN
     heading:=CASE WHEN TG_TABLE_NAME='marketing_credit_jobs' THEN 'AI caption ready' ELSE 'AI poster ready' END;
     detail:='Your generation has completed. Open Marketing Studio to view it.'; kind:='success';
    ELSE
     heading:=CASE WHEN TG_TABLE_NAME='marketing_credit_jobs' THEN 'AI caption generation update' ELSE 'AI poster generation update' END;
     detail:='Your generation did not complete and the job was refunded. Open Marketing Studio to review the status.'; kind:='warning';
    END IF;
   END IF;
  END IF;
 ELSE RETURN NEW;
 END CASE;
 IF recipient IS NOT NULL AND heading IS NOT NULL THEN
  INSERT INTO public.notifications(user_id,title,message,type) VALUES(recipient,heading,detail,kind);
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION slbi_push_internal.notify_committed_event() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS slbi_push_business_received ON public.businesses;
CREATE TRIGGER slbi_push_business_received AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_verification_received ON public.verifications;
CREATE TRIGGER slbi_push_verification_received AFTER INSERT ON public.verifications FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_verified_lead ON public.slbi_lead_request_receipts;
CREATE TRIGGER slbi_push_verified_lead AFTER INSERT ON public.slbi_lead_request_receipts FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_review_events ON public.reviews;
CREATE TRIGGER slbi_push_review_events AFTER INSERT OR UPDATE OF moderation_status ON public.reviews FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_qr_assigned ON public.qr_inventory;
CREATE TRIGGER slbi_push_qr_assigned AFTER INSERT OR UPDATE OF status,business_id ON public.qr_inventory FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_caption_final ON public.marketing_credit_jobs;
CREATE TRIGGER slbi_push_caption_final AFTER UPDATE OF state ON public.marketing_credit_jobs FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
DROP TRIGGER IF EXISTS slbi_push_poster_final ON public.marketing_poster_jobs;
CREATE TRIGGER slbi_push_poster_final AFTER UPDATE OF state ON public.marketing_poster_jobs FOR EACH ROW EXECUTE FUNCTION slbi_push_internal.notify_committed_event();
