import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useSession } from '@/app/components/SessionContext'
import { googleIdentityProfile } from '@/lib/auth/google-profile'

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
  const {user:sessionUser,loading}=useSession()
  const uid=sessionUser?.id
  const query=useQuery({
    queryKey: ['auth-user',uid||'guest'],
    enabled: !loading && Boolean(uid),
    queryFn: async (): Promise<AuthUser | null> => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user || user.id!==uid) throw new Error('Account verification unavailable')
      return fetchProfileAndBusiness(user)
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  })
  return {...query,data:uid?query.data:null,isLoading:loading||Boolean(uid&&query.isPending)}
}

async function fetchProfileAndBusiness(authUser: User): Promise<AuthUser> {
  const [profileResult, businessResult] = await Promise.all([
    supabase.from('profiles').select('full_name,username,role,verification_status,avatar_url')
      .eq('id', authUser.id).maybeSingle(),
    supabase.from('businesses').select('id').eq('owner_id', authUser.id).limit(1),
  ])
  if (profileResult.error || businessResult.error) {
    console.warn('Could not load full user profile or business ownership')
  }
  const profile = profileResult.data
  const google = googleIdentityProfile(authUser)

  // Roles only come from the database; never trust user_metadata for access.
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name?.trim() || google.name,
    username: profile?.username || undefined,
    role: profile?.role || undefined,
    verification_status: profile?.verification_status || undefined,
    avatar_url: profile?.avatar_url?.trim() || google.avatar,
    hasBusiness: !businessResult.error && Boolean(businessResult.data?.length),
  }
}
