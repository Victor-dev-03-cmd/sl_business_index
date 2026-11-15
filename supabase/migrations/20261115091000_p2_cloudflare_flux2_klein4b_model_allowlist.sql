-- SLBI P2-06: allow Cloudflare-hosted FLUX.2 Klein 4B for Pro AI posters.
-- One model handles both original generation and follow-up image edits.
-- All current owner, private-bucket, idempotency, Growth Credit refund and
-- service-role-only settlement checks remain intact. Does NOT enable spending.
BEGIN;
CREATE OR REPLACE FUNCTION public.marketing_poster_complete(
  p_job_id uuid,p_storage_path text,p_model text,p_prompt_version text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_job public.marketing_poster_jobs%ROWTYPE;v_changed integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Trusted service only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.marketing_poster_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state<>'processing' OR
    p_storage_path IS NULL OR
    p_storage_path <> (v_job.user_id::text||'/'||v_job.business_id::text||'/'||v_job.id::text||'.png')
    OR p_model NOT IN (
       'gpt-image-2.5-flare','gpt-image-2.5-sunburst',
       'gpt-image-2.6-flare','gpt-image-2.6-sunburst',
       'black-forest-labs/FLUX.1-schnell',
       'Qwen/Qwen-Image-Edit-2509',
       '@cf/black-forest-labs/flux-2-klein-4b'
     )
    OR p_prompt_version IS NULL OR char_length(p_prompt_version)>80
  THEN RAISE EXCEPTION 'Invalid image settlement' USING ERRCODE='22023'; END IF;
  UPDATE public.marketing_poster_jobs SET state='completed',storage_path=p_storage_path,
    provider_model=p_model,prompt_version=p_prompt_version,resolved_at=now()
    WHERE id=p_job_id AND state='processing';
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  RETURN v_changed=1;
END; $f$;
REVOKE ALL ON FUNCTION public.marketing_poster_complete(uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_poster_complete(uuid,text,text,text)
  TO service_role;
COMMIT;
