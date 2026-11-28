BEGIN;
-- No existing follower is silently converted into a marketing recipient.
CREATE TABLE slbi_audience_private.business_email_blocks (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 blocked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,business_id)
);
ALTER TABLE slbi_audience_private.business_email_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_audience_private.business_email_blocks FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.slbi_audience_change(p_user uuid,p_business uuid,p_action text,p_language text DEFAULT 'en')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE digest_value bytea; current_row slbi_audience_private.memberships%ROWTYPE; network_row slbi_audience_private.network_preferences%ROWTYPE;
BEGIN
  IF p_user IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user) THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_action IN ('follow_subscribe','subscribe','network_subscribe') THEN
    SELECT extensions.digest(lower(trim(email)),'sha256') INTO digest_value FROM auth.users
    WHERE id=p_user AND email_confirmed_at IS NOT NULL AND email IS NOT NULL AND length(email) BETWEEN 5 AND 254;
    IF digest_value IS NULL THEN RAISE EXCEPTION 'VERIFIED_EMAIL_REQUIRED'; END IF;
  END IF;
  -- Serialize changes by account. Explicit withdrawal is always available.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,92741));
  -- Withdrawal is never rate-limited; throttle only additions/enabling.
  IF p_action NOT IN ('unfollow','unsubscribe','network_unsubscribe','news_off','push_off') THEN
  INSERT INTO slbi_audience_private.action_limits(user_id,minute_bucket,used) VALUES(p_user,date_trunc('minute',now()),1)
  ON CONFLICT(user_id) DO UPDATE SET minute_bucket=EXCLUDED.minute_bucket,used=CASE WHEN action_limits.minute_bucket=EXCLUDED.minute_bucket THEN action_limits.used+1 ELSE 1 END
    WHERE action_limits.minute_bucket<>EXCLUDED.minute_bucket OR action_limits.used<30;
  IF NOT FOUND THEN RAISE EXCEPTION 'PREFERENCE_RATE_LIMIT'; END IF;
  END IF;
  IF p_action IN ('network_subscribe','network_unsubscribe') THEN
    IF p_business IS NOT NULL OR p_language NOT IN ('en','ta','si') THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
    SELECT * INTO network_row FROM slbi_audience_private.network_preferences WHERE user_id=p_user;
    IF p_action='network_subscribe' THEN
      INSERT INTO slbi_audience_private.network_preferences(user_id,consent_at,email_digest,language) VALUES(p_user,now(),digest_value,p_language)
      ON CONFLICT(user_id) DO UPDATE SET consent_at=CASE WHEN network_preferences.email_digest=EXCLUDED.email_digest THEN network_preferences.consent_at ELSE now() END,email_digest=EXCLUDED.email_digest,language=EXCLUDED.language;
      IF network_row.email_digest IS DISTINCT FROM digest_value THEN INSERT INTO slbi_audience_private.consent_events(user_id,action) VALUES(p_user,p_action); END IF;
    ELSE
      DELETE FROM slbi_audience_private.network_grants WHERE user_id=p_user;
      UPDATE slbi_audience_private.network_preferences SET consent_at=NULL,email_digest=NULL WHERE user_id=p_user AND consent_at IS NOT NULL;
      IF FOUND THEN INSERT INTO slbi_audience_private.consent_events(user_id,action) VALUES(p_user,p_action); END IF;
    END IF;
    RETURN public.slbi_audience_read(p_user,NULL);
  END IF;
  IF p_business IS NULL OR p_action NOT IN ('follow','follow_subscribe','unfollow','news_on','news_off','push_on','push_off','subscribe','unsubscribe') THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND (status='approved' OR p_action IN ('unfollow','unsubscribe','news_off','push_off'))) THEN RAISE EXCEPTION 'BUSINESS_UNAVAILABLE'; END IF;
  IF p_action IN ('follow','follow_subscribe','subscribe') AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business)
    AND (SELECT count(*) FROM slbi_audience_private.memberships WHERE user_id=p_user AND (followed_at IS NOT NULL OR email_consent_at IS NOT NULL))>=200 THEN RAISE EXCEPTION 'MEMBERSHIP_LIMIT'; END IF;
  INSERT INTO slbi_audience_private.memberships(user_id,business_id) VALUES(p_user,p_business) ON CONFLICT DO NOTHING;
  SELECT * INTO current_row FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business FOR UPDATE;
  IF p_action='follow' THEN UPDATE slbi_audience_private.memberships SET followed_at=coalesce(followed_at,now()),news=CASE WHEN followed_at IS NULL THEN true ELSE news END,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action='follow_subscribe' THEN
    UPDATE slbi_audience_private.memberships SET followed_at=coalesce(followed_at,now()),news=true,
      email_consent_at=CASE WHEN email_digest=digest_value AND consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business) THEN email_consent_at ELSE now() END,
      email_digest=digest_value,consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business),updated_at=now()
      WHERE user_id=p_user AND business_id=p_business;
    IF current_row.email_digest IS DISTINCT FROM digest_value OR current_row.consent_owner_id IS DISTINCT FROM (SELECT owner_id FROM public.businesses WHERE id=p_business) THEN
      INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action,policy_version) VALUES(p_user,p_business,'subscribe','slbi-follow-email-v3');
    END IF;
    DELETE FROM slbi_audience_private.business_email_blocks WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action IN ('unfollow','unsubscribe') THEN
    IF current_row.followed_at IS NOT NULL OR current_row.email_consent_at IS NOT NULL OR EXISTS(
      SELECT 1 FROM slbi_audience_private.network_grants g JOIN slbi_audience_private.network_requests q ON q.id=g.request_id WHERE g.user_id=p_user AND q.business_id=p_business
    ) THEN
      INSERT INTO slbi_audience_private.business_email_blocks(user_id,business_id) VALUES(p_user,p_business) ON CONFLICT DO NOTHING;
    END IF;
    IF current_row.email_consent_at IS NOT NULL THEN
      INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action,policy_version) VALUES(p_user,p_business,'unsubscribe','slbi-follow-email-v3');
    END IF;
    UPDATE slbi_audience_private.memberships SET followed_at=NULL,news=false,push=false,email_consent_at=NULL,email_digest=NULL,consent_owner_id=NULL,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
    DELETE FROM slbi_audience_private.network_grants g USING slbi_audience_private.network_requests q WHERE g.request_id=q.id AND g.user_id=p_user AND q.business_id=p_business;
  ELSIF p_action IN ('news_on','push_on') THEN
    IF current_row.followed_at IS NULL THEN RAISE EXCEPTION 'FOLLOW_REQUIRED'; END IF;
    UPDATE slbi_audience_private.memberships SET news=true,push=CASE WHEN p_action='push_on' THEN true ELSE push END,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action IN ('news_off','push_off') THEN UPDATE slbi_audience_private.memberships SET news=CASE WHEN p_action='news_off' THEN false ELSE news END,push=false,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action='subscribe' THEN
    -- Backward-compatible explicit legacy subscription; never backfill from a plain follow.
    UPDATE slbi_audience_private.memberships SET email_consent_at=CASE WHEN email_digest=digest_value AND consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business) THEN email_consent_at ELSE now() END,email_digest=digest_value,consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business),updated_at=now() WHERE user_id=p_user AND business_id=p_business;
    IF (current_row.email_digest IS DISTINCT FROM digest_value OR current_row.consent_owner_id IS DISTINCT FROM (SELECT owner_id FROM public.businesses WHERE id=p_business)) THEN INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action) VALUES(p_user,p_business,p_action); END IF;
  ELSE
    UPDATE slbi_audience_private.memberships SET email_consent_at=NULL,email_digest=NULL,consent_owner_id=NULL,updated_at=now() WHERE user_id=p_user AND business_id=p_business AND email_consent_at IS NOT NULL;
    IF FOUND THEN INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action) VALUES(p_user,p_business,p_action); END IF;
  END IF;
  -- Cancel queued, not-yet-dispatched device pushes when a user withdraws the relevant preference.
  IF p_action IN ('unfollow','unsubscribe','news_off','push_off') THEN
    DELETE FROM public.fcm_delivery_jobs j USING slbi_audience_private.news_deliveries d
    WHERE j.notification_id=d.notification_id AND d.user_id=p_user AND d.business_id=p_business;
  END IF;
  DELETE FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business AND followed_at IS NULL AND email_consent_at IS NULL;
  RETURN coalesce(public.slbi_audience_read(p_user,p_business),'{}'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.slbi_audience_owner_summary(p_owner uuid,p_business uuid,p_language text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE followers bigint; subscribers bigint; pushes bigint; network_count bigint; network_enabled boolean;
BEGIN
  IF p_language NOT IN ('all','en','ta','si') OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
  SELECT count(*) FILTER(WHERE m.followed_at IS NOT NULL),count(*) FILTER(WHERE m.followed_at IS NOT NULL AND m.news AND m.push),
    count(*) FILTER(WHERE m.email_consent_at IS NOT NULL AND m.consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=m.business_id) AND u.email_confirmed_at IS NOT NULL AND m.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
      )
  INTO followers,pushes,subscribers FROM slbi_audience_private.memberships m JOIN auth.users u ON u.id=m.user_id WHERE m.business_id=p_business;
  SELECT EXISTS(SELECT 1 FROM slbi_audience_private.network_requests q WHERE q.business_id=p_business AND q.owner_id=p_owner AND q.status='approved' AND q.expires_at>now() AND (p_language='all' OR q.language='all' OR q.language=p_language)) INTO network_enabled;
  IF network_enabled THEN
    SELECT count(DISTINCT g.user_id) INTO network_count FROM slbi_audience_private.network_requests q JOIN slbi_audience_private.network_grants g ON g.request_id=q.id JOIN slbi_audience_private.network_preferences n ON n.user_id=g.user_id JOIN auth.users u ON u.id=g.user_id
    WHERE q.business_id=p_business AND q.owner_id=p_owner AND q.status='approved' AND q.expires_at>now()
    AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks eb WHERE eb.business_id=p_business AND eb.user_id=n.user_id)
    AND n.consent_at=g.consent_at AND n.email_digest=g.email_digest AND u.email_confirmed_at IS NOT NULL AND n.email_digest=extensions.digest(lower(trim(u.email)),'sha256') AND (p_language='all' OR n.language=p_language)
    AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)));
  END IF;
  RETURN jsonb_build_object('followers',followers,'subscribers',subscribers,'pushPreferences',pushes,'networkEnabled',network_enabled,'networkReach',network_count);
END $$;
CREATE OR REPLACE FUNCTION public.slbi_audience_lists(p_owner uuid,p_business uuid,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE direct_list jsonb; network_list jsonb; requests jsonb;
BEGIN
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000 OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(x.email),'[]'::jsonb) INTO direct_list FROM (
 SELECT DISTINCT lower(trim(u.email)) AS email FROM slbi_audience_private.memberships m JOIN auth.users u ON u.id=m.user_id
 WHERE m.business_id=p_business AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks eb WHERE eb.business_id=p_business AND eb.user_id=m.user_id) AND m.consent_owner_id=p_owner AND m.email_consent_at IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND m.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)))
 ORDER BY email OFFSET p_offset LIMIT 100) x;
 SELECT coalesce(jsonb_agg(x.email),'[]'::jsonb) INTO network_list FROM (
 SELECT DISTINCT lower(trim(u.email)) AS email FROM slbi_audience_private.network_requests q JOIN slbi_audience_private.network_grants g ON g.request_id=q.id JOIN slbi_audience_private.network_preferences n ON n.user_id=g.user_id JOIN auth.users u ON u.id=g.user_id
 WHERE q.business_id=p_business AND q.owner_id=p_owner AND q.status='approved' AND q.expires_at>now()
 AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks eb WHERE eb.business_id=p_business AND eb.user_id=n.user_id)
 AND n.consent_at=g.consent_at AND n.email_digest=g.email_digest AND u.email_confirmed_at IS NOT NULL AND n.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)))
 ORDER BY email LIMIT 100) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO requests FROM (
 SELECT id,status,requested_count,language,purpose,created_at,expires_at FROM slbi_audience_private.network_requests WHERE business_id=p_business AND owner_id=p_owner ORDER BY created_at DESC LIMIT 10) x;
 RETURN jsonb_build_object('direct',direct_list,'network',network_list,'requests',requests);
END $$;
CREATE OR REPLACE FUNCTION public.slbi_audience_admin_control(p_actor uuid,p_request uuid DEFAULT NULL,p_decision text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q slbi_audience_private.network_requests%ROWTYPE; result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role::text IN ('admin','ceo')) THEN RETURN NULL; END IF;
 IF p_request IS NOT NULL THEN
   SELECT * INTO q FROM slbi_audience_private.network_requests WHERE id=p_request FOR UPDATE;
   IF NOT FOUND OR NOT ((q.status='pending' AND p_decision IN ('approved','rejected')) OR (q.status='approved' AND p_decision='revoked')) THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;
   IF p_decision='approved' THEN
     IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=q.business_id AND owner_id=q.owner_id AND status='approved') THEN RAISE EXCEPTION 'BUSINESS_UNAVAILABLE'; END IF;
     INSERT INTO slbi_audience_private.network_grants(request_id,user_id,consent_at,email_digest)
     SELECT q.id,n.user_id,n.consent_at,n.email_digest FROM slbi_audience_private.network_preferences n JOIN auth.users u ON u.id=n.user_id
     WHERE n.consent_at IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND n.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
     AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks eb WHERE eb.business_id=q.business_id AND eb.user_id=n.user_id)
     AND (q.language='all' OR n.language=q.language) AND n.user_id<>q.owner_id
     AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=q.business_id AND s.email=lower(trim(u.email)))
     AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.memberships m WHERE m.user_id=n.user_id AND m.business_id=q.business_id AND m.email_consent_at IS NOT NULL AND m.consent_owner_id=q.owner_id)
     ORDER BY n.consent_at,n.user_id LIMIT q.requested_count;
   END IF;
   UPDATE slbi_audience_private.network_requests SET status=p_decision,reviewed_at=now(),reviewed_by=p_actor,expires_at=CASE WHEN p_decision='approved' THEN now()+interval '7 days' ELSE NULL END WHERE id=q.id;
   INSERT INTO slbi_audience_private.network_review_events(request_id,actor_id,decision) VALUES(q.id,p_actor,p_decision);
 END IF;
 SELECT jsonb_build_object('requests',coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb),'deliveryEnabled',false) INTO result FROM (
 SELECT req.id,req.business_id,b.name AS business_name,req.requested_count,req.language,req.purpose,req.status,req.created_at,req.expires_at FROM slbi_audience_private.network_requests req JOIN public.businesses b ON b.id=req.business_id ORDER BY (req.status='pending') DESC,req.created_at DESC LIMIT 100) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.slbi_audience_change(uuid,uuid,text,text),public.slbi_audience_owner_summary(uuid,uuid,text),public.slbi_audience_lists(uuid,uuid,integer),public.slbi_audience_admin_control(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_audience_change(uuid,uuid,text,text),public.slbi_audience_owner_summary(uuid,uuid,text),public.slbi_audience_lists(uuid,uuid,integer),public.slbi_audience_admin_control(uuid,uuid,text) TO service_role;
COMMIT;
