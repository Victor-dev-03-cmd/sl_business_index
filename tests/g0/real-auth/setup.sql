-- Synthetic disposable Supabase Docker only; never use with production.
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $$ BEGIN
 IF to_regprocedure('extensions.digest(bytea,text)') IS NULL THEN RAISE EXCEPTION 'Missing extensions.digest'; END IF;
END $$;
ALTER TABLE public.businesses ADD COLUMN rating numeric DEFAULT 0, ADD COLUMN reviews_count integer DEFAULT 0;
CREATE TABLE public.slbi_lead_request_receipts (
 request_id uuid PRIMARY KEY, lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.slbi_lead_rate_limits (
 bucket text PRIMARY KEY CHECK(bucket ~ '^[a-f0-9]{64}$'),
 window_hour timestamptz NOT NULL,event_count integer NOT NULL CHECK(event_count >= 0),
 expires_at timestamptz NOT NULL
);
ALTER TABLE public.slbi_lead_request_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slbi_lead_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slbi_lead_request_receipts,public.slbi_lead_rate_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slbi_lead_request_receipts,public.slbi_lead_rate_limits TO service_role;
\ir ../../../docs/growth/g0/release/LEAD_RECOVERY_BASELINE.sql
