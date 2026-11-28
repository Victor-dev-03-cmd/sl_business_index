\set ON_ERROR_STOP on
DO $$
BEGIN
 ASSERT NOT has_schema_privilege('anon','slbi_audience_private','USAGE');
 ASSERT NOT has_schema_privilege('authenticated','slbi_audience_private','USAGE');
 ASSERT NOT has_function_privilege('authenticated','public.slbi_audience_change(uuid,uuid,text,text)','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.slbi_audience_read(uuid,uuid)','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.slbi_audience_owner_summary(uuid,uuid,text)','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.slbi_audience_admin_control(uuid,boolean)','EXECUTE');
 ASSERT has_function_privilege('service_role','public.slbi_audience_change(uuid,uuid,text,text)','EXECUTE');
 ASSERT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='slbi_audience_private' AND c.relkind='r' AND NOT c.relrowsecurity)=0;
END $$;
SET ROLE service_role;
DO $$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; fa uuid:='33333333-3333-4333-8333-333333333333'; fb uuid:='44444444-4444-4444-8444-444444444444'; other_user uuid:='55555555-5555-4555-8555-555555555555'; own uuid:='11111111-1111-4111-8111-111111111111'; admin uuid:='77777777-7777-4777-8777-777777777777'; s jsonb;
BEGIN
 s:=public.slbi_audience_read(NULL,a); ASSERT s->>'following'='false' AND s->>'followers'='0';
 s:=public.slbi_audience_change(fa,a,'follow'); ASSERT s->>'following'='true' AND s->>'news'='true' AND s->>'email'='false' AND s->>'push'='false';
 PERFORM public.slbi_audience_change(fa,a,'push_on');
 PERFORM public.slbi_audience_change(fa,a,'subscribe');
 PERFORM public.slbi_audience_change(fa,a,'subscribe');
 PERFORM public.slbi_audience_change(fb,a,'follow');
 PERFORM public.slbi_audience_change(fb,b,'follow');
 PERFORM public.slbi_audience_change(other_user,a,'subscribe');
 s:=public.slbi_audience_owner_summary(own,a,'all'); ASSERT s->>'followers'='2' AND s->>'subscribers'='2' AND s->>'pushPreferences'='1' AND s->>'networkEnabled'='false';
 ASSERT public.slbi_audience_owner_summary(own,b,'all') IS NULL;
 ASSERT public.slbi_audience_owner_summary(own,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','all') IS NULL;
 ASSERT public.slbi_audience_admin_control(own,true) IS NULL;
 PERFORM public.slbi_audience_change(fa,NULL,'network_subscribe','ta');
 ASSERT public.slbi_audience_admin_control(admin,true)->>'enabled'='true';
 s:=public.slbi_audience_owner_summary(own,a,'ta'); ASSERT s->>'networkEnabled'='true' AND s->>'networkReach' IS NULL;
 ASSERT public.slbi_audience_read(fa,NULL)->>'network'='true';
 ASSERT public.slbi_audience_read(fb,NULL)->>'network'='false';
 ASSERT public.slbi_audience_read(fa,NULL)::text NOT LIKE '%example.invalid%';
 ASSERT public.slbi_audience_owner_counts(own)->>a::text='2';
 BEGIN
   PERFORM public.slbi_audience_change('66666666-6666-4666-8666-666666666666',a,'subscribe');
   RAISE EXCEPTION 'Unverified account subscribed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'VERIFIED_EMAIL_REQUIRED' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
-- Subscription audit is idempotent; subscription and follow are independent.
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM slbi_audience_private.consent_events WHERE user_id='33333333-3333-4333-8333-333333333333' AND action='subscribe')=1;
END $$;
INSERT INTO public.business_news VALUES ('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false,'New offer','Offer text');
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.notifications)=0;
 ASSERT (SELECT count(*) FROM slbi_audience_private.news_queue)=1;
 ASSERT slbi_audience_private.process_news_batch()=2;
 ASSERT slbi_audience_private.process_news_batch()=0;
 ASSERT (SELECT count(*) FROM public.notifications)=2;
 ASSERT (SELECT count(*) FROM public.fcm_delivery_jobs)=1;
 ASSERT EXISTS(SELECT 1 FROM public.notifications WHERE user_id='44444444-4444-4444-8444-444444444444' AND type='business_follow_news_silent');
 ASSERT NOT EXISTS(SELECT 1 FROM public.notifications WHERE user_id='55555555-5555-4555-8555-555555555555');
END $$;
SET ROLE service_role;
SELECT public.slbi_audience_change('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','push_off');
SELECT public.slbi_audience_change('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','unfollow');
RESET ROLE;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.fcm_delivery_jobs)=0;
 ASSERT public.slbi_audience_read('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'email'='true';
END $$;
INSERT INTO public.marketing_email_suppressions VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','non-follower@example.invalid');
DO $$ BEGIN
 ASSERT public.slbi_audience_owner_summary('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'subscribers'='1';
END $$;
UPDATE auth.users SET email='new-address@example.invalid' WHERE id='33333333-3333-4333-8333-333333333333';
DO $$ BEGIN
 ASSERT public.slbi_audience_read('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'emailEligible'='false';
 ASSERT public.slbi_audience_owner_summary('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'subscribers'='0';
 ASSERT public.slbi_audience_read('33333333-3333-4333-8333-333333333333',NULL)->>'networkEligible'='false';
END $$;
SET ROLE service_role;
SELECT public.slbi_audience_change('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','unsubscribe');
SELECT public.slbi_audience_change('33333333-3333-4333-8333-333333333333',NULL,'network_unsubscribe');
RESET ROLE;
-- 20 explicit synthetic network opt-ins; exact recipient identities never returned to owner.
INSERT INTO auth.users(id,email,email_confirmed_at) SELECT md5('audience-fixture-'||i)::uuid,'synthetic-'||i||'@example.invalid',now() FROM generate_series(1,20) i;
DO $$ DECLARE account record; s jsonb;
BEGIN
 FOR account IN SELECT id FROM auth.users WHERE email LIKE 'synthetic-%' LOOP
   PERFORM public.slbi_audience_change(account.id,NULL,'network_subscribe','si');
 END LOOP;
 s:=public.slbi_audience_owner_summary('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','si');
 ASSERT s->>'networkReach'='20';
 ASSERT public.slbi_audience_owner_summary('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ta')->>'networkReach' IS NULL;
 ASSERT public.slbi_audience_admin_control('77777777-7777-4777-8777-777777777777',false)->>'deliveryEnabled'='false';
 ASSERT public.slbi_audience_owner_summary('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','all')->>'networkReach' IS NULL;
END $$;
SELECT 'Audience SQL fixture PASS' AS result;
