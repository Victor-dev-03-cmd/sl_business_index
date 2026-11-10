import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

export interface AuthUser {
  id: string
  email?: string
  full_name?: string
  username?: string
  role?: string
  verification_status?: string
  avatar_url?: string
  hasBusiness?: boolean
}

/**
 * Client-side display/profile hook, not an authorization boundary.
 * Always verify the signed-in user against Supabase Auth before loading a profile.
 */
export function useUser() {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: async (): Promise<AuthUser | null> => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null
      return fetchProfileAndBusiness(user)
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  })
}

async function fetchProfileAndBusiness(authUser: User): Promise<AuthUser> {
  const [profileResult, businessResult] = await Promise.all([
    supabase.from('profiles').select('full_name,username,role,verification_status,avatar_url')
      .eq('id', authUser.id).maybeSingle(),
    supabase.from('businesses').select('id', { count: 'exact', head: true })
      .eq('owner_id', authUser.id),
  ])
  if (profileResult.error || businessResult.error) {
    console.warn('Could not load full user profile or business ownership')
  }
  const profile = profileResult.data

  // Roles only come from the database; never trust user_metadata for access.
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || undefined,
    username: profile?.username || undefined,
    role: profile?.role || undefined,
    verification_status: profile?.verification_status || undefined,
    avatar_url: profile?.avatar_url || undefined,
    hasBusiness: !businessResult.error && (businessResult.count || 0) > 0,
  }
}
