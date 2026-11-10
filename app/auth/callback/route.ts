import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function safeInternalPath(candidate: string | null): string {
  // A callback must never redirect into an untrusted external origin.
  if (!candidate || candidate.length > 2048 ||
      !candidate.startsWith('/') || candidate.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/.test(candidate)) return '/'
  return candidate
}

function redirectNoStore(to: URL): NextResponse {
  const response = NextResponse.redirect(to)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeInternalPath(url.searchParams.get('next'))
  const failure = new URL('/auth/auth-code-error', url.origin)

  if (!code) return redirectNoStore(failure)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback code exchange failed:', error.message)
    return redirectNoStore(failure)
  }

  // Confirm the account with Auth itself; do not infer identity from URL params.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return redirectNoStore(failure)

  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id').eq('id', user.id).maybeSingle()

  // The signup database trigger normally creates the profile.
  // Provide a guarded fallback for legacy OAuth users.
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
      console.warn('Profile will need to be synchronized after OAuth login')
    }
  }

  return redirectNoStore(new URL(next, url.origin))
}
