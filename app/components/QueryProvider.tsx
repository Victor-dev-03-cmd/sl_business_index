'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000 },
    },
  }));

  useEffect(() => {
    // Private React Query data must not survive a logout or account switch.
    // Clear the cache on sign-out, then revalidate the account on sign-in.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void queryClient.invalidateQueries({ queryKey: ['auth-user'] });
        void queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
        void queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
