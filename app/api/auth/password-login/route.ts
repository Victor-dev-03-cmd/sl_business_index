import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

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
export async function POST(request: NextRequest) {
  // Next.js may normalize Request.url to localhost behind its dev proxy.
  // The browser's Host header is the correct same-origin authority, including
  // Vercel custom domains. Reject mismatched hosts and schemes.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') || new URL(request.url).host
  const protocol = request.headers.get('x-forwarded-proto') ||
    new URL(request.url).protocol.replace(':', '')
  let acceptedOrigin = false
  try {
    const supplied = new URL(origin || '')
    // Public production requests MUST be HTTPS. Next.js local production
    // smoke tests should use a forwarded HTTPS header, not weaken this rule.
    acceptedOrigin = supplied.host === host &&
      supplied.protocol === protocol + ':' &&
      (protocol === 'https' || process.env.NODE_ENV !== 'production')
  } catch { /* Missing or invalid Origin: reject. */ }
  if (!acceptedOrigin) {
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return json({ error: 'Authentication service is not configured.' }, 503)
    }

    // IMPORTANT: Use the SAME response for Supabase's Set-Cookie headers and
    // the returned JSON body. Mutating next/headers cookies and constructing a
    // separate response may lose the freshly-issued SSR session in production.
    const signedInResponse = json({ authenticated: true })
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            signedInResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    // Supabase Auth itself checks the credentials and issues the session;
    // there is no reason to call getUser again inside this same request.
    // The protected Proxy verifies getClaims() on the subsequent navigation.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session || !data.user) {
      return json({ error: 'Invalid email or password.' }, 401)
    }

    // Supabase SSR writes cookies only when the stored session value changes;
    // a successful Auth response is NOT guaranteed to emit a new Set-Cookie.
    // Returning 503 on zero Set-Cookie incorrectly rejects valid credentials.
    // If a fresh session cookie was not emitted, let the official browser SSR
    // client persist the session as a recovery path after the server has
    // already verified Turnstile and authenticated the credentials.
    // Neither access nor refresh tokens leave this endpoint's JSON response.
    const hasNewAuthCookie = signedInResponse.cookies.getAll().some(({ name }) =>
      name.includes('-auth-token')
    )
    if (!hasNewAuthCookie) {
      return json({ authenticated: true, browserSessionRequired: true })
    }
    return signedInResponse
  } catch {
    return json({ error: 'Authentication service temporarily unavailable.' }, 503)
  }
}
