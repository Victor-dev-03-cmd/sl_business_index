-- SLBusinessIndex P2 Production Marketing Database Foundation (2026-11-14)
-- Reviewed additive schema from previously green PostgreSQL 17 isolated tests.
-- Uses this single atomic Supabase migration (DO NOT manually split).
-- No paid entitlements, tokens, mailbox accounts, network actions, sends,
-- AI budgets, provider webhooks, authentication grants or external publishing.
-- This migration does NOT enable production OAuth: VERCEL_ENV preview gate is independent.
-- Verify absence of P2 tables and perform database backup/PITR check beforehand.
-- Rollback: disable code rollout, restore database backup for full reversal; or
-- drop ONLY these P2 objects after dependency review if all remain empty.
-- No live marketing_campaigns rows or RLS policies modified by this migration.

DO $preflight$
BEGIN
 IF to_regclass('public.marketing_studio_app_rollouts') IS NOT NULL
   OR to_regclass('public.social_brand_profiles') IS NOT NULL
   OR to_regclass('public.marketing_oauth_intents') IS NOT NULL
   OR to_regclass('public.marketing_connections') IS NOT NULL
   OR to_regclass('public.marketing_connection_secrets') IS NOT NULL
 THEN RAISE EXCEPTION 'P2 Marketing baseline already exists: manual reconcile required'; END IF;
 IF to_regclass('public.growth_entitlements') IS NULL OR
    to_regclass('public.businesses') IS NULL
 THEN RAISE EXCEPTION 'GrowthOS owner/entitlement prerequisites missing'; END IF;
END $preflight$;


-- Global Marketing Studio app catalogue: visible to signed-in vendors only.
-- Publication states are independent from OAuth, external sends and Pro grants.
CREATE TABLE public.marketing_studio_app_rollouts (
  app_id text PRIMARY KEY CHECK (app_id ~ '^[a-z][a-z0-9-]{2,70}$'),
  launch_status text NOT NULL DEFAULT 'coming_soon'
    CHECK (launch_status IN ('coming_soon','preview','live')),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_studio_app_rollouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_studio_app_rollouts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketing_studio_app_rollouts TO authenticated;
GRANT ALL ON public.marketing_studio_app_rollouts TO service_role;
CREATE POLICY marketing_studio_app_rollouts_read
 ON public.marketing_studio_app_rollouts FOR SELECT TO authenticated
 USING (true);
INSERT INTO public.marketing_studio_app_rollouts(app_id,launch_status) VALUES
  ('campaign-planner','coming_soon'),
  ('poster-editor','coming_soon'),
  ('caption-lab','coming_soon'),
  ('brand-kit','coming_soon'),
  ('social-marketing','coming_soon'),
  ('email-marketing','coming_soon'),
  ('voice-agent','coming_soon'),
  ('workflow-automation','coming_soon'),
  ('plugin-connectors','coming_soon'),
  ('content-calendar','coming_soon'),
  ('leads-workspace','coming_soon'),
  ('leads-crm','coming_soon');
-- Only reviewed server-side rollout processes may update this table.
-- No front-end role has INSERT, UPDATE or DELETE grants.


-- Validated source segment 1: docs/growth/p2/P2_01_SOCIAL_BRAND_PROFILES_STAGING_ONLY.sql
-- SLBI GrowthOS — Marketing Engine / P2-01 Brand Profiles
-- REVIEW / DISPOSABLE DOCKER DATABASE ONLY. NOT applied to live Supabase.
-- Prerequisites: existing public.businesses.id/owner_id, auth.users, auth.uid().

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
      AND cardinality(languages) =
        ((CASE WHEN 'en' = ANY(languages) THEN 1 ELSE 0 END)
        +(CASE WHEN 'ta' = ANY(languages) THEN 1 ELSE 0 END)
        +(CASE WHEN 'si' = ANY(languages) THEN 1 ELSE 0 END))),
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

GRANT SELECT ON public.social_brand_profiles TO authenticated;
-- Only the necessary input columns can be supplied by an authenticated owner.
-- The audit timestamps are exclusively server-generated and cannot be forged.
GRANT INSERT (
  business_id,owner_id,brand_name,slogan,primary_color,secondary_color,
  accent_color,audience,tone,languages,guidelines,offers
) ON public.social_brand_profiles TO authenticated;
-- Immutable through browser JWT: business_id, owner_id, created_at.
GRANT UPDATE (
  brand_name,slogan,primary_color,secondary_color,accent_color,
  audience,tone,languages,guidelines,offers
) ON public.social_brand_profiles TO authenticated;

-- Release gates: A/B owner negative RLS tests, no anon access/DELETE/TRUNCATE,
-- fresh browser Auth roundtrip, existing marketing_campaigns compatibility,
-- a versioned migration, monitored Preview, independent rollback.


-- Validated source segment 2: docs/growth/p2/P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql
-- P2-07: Official connector OAuth and vault boundary.
-- STAGING ONLY: NOT APPLIED TO PRODUCTION. Docker test before versioned migration.
-- Dependencies: public.businesses.id and owner_id; public.growth_entitlements
-- verified and unexpired. No seed tokens, provider credentials or fake accounts.

CREATE TABLE IF NOT EXISTS public.marketing_oauth_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK(provider IN (
    'meta_pages','instagram_professional','whatsapp_business','google_mail','microsoft_mail'
  )),
  state_digest text NOT NULL UNIQUE CHECK(length(state_digest) BETWEEN 40 AND 60),
  pkce_verifier_ciphertext text,
  redirect_uri text NOT NULL CHECK(length(redirect_uri) BETWEEN 12 AND 500),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at > created_at AND expires_at <= created_at+interval '15 minutes')
);
CREATE INDEX IF NOT EXISTS marketing_oauth_pending_expiry ON public.marketing_oauth_intents(expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.marketing_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK(provider IN (
    'meta_pages','instagram_professional','whatsapp_business','google_mail','microsoft_mail'
  )),
  external_account_id text NOT NULL CHECK(length(external_account_id) BETWEEN 1 AND 255),
  account_display_name text CHECK(length(account_display_name) <= 160),
  account_type text NOT NULL CHECK(account_type IN (
    'managed_page','professional_profile','business_phone','mailbox'
  )),
  granted_scopes text[] NOT NULL DEFAULT '{}' CHECK(cardinality(granted_scopes) <= 30),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','connected','expired','revoked','error'
  )),
  access_expires_at timestamptz,
  last_verified_at timestamptz,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,business_id,provider,external_account_id)
);
CREATE INDEX IF NOT EXISTS marketing_connections_by_owner ON public.marketing_connections
  (user_id,business_id,provider);

-- Private encryption wrapper: only trusted service role may read/write.
-- In production use dedicated KMS/vault envelope encryption. The table holds
-- ciphertext ONLY, never access/refresh token plaintext.
CREATE TABLE IF NOT EXISTS public.marketing_connection_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  encrypted_access_token text NOT NULL CHECK(length(encrypted_access_token) BETWEEN 32 AND 20000),
  encrypted_refresh_token text CHECK(length(encrypted_refresh_token) <= 20000),
  encryption_key_id text NOT NULL CHECK(length(encryption_key_id) BETWEEN 3 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_oauth_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_oauth_intents,public.marketing_connections,
  public.marketing_connection_secrets FROM PUBLIC,anon,authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.marketing_oauth_intents,
  public.marketing_connections,public.marketing_connection_secrets TO service_role;
-- Authenticated owners may inspect nonsecret connection metadata only.
-- Secrets and OAuth pending state are never exposed through PostgREST.
GRANT SELECT ON public.marketing_connections TO authenticated;
DROP POLICY IF EXISTS marketing_connections_owner_read ON public.marketing_connections;
CREATE POLICY marketing_connections_owner_read ON public.marketing_connections
  FOR SELECT TO authenticated USING (
    user_id=(SELECT auth.uid())
    AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id
      AND b.owner_id=(SELECT auth.uid()))
    AND EXISTS(SELECT 1 FROM public.growth_entitlements g
      WHERE g.user_id=(SELECT auth.uid())
      AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL
      AND length(g.payment_reference)>=3
      AND g.verified_at<=now() AND g.expires_at>now())
  );
-- No client write policies. Only trusted server actions manage connections.
-- An OAuth callback MUST consume an intent atomically with consumed_at IS NULL,
-- recheck current Pro/owner, exchange code, verify provider account/scopes,
-- encrypt credentials and then store connection metadata.


-- Validated source segment 3: docs/growth/p2/P2_07_OAUTH_INTENT_CLAIM_STAGING_ONLY.sql
-- P2-07: One-time OAuth intent claim. STAGING/DISPOSABLE DOCKER ONLY.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.
-- The server must independently authenticate the owner and never accept these
-- identity, provider or redirect arguments from an untrusted browser callback.
-- No provider tokens, external calls, pricing or live migrations are enabled.

CREATE OR REPLACE FUNCTION public.slbi_claim_marketing_oauth_intent(
  p_state_digest text,
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_redirect_uri text
)
RETURNS TABLE(intent_id uuid, encrypted_pkce_verifier text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $claim$
  UPDATE public.marketing_oauth_intents AS i
     SET consumed_at = clock_timestamp()
   WHERE i.state_digest = p_state_digest
     AND i.user_id = p_owner_id
     AND i.business_id = p_business_id
     AND i.provider = p_provider
     AND i.redirect_uri = p_redirect_uri
     AND i.consumed_at IS NULL
     AND i.expires_at > clock_timestamp()
     -- Google/Microsoft must not proceed without securely held PKCE material.
     AND (i.provider NOT IN ('google_mail', 'microsoft_mail')
          OR length(coalesce(i.pkce_verifier_ciphertext, '')) >= 32)
     AND EXISTS (
       SELECT 1 FROM public.businesses AS b
        WHERE b.id = i.business_id AND b.owner_id = p_owner_id
     )
     AND EXISTS (
       SELECT 1 FROM public.growth_entitlements AS g
        WHERE g.user_id = p_owner_id
          AND g.plan_name IN ('Professional', 'Enterprise')
          AND g.payment_reference IS NOT NULL
          AND length(g.payment_reference) >= 3
          AND g.verified_at IS NOT NULL
          AND g.verified_at <= clock_timestamp()
          AND g.expires_at > clock_timestamp()
     )
  RETURNING i.id, i.pkce_verifier_ciphertext;
$claim$;

-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- Revoke it explicitly: only the server's trusted service role may claim.
REVOKE ALL ON FUNCTION public.slbi_claim_marketing_oauth_intent(
  text, uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_claim_marketing_oauth_intent(
  text, uuid, uuid, text, text
) TO service_role;


-- Validated source segment 4: docs/growth/p2/P2_07_OAUTH_CONNECTION_STORE_STAGING_ONLY.sql
-- P2-07 preview-only atomic verified provider connection store.
-- STAGING / DISPOSABLE POSTGRES ONLY; NEVER APPLY AS-IS TO LIVE SUPABASE.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.
-- Uses ciphertext only; application must verify Google UserInfo and scopes.

CREATE OR REPLACE FUNCTION public.slbi_store_verified_marketing_connection(
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_external_account_id text,
  p_account_display_name text,
  p_account_type text,
  p_granted_scopes text[],
  p_expires_at timestamptz,
  p_encrypted_access text,
  p_encrypted_refresh text,
  p_encryption_key_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL
    OR p_provider <> 'google_mail' OR p_account_type <> 'mailbox'
    OR length(coalesce(p_external_account_id,'')) NOT BETWEEN 3 AND 255
    OR length(coalesce(p_account_display_name,'')) NOT BETWEEN 5 AND 160
    OR length(coalesce(p_encrypted_access,'')) NOT BETWEEN 40 AND 20000
    OR length(coalesce(p_encrypted_refresh,'')) NOT BETWEEN 40 AND 20000
    OR left(p_encrypted_access,3) <> 'v1.'
    OR left(p_encrypted_refresh,3) <> 'v1.'
    OR length(coalesce(p_encryption_key_id,'')) NOT BETWEEN 3 AND 120
    OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp()+interval '1 day'
    OR p_granted_scopes IS NULL
    OR NOT ('https://www.googleapis.com/auth/gmail.send'=ANY(p_granted_scopes))
    OR NOT ('openid'=ANY(p_granted_scopes))
    OR cardinality(p_granted_scopes) > 10 THEN
    RAISE EXCEPTION 'Invalid verified OAuth connection request' USING ERRCODE='22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements g
    WHERE g.user_id=p_owner_id
      AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL
      AND length(g.payment_reference)>=3
      AND g.verified_at<=clock_timestamp()
      AND g.expires_at>clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'Not authorized for provider connection' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.marketing_connections(
    user_id,business_id,provider,external_account_id,account_display_name,
    account_type,granted_scopes,status,access_expires_at,last_verified_at,connected_at
  ) VALUES (
    p_owner_id,p_business_id,p_provider,p_external_account_id,p_account_display_name,
    p_account_type,p_granted_scopes,'connected',p_expires_at,clock_timestamp(),clock_timestamp()
  )
  ON CONFLICT (user_id,business_id,provider,external_account_id) DO UPDATE
    SET account_display_name=excluded.account_display_name,
        account_type=excluded.account_type,
        granted_scopes=excluded.granted_scopes,
        status='connected',
        access_expires_at=excluded.access_expires_at,
        last_verified_at=excluded.last_verified_at,
        connected_at=excluded.connected_at,
        disconnected_at=NULL
  RETURNING id INTO v_id;

  INSERT INTO public.marketing_connection_secrets(
    connection_id,encrypted_access_token,encrypted_refresh_token,encryption_key_id
  ) VALUES (v_id,p_encrypted_access,p_encrypted_refresh,p_encryption_key_id)
  ON CONFLICT (connection_id) DO UPDATE
    SET encrypted_access_token=excluded.encrypted_access_token,
        encrypted_refresh_token=excluded.encrypted_refresh_token,
        encryption_key_id=excluded.encryption_key_id,
        updated_at=clock_timestamp();

  RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) TO service_role;


-- Validated source segment 5: docs/growth/p2/P2_07_OAUTH_START_RATE_LIMIT_STAGING_ONLY.sql
-- P2-07 secure OAuth start with trusted tenant and rate-limit transaction.
-- STAGING / DISPOSABLE DOCKER ONLY; do not apply to production.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.

CREATE OR REPLACE FUNCTION public.slbi_begin_marketing_oauth_intent(
  p_owner_id uuid,p_business_id uuid,p_provider text,p_state_digest text,
  p_pkce_ciphertext text,p_redirect_uri text,p_expires_at timestamptz
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF p_provider <> 'google_mail' OR p_owner_id IS NULL OR p_business_id IS NULL
    OR length(coalesce(p_state_digest,'')) NOT BETWEEN 40 AND 60
    OR length(coalesce(p_pkce_ciphertext,'')) NOT BETWEEN 40 AND 2000
    OR left(p_pkce_ciphertext,3)<>'v1.'
    OR length(coalesce(p_redirect_uri,'')) NOT BETWEEN 20 AND 500
    OR left(p_redirect_uri,8)<>'https://'
    OR p_expires_at<=clock_timestamp()
    OR p_expires_at>clock_timestamp()+interval '12 minutes'
  THEN RAISE EXCEPTION 'Invalid OAuth start request' USING ERRCODE='22023';
  END IF;
  -- Lock per owner so simultaneous starts cannot bypass the per-hour quota.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements g
    WHERE g.user_id=p_owner_id AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL AND length(g.payment_reference)>=3
      AND g.verified_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'Not authorized for OAuth start' USING ERRCODE='42501';
  END IF;
  IF (
    SELECT count(*) FROM public.marketing_oauth_intents i
     WHERE i.user_id=p_owner_id
       AND i.created_at > clock_timestamp()-interval '1 hour'
  )>=5 THEN
    RAISE EXCEPTION 'OAuth start rate limit' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.marketing_oauth_intents(
    user_id,business_id,provider,state_digest,pkce_verifier_ciphertext,
    redirect_uri,expires_at
  ) VALUES (
    p_owner_id,p_business_id,p_provider,p_state_digest,p_pkce_ciphertext,
    p_redirect_uri,p_expires_at
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.slbi_begin_marketing_oauth_intent(
  uuid,uuid,text,text,text,text,timestamptz
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_begin_marketing_oauth_intent(
  uuid,uuid,text,text,text,text,timestamptz
) TO service_role;


-- Validated source segment 6: docs/growth/p2/P2_07_OAUTH_LOCAL_DISCONNECT_STAGING_ONLY.sql
-- P2-07: local first-party credential purge and connection disconnect.
-- STAGING / DISPOSABLE PostgreSQL ONLY. Never run on live Supabase as-is.
-- Dependencies: P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql
-- This does NOT revoke Google's OAuth grant remotely. Provider-side revocation
-- requires separate consent/API tests and a managed KMS with refresh handling.

CREATE OR REPLACE FUNCTION public.slbi_disconnect_google_mail_connection(
  p_owner_id uuid,
  p_business_id uuid,
  p_connection_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE v_disconnected boolean:=false;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL OR p_connection_id IS NULL
  THEN
    RAISE EXCEPTION 'Invalid connection disconnect input' USING ERRCODE='22023';
  END IF;
  -- A formerly paid owner MUST retain the ability to remove private tokens,
  -- even after plan expiration. Ownership never depends on plan status.
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) THEN
    RETURN false;
  END IF;

  -- Lock by owner and serialize two disconnect requests. The caller is
  -- authenticated + ownership-checked by the server, not by browser IDs.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  UPDATE public.marketing_connections c
     SET status='revoked',
         disconnected_at=COALESCE(c.disconnected_at,clock_timestamp()),
         access_expires_at=NULL
   WHERE c.id=p_connection_id
     AND c.user_id=p_owner_id
     AND c.business_id=p_business_id
     AND c.provider='google_mail'
  RETURNING true INTO v_disconnected;

  IF COALESCE(v_disconnected,false) THEN
    DELETE FROM public.marketing_connection_secrets s
     WHERE s.connection_id=p_connection_id;

    -- Invalidate outstanding, UNCLAIMED OAuth state so the user must start
    -- a fresh consent flow. A previously claimed callback race still needs
    -- a generation-bound store contract before any production activation.
    UPDATE public.marketing_oauth_intents i
       SET consumed_at=clock_timestamp()
     WHERE i.user_id=p_owner_id
       AND i.business_id=p_business_id
       AND i.provider='google_mail'
       AND i.consumed_at IS NULL;
    RETURN true;
  END IF;
  RETURN false; -- nonexistent or cross-tenant id: no secret/error disclosure
END;
$function$;
REVOKE ALL ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) TO service_role;


-- Validated source segment 7: docs/growth/p2/P2_07_OAUTH_CALLBACK_DISCONNECT_RACE_STAGING_ONLY.sql
-- P2-07: CLOSE REVOKED-CALLBACK CREDENTIAL RESURRECTION RACE
-- STAGING / DISPOSABLE POSTGRES ONLY. Never apply directly to Production.
-- Run AFTER: vault, claim, store, begin and local-disconnect staging SQL.
-- No provider credentials, external sends, subscription changes or live DDL.

ALTER TABLE public.marketing_oauth_intents
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS stored_at timestamptz;

-- Preserve a claimed state's identity; later privileged persistence must bind
-- to this exact intent ID, not merely an owner/business/provider tuple.
CREATE OR REPLACE FUNCTION public.slbi_claim_marketing_oauth_intent(
  p_state_digest text,
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_redirect_uri text
)
RETURNS TABLE(intent_id uuid, encrypted_pkce_verifier text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $claim$
  UPDATE public.marketing_oauth_intents AS i
     SET consumed_at = clock_timestamp()
   WHERE i.state_digest = p_state_digest
     AND i.user_id = p_owner_id
     AND i.business_id = p_business_id
     AND i.provider = p_provider
     AND i.redirect_uri = p_redirect_uri
     AND i.consumed_at IS NULL
     AND i.invalidated_at IS NULL
     AND i.expires_at > clock_timestamp()
     -- Google/Microsoft must not proceed without securely held PKCE material.
     AND (i.provider NOT IN ('google_mail', 'microsoft_mail')
          OR length(coalesce(i.pkce_verifier_ciphertext, '')) >= 32)
     AND EXISTS (
       SELECT 1 FROM public.businesses AS b
        WHERE b.id = i.business_id AND b.owner_id = p_owner_id
     )
     AND EXISTS (
       SELECT 1 FROM public.growth_entitlements AS g
        WHERE g.user_id = p_owner_id
          AND g.plan_name IN ('Professional', 'Enterprise')
          AND g.payment_reference IS NOT NULL
          AND length(g.payment_reference) >= 3
          AND g.verified_at IS NOT NULL
          AND g.verified_at <= clock_timestamp()
          AND g.expires_at > clock_timestamp()
     )
  RETURNING i.id, i.pkce_verifier_ciphertext;
$claim$;


-- Even service_role must no longer invoke the legacy unbound credential store.
REVOKE EXECUTE ON FUNCTION public.slbi_store_verified_marketing_connection(
  uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM service_role;

-- The only trusted connection-store operation must prove one claimed intent,
-- acquire the same advisory lock as disconnect, and mark it stored exactly once.
CREATE OR REPLACE FUNCTION public.slbi_store_claimed_google_mail_connection(
  p_intent_id uuid,
  p_owner_id uuid,
  p_business_id uuid,
  p_provider text,
  p_external_account_id text,
  p_account_display_name text,
  p_account_type text,
  p_granted_scopes text[],
  p_expires_at timestamptz,
  p_encrypted_access text,
  p_encrypted_refresh text,
  p_encryption_key_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
DECLARE v_id uuid;
v_intent public.marketing_oauth_intents%ROWTYPE;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL
    OR p_provider <> 'google_mail' OR p_account_type <> 'mailbox'
    OR length(coalesce(p_external_account_id,'')) NOT BETWEEN 3 AND 255
    OR length(coalesce(p_account_display_name,'')) NOT BETWEEN 5 AND 160
    OR length(coalesce(p_encrypted_access,'')) NOT BETWEEN 40 AND 20000
    OR length(coalesce(p_encrypted_refresh,'')) NOT BETWEEN 40 AND 20000
    OR left(p_encrypted_access,3) <> 'v1.'
    OR left(p_encrypted_refresh,3) <> 'v1.'
    OR length(coalesce(p_encryption_key_id,'')) NOT BETWEEN 3 AND 120
    OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp()+interval '1 day'
    OR p_granted_scopes IS NULL
    OR NOT ('https://www.googleapis.com/auth/gmail.send'=ANY(p_granted_scopes))
    OR NOT ('openid'=ANY(p_granted_scopes))
    OR cardinality(p_granted_scopes) > 10 THEN
    RAISE EXCEPTION 'Invalid verified OAuth connection request' USING ERRCODE='22023';
  END IF;

  -- Serialize with begin and disconnect using the same owner-scoped lock.
  -- A pre-disconnect claimed OAuth callback cannot resurrect deleted tokens.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  SELECT i.* INTO v_intent FROM public.marketing_oauth_intents AS i
  WHERE i.id=p_intent_id
    AND i.user_id=p_owner_id
    AND i.business_id=p_business_id
    AND i.provider=p_provider
  FOR UPDATE;
  IF NOT FOUND OR v_intent.consumed_at IS NULL
    OR v_intent.invalidated_at IS NOT NULL
    OR v_intent.stored_at IS NOT NULL
    OR v_intent.expires_at<=clock_timestamp()
    OR v_intent.consumed_at<clock_timestamp()-interval '10 minutes'
  THEN
    RAISE EXCEPTION 'OAuth intent expired, revoked or already persisted'
      USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.growth_entitlements g
    WHERE g.user_id=p_owner_id
      AND g.plan_name IN ('Professional','Enterprise')
      AND g.payment_reference IS NOT NULL
      AND length(g.payment_reference)>=3
      AND g.verified_at<=clock_timestamp()
      AND g.expires_at>clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'Not authorized for provider connection' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.marketing_connections(
    user_id,business_id,provider,external_account_id,account_display_name,
    account_type,granted_scopes,status,access_expires_at,last_verified_at,connected_at
  ) VALUES (
    p_owner_id,p_business_id,p_provider,p_external_account_id,p_account_display_name,
    p_account_type,p_granted_scopes,'connected',p_expires_at,clock_timestamp(),clock_timestamp()
  )
  ON CONFLICT (user_id,business_id,provider,external_account_id) DO UPDATE
    SET account_display_name=excluded.account_display_name,
        account_type=excluded.account_type,
        granted_scopes=excluded.granted_scopes,
        status='connected',
        access_expires_at=excluded.access_expires_at,
        last_verified_at=excluded.last_verified_at,
        connected_at=excluded.connected_at,
        disconnected_at=NULL
  RETURNING id INTO v_id;

  INSERT INTO public.marketing_connection_secrets(
    connection_id,encrypted_access_token,encrypted_refresh_token,encryption_key_id
  ) VALUES (v_id,p_encrypted_access,p_encrypted_refresh,p_encryption_key_id)
  ON CONFLICT (connection_id) DO UPDATE
    SET encrypted_access_token=excluded.encrypted_access_token,
        encrypted_refresh_token=excluded.encrypted_refresh_token,
        encryption_key_id=excluded.encryption_key_id,
        updated_at=clock_timestamp();

  -- Commit binding of state to this exact one-time credential store.
  -- Any exception also rolls back metadata and secret ciphertext.
  UPDATE public.marketing_oauth_intents
     SET stored_at=clock_timestamp()
   WHERE id=p_intent_id AND stored_at IS NULL AND invalidated_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OAuth intent no longer available' USING ERRCODE='42501';
  END IF;
  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.slbi_store_claimed_google_mail_connection(
  uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_store_claimed_google_mail_connection(
  uuid,uuid,uuid,text,text,text,text,text[],timestamptz,text,text,text
) TO service_role;

-- Disconnect now invalidates even the already-claimed OAuth callback state.
-- Advisory lock + UPDATE serialize the purge with connection persistence.
CREATE OR REPLACE FUNCTION public.slbi_disconnect_google_mail_connection(
  p_owner_id uuid,
  p_business_id uuid,
  p_connection_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE v_disconnected boolean:=false;
BEGIN
  IF p_owner_id IS NULL OR p_business_id IS NULL OR p_connection_id IS NULL
  THEN
    RAISE EXCEPTION 'Invalid connection disconnect input' USING ERRCODE='22023';
  END IF;
  -- A formerly paid owner MUST retain the ability to remove private tokens,
  -- even after plan expiration. Ownership never depends on plan status.
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=p_business_id AND b.owner_id=p_owner_id
  ) THEN
    RETURN false;
  END IF;

  -- Lock by owner and serialize two disconnect requests. The caller is
  -- authenticated + ownership-checked by the server, not by browser IDs.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text,19407)
  );
  UPDATE public.marketing_connections c
     SET status='revoked',
         disconnected_at=COALESCE(c.disconnected_at,clock_timestamp()),
         access_expires_at=NULL
   WHERE c.id=p_connection_id
     AND c.user_id=p_owner_id
     AND c.business_id=p_business_id
     AND c.provider='google_mail'
  RETURNING true INTO v_disconnected;

  IF COALESCE(v_disconnected,false) THEN
    DELETE FROM public.marketing_connection_secrets s
     WHERE s.connection_id=p_connection_id;

    -- Invalidate BOTH unclaimed and already-claimed OAuth states.
    -- The revised store checks invalidated_at under the owner lock.
    UPDATE public.marketing_oauth_intents i
       SET consumed_at=COALESCE(i.consumed_at,clock_timestamp()),
           invalidated_at=clock_timestamp()
     WHERE i.user_id=p_owner_id
       AND i.business_id=p_business_id
       AND i.provider='google_mail'
;
    RETURN true;
  END IF;
  RETURN false; -- nonexistent or cross-tenant id: no secret/error disclosure
END;
$function$;

REVOKE ALL ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.slbi_disconnect_google_mail_connection(
  uuid,uuid,uuid
) TO service_role;
