import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Middleware: Supabase environment variables are missing')
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
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
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('-auth-token'))
  let user = null

  if ((pathname.startsWith('/admin') || pathname.startsWith('/vendor')) && hasAuthCookie) {
    let authUser = null
    try {
      const { data } = await supabase.auth.getUser()
      authUser = data.user
    } catch (e) {
      console.error('Middleware getUser error:', e)
    }
    
    user = authUser

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      
      const redirectResponse = NextResponse.redirect(url)
      // Copy refreshed cookies to redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Middleware profile error:', profileError)
      }

      const role = profile?.role?.toLowerCase()

      const { count: businessCount, error: businessError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      if (businessError) {
        console.error('Middleware business error:', businessError)
      }

      const isBusinessOwner = (businessCount || 0) > 0

      if (pathname.startsWith('/admin')) {
        if (role !== 'admin' && role !== 'ceo') {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          const redirectResponse = NextResponse.redirect(url)
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
          return redirectResponse
        }
      }

      if (pathname.startsWith('/vendor')) {
        if (role !== 'vendor' && role !== 'admin' && role !== 'ceo' && !isBusinessOwner) {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          const redirectResponse = NextResponse.redirect(url)
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
          return redirectResponse
        }
      }
    } catch (error) {
      console.error('Middleware db fetch error:', error)
    }
  }

  return response
}

export default middleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}