BEGIN;
CREATE SCHEMA slbi_email_import_private;
REVOKE ALL ON SCHEMA slbi_email_import_private FROM PUBLIC,anon,authenticated;
CREATE TABLE slbi_email_import_private.lists(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
 source text NOT NULL CHECK(source IN ('xlsx','csv','txt','paste')),
 consent_attested_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_import_lists_scope ON slbi_email_import_private.lists(owner_id,business_id);
CREATE TABLE slbi_email_import_private.contacts(
 list_id uuid NOT NULL REFERENCES slbi_email_import_private.lists(id) ON DELETE CASCADE,
 email text NOT NULL CHECK(length(email) BETWEEN 6 AND 254 AND email=lower(trim(email)) AND email ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'),
 PRIMARY KEY(list_id,email)
);
ALTER TABLE slbi_email_import_private.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE slbi_email_import_private.contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA slbi_email_import_private FROM PUBLIC,anon,authenticated;
-- Never expose imported addresses to the platform audience or other owners.
CREATE FUNCTION public.slbi_email_import_lists(p_owner uuid,p_business uuid,p_list uuid DEFAULT NULL,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lists jsonb; contacts jsonb;
BEGIN
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 5000 OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO lists FROM (
 SELECT l.id,l.name,l.source,l.created_at,count(c.email) AS total,
 count(c.email) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND lower(trim(s.email))=c.email)) AS eligible
 FROM slbi_email_import_private.lists l LEFT JOIN slbi_email_import_private.contacts c ON c.list_id=l.id
 WHERE l.owner_id=p_owner AND l.business_id=p_business GROUP BY l.id ORDER BY l.created_at DESC LIMIT 20) x;
 IF p_list IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM slbi_email_import_private.lists l WHERE l.id=p_list AND l.owner_id=p_owner AND l.business_id=p_business) THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.email),'[]'::jsonb) INTO contacts FROM (
   SELECT c.email,EXISTS(SELECT 1 FROM public.marketing_email_suppressions s WHERE s.business_id=p_business AND lower(trim(s.email))=c.email) AS suppressed
   FROM slbi_email_import_private.contacts c WHERE c.list_id=p_list ORDER BY c.email OFFSET p_offset LIMIT 100) x;
 END IF;
 RETURN jsonb_build_object('lists',lists,'contacts',coalesce(contacts,'[]'::jsonb));
END $$;
CREATE FUNCTION public.slbi_email_import_create(p_owner uuid,p_business uuid,p_name text,p_source text,p_emails jsonb,p_attested boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE list_id uuid; inserted integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business AND owner_id=p_owner AND status='approved') THEN RETURN NULL; END IF;
 IF p_attested IS DISTINCT FROM true OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100 OR p_source IS NULL OR p_source NOT IN ('xlsx','csv','txt','paste') OR jsonb_typeof(p_emails) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_IMPORT'; END IF;
 IF jsonb_array_length(p_emails) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'INVALID_IMPORT'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_emails) e WHERE jsonb_typeof(e) <> 'string' OR length(e #>> '{}') NOT BETWEEN 6 AND 254 OR lower(trim(e #>> '{}')) !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$') THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_business::text,73391));
 IF (SELECT count(*) FROM slbi_email_import_private.lists WHERE owner_id=p_owner AND business_id=p_business)>=20 THEN RAISE EXCEPTION 'IMPORT_LIST_LIMIT'; END IF;
 IF (SELECT count(*) FROM slbi_email_import_private.contacts c JOIN slbi_email_import_private.lists l ON l.id=c.list_id WHERE l.owner_id=p_owner AND l.business_id=p_business)+jsonb_array_length(p_emails)>20000 THEN RAISE EXCEPTION 'IMPORT_CONTACT_LIMIT'; END IF;
 INSERT INTO slbi_email_import_private.lists(owner_id,business_id,name,source) VALUES(p_owner,p_business,trim(p_name),p_source) RETURNING id INTO list_id;
 INSERT INTO slbi_email_import_private.contacts(list_id,email) SELECT list_id,lower(trim(value)) FROM jsonb_array_elements_text(p_emails) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN jsonb_build_object('id',list_id,'total',inserted);
END $$;
CREATE FUNCTION public.slbi_email_import_remove(p_owner uuid,p_business uuid,p_list uuid,p_email text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM slbi_email_import_private.lists l JOIN public.businesses b ON b.id=l.business_id WHERE l.id=p_list AND l.owner_id=p_owner AND l.business_id=p_business AND b.owner_id=p_owner) THEN RETURN false; END IF;
 IF p_email IS NULL THEN DELETE FROM slbi_email_import_private.lists WHERE id=p_list AND owner_id=p_owner AND business_id=p_business;
 ELSE DELETE FROM slbi_email_import_private.contacts WHERE list_id=p_list AND email=lower(trim(p_email)); END IF;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.slbi_email_import_lists(uuid,uuid,uuid,integer),public.slbi_email_import_create(uuid,uuid,text,text,jsonb,boolean),public.slbi_email_import_remove(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_email_import_lists(uuid,uuid,uuid,integer),public.slbi_email_import_create(uuid,uuid,text,text,jsonb,boolean),public.slbi_email_import_remove(uuid,uuid,uuid,text) TO service_role;
COMMIT;
