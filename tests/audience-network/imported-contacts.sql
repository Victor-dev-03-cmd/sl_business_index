\set ON_ERROR_STOP on
DO $$ BEGIN
 ASSERT NOT has_schema_privilege('authenticated','slbi_email_import_private','USAGE');
 ASSERT NOT has_function_privilege('authenticated','public.slbi_email_import_create(uuid,uuid,text,text,jsonb,boolean)','EXECUTE');
 ASSERT has_function_privilege('service_role','public.slbi_email_import_create(uuid,uuid,text,text,jsonb,boolean)','EXECUTE');
 ASSERT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='slbi_email_import_private' AND c.relkind='r' AND NOT c.relrowsecurity)=0;
END $$;
DO $$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; own uuid:='11111111-1111-4111-8111-111111111111'; other_owner uuid:='22222222-2222-4222-8222-222222222222'; lid uuid; j jsonb;
BEGIN
 ASSERT public.slbi_email_import_create(own,b,'Wrong business','csv','["x@example.invalid"]',true) IS NULL;
 BEGIN
  PERFORM public.slbi_email_import_create(own,a,'No consent','txt','["x@example.invalid"]',false);
  RAISE EXCEPTION 'Consent gate failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'INVALID_IMPORT' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.slbi_email_import_create(own,a,'Invalid','csv','["not-an-email"]',true);
  RAISE EXCEPTION 'Validation gate failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'INVALID_EMAIL' THEN RAISE; END IF; END;
 j:=public.slbi_email_import_create(own,a,'My list','xlsx','["One@example.invalid","one@example.invalid","two@example.invalid","non-follower@example.invalid"]',true);
 lid:=(j->>'id')::uuid;
 ASSERT j->>'total'='3';
 j:=public.slbi_email_import_lists(own,a,lid,0);
 ASSERT jsonb_array_length(j->'contacts')=3;
 ASSERT j->'lists'->0->>'eligible'='2';
 ASSERT public.slbi_email_import_lists(other_owner,b,lid,0) IS NULL;
 ASSERT public.slbi_email_import_lists(other_owner,a,lid,0) IS NULL;
 ASSERT NOT public.slbi_email_import_remove(other_owner,b,lid,NULL);
 ASSERT public.slbi_email_import_remove(own,a,lid,'ONE@example.invalid');
 ASSERT jsonb_array_length(public.slbi_email_import_lists(own,a,lid,0)->'contacts')=2;
 ASSERT public.slbi_email_import_remove(own,a,lid,NULL);
 ASSERT public.slbi_email_import_lists(own,a,lid,0) IS NULL;
 ASSERT NOT EXISTS(SELECT 1 FROM slbi_email_import_private.contacts WHERE list_id=lid);
END $$;
SELECT 'Imported contacts fixture PASS' AS result;
