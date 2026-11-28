-- REVIEW CANDIDATE: apply only after isolated migration/rollback and role tests.
-- No imported users, bulk export or email provider activation; scoped consented email lists only.
BEGIN;
CREATE SCHEMA IF NOT EXISTS slbi_audience_private;
REVOKE ALL ON SCHEMA slbi_audience_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA slbi_audience_private TO service_role;
CREATE TABLE slbi_audience_private.memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  followed_at timestamptz,
  news boolean NOT NULL DEFAULT false,
  push boolean NOT NULL DEFAULT false,
  email_consent_at timestamptz,
  consent_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_digest bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,business_id),
  CHECK (followed_at IS NOT NULL OR (NOT news AND NOT push)),
  CHECK (NOT push OR news),
  CHECK ((email_consent_at IS NULL)=(email_digest IS NULL))
);
CREATE INDEX audience_follow_idx ON slbi_audience_private.memberships(business_id,user_id)
  WHERE followed_at IS NOT NULL AND news;
CREATE INDEX audience_members_business_idx ON slbi_audience_private.memberships(business_id);
CREATE TABLE slbi_audience_private.network_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_at timestamptz,
  email_digest bytea,
  language text NOT NULL DEFAULT 'en' CHECK(language IN ('en','ta','si')),
  CHECK ((consent_at IS NULL)=(email_digest IS NULL))
);
CREATE TABLE slbi_audience_private.consent_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  action text NOT NULL CHECK(action IN ('subscribe','unsubscribe','network_subscribe','network_unsubscribe')),
  policy_version text NOT NULL DEFAULT 'slbi-audience-sharing-v2',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE slbi_audience_private.news_queue (
  news_id uuid PRIMARY KEY REFERENCES public.business_news(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL,
  cursor_user uuid,
  completed_at timestamptz
);
CREATE INDEX audience_news_pending_idx ON slbi_audience_private.news_queue(published_at,news_id) WHERE completed_at IS NULL;
CREATE TABLE slbi_audience_private.news_deliveries (
  news_id uuid NOT NULL REFERENCES public.business_news(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,
  PRIMARY KEY(news_id,user_id)
);
CREATE INDEX audience_news_delivery_user_idx ON slbi_audience_private.news_deliveries(user_id,business_id);
CREATE TABLE slbi_audience_private.action_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  minute_bucket timestamptz NOT NULL,
  used integer NOT NULL CHECK(used BETWEEN 1 AND 30)
);
CREATE TABLE slbi_audience_private.network_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 requested_count integer NOT NULL CHECK(requested_count BETWEEN 1 AND 100),
 language text NOT NULL CHECK(language IN ('all','en','ta','si')),
 purpose text NOT NULL CHECK(length(purpose) BETWEEN 5 AND 300),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz, reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 expires_at timestamptz
);
CREATE INDEX audience_request_business_idx ON slbi_audience_private.network_requests(business_id,created_at DESC);
CREATE UNIQUE INDEX audience_one_pending_request ON slbi_audience_private.network_requests(business_id) WHERE status='pending';
CREATE TABLE slbi_audience_private.network_grants (
 request_id uuid NOT NULL REFERENCES slbi_audience_private.network_requests(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 consent_at timestamptz NOT NULL,
 email_digest bytea NOT NULL,
 PRIMARY KEY(request_id,user_id)
);
CREATE TABLE slbi_audience_private.network_review_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES slbi_audience_private.network_requests(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 decision text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE slbi_audience_private.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.network_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.news_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.network_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.network_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.network_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.news_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_audience_private.action_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA slbi_audience_private FROM PUBLIC,anon,authenticated;
-- Public RPC surface is service-role-only. The API authenticates via getUser.
CREATE FUNCTION public.slbi_audience_read(p_user uuid,p_business uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_business IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND status='approved') THEN RETURN NULL; END IF;
    SELECT jsonb_build_object('following',m.followed_at IS NOT NULL,'news',coalesce(m.news,false),
      'push',coalesce(m.push,false),'email',m.email_consent_at IS NOT NULL,'emailEligible',coalesce(m.email_digest=extensions.digest(lower(trim(u.email)),'sha256') AND u.email_confirmed_at IS NOT NULL AND m.consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=m.business_id),false),
      'followers',(SELECT count(*) FROM slbi_audience_private.memberships x WHERE x.business_id=p_business AND x.followed_at IS NOT NULL))
    INTO result FROM (SELECT 1) dummy LEFT JOIN slbi_audience_private.memberships m ON m.user_id=p_user AND m.business_id=p_business
      LEFT JOIN auth.users u ON u.id=p_user;
    RETURN result;
  END IF;
  IF p_user IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'businesses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'approved',b.status='approved',
      'following',m.followed_at IS NOT NULL,'news',m.news,'push',m.push,
      'email',m.email_consent_at IS NOT NULL,'emailEligible',coalesce(m.email_digest=extensions.digest(lower(trim(u.email)),'sha256') AND u.email_confirmed_at IS NOT NULL AND m.consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=m.business_id),false)) ORDER BY m.updated_at DESC)
      FROM (SELECT * FROM slbi_audience_private.memberships WHERE user_id=p_user AND (followed_at IS NOT NULL OR email_consent_at IS NOT NULL) ORDER BY updated_at DESC LIMIT 200) m
      JOIN public.businesses b ON b.id=m.business_id JOIN auth.users u ON u.id=m.user_id),'[]'::jsonb),
    'network',coalesce((SELECT n.consent_at IS NOT NULL FROM slbi_audience_private.network_preferences n WHERE n.user_id=p_user),false),
    'networkEligible',coalesce((SELECT n.email_digest=extensions.digest(lower(trim(u.email)),'sha256') AND u.email_confirmed_at IS NOT NULL
      FROM slbi_audience_private.network_preferences n JOIN auth.users u ON u.id=n.user_id WHERE n.user_id=p_user),false),
    'language',coalesce((SELECT language FROM slbi_audience_private.network_preferences WHERE user_id=p_user),'en')) INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.slbi_audience_change(p_user uuid,p_business uuid,p_action text,p_language text DEFAULT 'en')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE digest_value bytea; current_row slbi_audience_private.memberships%ROWTYPE; network_row slbi_audience_private.network_preferences%ROWTYPE;
BEGIN
  IF p_user IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user) THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_action IN ('subscribe','network_subscribe') THEN
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
      UPDATE slbi_audience_private.network_preferences SET consent_at=NULL,email_digest=NULL WHERE user_id=p_user AND consent_at IS NOT NULL;
      IF FOUND THEN INSERT INTO slbi_audience_private.consent_events(user_id,action) VALUES(p_user,p_action); END IF;
    END IF;
    RETURN public.slbi_audience_read(p_user,NULL);
  END IF;
  IF p_business IS NULL OR p_action NOT IN ('follow','unfollow','news_on','news_off','push_on','push_off','subscribe','unsubscribe') THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND (status='approved' OR p_action IN ('unfollow','unsubscribe','news_off','push_off'))) THEN RAISE EXCEPTION 'BUSINESS_UNAVAILABLE'; END IF;
  IF p_action IN ('follow','subscribe') AND NOT EXISTS(SELECT 1 FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business)
    AND (SELECT count(*) FROM slbi_audience_private.memberships WHERE user_id=p_user AND (followed_at IS NOT NULL OR email_consent_at IS NOT NULL))>=200 THEN RAISE EXCEPTION 'MEMBERSHIP_LIMIT'; END IF;
  INSERT INTO slbi_audience_private.memberships(user_id,business_id) VALUES(p_user,p_business) ON CONFLICT DO NOTHING;
  SELECT * INTO current_row FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business FOR UPDATE;
  IF p_action='follow' THEN UPDATE slbi_audience_private.memberships SET followed_at=coalesce(followed_at,now()),news=CASE WHEN followed_at IS NULL THEN true ELSE news END,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action='unfollow' THEN UPDATE slbi_audience_private.memberships SET followed_at=NULL,news=false,push=false,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action IN ('news_on','push_on') THEN
    IF current_row.followed_at IS NULL THEN RAISE EXCEPTION 'FOLLOW_REQUIRED'; END IF;
    UPDATE slbi_audience_private.memberships SET news=true,push=CASE WHEN p_action='push_on' THEN true ELSE push END,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action IN ('news_off','push_off') THEN UPDATE slbi_audience_private.memberships SET news=CASE WHEN p_action='news_off' THEN false ELSE news END,push=false,updated_at=now() WHERE user_id=p_user AND business_id=p_business;
  ELSIF p_action='subscribe' THEN
    UPDATE slbi_audience_private.memberships SET email_consent_at=CASE WHEN email_digest=digest_value AND consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business) THEN email_consent_at ELSE now() END,email_digest=digest_value,consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=p_business),updated_at=now() WHERE user_id=p_user AND business_id=p_business;
    IF (current_row.email_digest IS DISTINCT FROM digest_value OR current_row.consent_owner_id IS DISTINCT FROM (SELECT owner_id FROM public.businesses WHERE id=p_business)) THEN INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action) VALUES(p_user,p_business,p_action); END IF;
  ELSE
    UPDATE slbi_audience_private.memberships SET email_consent_at=NULL,email_digest=NULL,consent_owner_id=NULL,updated_at=now() WHERE user_id=p_user AND business_id=p_business AND email_consent_at IS NOT NULL;
    IF FOUND THEN INSERT INTO slbi_audience_private.consent_events(user_id,business_id,action) VALUES(p_user,p_business,p_action); END IF;
  END IF;
  -- Cancel queued, not-yet-dispatched device pushes when a user withdraws the relevant preference.
  IF p_action IN ('unfollow','news_off','push_off') THEN
    DELETE FROM public.fcm_delivery_jobs j USING slbi_audience_private.news_deliveries d
    WHERE j.notification_id=d.notification_id AND d.user_id=p_user AND d.business_id=p_business;
  END IF;
  DELETE FROM slbi_audience_private.memberships WHERE user_id=p_user AND business_id=p_business AND followed_at IS NULL AND email_consent_at IS NULL;
  RETURN coalesce(public.slbi_audience_read(p_user,p_business),'{}'::jsonb);
END $$;
CREATE FUNCTION public.slbi_audience_owner_summary(p_owner uuid,p_business uuid,p_language text DEFAULT 'all')
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
    AND n.consent_at=g.consent_at AND n.email_digest=g.email_digest AND u.email_confirmed_at IS NOT NULL AND n.email_digest=extensions.digest(lower(trim(u.email)),'sha256') AND (p_language='all' OR n.language=p_language)
    AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)));
  END IF;
  RETURN jsonb_build_object('followers',followers,'subscribers',subscribers,'pushPreferences',pushes,'networkEnabled',network_enabled,'networkReach',network_count);
END $$;
CREATE FUNCTION public.slbi_audience_owner_counts(p_owner uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(owned.id,owned.subscribers),'{}'::jsonb)
 FROM (
  SELECT b.id,count(m.user_id) FILTER(WHERE m.email_consent_at IS NOT NULL AND m.consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=m.business_id) AND u.email_confirmed_at IS NOT NULL
    AND m.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
    ) AS subscribers
  FROM public.businesses b LEFT JOIN slbi_audience_private.memberships m ON m.business_id=b.id
  LEFT JOIN auth.users u ON u.id=m.user_id WHERE b.owner_id=p_owner AND b.status='approved' GROUP BY b.id
 ) owned
$$;
-- Internal, non-exposed eligibility primitive for future provider stage.
-- Never expose its suppression-adjusted result or recipient identities to vendors.
CREATE FUNCTION slbi_audience_private.business_eligible_count(p_business uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(*) FROM slbi_audience_private.memberships m JOIN auth.users u ON u.id=m.user_id
 WHERE m.business_id=p_business AND m.email_consent_at IS NOT NULL AND m.consent_owner_id=(SELECT owner_id FROM public.businesses WHERE id=m.business_id) AND u.email_confirmed_at IS NOT NULL
 AND m.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)))
 AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=p_business AND b.status='approved')
$$;
REVOKE ALL ON FUNCTION slbi_audience_private.business_eligible_count(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.slbi_audience_request(p_owner uuid,p_business uuid,p_count integer,p_language text,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE qid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 100 OR p_language NOT IN ('all','en','ta','si') OR p_purpose IS NULL OR length(trim(p_purpose)) NOT BETWEEN 5 AND 300 THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business::text,92742));
 IF EXISTS(SELECT 1 FROM slbi_audience_private.network_requests WHERE business_id=p_business AND (status='pending' OR (status='approved' AND expires_at>now()))) THEN RAISE EXCEPTION 'ACTIVE_REQUEST'; END IF;
 INSERT INTO slbi_audience_private.network_requests(owner_id,business_id,requested_count,language,purpose) VALUES(p_owner,p_business,p_count,p_language,trim(p_purpose)) RETURNING id INTO qid;
 RETURN jsonb_build_object('id',qid,'status','pending');
END $$;
CREATE FUNCTION public.slbi_audience_lists(p_owner uuid,p_business uuid,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE direct_list jsonb; network_list jsonb; requests jsonb;
BEGIN
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000 OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(x.email),'[]'::jsonb) INTO direct_list FROM (
 SELECT DISTINCT lower(trim(u.email)) AS email FROM slbi_audience_private.memberships m JOIN auth.users u ON u.id=m.user_id
 WHERE m.business_id=p_business AND m.consent_owner_id=p_owner AND m.email_consent_at IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND m.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)))
 ORDER BY email OFFSET p_offset LIMIT 100) x;
 SELECT coalesce(jsonb_agg(x.email),'[]'::jsonb) INTO network_list FROM (
 SELECT DISTINCT lower(trim(u.email)) AS email FROM slbi_audience_private.network_requests q JOIN slbi_audience_private.network_grants g ON g.request_id=q.id JOIN slbi_audience_private.network_preferences n ON n.user_id=g.user_id JOIN auth.users u ON u.id=g.user_id
 WHERE q.business_id=p_business AND q.owner_id=p_owner AND q.status='approved' AND q.expires_at>now()
 AND n.consent_at=g.consent_at AND n.email_digest=g.email_digest AND u.email_confirmed_at IS NOT NULL AND n.email_digest=extensions.digest(lower(trim(u.email)),'sha256')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND s.email=lower(trim(u.email)))
 ORDER BY email LIMIT 100) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO requests FROM (
 SELECT id,status,requested_count,language,purpose,created_at,expires_at FROM slbi_audience_private.network_requests WHERE business_id=p_business AND owner_id=p_owner ORDER BY created_at DESC LIMIT 10) x;
 RETURN jsonb_build_object('direct',direct_list,'network',network_list,'requests',requests);
END $$;
CREATE FUNCTION public.slbi_audience_admin_control(p_actor uuid,p_request uuid DEFAULT NULL,p_decision text DEFAULT NULL)
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
REVOKE ALL ON FUNCTION public.slbi_audience_read(uuid,uuid),public.slbi_audience_change(uuid,uuid,text,text),public.slbi_audience_owner_summary(uuid,uuid,text),public.slbi_audience_owner_counts(uuid),public.slbi_audience_request(uuid,uuid,integer,text,text),public.slbi_audience_lists(uuid,uuid,integer),public.slbi_audience_admin_control(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_audience_read(uuid,uuid),public.slbi_audience_change(uuid,uuid,text,text),public.slbi_audience_owner_summary(uuid,uuid,text),public.slbi_audience_owner_counts(uuid),public.slbi_audience_request(uuid,uuid,integer,text,text),public.slbi_audience_lists(uuid,uuid,integer),public.slbi_audience_admin_control(uuid,uuid,text) TO service_role;

-- Preserve existing official announcements; replace all-profile vendor fan-out with a queue.
CREATE OR REPLACE FUNCTION public.notify_all_on_business_news() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.is_official THEN
    INSERT INTO public.notifications(user_id,title,message,type)
      SELECT p.id,'New Business Update: SL Business Index Admin',left(NEW.content,1200),'info' FROM public.profiles p;
  ELSIF EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=NEW.business_id AND b.owner_id=NEW.owner_id AND b.status='approved' AND b.is_verified) THEN
    INSERT INTO slbi_audience_private.news_queue(news_id,business_id,published_at) VALUES(NEW.id,NEW.business_id,clock_timestamp()) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_all_on_business_news() FROM PUBLIC,anon,authenticated;
-- Keep existing FCM queue behavior for other notifications; honor silent follower preference.
-- Prevent clients spoofing the new notification types under the legacy permissive INSERT policy.
CREATE POLICY audience_news_server_only_insert ON public.notifications AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(coalesce(type,'') NOT IN ('business_follow_news','business_follow_news_silent'));
CREATE OR REPLACE FUNCTION public.slbi_enqueue_fcm_job() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') OR NEW.user_id IS NULL OR coalesce(NEW.is_read,false) OR NEW.type='business_follow_news_silent' THEN RETURN NEW; END IF;
  INSERT INTO public.fcm_delivery_jobs(notification_id,token,user_id,session_id)
  SELECT NEW.id,d.token,d.user_id,d.session_id FROM public.fcm_devices d
  WHERE d.user_id=NEW.user_id AND d.updated_at>now()-interval '90 days'
  ON CONFLICT(notification_id,token) DO NOTHING;
  RETURN NEW;
END $$;
CREATE FUNCTION slbi_audience_private.process_news_batch() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job slbi_audience_private.news_queue%ROWTYPE; recipient record; n integer:=0; last_id uuid; notification uuid; title_text text; message_text text;
BEGIN
  SELECT * INTO job FROM slbi_audience_private.news_queue WHERE completed_at IS NULL ORDER BY published_at,news_id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT 'New Business Update: '||b.name,left(news.title,1200) INTO title_text,message_text FROM public.business_news news JOIN public.businesses b ON b.id=news.business_id
  WHERE news.id=job.news_id AND news.business_id=job.business_id AND b.status='approved' AND b.is_verified AND news.owner_id=b.owner_id;
  IF NOT FOUND THEN UPDATE slbi_audience_private.news_queue SET completed_at=now() WHERE news_id=job.news_id; RETURN 0; END IF;
  FOR recipient IN SELECT m.user_id,m.push FROM slbi_audience_private.memberships m
    WHERE m.business_id=job.business_id AND m.followed_at<=job.published_at AND m.news AND (job.cursor_user IS NULL OR m.user_id>job.cursor_user)
    ORDER BY m.user_id LIMIT 250 FOR SHARE
  LOOP
    IF NOT EXISTS(SELECT 1 FROM slbi_audience_private.news_deliveries WHERE news_id=job.news_id AND user_id=recipient.user_id) THEN
      INSERT INTO public.notifications(user_id,title,message,type) VALUES(recipient.user_id,title_text,message_text,CASE WHEN recipient.push THEN 'business_follow_news' ELSE 'business_follow_news_silent' END) RETURNING id INTO notification;
      INSERT INTO slbi_audience_private.news_deliveries(news_id,user_id,business_id,notification_id) VALUES(job.news_id,recipient.user_id,job.business_id,notification);
    END IF;
    last_id:=recipient.user_id;n:=n+1;
  END LOOP;
  UPDATE slbi_audience_private.news_queue SET cursor_user=coalesce(last_id,cursor_user),completed_at=CASE WHEN n<250 THEN now() ELSE NULL END WHERE news_id=job.news_id;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION slbi_audience_private.process_news_batch() FROM PUBLIC,anon,authenticated;
-- Cron activation is a separate release gate after the SQL and push checks.
COMMIT;
