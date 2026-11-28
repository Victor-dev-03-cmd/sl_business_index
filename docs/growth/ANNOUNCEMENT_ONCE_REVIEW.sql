BEGIN;
CREATE SCHEMA slbi_announcement_private;
REVOKE ALL ON SCHEMA slbi_announcement_private FROM PUBLIC,anon,authenticated;
CREATE TABLE slbi_announcement_private.receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
 shown_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,announcement_id)
);
ALTER TABLE slbi_announcement_private.receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_announcement_private.receipts FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.slbi_claim_announcement()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); item public.announcements%ROWTYPE; claimed uuid;
BEGIN
 IF actor IS NULL THEN RETURN NULL; END IF;
 SELECT a.* INTO item FROM public.announcements a
 WHERE a.is_active AND a.starts_at<=now() AND (a.ends_at IS NULL OR a.ends_at>now())
 AND (a.target_role='all' OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.role::text=a.target_role))
 ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO slbi_announcement_private.receipts(user_id,announcement_id) VALUES(actor,item.id)
 ON CONFLICT DO NOTHING RETURNING announcement_id INTO claimed;
 IF claimed IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',item.id,'title',item.title,'message',item.message,'type',item.type);
END $$;
REVOKE ALL ON FUNCTION public.slbi_claim_announcement() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_claim_announcement() TO authenticated;
COMMIT;
