import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the current user after session exchange
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // ... (profile check logic remains the same)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (!existingProfile) {
          const full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          const username = user.user_metadata?.user_name || user.email?.split('@')[0] || 'user'
          
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: full_name,
              username: username,
              role: 'customer',
            })
        }
      }
      
      const isLocalPath = next.startsWith('/')
      if (isLocalPath) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        return NextResponse.redirect(next)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
