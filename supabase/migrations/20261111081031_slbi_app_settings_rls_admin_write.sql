-- SLBI Growth OS Foundation v1: secure app_settings without changing values.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.app_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.app_settings TO authenticated;

CREATE POLICY slbi_app_settings_read ON public.app_settings
FOR SELECT TO anon, authenticated
USING (
  key = 'advanced_feature_definitions'
  OR EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'ceo')
  )
);

CREATE POLICY slbi_app_settings_admin_insert ON public.app_settings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'ceo')
  )
);

CREATE POLICY slbi_app_settings_admin_update ON public.app_settings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'ceo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'ceo')
  )
);

CREATE POLICY slbi_app_settings_admin_delete ON public.app_settings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'ceo')
  )
);