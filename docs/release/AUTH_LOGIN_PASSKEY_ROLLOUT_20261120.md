# SLBI authentication rollout — 20 November 2026

Scope: Google, Passkey (WebAuthn), Email. **No Facebook provider.**

## Included in this branch

- Shared mobile-first responsive /login and /signup UI.
- Official colored Google G icon and existing OAuth PKCE callback.
- Supabase experimental passkey client opt-in, sign-in, authenticated enrollment and revocation at /auth/passkeys.
- Email/password form with server-side Turnstile verification for login and captchaToken for signup.
- Session confirmation before protected-page navigation. Returning verified sessions bypass /login.
- Removed unused 10-minute inactivity SessionManager. Server token refresh, security checks and explicit Sign Out remain.
- Auth menu links to the passkey enrollment page.

## Provider configuration — MUST confirm before releasing

**Supabase Auth** → Authentication → Providers → Google:
1. Enable Google provider.
2. Store Google Cloud OAuth web application Client ID and Client Secret securely in Supabase (never in repository or NEXT_PUBLIC environment).
3. Google Cloud Authorized redirect URI: https://oofxhragafekazwjikae.supabase.co/auth/v1/callback
4. Supabase URL Configuration Site URL: https://slbusinessindex.com
5. Add the exact redirect allowlist: https://slbusinessindex.com/auth/callback
6. Confirm Google OAuth consent screen publishing/test-user settings as appropriate. A Vercel preview origin needs a separately allowlisted redirect URI for end-to-end preview OAuth tests.

**Supabase Auth** → Authentication → Passkeys:
1. Toggle Enable Passkey authentication (currently an experimental/Beta API).
2. Relying party display name: SL Business Index
3. Relying party ID: slbusinessindex.com
4. Allowed origin: https://slbusinessindex.com
5. If www.slbusinessindex.com is used for auth, add https://www.slbusinessindex.com; decide and retain a stable RP ID.
6. Users must first log in with Google/Email and register a passkey from Account → Passkeys & Security.
7. Never put Supabase service-role/secret keys in frontend code.

## Smoke test gate (production)

- Email signup → CAPTCHA → confirmation → sign in → logout.
- Existing vendor login via Google → PKCE callback → /vendor/dashboard → correct role and account, no duplicate profile.
- Existing customer registers passkey → signs out → logs in with fingerprint/Face ID/PIN.
- Remove passkey → sign-in with removed credential fails, Google/Email fallback works.
- Login from iOS Safari and Android Chrome, including browser tabs and installed PWA.
- Refresh authenticated routes to confirm cookies/claims and session persistence.
- Wrong password, cancelled WebAuthn prompt, unsupported browser, disabled Google/provider, and blocked third-party cookies show recoverable errors.

Do not release just because the UI and build are green: OAuth credentials, redirect allowlist, and passkey provider enablement are external configuration that code cannot prove.
