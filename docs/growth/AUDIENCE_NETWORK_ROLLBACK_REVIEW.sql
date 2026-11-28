-- Operational rollback: pause new targeted notification processing and restore the
-- exact prior news trigger function. Preserve consent records and user withdrawal.
BEGIN;
SELECT cron.unschedule('slbi-audience-news-batch') WHERE EXISTS(SELECT 1 FROM cron.job WHERE jobname='slbi-audience-news-batch');
CREATE OR REPLACE FUNCTION public.notify_all_on_business_news() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account record; publication_name text;
BEGIN
  IF NEW.is_official THEN publication_name := 'SL Business Index Admin';
  ELSE SELECT b.name INTO publication_name FROM public.businesses b WHERE b.id=NEW.business_id; END IF;
  FOR account IN SELECT p.id FROM public.profiles p LOOP
    INSERT INTO public.notifications(user_id,title,message,type)
      VALUES(account.id,'New Business Update: '||coalesce(publication_name,'Business News'),left(NEW.content,1200),'info');
  END LOOP;
  RETURN NEW;
END $$;
-- Default to disabling network reach if a rollback is needed.
UPDATE slbi_audience_private.network_control SET enabled=false WHERE singleton;
COMMIT;
