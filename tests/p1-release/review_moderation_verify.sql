\set ON_ERROR_STOP on
-- Run only in disposable Postgres. Each DO block impersonates an API role.
DO $columns$
BEGIN
  IF has_column_privilege('authenticated','public.reviews','sentiment','INSERT')
      OR has_column_privilege('authenticated','public.reviews','moderated_by','INSERT')
      OR NOT has_column_privilege('authenticated','public.reviews','comment','INSERT') THEN
    RAISE EXCEPTION 'Author INSERT can forge sentiment/moderator audit fields';
  END IF;
END
$columns$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='66666666-6666-4666-8666-666666666666';
DO $reviewer$
DECLARE blocked boolean; changed integer;
BEGIN
  -- The client cannot forge publication or another reviewer's identity,
  -- even when it bypasses the Next.js API and directly calls PostgREST.
  blocked:=false;
  BEGIN
    INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
    VALUES ('aaaabbbb-cccc-4ddd-8eee-ffffffffffff',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '66666666-6666-4666-8666-666666666666','Reviewer six',
      5,'Forged approval attempt',true,'approved');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Direct review approval forged'; END IF;

  blocked:=false;
  BEGIN
    INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
    VALUES ('bbbbcccc-dddd-4eee-8fff-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '55555555-5555-4555-8555-555555555555','Fake admin',
      4,'Forged author',false,'pending');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Review author spoofing allowed'; END IF;

  INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
  VALUES ('99999999-aaaa-4aaa-8aaa-999999999999',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '66666666-6666-4666-8666-666666666666','Reviewer six',
    4,'A constructive pending review',false,'pending');

  IF (SELECT count(*) FROM public.reviews WHERE moderation_status='pending')<>1
  THEN RAISE EXCEPTION 'Reviewer can see another customer pending review'; END IF;
  blocked:=false;
  BEGIN
    INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
    VALUES ('88888888-aaaa-4aaa-8aaa-888888888888',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '66666666-6666-4666-8666-666666666666','Reviewer six',
    5,'Duplicate customer review',false,'pending');
  EXCEPTION WHEN unique_violation THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate reviewer submission allowed'; END IF;

  UPDATE public.reviews SET is_approved=true,moderation_status='approved'
  WHERE id='99999999-aaaa-4aaa-8aaa-999999999999';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Non-staff user approved own review'; END IF;
END
$reviewer$;

SET "request.jwt.claim.sub"='11111111-1111-4111-8111-111111111111';
DO $vendor$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
    VALUES ('77777777-aaaa-4aaa-8aaa-777777777777',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111','Vendor A',
      5,'Own business review forbidden',false,'pending');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Business owner allowed to self-review'; END IF;
END
$vendor$;

SET "request.jwt.claim.sub"='55555555-5555-4555-8555-555555555555';
DO $staff$
DECLARE count_changed integer; original_review_count integer;
BEGIN
  SELECT count(*) INTO original_review_count FROM public.reviews
    WHERE moderation_status='pending';
  IF original_review_count<>2 THEN
    RAISE EXCEPTION 'Staff cannot view pending review queue';
  END IF;
  UPDATE public.reviews SET
    moderation_status='approved',is_approved=true,
    moderated_by='77777777-aaaa-4aaa-8aaa-777777777777',
    moderated_at='2001-01-01T00:00:00Z'
  WHERE id='99999999-aaaa-4aaa-8aaa-999999999999'
    AND moderation_status='pending';
  GET DIAGNOSTICS count_changed=ROW_COUNT;
  IF count_changed<>1 THEN RAISE EXCEPTION 'Staff approval failed'; END IF;
  IF (SELECT moderated_by FROM public.reviews
      WHERE id='99999999-aaaa-4aaa-8aaa-999999999999')
      <> '55555555-5555-4555-8555-555555555555'::uuid
  THEN RAISE EXCEPTION 'Database audit actor was spoofed'; END IF;
  IF (SELECT moderated_at FROM public.reviews
      WHERE id='99999999-aaaa-4aaa-8aaa-999999999999')
     < now()-interval '1 minute'
  THEN RAISE EXCEPTION 'Database audit timestamp was spoofed'; END IF;
  UPDATE public.reviews SET
    moderation_status='rejected',is_approved=false,moderation_note='Contains prohibited content'
  WHERE id='aaaaeeee-aaaa-4aaa-8aaa-aaaaaaaeeeee'
    AND moderation_status='pending';
  GET DIAGNOSTICS count_changed=ROW_COUNT;
  IF count_changed<>1 THEN RAISE EXCEPTION 'Staff rejection failed'; END IF;
  UPDATE public.reviews SET
    moderation_status='pending',is_approved=false
  WHERE id='99999999-aaaa-4aaa-8aaa-999999999999';
  GET DIAGNOSTICS count_changed=ROW_COUNT;
  IF count_changed<>0 THEN RAISE EXCEPTION 'Already-approved review was reverted'; END IF;
END
$staff$;
RESET ROLE;

SET ROLE anon;
DO $public$
DECLARE blocked boolean:=false;
BEGIN
  IF (SELECT count(*) FROM public.reviews)<>3
  THEN RAISE EXCEPTION 'Published review visibility incorrect'; END IF;
  IF (SELECT count(*) FROM public.reviews WHERE moderation_status='rejected')<>0
  THEN RAISE EXCEPTION 'Rejected review visible to public'; END IF;
  BEGIN
    INSERT INTO public.reviews(id,business_id,user_id,user_name,rating,comment,is_approved,moderation_status)
    VALUES ('66666666-aaaa-4aaa-8aaa-666666666666',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '66666666-6666-4666-8666-666666666666','Anonymous',
      5,'Anonymous insertion rejected',false,'pending');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Anonymous review insertion allowed'; END IF;
END
$public$;
RESET ROLE;

SELECT 'SLBI trusted review moderation staging RLS and audit checks passed' AS result;
