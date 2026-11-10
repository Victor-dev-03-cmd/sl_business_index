import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const responseHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: responseHeaders })

/**
 * Same-origin password sign-in. The Supabase SSR client writes verified auth
 * cookies through next/headers before this response is sent to the browser.
 * Never echo tokens or sign-in secrets in responses or logs.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin sign-in request rejected.' }, 403)
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    return json({ error: 'A JSON sign-in request is required.' }, 415)
  }
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 8192) return json({ error: 'Sign-in request is too large.' }, 413)

  let body: { email?: unknown; password?: unknown; turnstileToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid sign-in request.' }, 400)
  }
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = body?.password
  const challenge = body?.turnstileToken
  if (!email || email.length > 320 || !email.includes('@') ||
      typeof password !== 'string' || password.length < 1 || password.length > 4096 ||
      typeof challenge !== 'string' || challenge.length < 10 || challenge.length > 4096) {
    return json({ error: 'Enter your email, password, and complete the security check.' }, 400)
  }

  // Challenge enforcement must happen on the server. A client-side token-presence
  // check does not provide anti-bot protection.
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  if (!secret) {
    return json({ error: 'Sign-in security verification is unavailable.' }, 503)
  }
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: challenge }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!verify.ok) return json({ error: 'Security verification is temporarily unavailable.' }, 503)
    const verdict: { success?: boolean } = await verify.json()
    if (verdict.success !== true) {
      return json({ error: 'Security verification failed. Complete the check again.' }, 403)
    }
  } catch {
    return json({ error: 'Security verification is temporarily unavailable.' }, 503)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session || !data.user) {
      return json({ error: 'Invalid email or password.' }, 401)
    }

    // The session has been obtained by Supabase Auth, not fabricated from input.
    // This also verifies that the account is readable from Auth.
    const { data: verified, error: verifyError } = await supabase.auth.getUser()
    if (verifyError || verified.user?.id !== data.user.id) {
      return json({ error: 'Sign-in could not be confirmed. Please try again.' }, 503)
    }
    return json({ authenticated: true })
  } catch {
    return json({ error: 'Authentication service temporarily unavailable.' }, 503)
  }
}
