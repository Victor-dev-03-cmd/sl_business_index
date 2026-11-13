-- SLBusinessIndex | P1 safe application API TRUNCATE lockdown.
-- Review-only source promoted after Docker acceptance; no DML / row deletion.
-- Exactly the 29 existing app tables from the 2026-11-13 live-grant audit,
-- plus the new private lead_followups table. Do NOT touch PostGIS-owned
-- extension relations (e.g. spatial_ref_sys/geography_columns).
-- API roles must never have TRUNCATE because PostgreSQL RLS cannot guard it.
BEGIN;

DO $guard$
DECLARE
  rel text;
  oid regclass;
  targets text[] := ARRAY[
    'analytics_logs','announcements','business_news','business_views',
    'businesses','categories','chat_messages','chat_room_members',
    'chat_rooms','contact_submissions','favorites','featured_listings',
    'invoices','lead_notes','leads','lead_followups','marketing_campaigns',
    'notifications','profiles','promotions','push_subscriptions',
    'qr_inventory','reports','review_replies','reviews','site_settings',
    'subscription_plans','subscriptions','testimonials','verifications'
  ];
BEGIN
  IF to_regclass('public.businesses') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.reviews') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
  THEN
    RAISE EXCEPTION 'Required application schema or API roles missing';
  END IF;

  FOREACH rel IN ARRAY targets LOOP
    oid := to_regclass(format('public.%I',rel));
    IF oid IS NOT NULL THEN
      EXECUTE format(
        'REVOKE TRUNCATE ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        rel
      );
      IF has_table_privilege('anon',oid,'TRUNCATE')
         OR has_table_privilege('authenticated',oid,'TRUNCATE')
      THEN
        RAISE EXCEPTION 'RLS bypass remains on public.%',rel;
      END IF;
    END IF;
  END LOOP;
END
$guard$;
COMMIT;

-- Existing data, policies, SELECT/INSERT/UPDATE rights and service_role are
-- untouched by this supplemental privilege correction.
