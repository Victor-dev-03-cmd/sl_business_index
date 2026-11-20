import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeInternalPath(candidate: string | null): string {
  // Only same-origin, relative paths can be restored after OAuth.
  if (!candidate || candidate.length > 2048 ||
      !candidate.startsWith('/') || candidate.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/.test(candidate)) return '/'
  return candidate
}

function redirectNoStore(to: URL): NextResponse {
  const response = NextResponse.redirect(to)
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

/**
 * PKCE code exchange has to read the browser's verifier cookie and write the
 * authenticated Supabase cookies onto the very SAME redirect response.
 * A separate NextResponse.redirect() can otherwise lose cookies in production.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const next = safeInternalPath(url.searchParams.get('next'))
  const failure = new URL('/auth/auth-code-error', url.origin)

  if (!code) {
    console.warn('SLBI_OAUTH_CALLBACK_NO_CODE')
    return redirectNoStore(failure)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('SLBI_OAUTH_CALLBACK_CONFIGURATION_MISSING')
    return redirectNoStore(failure)
  }

  // Keep the response and request cookie state synchronized, including if
  // getUser() refreshes a token during this same request.
  const response = redirectNoStore(new URL(next, url.origin))
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('SLBI_OAUTH_CALLBACK_EXCHANGE_FAILED', exchangeError.name)
      return redirectNoStore(failure)
    }

    // Do not treat a successful Google consent screen as a signed-in session.
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('SLBI_OAUTH_CALLBACK_USER_UNVERIFIED', userError?.name || 'missing_user')
      return redirectNoStore(failure)
    }

    // A valid session must be persisted in cookies before the next navigation.
    const hasAuthCookie = response.cookies.getAll().some(({ name }) =>
      /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(name)
    ) || request.cookies.getAll().some(({ name }) =>
      /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(name)
    )
    if (!hasAuthCookie) {
      console.error('SLBI_OAUTH_CALLBACK_COOKIE_MISSING')
      return redirectNoStore(failure)
    }

    // The auth trigger creates new profiles; never overwrite existing roles
    // or subscriptions when an existing email account links Google identity.
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('id').eq('id', user.id).maybeSingle()
    if (!profileError && !profile) {
      const emailPrefix = user.email?.split('@')[0] || 'user'
      const fullName = typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.slice(0, 150) : emailPrefix
      const username = typeof user.user_metadata?.user_name === 'string'
        ? user.user_metadata.user_name.slice(0, 80) : emailPrefix
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id, full_name: fullName, username, role: 'customer',
      })
      if (insertError && insertError.code !== '23505') {
        console.warn('SLBI_OAUTH_CALLBACK_PROFILE_SYNC_PENDING')
      }
    }

    console.info('SLBI_OAUTH_CALLBACK_SUCCESS')
    return response
  } catch (cause) {
    console.error('SLBI_OAUTH_CALLBACK_UNEXPECTED', cause instanceof Error ? cause.name : 'unknown')
    return redirectNoStore(failure)
  }
}
