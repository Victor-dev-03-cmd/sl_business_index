import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('both auth pages use the same responsive experience', () => {
  assert.match(read('app/login/page.tsx'), /AuthExperience mode="login"/);
  assert.match(read('app/signup/page.tsx'), /AuthExperience mode="signup"/);
});

test('only Google, Passkey and Email methods appear in sign-in', () => {
  const page = read('app/components/auth/AuthExperience.tsx');
  assert.match(page, /provider: 'google'/);
  assert.match(page, /signInWithPasskey\(\)/);
  assert.match(page, /Continue with Email/);
  assert.doesNotMatch(page, /handleSocialLogin\('facebook'\)/);
  assert.doesNotMatch(page, /<Chrome/);
});

test('email sign-in keeps server CAPTCHA and cookie verification', () => {
  const page = read('app/components/auth/AuthExperience.tsx');
  assert.match(page, /\/api\/auth\/password-login/);
  assert.match(page, /\/api\/auth\/session-status/);
  assert.match(page, /captchaToken: turnstileToken/);
});

test('passkey enrollment is real and linked from account dropdown', () => {
  assert.match(read('app/auth/passkeys/page.tsx'), /auth\.registerPasskey\(\)/);
  assert.match(read('app/auth/passkeys/page.tsx'), /auth\.passkey\.list\(\)/);
  assert.match(read('app/components/AuthButton.tsx'), /href="\/auth\/passkeys"/);
  assert.match(read('lib/supabaseClient.ts'), /experimental: \{ passkey: true \}/);
});

test('unused forced 10-minute session manager has been deleted', () => {
  assert.equal(existsSync(new URL('../../app/components/SessionManager.tsx', import.meta.url)), false);
});

test('OAuth callback persists PKCE session onto the redirect response', () => {
  const callback = read('app/auth/callback/route.ts');
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /response\.cookies\.set\(name, value, options\)/);
  assert.match(callback, /request\.cookies\.set\(name, value\)/);
  assert.match(callback, /SLBI_OAUTH_CALLBACK_COOKIE_MISSING/);
  assert.match(callback, /SLBI_OAUTH_CALLBACK_SUCCESS/);
});

test('Google auth starts on canonical domain to keep PKCE verifier on same origin', () => {
  const page = read('app/components/auth/AuthExperience.tsx');
  assert.match(page, /hostname === 'slbusinessindex\.com'/);
  assert.match(page, /hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(page, /https:\/\/www\.slbusinessindex\.com/);
});
