\set ON_ERROR_STOP on
ALTER ROLE service_role BYPASSRLS;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
DO $test$
DECLARE u uuid:='00000000-0000-4000-8000-000000000002'; w public.growth_credit_wallets%ROWTYPE;
 p date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 oldp date:=(p-interval '1 month')::date;
 capjob uuid:=gen_random_uuid(); posterjob uuid:=gen_random_uuid(); priorjob uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.growth_entitlements(user_id,plan_name,payment_reference,verified_at,expires_at)
 VALUES(u,'Professional','synthetic-future',now()+interval '1 day',now()+interval '2 days');
 PERFORM public._growth_ensure_wallet(u);
 SELECT * INTO w FROM public.growth_credit_wallets WHERE user_id=u AND period_start=p;
 IF w.plan_name<>'Basic' OR w.credits_remaining<>30 THEN RAISE EXCEPTION 'future entitlement unlocked';END IF;
 UPDATE public.growth_entitlements SET verified_at=now()-interval '1 day',expires_at=now()+interval '1 day' WHERE user_id=u;
 UPDATE public.growth_credit_actions SET is_enabled=true WHERE action_key='ai_social_draft';
 INSERT INTO public.growth_credit_actions VALUES('ai_poster_design',8,true);
 FOR i IN 1..20 LOOP PERFORM public.growth_consume_credits(u,'ai_social_draft','completed-'||i); END LOOP;
 PERFORM public.growth_consume_credits(u,'ai_social_draft','p2-ai:caption-001');
 PERFORM public.growth_consume_credits(u,'ai_poster_design','p2-poster:poster-001');
 INSERT INTO public.marketing_credit_jobs(id,user_id,request_key,cost_credits,state) VALUES(capjob,u,'caption-001',2,'reserved');
 INSERT INTO public.marketing_poster_jobs(id,user_id,request_key,cost_credits,state) VALUES(posterjob,u,'poster-001',8,'processing');
 UPDATE public.growth_entitlements SET verified_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id=u;
 IF NOT public.marketing_refund_ai_draft(capjob) OR NOT public.marketing_poster_refund(posterjob) THEN RAISE EXCEPTION 'valid refund failed'; END IF;
 IF public.marketing_refund_ai_draft(capjob) OR public.marketing_poster_refund(posterjob) THEN RAISE EXCEPTION 'double refund accepted'; END IF;
 SELECT * INTO w FROM public.growth_credit_wallets WHERE user_id=u AND period_start=p;
 IF w.plan_name<>'Basic' OR w.credits_remaining<>0 OR w.credits_used<>40 THEN RAISE EXCEPTION 'expired wallet over-refund'; END IF;
 IF (SELECT sum(delta) FROM public.growth_credit_ledger WHERE user_id=u AND period_start=p)<>w.credits_remaining THEN RAISE EXCEPTION 'ledger mismatch after downgrade';END IF;
 IF (SELECT count(*) FROM public.growth_credit_ledger WHERE user_id=u AND request_key IN ('p2-refund:caption-001','p2-poster-refund:poster-001') AND delta>0)<>2 THEN RAISE EXCEPTION 'refund reversal missing';END IF;
 UPDATE public.growth_entitlements SET verified_at=now()-interval '1 hour',expires_at=now()+interval '2 days' WHERE user_id=u;
 PERFORM public._growth_ensure_wallet(u);
 SELECT * INTO w FROM public.growth_credit_wallets WHERE user_id=u AND period_start=p;
 IF w.credits_remaining<>460 OR w.credit_limit<>500 OR w.credits_used<>40 THEN RAISE EXCEPTION 'upgrade overgrant';END IF;
 INSERT INTO public.growth_credit_wallets(user_id,period_start,plan_name,credit_limit,credits_remaining,credits_used) VALUES(u,oldp,'Basic',30,28,2);
 INSERT INTO public.growth_credit_ledger(user_id,period_start,action_key,delta,balance_after,request_key)
 VALUES(u,oldp,'monthly_grant',30,30,'monthly-grant'),(u,oldp,'ai_social_draft',-2,28,'p2-ai:prior-001');
 INSERT INTO public.marketing_credit_jobs(id,user_id,request_key,cost_credits,state,created_at) VALUES(priorjob,u,'prior-001',2,'reserved',oldp::timestamp AT TIME ZONE 'UTC');
 IF NOT public.marketing_refund_ai_draft(priorjob) THEN RAISE EXCEPTION 'prior refund failed';END IF;
 IF (SELECT credits_remaining FROM public.growth_credit_wallets WHERE user_id=u AND period_start=oldp)<>30 OR (SELECT credits_remaining FROM public.growth_credit_wallets WHERE user_id=u AND period_start=p)<>460 THEN RAISE EXCEPTION 'monthly isolation failed';END IF;
 IF EXISTS(SELECT 1 FROM public.growth_credit_wallets w2 WHERE w2.user_id=u AND w2.credits_remaining<>(SELECT sum(delta) FROM public.growth_credit_ledger l WHERE l.user_id=w2.user_id AND l.period_start=w2.period_start)) THEN RAISE EXCEPTION 'ledger not reconciled';END IF;
END $test$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.marketing_refund_ai_draft(uuid)','execute') OR has_function_privilege('anon','public.marketing_poster_refund(uuid)','execute') OR has_function_privilege('authenticated','public._growth_ensure_wallet(uuid)','execute') THEN RAISE EXCEPTION 'client mutation access';END IF;
END $$;
\echo 'PASS: verified_at, expiry refund, duplicate refund, re-upgrade cap, historical month, ACL and ledger reconciliation'
