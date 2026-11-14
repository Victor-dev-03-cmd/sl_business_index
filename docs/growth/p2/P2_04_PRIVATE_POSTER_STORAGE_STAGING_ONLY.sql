-- STAGING / REVIEW ONLY. Do not apply to live until Pro poster image release approval.
-- Isolated private bucket for AI artwork. Existing buckets are unaffected.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL
  THEN RAISE EXCEPTION 'Supabase Storage schema is required'; END IF;
END $preflight$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('slbi-poster-ai-private','slbi-poster-ai-private',false,12000000,ARRAY['image/png']::text[])
ON CONFLICT(id) DO NOTHING;

DO $private$
BEGIN
  IF EXISTS(SELECT 1 FROM storage.buckets
    WHERE id='slbi-poster-ai-private' AND
      (public IS DISTINCT FROM false OR file_size_limit>12000000))
  THEN RAISE EXCEPTION 'Poster image bucket must be private and size-capped'; END IF;
END $private$;

-- RESTRICTIVE policy is an AND guard even when other broad storage policies exist.
-- The backend uses server-only service_role downloads after checking RLS ownership.
DROP POLICY IF EXISTS slbi_poster_ai_private_guard ON storage.objects;
CREATE POLICY slbi_poster_ai_private_guard
  ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon,authenticated
  USING (bucket_id<>'slbi-poster-ai-private')
  WITH CHECK (bucket_id<>'slbi-poster-ai-private');

COMMIT;
