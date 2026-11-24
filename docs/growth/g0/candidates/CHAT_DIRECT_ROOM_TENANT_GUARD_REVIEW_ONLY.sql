-- G0-03 REVIEW CANDIDATE ONLY. Never run against production without recovery, owner
-- scoped release approval, PostgreSQL 17/Supabase-compatible staging, and rollback.
-- Preserves the existing RPC signature. Deliberately no ALTER ROLE / live grants.
CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(
  other_user_id uuid,
  p_business_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_room_id uuid;
BEGIN
  -- auth.uid() is supplied by a verified PostgREST JWT, not a user_metadata role.
  IF v_me IS NULL OR other_user_id IS NULL OR v_me = other_user_id THEN
    RAISE EXCEPTION 'direct-room-not-authorized' USING ERRCODE = '42501';
  END IF;

  -- A business-scoped conversation must be about a published listing, whose
  -- owner is one of the two participants. Caller can be buyer or vendor.
  -- No cross-business arbitrary association even though this function
  -- deliberately uses SECURITY DEFINER to insert both members.
  IF p_business_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.businesses b
        WHERE b.id = p_business_id
          AND b.status = 'approved'
          AND b.owner_id IN (v_me, other_user_id)
     ) THEN
    RAISE EXCEPTION 'direct-room-not-authorized' USING ERRCODE = '42501';
  END IF;

  -- Serialize the unordered pair plus business scope to prevent two callers
  -- creating duplicate rooms concurrently. Hash collisions only over-serialize.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.concat_ws('|',
        LEAST(v_me::text, other_user_id::text),
        GREATEST(v_me::text, other_user_id::text),
        COALESCE(p_business_id::text, 'unscoped')),
      0)
  );

  SELECT r.id INTO v_room_id
    FROM public.chat_rooms r
   WHERE r.room_type = 'direct'
     AND r.business_id IS NOT DISTINCT FROM p_business_id
     AND (SELECT COUNT(*) FROM public.chat_room_members m
           WHERE m.room_id = r.id) = 2
     AND EXISTS (SELECT 1 FROM public.chat_room_members m
                  WHERE m.room_id = r.id AND m.user_id = v_me)
     AND EXISTS (SELECT 1 FROM public.chat_room_members m
                  WHERE m.room_id = r.id AND m.user_id = other_user_id)
   LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  INSERT INTO public.chat_rooms (room_type, business_id)
  VALUES ('direct', p_business_id)
  RETURNING id INTO v_room_id;

  INSERT INTO public.chat_room_members (room_id, user_id)
  VALUES (v_room_id, v_me), (v_room_id, other_user_id);

  RETURN v_room_id;
END;
$function$;
