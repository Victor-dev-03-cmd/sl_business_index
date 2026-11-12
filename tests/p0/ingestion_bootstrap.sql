-- Isolated GitHub Actions PostgreSQL fixtures for SLBI Growth ingest.
-- Synthetic records only. Test driver first loads tests/p0/security_bootstrap.sql.
\set ON_ERROR_STOP on
ALTER ROLE service_role BYPASSRLS;
CREATE TABLE public.analytics_logs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid REFERENCES public.businesses(id),
 event_type text NOT NULL,user_id uuid,city text,metadata jsonb DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.leads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid REFERENCES public.businesses(id),
 name text NOT NULL,email text,phone text,status text DEFAULT 'new',
 source text DEFAULT 'Website Enquiry',message text,created_at timestamptz DEFAULT now()
);
ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert logs" ON public.analytics_logs
 FOR INSERT TO PUBLIC WITH CHECK(true);
CREATE POLICY "Vendors can view logs for their businesses" ON public.analytics_logs
 FOR SELECT TO PUBLIC
 USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=analytics_logs.business_id AND b.owner_id=auth.uid()));
CREATE POLICY "Admins can view all logs" ON public.analytics_logs
 FOR SELECT TO PUBLIC
 USING(EXISTS(SELECT 1 FROM public.profiles p
  WHERE p.id=auth.uid() AND p.role='admin'));
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT TO PUBLIC WITH CHECK(true);
CREATE POLICY "Vendors view own leads" ON public.leads FOR SELECT TO PUBLIC
 USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=leads.business_id AND b.owner_id=auth.uid()));
CREATE POLICY "Vendors update own leads" ON public.leads FOR UPDATE TO PUBLIC
 USING(EXISTS(SELECT 1 FROM public.businesses b
  WHERE b.id=leads.business_id AND b.owner_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE ON public.analytics_logs,public.leads TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.analytics_logs,public.leads TO service_role;
