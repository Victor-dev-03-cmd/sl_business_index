-- SLBI GrowthOS — Marketing Engine / P2-01 Brand Profiles
-- REVIEW / DISPOSABLE DOCKER DATABASE ONLY. NOT applied to live Supabase.
-- Prerequisites: existing public.businesses.id/owner_id, auth.users, auth.uid().
BEGIN;

CREATE TABLE IF NOT EXISTS public.social_brand_profiles (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL CHECK (char_length(btrim(brand_name)) BETWEEN 2 AND 100),
  slogan text NOT NULL DEFAULT '' CHECK (char_length(slogan) <= 160),
  primary_color text NOT NULL DEFAULT '#202024' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text NOT NULL DEFAULT '#FFFFFF' CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text NOT NULL DEFAULT '#FF7900' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  audience text NOT NULL DEFAULT '' CHECK (char_length(audience) <= 240),
  tone text NOT NULL DEFAULT 'professional'
    CHECK (tone IN ('professional','friendly','bold','elegant','playful')),
  languages text[] NOT NULL DEFAULT ARRAY['en','ta','si']::text[]
    CHECK (cardinality(languages) BETWEEN 1 AND 3
      AND languages <@ ARRAY['en','ta','si']::text[]
      AND cardinality(ARRAY(SELECT DISTINCT unnest(languages))) = cardinality(languages)),
  guidelines text NOT NULL DEFAULT '' CHECK (char_length(guidelines) <= 2000),
  offers jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(offers) = 'array' AND jsonb_array_length(offers) <= 5
      AND pg_column_size(offers) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_brand_profiles_owner_idx
  ON public.social_brand_profiles(owner_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.slbi_touch_brand_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS slbi_brand_profile_timestamp ON public.social_brand_profiles;
CREATE TRIGGER slbi_brand_profile_timestamp
  BEFORE UPDATE ON public.social_brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.slbi_touch_brand_profile();

ALTER TABLE public.social_brand_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_brand_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.slbi_touch_brand_profile() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS social_brand_profiles_owner_select ON public.social_brand_profiles;
CREATE POLICY social_brand_profiles_owner_select ON public.social_brand_profiles
  FOR SELECT TO authenticated USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS social_brand_profiles_owner_insert ON public.social_brand_profiles;
CREATE POLICY social_brand_profiles_owner_insert ON public.social_brand_profiles
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS social_brand_profiles_owner_update ON public.social_brand_profiles;
CREATE POLICY social_brand_profiles_owner_update ON public.social_brand_profiles
  FOR UPDATE TO authenticated USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT ON public.social_brand_profiles TO authenticated;
-- Immutable through browser JWT: business_id, owner_id, created_at.
GRANT UPDATE (
  brand_name,slogan,primary_color,secondary_color,accent_color,
  audience,tone,languages,guidelines,offers
) ON public.social_brand_profiles TO authenticated;

COMMIT;

-- Release gates: A/B owner negative RLS tests, no anon access/DELETE/TRUNCATE,
-- fresh browser Auth roundtrip, existing marketing_campaigns compatibility,
-- a versioned migration, monitored Preview, independent rollback.
