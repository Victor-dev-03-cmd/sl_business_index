import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type AuthCookie = { name: string; value: string; options?: CookieOptions }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Same-origin diagnostic with intentionally NON-sensitive booleans.
 * No identities, JWTs, cookies, IP addresses or personal data in the JSON.
 * Safe to inspect in DevTools after a login redirect loop.
 */
export async function GET(request: NextRequest) {
  const responseHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }
  const incomingCookies = request.cookies.getAll()
  const hasAuthCookie = incomingCookies.some(cookie =>
    /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(cookie.name)
  )
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json(
      { authenticated: false, authCookiePresent: hasAuthCookie, reason: 'configuration_unavailable' },
      { status: 503, headers: responseHeaders },
    )
  }

  const pendingCookies: AuthCookie[] = []
  let claimsVerified = false
  let userVerified = false
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet: AuthCookie[]) {
          toSet.forEach(cookie => {
            request.cookies.set(cookie.name, cookie.value)
            pendingCookies.push(cookie)
          })
        },
      },
    })
    const claims = await supabase.auth.getClaims()
    claimsVerified = Boolean(!claims.error && claims.data?.claims?.sub)
    if (!claimsVerified && hasAuthCookie) {
      const fresh = await supabase.auth.getUser()
      userVerified = Boolean(!fresh.error && fresh.data.user?.id)
    }
  } catch {
    // Diagnostic is deliberately minimal: do not expose Auth internals.
  }

  const authenticated = claimsVerified || userVerified
  const result = NextResponse.json({
    authenticated,
    authCookiePresent: hasAuthCookie,
    claimsVerified,
    userVerified,
    reason: authenticated ? 'ok' :
      hasAuthCookie ? 'verification_failed' : 'cookie_missing',
    host: request.nextUrl.hostname,
  }, { headers: responseHeaders })
  pendingCookies.forEach(({ name, value, options }) => result.cookies.set(name, value, options))
  return result
}
