'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import {clearLocalPush,refreshPush} from '@/lib/push/client';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [getSession]);

  useEffect(() => {
    if(loading)return;
    if(!user){void clearLocalPush();return;}
    const uid=user.id;
    let last=0;
    const recover=()=>{if(document.visibilityState!=='visible'||Date.now()-last<30000)return;last=Date.now();void refreshPush(uid).catch(()=>{});};
    recover();
    document.addEventListener('visibilitychange',recover);
    window.addEventListener('online',recover);
    window.addEventListener('focus',recover);
    return()=>{document.removeEventListener('visibilitychange',recover);window.removeEventListener('online',recover);window.removeEventListener('focus',recover);};
  },[loading,user?.id]);

  return (
    <SessionContext.Provider value={{ session, user, loading, refreshSession: getSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}