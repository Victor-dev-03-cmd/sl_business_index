\set ON_ERROR_STOP on
-- Disposable Postgres only, after store-verify.sql and start-verify.sql.
-- Uses synthetic vendor A (once Pro), vendor B (Basic), no actual Google credentials.
DO $privileges$
BEGIN
  IF has_function_privilege('anon',
    'public.slbi_disconnect_google_mail_connection(uuid,uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.slbi_disconnect_google_mail_connection(uuid,uuid,uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Browser role can invoke privileged token purge'; END IF;

  IF has_table_privilege('authenticated','public.marketing_connection_secrets','SELECT')
    OR has_table_privilege('authenticated','public.marketing_connection_secrets','DELETE')
  THEN RAISE EXCEPTION 'OAuth secret ciphertext exposed to authenticated'; END IF;
END $privileges$;

-- The previous store-verify test saved exactly one synthetic connection.
DO $negative$
DECLARE v_id uuid; v_result boolean;
BEGIN
  SELECT id INTO STRICT v_id FROM public.marketing_connections
    WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND provider='google_mail';
  v_result:=public.slbi_disconnect_google_mail_connection(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',v_id);
  IF v_result THEN RAISE EXCEPTION 'Basic vendor removed another owner credential'; END IF;

  v_result:=public.slbi_disconnect_google_mail_connection(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',v_id);
  IF v_result THEN RAISE EXCEPTION 'Forged business ownership disconnected credential'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.marketing_connection_secrets WHERE connection_id=v_id)
    THEN RAISE EXCEPTION 'Cross-tenant attempt erased credentials'; END IF;
END $negative$;

-- Expired Pro must be able to remove SLBI's copy of Google credentials.
UPDATE public.growth_entitlements
  SET expires_at=clock_timestamp()-interval '10 minutes'
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $disconnect$
DECLARE v_id uuid; v_result boolean;
BEGIN
  SELECT id INTO STRICT v_id FROM public.marketing_connections
    WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND provider='google_mail';

  v_result:=public.slbi_disconnect_google_mail_connection(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',v_id);
  IF NOT v_result THEN RAISE EXCEPTION 'Expired Pro owner cannot delete stored tokens'; END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_connection_secrets WHERE connection_id=v_id)
    THEN RAISE EXCEPTION 'Encrypted credentials survive local disconnect'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.marketing_connections
    WHERE id=v_id AND status='revoked' AND disconnected_at IS NOT NULL
    AND access_expires_at IS NULL)
    THEN RAISE EXCEPTION 'Local disconnection metadata incomplete'; END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_oauth_intents
    WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND business_id='11111111-1111-4111-8111-111111111111'
    AND provider='google_mail' AND consumed_at IS NULL)
    THEN RAISE EXCEPTION 'Pending Google OAuth state still usable after disconnect'; END IF;

  -- Retry does not restore a credential or move the account to connected.
  v_result:=public.slbi_disconnect_google_mail_connection(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',v_id);
  IF NOT v_result THEN RAISE EXCEPTION 'Idempotent local disconnect retry failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_connection_secrets WHERE connection_id=v_id)
    THEN RAISE EXCEPTION 'Retry recreated encrypted token'; END IF;
END $disconnect$;
SELECT 'P2-07 owner / expired-Pro disconnect and credential purge PASS' result;
