import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

test('Google metadata supplies display identity only, never roles', () => {
  const helper = read('lib/auth/google-profile.ts')
  const navbar = read('app/components/Navbar.tsx')
  assert.match(helper, /item\.provider === 'google'/)
  assert.match(helper, /googleusercontent\.com/)
  assert.doesNotMatch(helper, /update.*role/)
  assert.match(navbar, /googleIdentityProfile\(user\)/)
  assert.match(navbar, /avatar_url: data\.avatar_url\?\.trim\(\) \|\| google\.avatar/)
  assert.match(navbar, /alt="Your profile"/)
})

test('existing avatars stay untouched in Google OAuth callback', () => {
  const callback = read('app/auth/callback/route.ts')
  assert.match(callback, /if \(!profileError && profile && !profile\.avatar_url && google\.avatar\)/)
  assert.match(callback, /\.is\('avatar_url', null\)/)
  assert.match(callback, /exchangeCodeForSession\(code\)/)
  assert.match(callback, /response\.cookies\.set\(name, value, options\)/)
})

test('passkey setup delegates secure QR to native WebAuthn browser UI', () => {
  const registration = read('app/auth/passkeys/page.tsx')
  const login = read('app/components/auth/AuthExperience.tsx')
  assert.match(registration, /auth\.registerPasskey\(\)/)
  assert.match(registration, /Use a phone or tablet/)
  assert.match(login, /auth\.signInWithPasskey\(\)/)
  assert.match(login, /browser's passkey prompt/)
  assert.match(login, /register a passkey first/)
  assert.doesNotMatch(registration + login, /otpauth:|QRCodeSVG|QRCodeCanvas|data:image\/png;base64/)
})

test('passkey enrollment documents real origin and known errors', () => {
  const page = read('app/auth/passkeys/page.tsx')
  assert.match(page, /https:\/\/www\.slbusinessindex\.com/)
  assert.match(page, /webauthn_credential_exists/)
  assert.match(page, /webauthn_challenge_expired/)
})
