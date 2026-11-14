-- P2-07: One-time OAuth intent claim. STAGING/DISPOSABLE DOCKER ONLY.
-- Depends on P2_07_CONNECTOR_OAUTH_VAULT_STAGING_ONLY.sql.
-- The server must independently authenticate the owner and never accept these
-- identity, provider or redirect arguments from an untrusted browser callback.
-- No provider tokens, external calls, pricing or live migrations are enabled.
BEGIN;

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
COMMIT;
