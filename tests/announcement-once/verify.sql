DO $$ BEGIN
 ASSERT NOT has_schema_privilege('authenticated','slbi_announcement_private','USAGE');
 ASSERT NOT has_function_privilege('anon','public.slbi_claim_announcement()','EXECUTE');
 ASSERT has_function_privilege('authenticated','public.slbi_claim_announcement()','EXECUTE');
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ BEGIN
 ASSERT public.slbi_claim_announcement()->>'id'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 ASSERT public.slbi_claim_announcement() IS NULL;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$ BEGIN
 ASSERT public.slbi_claim_announcement()->>'id'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 ASSERT public.slbi_claim_announcement() IS NULL;
END $$;
RESET ROLE;
INSERT INTO public.announcements VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','New notice','Hello','info','all',true,now()-interval '1 minute',NULL,now()+interval '1 minute');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ BEGIN
 ASSERT public.slbi_claim_announcement()->>'id'='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 ASSERT public.slbi_claim_announcement() IS NULL;
END $$;
RESET ROLE;
SELECT 'Announcement receipt tests PASS' AS result;
