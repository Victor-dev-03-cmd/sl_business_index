-- P2-07: Official connector OAuth and vault boundary.
-- STAGING ONLY: NOT APPLIED TO PRODUCTION. Docker test before versioned migration.
-- Dependencies: public.businesses.id and owner_id; public.growth_entitlements
-- verified and unexpired. No seed tokens, provider credentials or fake accounts.
BEGIN;

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
COMMIT;
