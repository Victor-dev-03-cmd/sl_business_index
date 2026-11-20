-- FCM tokens and a bounded, server-only per-device outbox.
-- No historical notifications are queued, and no delivery scheduler is enabled.
CREATE TABLE IF NOT EXISTS public.fcm_devices (
  token text PRIMARY KEY CHECK (length(token) BETWEEN 20 AND 2048),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fcm_devices_user_idx ON public.fcm_devices(user_id);
ALTER TABLE public.fcm_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fcm_devices FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.fcm_devices TO service_role;

CREATE TABLE IF NOT EXISTS public.fcm_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  token text NOT NULL REFERENCES public.fcm_devices(token) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  UNIQUE(notification_id,token)
);
CREATE INDEX IF NOT EXISTS fcm_delivery_jobs_ready_idx ON public.fcm_delivery_jobs(next_attempt_at,expires_at);
ALTER TABLE public.fcm_delivery_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fcm_delivery_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.fcm_delivery_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.slbi_register_fcm_device(p_token text,p_user uuid,p_session uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) NOT BETWEEN 20 AND 2048 OR
     NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p_session AND s.user_id=p_user
                AND (s.not_after IS NULL OR s.not_after>now())) THEN
    RAISE EXCEPTION 'Invalid device session';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,641));
  -- Bound registrations per account; refresh an existing token in place.
  IF NOT EXISTS(SELECT 1 FROM public.fcm_devices d WHERE d.token=p_token AND d.user_id=p_user)
     AND (SELECT count(*) FROM public.fcm_devices d WHERE d.user_id=p_user)>=10 THEN
    RAISE EXCEPTION 'Device limit reached';
  END IF;
  INSERT INTO public.fcm_devices(token,user_id,session_id)
  VALUES(p_token,p_user,p_session)
  ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,updated_at=now();
  DELETE FROM public.fcm_delivery_jobs j WHERE j.token=p_token
       AND (j.user_id IS DISTINCT FROM p_user OR j.session_id IS DISTINCT FROM p_session);
END $$;
REVOKE ALL ON FUNCTION public.slbi_register_fcm_device(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_register_fcm_device(text,uuid,uuid) TO service_role;

-- Existing business/status/news trigger functions run with trusted definer
-- privileges. Direct client inserts into the legacy notification table must
-- not cause push delivery. This invoker trigger intentionally retains the
-- role of the INSERT caller.
CREATE OR REPLACE FUNCTION public.slbi_enqueue_fcm_job()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') OR NEW.user_id IS NULL OR coalesce(NEW.is_read,false) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.fcm_delivery_jobs(notification_id,token,user_id,session_id)
  SELECT NEW.id,d.token,d.user_id,d.session_id
  FROM public.fcm_devices d
  WHERE d.user_id=NEW.user_id AND d.updated_at>now()-interval '90 days'
  ON CONFLICT(notification_id,token) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.slbi_enqueue_fcm_job() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_enqueue_fcm_job() TO service_role,postgres;
DROP TRIGGER IF EXISTS slbi_enqueue_fcm_job ON public.notifications;
CREATE TRIGGER slbi_enqueue_fcm_job AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.slbi_enqueue_fcm_job();

CREATE OR REPLACE FUNCTION public.slbi_claim_fcm_jobs(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid,token text,attempts integer)
LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$
  WITH candidate AS (
    SELECT j.id FROM public.fcm_delivery_jobs j
    JOIN public.fcm_devices d ON d.token=j.token AND d.user_id=j.user_id AND d.session_id=j.session_id
    JOIN auth.sessions s ON s.id=j.session_id AND s.user_id=j.user_id
    JOIN public.notifications n ON n.id=j.notification_id AND n.user_id=j.user_id
    WHERE j.next_attempt_at<=now() AND j.expires_at>now() AND j.attempts<5
      AND (s.not_after IS NULL OR s.not_after>now())
      AND NOT coalesce(n.is_read,false) AND d.updated_at>now()-interval '90 days'
    ORDER BY j.next_attempt_at,j.id
    LIMIT greatest(1,least(coalesce(p_limit,20),20)) FOR UPDATE OF j SKIP LOCKED
  )
  UPDATE public.fcm_delivery_jobs j SET attempts=j.attempts+1,next_attempt_at=now()+interval '2 minutes'
  FROM candidate c WHERE j.id=c.id RETURNING j.id,j.token,j.attempts;
$$;
REVOKE ALL ON FUNCTION public.slbi_claim_fcm_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_claim_fcm_jobs(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.slbi_fcm_job_valid(p_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS(
    SELECT 1 FROM public.fcm_delivery_jobs j
    JOIN public.fcm_devices d ON d.token=j.token AND d.user_id=j.user_id AND d.session_id=j.session_id
    JOIN auth.sessions s ON s.id=j.session_id AND s.user_id=j.user_id
    JOIN public.notifications n ON n.id=j.notification_id AND n.user_id=j.user_id
    WHERE j.id=p_id AND j.expires_at>now() AND d.updated_at>now()-interval '90 days'
     AND (s.not_after IS NULL OR s.not_after>now()) AND NOT coalesce(n.is_read,false)
 );
$$;
REVOKE ALL ON FUNCTION public.slbi_fcm_job_valid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_fcm_job_valid(uuid) TO service_role;
NOTIFY pgrst,'reload schema';