\set ON_ERROR_STOP on
-- Run after real Growth Credit foundation and Marketing AI draft migrations
-- in disposable GitHub Docker postgres:17, with two synthetic owner identities.
UPDATE public.growth_credit_actions
SET is_enabled=true WHERE action_key='ai_social_draft'; -- TEST ONLY; NEVER production

DO $priv$
BEGIN
  IF has_table_privilege('anon','public.marketing_ai_drafts','SELECT')
    OR has_table_privilege('authenticated','public.marketing_credit_jobs','SELECT')
    OR has_table_privilege('authenticated','public.marketing_ai_drafts','INSERT')
    OR has_table_privilege('authenticated','public.marketing_ai_drafts','TRUNCATE')
    OR has_column_privilege('authenticated','public.marketing_ai_drafts','user_id','UPDATE')
    OR has_function_privilege('authenticated',
      'public.marketing_reserve_ai_draft(uuid,uuid,text)','EXECUTE')
  THEN RAISE EXCEPTION 'AI credits/drafts exposed to untrusted roles'; END IF;
END $priv$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $blocked$
DECLARE refused boolean:=false;
BEGIN
  BEGIN
    PERFORM public.marketing_reserve_ai_draft(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'attempt-direct-client-reservation-key');
  EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Browser can reserve credits'; END IF;
END $blocked$;
RESET ROLE;

SET ROLE service_role;
SET "request.jwt.claim.role"='service_role';
DO $owner$
DECLARE
  id1 uuid;id2 uuid;id3 uuid;id_again uuid;
  stage text;balance integer;cost integer;
  state_return text;
  draft uuid;
  refused boolean;
  changes integer;
BEGIN
  -- Unauthorized business of Vendor B cannot spend Vendor A credits.
  refused:=false;
  BEGIN
    PERFORM * FROM public.marketing_reserve_ai_draft(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222222',
      '11111111-aaaaaaaa-4444-aaaa-111111111111');
  EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Cross-owner reservation allowed'; END IF;

  SELECT job_id,job_state,remaining_credits,charged_credits
  INTO id1,stage,balance,cost
  FROM public.marketing_reserve_ai_draft(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '22222222-aaaa-4444-aaaa-111111111111');
  IF id1 IS NULL OR stage<>'reserved' OR balance<>28 OR cost<>2 THEN
    RAISE EXCEPTION 'First AI reservation did not atomically deduct 2 credits'; END IF;

  SELECT job_id,job_state,remaining_credits,charged_credits
  INTO id_again,stage,balance,cost
  FROM public.marketing_reserve_ai_draft(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '22222222-aaaa-4444-aaaa-111111111111');
  IF id_again<>id1 OR balance<>28 OR stage<>'reserved' THEN
    RAISE EXCEPTION 'Idempotent retry double-charged wallet'; END IF;

  draft:=public.marketing_complete_ai_draft(
   id1,'ta','யாழ்ப்பாணத்தில் எங்கள் பொருட்கள் பற்றி அறிந்துகொள்ளுங்கள்.',
   'openai/gpt-oss-20b',180,150);
  IF draft IS NULL OR
    (SELECT review_status FROM public.marketing_ai_drafts WHERE id=draft)<>'pending_review'
    OR (SELECT state FROM public.marketing_credit_jobs WHERE id=id1)<>'completed'
  THEN RAISE EXCEPTION 'Draft was not persisted for explicit human review'; END IF;

  IF public.marketing_refund_ai_draft(id1) THEN
    RAISE EXCEPTION 'Completed AI caption was illegally refunded'; END IF;

  SELECT job_id,job_state,remaining_credits,charged_credits
  INTO id2,stage,balance,cost FROM public.marketing_reserve_ai_draft(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '33333333-aaaa-4444-aaaa-111111111111');
  IF balance<>26 THEN RAISE EXCEPTION 'Second reservation did not charge'; END IF;

  IF NOT public.marketing_refund_ai_draft(id2) THEN
    RAISE EXCEPTION 'Refund of failed provider request did not work'; END IF;
  IF public.marketing_refund_ai_draft(id2) THEN
    RAISE EXCEPTION 'Second refund double-credited balance'; END IF;

  SELECT credits_remaining INTO balance FROM public.growth_credit_wallets
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF balance<>28 THEN RAISE EXCEPTION 'Refund did not reconcile wallet'; END IF;
  IF (SELECT count(*) FROM public.growth_credit_ledger
      WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND action_key IN ('ai_social_draft','ai_social_refund'))<>3
  THEN RAISE EXCEPTION 'AI usage ledger lost idempotency audit entries'; END IF;

  SELECT job_id,job_state,remaining_credits,charged_credits
  INTO id_again,stage,balance,cost
  FROM public.marketing_reserve_ai_draft(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111',
   '33333333-aaaa-4444-aaaa-111111111111');
  IF id_again<>id2 OR stage<>'refunded' OR balance<>28 THEN
    RAISE EXCEPTION 'Refunded request key permitted duplicate AI processing'; END IF;

  refused:=false;
  BEGIN
    PERFORM public.marketing_complete_ai_draft(
      id2,'en','Malicious retry','openai/gpt-oss-20b',100,100);
  EXCEPTION WHEN raise_exception THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Refunded job could still settle output'; END IF;

  -- New requests do not exceed a platform-wide budget, even after refund.
  UPDATE public.marketing_ai_daily_limits SET max_reservations=2;
  refused:=false;
  BEGIN
    PERFORM * FROM public.marketing_reserve_ai_draft(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '44444444-aaaa-4444-aaaa-111111111111');
  EXCEPTION WHEN raise_exception THEN refused:=true; END;
  IF NOT refused THEN RAISE EXCEPTION 'Global provider daily cost ceiling bypassed'; END IF;
END $owner$;
RESET ROLE;
RESET "request.jwt.claim.role";

SET ROLE authenticated;
SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $vendor_b$
DECLARE affected integer;refused boolean:=false;
BEGIN
  IF (SELECT count(*) FROM public.marketing_ai_drafts)<>0 THEN
    RAISE EXCEPTION 'Vendor B can see Vendor A captions'; END IF;
  UPDATE public.marketing_ai_drafts SET caption='Cross-tenant edit';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Vendor B can modify Vendor A caption'; END IF;
END $vendor_b$;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $vendor_a$
DECLARE updated_count integer;
BEGIN
  IF (SELECT count(*) FROM public.marketing_ai_drafts)<>1 THEN
    RAISE EXCEPTION 'Vendor A caption missing'; END IF;
  UPDATE public.marketing_ai_drafts
  SET caption='Reviewed caption by business owner',review_status='approved';
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  IF updated_count<>1 THEN RAISE EXCEPTION 'Owner cannot approve own draft'; END IF;
END $vendor_a$;
RESET ROLE;
RESET "request.jwt.claim.sub";
SELECT 'P2 Marketing AI credits, review, idempotency, global cap and RLS PASS' result;
