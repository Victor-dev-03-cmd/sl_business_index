import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Per-request Supabase server client with shared SSR auth cookies.
 * Use auth.getUser() or getClaims(), never getSession(), for authorization.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes
          // credentials on the paths that require authenticated access.
        }
      },
    },
  })
}
