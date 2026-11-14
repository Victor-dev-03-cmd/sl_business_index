\set ON_ERROR_STOP on
-- Realistic owner/paid entitlement fixture, no real vendor/token data.
INSERT INTO public.growth_entitlements (
  user_id,plan_name,payment_reference,verified_at,expires_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Professional','docker-verified-synthetic',
  now()-interval '1 day',now()+interval '30 days'
);
INSERT INTO public.marketing_connections(
 id,user_id,business_id,provider,external_account_id,
 account_display_name,account_type,status,granted_scopes
) VALUES(
 '33333333-3333-4333-8333-333333333333',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'meta_pages','synthetic-page-no-account','Test-owned Page',
 'managed_page','pending',ARRAY['pages_show_list']
);
INSERT INTO public.marketing_connection_secrets(
 connection_id,encrypted_access_token,encryption_key_id
) VALUES(
 '33333333-3333-4333-8333-333333333333',
 'synthetic_encrypted_envelope_not_a_real_oauth_token',
 'test-key-v1'
);
INSERT INTO public.marketing_oauth_intents(
 user_id,business_id,provider,state_digest,redirect_uri,expires_at
) VALUES(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'meta_pages','synthetic_hmac_digest_AAAAAAAA________BBBBBBBBBBBBBB',
 'https://slbusinessindex.com/api/marketing/oauth/meta_pages/callback',
 now()+interval '10 minutes'
);

DO $checks$
BEGIN
 IF has_table_privilege('anon','public.marketing_connections','SELECT')
 OR has_table_privilege('anon','public.marketing_connection_secrets','SELECT')
 OR has_table_privilege('authenticated','public.marketing_connection_secrets','SELECT')
 OR has_table_privilege('authenticated','public.marketing_oauth_intents','SELECT')
 OR has_table_privilege('authenticated','public.marketing_connections','INSERT')
 OR has_table_privilege('authenticated','public.marketing_connections','UPDATE')
 OR has_table_privilege('authenticated','public.marketing_connections','DELETE')
 THEN RAISE EXCEPTION 'OAuth vault or connection writes exposed to public'; END IF;
END $checks$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $paid_a$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT COUNT(*) FROM public.marketing_connections)<>1 THEN
   RAISE EXCEPTION 'Verified Pro owner cannot read own provider metadata'; END IF;
 BEGIN PERFORM COUNT(*) FROM public.marketing_connection_secrets;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Owner read encrypted token vault'; END IF;
 rejected:=false;
 BEGIN PERFORM COUNT(*) FROM public.marketing_oauth_intents;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Owner read OAuth state and PKCE material'; END IF;
END $paid_a$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $basic_b$
BEGIN
 IF (SELECT COUNT(*) FROM public.marketing_connections)<>0 THEN
   RAISE EXCEPTION 'Basic vendor saw Pro connection'; END IF;
END $basic_b$;

SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
RESET ROLE;

UPDATE public.growth_entitlements SET expires_at=now()-interval '1 minute'
 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $expired$
BEGIN
 IF (SELECT COUNT(*) FROM public.marketing_connections)<>0 THEN
   RAISE EXCEPTION 'Expired Pro vendor could still read connector metadata'; END IF;
END $expired$;
RESET ROLE;
RESET "request.jwt.claim.sub";

SELECT 'P2 connector OAuth private vault, Basic tenant denial, expired Pro denial PASS' result;
