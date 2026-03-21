'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast, Toaster } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { LogOut, Timer, ShieldAlert } from 'lucide-react';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_MS = 9 * 60 * 1000; // 9 minutes
const SYNC_CHANNEL = 'auth-session-sync';

export default function SessionManager({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const handleLogout = useCallback(async (forced = true) => {
    try {
      await supabase.auth.signOut();
      
      // Clear any remaining auth-related storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      if (forced) {
        toast.error('Session expired for your security. Please login again.', {
          duration: 5000,
          position: 'top-center',
        });
      }
      
      // Notify other tabs
      broadcastRef.current?.postMessage('logout');
      
      setIsLoggedOut(true);
      setShowWarning(false);
      setHasSession(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const resetTimers = useCallback(() => {
    if (isLoggedOut || !hasSession) return;

    // Clear existing timers
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Reset warning modal state if user becomes active
    if (showWarning) setShowWarning(false);

    // Set new timers
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_MS);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout(true);
    }, TIMEOUT_MS);
  }, [handleLogout, isLoggedOut, showWarning, hasSession]);

  useEffect(() => {
    // Check initial session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      if (session) resetTimers();
    };
    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(!!session);
      if (session) {
        resetTimers();
      } else {
        // Clear timers if signed out
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      }
    });

    // Setup sync across tabs
    if (typeof window !== 'undefined') {
      broadcastRef.current = new BroadcastChannel(SYNC_CHANNEL);
      broadcastRef.current.onmessage = (event) => {
        if (event.data === 'logout') {
          setIsLoggedOut(true);
          setHasSession(false);
          router.push('/login');
        }
      };
    }

    // Activity listeners - Debounce these if possible, or just rely on state
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const activityHandler = () => {
      if (hasSession) resetTimers();
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });

    return () => {
      subscription.unsubscribe();
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
      broadcastRef.current?.close();
    };
  }, [resetTimers, router, hasSession]);

  return (
    <>
      <Toaster richColors closeButton position="top-center" />
      {children}

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-md bg-white rounded-xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-amber-50 p-6 flex items-center gap-4 border-b border-amber-100">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-amber-900">Session Expiring</DialogTitle>
              <DialogDescription className="text-sm text-amber-700 font-medium">For your security, you'll be logged out shortly.</DialogDescription>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed font-medium text-center">
              Your session is about to expire due to inactivity. Do you want to stay logged in?
            </p>
            
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Timer size={12} /> Auto-Logout in 1 Minute
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleLogout(false)}
              className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-tight"
            >
              Logout Now
            </button>
            <button
              onClick={resetTimers}
              className="flex-1 px-8 py-3 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              Stay Logged In
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
