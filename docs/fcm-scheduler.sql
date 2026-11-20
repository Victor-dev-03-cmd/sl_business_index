-- Run only after the deployed route is configured and Vault contains
-- 'slbi_fcm_dispatch_secret'. This file is NOT an automatic migration.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='slbi_fcm_dispatch_secret' AND length(decrypted_secret)>=32) THEN
  RAISE EXCEPTION 'Set the matching dispatch secret in Supabase Vault first';
 END IF;
END $$;
SELECT cron.schedule('slbi-fcm-dispatch', '* * * * *', $job$
 SELECT net.http_post(
   url := 'https://www.slbusinessindex.com/api/internal/push/dispatch',
   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='slbi_fcm_dispatch_secret' LIMIT 1)),
   body := '{}'::jsonb, timeout_milliseconds := 55000
 )
 WHERE EXISTS (SELECT 1 FROM public.fcm_delivery_jobs WHERE next_attempt_at<=now() AND expires_at>now() AND attempts<5);
 DELETE FROM public.fcm_delivery_jobs WHERE expires_at<=now() OR (attempts>=5 AND next_attempt_at<=now());
$job$);
