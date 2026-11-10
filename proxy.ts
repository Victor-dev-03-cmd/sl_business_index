import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options?: CookieOptions }
import { NextResponse, type NextRequest } from 'next/server'

function isWithin(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

function privateNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

/**
 * Server-side access gate. These checks protect pages, not data APIs:
 * all sensitive Supabase queries must still be restricted by RLS.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isAdmin = isWithin(path, '/admin')
  const isVendor = isWithin(path, '/vendor')
  const isBusinessRegistration = isWithin(path, '/register-business')

  if (!isAdmin && !isVendor && !isBusinessRegistration) {
    return NextResponse.next({ request })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Never allow a protected route through on a missing configuration.
  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Authentication service unavailable', { status: 503 })
  }

  let response = privateNoStore(NextResponse.next({ request }))
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[], headers: Record<string, string> = {}) {
        // Keep the refreshed session consistent for both Server Components and browser.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = privateNoStore(NextResponse.next({ request }))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  function withSessionCookies(destination: NextResponse): NextResponse {
    response.cookies.getAll().forEach(cookie => destination.cookies.set(cookie))
    return privateNoStore(destination)
  }

  function signInRedirect(): NextResponse {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', path + request.nextUrl.search)
    return withSessionCookies(NextResponse.redirect(login))
  }

  try {
    // getClaims validates the JWT instead of trusting cookie/session contents.
    // It also refreshes expired tokens via the SSR cookie adapter when needed.
    const { data, error } = await supabase.auth.getClaims()
    let userId = !error ? data?.claims?.sub : undefined

    if (!userId) {
      // With legacy symmetric Supabase JWTs, getClaims() uses remote Auth.
      // If the JWT check fails unexpectedly, an independent getUser() call
      // verifies the current account against Supabase Auth before redirecting.
      // Never trust unverified getSession() or role metadata here.
      const hasAuthCookie = request.cookies.getAll().some(cookie =>
        /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(cookie.name)
      )
      if (!hasAuthCookie) return signInRedirect()
      const { data: fresh, error: freshError } = await supabase.auth.getUser()
      if (freshError || !fresh.user) {
        console.warn('SLBI_AUTH_PROXY_REJECT', {
          area: isAdmin ? 'admin' : isVendor ? 'vendor' : 'registration',
          cookiePresent: true,
          claimsErrorType: error?.name || 'claims_missing',
          userErrorType: freshError?.name || 'user_missing',
        })
        return signInRedirect()
      }
      console.warn('SLBI_AUTH_PROXY_VERIFIED_USER_FALLBACK', {
        area: isAdmin ? 'admin' : isVendor ? 'vendor' : 'registration',
      })
      userId = fresh.user.id
    }

    if (isBusinessRegistration) return response

    // Roles are sourced from the database, never user-editable auth metadata.
    const { data: profile, error: roleError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (roleError) {
      return withSessionCookies(new NextResponse('Access verification temporarily unavailable', { status: 503 }))
    }

    const role = String(profile?.role || 'customer').toLowerCase()
    const staff = role === 'admin' || role === 'ceo'

    if (isAdmin) {
      return staff
        ? response
        : withSessionCookies(NextResponse.redirect(new URL('/', request.url)))
    }

    if (isVendor && !staff && role !== 'vendor') {
      const { data: owned, error: ownershipError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)

      if (ownershipError) {
        return withSessionCookies(new NextResponse('Access verification temporarily unavailable', { status: 503 }))
      }
      if (!owned?.length) {
        return withSessionCookies(NextResponse.redirect(new URL('/register-business', request.url)))
      }
    }

    return response
  } catch (error) {
    console.error('Protected route verification failed', error)
    return withSessionCookies(new NextResponse('Access verification temporarily unavailable', { status: 503 }))
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendor/:path*',
    '/register-business/:path*',
  ],
}
