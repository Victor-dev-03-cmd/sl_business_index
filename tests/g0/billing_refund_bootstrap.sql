\set ON_ERROR_STOP on
-- Minimal disposable shape used by the existing refund RPCs.
CREATE TABLE public.marketing_credit_jobs(
 id uuid PRIMARY KEY,user_id uuid NOT NULL,request_key text NOT NULL,cost_credits int NOT NULL,state text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz);
CREATE TABLE public.marketing_poster_jobs(LIKE public.marketing_credit_jobs INCLUDING ALL);
GRANT ALL ON public.marketing_credit_jobs,public.marketing_poster_jobs TO service_role;
