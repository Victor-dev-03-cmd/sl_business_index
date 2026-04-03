import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 Proxy / Middleware
 * Handles Supabase session refresh and role-based protection
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Protected routes check (Admin/Vendor)
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendor')) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        // Break infinite loops if refresh token is missing or invalid
        if (authError.message.includes('Refresh Token Not Found') || authError.status === 400) {
          const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
          request.cookies.getAll().forEach(cookie => {
            if (cookie.name.includes('auth-token') || cookie.name.includes('supabase')) {
              redirectResponse.cookies.set(cookie.name, '', { maxAge: 0 })
            }
          })
          return redirectResponse
        }
        throw authError
      }

      if (!user) {
        const url = new URL('/login', request.url)
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role?.toLowerCase()

      if (pathname.startsWith('/admin')) {
        if (role !== 'admin' && role !== 'ceo') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      if (pathname.startsWith('/vendor')) {
        const { count } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)

        const isBusinessOwner = (count || 0) > 0
        if (role !== 'vendor' && role !== 'admin' && role !== 'ceo' && !isBusinessOwner) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
