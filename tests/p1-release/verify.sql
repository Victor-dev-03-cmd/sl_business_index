\set ON_ERROR_STOP on

-- Object and grants assertions run as the disposable postgres superuser.
DO $assert$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='review_replies_one_reply_per_review_idx') THEN
   RAISE EXCEPTION 'Missing atomic review uniqueness';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public'
    AND tablename='lead_followups' AND rowsecurity) THEN
   RAISE EXCEPTION 'Follow-ups missing RLS';
 END IF;
 IF has_table_privilege('anon','public.leads','TRUNCATE')
    OR has_table_privilege('authenticated','public.leads','TRUNCATE')
    OR has_table_privilege('anon','public.reviews','TRUNCATE')
    OR has_table_privilege('authenticated','public.review_replies','TRUNCATE')
    OR has_table_privilege('anon','public.analytics_logs','TRUNCATE') THEN
   RAISE EXCEPTION 'Public TRUNCATE privilege still exposed';
 END IF;
 IF has_table_privilege('anon','public.lead_followups','SELECT')
    OR has_table_privilege('anon','public.lead_followups','INSERT')
    OR NOT has_table_privilege('authenticated','public.lead_followups','SELECT') THEN
   RAISE EXCEPTION 'Follow-up SQL role grants wrong';
 END IF;
 -- Permission alone does not authorize a user: UPDATE is scoped by
 -- admin-only USING/WITH CHECK RLS. Customer rating updates are disabled.
 IF NOT has_column_privilege('authenticated','public.reviews','is_approved','UPDATE')
   OR has_column_privilege('authenticated','public.reviews','rating','UPDATE') THEN
   RAISE EXCEPTION 'Admin-only review field grants are inconsistent';
 END IF;
END
$assert$;

-- Vendor A may schedule, view, complete and reply to its own approved review.
SET ROLE authenticated;
SET "request.jwt.claim.sub"='11111111-1111-4111-8111-111111111111';
DO $ownerA$
DECLARE blocked boolean := false; changed integer;
BEGIN
 INSERT INTO public.lead_followups(lead_id,due_at)
 VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc',now()+interval '2 days');
 IF (SELECT count(*) FROM public.lead_followups)<>1 THEN
  RAISE EXCEPTION 'Vendor A could not read own follow-up';
 END IF;
 UPDATE public.lead_followups SET done_at=now()+interval '1 hour'
 WHERE lead_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Vendor A could not complete own follow-up'; END IF;
 IF (SELECT count(*) FROM public.lead_followups
   WHERE lead_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>0 THEN
  RAISE EXCEPTION 'Vendor A can read vendor B follow-up';
 END IF;
 BEGIN
  INSERT INTO public.lead_followups(lead_id,due_at)
  VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd',now()+interval '2 days');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Vendor A can insert into vendor B'; END IF;

 INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
 VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','Thank you for sharing.');
 blocked:=false;
 BEGIN
  INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
  VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','Duplicate reply');
 EXCEPTION WHEN unique_violation THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Duplicate reply was inserted'; END IF;
 blocked:=false;
 BEGIN
  INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
  VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111','Cross-tenant reply');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Vendor A can reply on B review'; END IF;
 blocked:=false;
 BEGIN
  INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
  VALUES('aaaaeeee-aaaa-4aaa-8aaa-aaaaaaaeeeee','11111111-1111-4111-8111-111111111111','Reply to unpublished review');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Vendor A can reply to unpublished review'; END IF;
END
$ownerA$;

-- Vendor B cannot alter or even read Vendor A follow-up.
SET "request.jwt.claim.sub"='22222222-2222-4222-8222-222222222222';
DO $ownerB$
DECLARE changed integer; blocked boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.lead_followups)<>0 THEN
   RAISE EXCEPTION 'Vendor B can read Vendor A reminder';
 END IF;
 UPDATE public.lead_followups SET due_at=now()+interval '3 days'
 WHERE lead_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Vendor B changed Vendor A reminder'; END IF;
 BEGIN
  INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
  VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','22222222-2222-4222-8222-222222222222','Fake vendor reply');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Vendor B impersonated review ownership'; END IF;
END
$ownerB$;

-- Review author can see their own unapproved review; other people cannot
-- impersonate that user_id on INSERT.
SET "request.jwt.claim.sub"='77777777-7777-4777-8777-777777777777';
DO $customer$
DECLARE blocked boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.reviews WHERE is_approved=false)<>1 THEN
   RAISE EXCEPTION 'Pending reviewer lost access to own review';
 END IF;
 BEGIN
  INSERT INTO public.reviews(id,business_id,user_id,rating,comment,is_approved)
  VALUES('aabbccdd-0000-4000-8000-123456789abc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '44444444-4444-4444-8444-444444444444',3,'Forged reviewer',false);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'User can impersonate review author'; END IF;
END
$customer$;
RESET ROLE;

-- Public users only see approved reviews and approved-parent replies.
SET ROLE anon;
DO $anonymous$
DECLARE blocked boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.reviews)<>2 THEN
   RAISE EXCEPTION 'Unpublished reviews leaked to public';
 END IF;
 IF (SELECT count(*) FROM public.review_replies)<>1 THEN
   RAISE EXCEPTION 'Approved review reply not visible';
 END IF;
 BEGIN
  INSERT INTO public.review_replies(review_id,vendor_id,reply_text)
  VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff',
  '22222222-2222-4222-8222-222222222222','Anonymous fake reply');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Anonymous reply insert accepted'; END IF;
 INSERT INTO public.leads (id,business_id,name,status)
 VALUES('11223344-5566-4788-9900-112233445566',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Legacy mobile customer','new');
END
$anonymous$;
RESET ROLE;

DO $final$
BEGIN
 IF (SELECT count(*) FROM public.leads
 WHERE id='11223344-5566-4788-9900-112233445566')<>1 THEN
  RAISE EXCEPTION 'Legacy anonymous leads path broken';
 END IF;
 IF (SELECT count(*) FROM public.review_replies)<>1 THEN
  RAISE EXCEPTION 'Cross-vendor/duplicate reply persisted';
 END IF;
END
$final$;
SELECT 'SLBI P1 vendor CRM/reviews disposable RLS tests passed' AS result;
