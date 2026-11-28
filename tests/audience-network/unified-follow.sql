\set ON_ERROR_STOP on
DO $$ BEGIN
 ASSERT NOT has_table_privilege('authenticated','slbi_audience_private.business_email_blocks','SELECT');
 ASSERT NOT has_function_privilege('authenticated','public.slbi_audience_change(uuid,uuid,text,text)','EXECUTE');
END $$;
DO $$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; fa uuid:='33333333-3333-4333-8333-333333333333'; fb uuid:='44444444-4444-4444-8444-444444444444'; own uuid:='11111111-1111-4111-8111-111111111111'; admin uuid:='77777777-7777-4777-8777-777777777777'; s jsonb; q uuid; recipient uuid; blocked_email text;
BEGIN
 -- Existing follow-only rows must remain unshared until the new explicit action.
 ASSERT public.slbi_audience_read(fb,a)->>'following'='true';
 ASSERT public.slbi_audience_read(fb,a)->>'email'='false';
 s:=public.slbi_audience_change(fa,a,'follow_subscribe');
 ASSERT s->>'following'='true' AND s->>'email'='true' AND s->>'emailEligible'='true' AND s->>'news'='true';
 ASSERT public.slbi_audience_lists(own,a,0)->'direct' ? 'new-address@example.invalid';
 ASSERT public.slbi_audience_lists(own,b,0) IS NULL;
 PERFORM public.slbi_audience_change(fa,a,'follow_subscribe');
 ASSERT (SELECT count(*) FROM slbi_audience_private.consent_events WHERE user_id=fa AND business_id=a AND action='subscribe' AND policy_version='slbi-follow-email-v3')=1;
 PERFORM public.slbi_audience_change(fa,a,'push_on');
 s:=public.slbi_audience_change(fa,a,'unfollow');
 ASSERT s->>'following'='false' AND s->>'email'='false' AND s->>'push'='false' AND s->>'news'='false';
 ASSERT NOT (public.slbi_audience_lists(own,a,0)->'direct' ? 'new-address@example.invalid');
 ASSERT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks WHERE user_id=fa AND business_id=a);
 PERFORM public.slbi_audience_change(fa,a,'follow_subscribe');
 ASSERT NOT EXISTS(SELECT 1 FROM slbi_audience_private.business_email_blocks WHERE user_id=fa AND business_id=a);
 ASSERT public.slbi_audience_lists(own,a,0)->'direct' ? 'new-address@example.invalid';
 BEGIN
   PERFORM public.slbi_audience_change('66666666-6666-4666-8666-666666666666',a,'follow_subscribe');
   RAISE EXCEPTION 'Unverified account followed with email';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'VERIFIED_EMAIL_REQUIRED' THEN RAISE; END IF; END;
 ASSERT public.slbi_audience_read('66666666-6666-4666-8666-666666666666',a)->>'following'='false';
 q:=(public.slbi_audience_request(own,a,5,'si','New audience test')->>'id')::uuid;
 PERFORM public.slbi_audience_admin_control(admin,q,'approved');
 SELECT g.user_id,u.email INTO recipient,blocked_email FROM slbi_audience_private.network_grants g JOIN auth.users u ON u.id=g.user_id WHERE g.request_id=q LIMIT 1;
 ASSERT recipient IS NOT NULL;
 PERFORM public.slbi_audience_change(recipient,a,'follow_subscribe');
 PERFORM public.slbi_audience_change(recipient,a,'unfollow');
 ASSERT NOT (public.slbi_audience_lists(own,a,0)->'network' ? blocked_email);
 PERFORM public.slbi_audience_admin_control(admin,q,'revoked');
 q:=(public.slbi_audience_request(own,a,100,'si','Check future exclusion')->>'id')::uuid;
 PERFORM public.slbi_audience_admin_control(admin,q,'approved');
 ASSERT NOT EXISTS(SELECT 1 FROM slbi_audience_private.network_grants g WHERE g.request_id=q AND g.user_id=recipient);
 ASSERT public.slbi_audience_read(recipient,NULL)->>'network'='true';
END $$;
SELECT 'Unified follow tests PASS' AS result;
