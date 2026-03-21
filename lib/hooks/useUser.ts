import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  role?: string;
  verification_status?: string;
  avatar_url?: string;
  hasBusiness?: boolean;
}

export function useUser() {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      // Use getSession for faster local access instead of getUser
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        // Fallback to getUser just in case session is stale but user is valid
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) return null;
        return fetchProfileAndBusiness(authUser);
      }

      return fetchProfileAndBusiness(session.user);
    },
    staleTime: 2 * 60 * 1000, // Reduced to 2 minutes for better responsiveness
    gcTime: 5 * 60 * 1000,   
    retry: false,
  });
}

async function fetchProfileAndBusiness(authUser: any) {
  // Parallelize profile and business check
  const [profileResult, businessResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single(),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', authUser.id)
  ]);

  const profile = profileResult.data;
  const hasBusiness = (businessResult.count || 0) > 0;

  return {
    ...authUser,
    ...(profile || {}),
    hasBusiness
  } as AuthUser;
}
