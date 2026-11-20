# Google avatar and phone passkey rollout — 20 November 2026

## Confirmed issues

Supabase Google identity metadata contains an avatar and full name, but the SLBI public profile avatar is empty. This patch displays the Google photo/name when the user hasn't saved a custom avatar/name, and persists the photo via the verified OAuth callback only when the DB avatar is NULL. Existing profile roles, account IDs and subscriptions are not changed.

Supabase Auth log errors:
- WebAuthn verification failed: Error validating origin.
- WebAuthn credential not found.

Supabase reported zero passkeys registered at the time of audit.

## REQUIRED: Configure Supabase Passkeys

Authentication → Passkeys:
- Enable Passkey authentication.
- Relying Party Display Name: SL Business Index.
- Relying Party ID: slbusinessindex.com (without www or https).
- Relying Party Origins: https://www.slbusinessindex.com.
- Retain the RP ID after registering credentials or existing passkeys become invalid.

## Real QR process

1. First sign in using Google or Email at https://www.slbusinessindex.com/login.
2. Open https://www.slbusinessindex.com/auth/passkeys and click Create a passkey.
3. The native browser/OS WebAuthn prompt handles local biometrics or the option Use a phone or tablet.
4. If the browser offers a cross-device QR, scan the browser's QR with the phone camera; enable Bluetooth if prompted, and verify with fingerprint, Face ID, or device PIN.
5. Confirm the passkey appears under Saved passkeys, then sign out and test Continue with Passkey.

The site does NOT create arbitrary QR codes for authentication. WebAuthn hybrid QR and proximity protocols belong to the browser/OS; different platforms may show different prompts or no QR.

## Validation

Run the auth regression tests and Next.js TypeScript build. Then test Google avatar on desktop and mobile, and real passkey creation and cross-device sign-in on iOS/Android and desktop. Build success alone does not correct Supabase Relying Party origin configuration.
