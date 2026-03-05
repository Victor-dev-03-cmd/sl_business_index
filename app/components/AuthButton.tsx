'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, LayoutDashboard, Briefcase } from 'lucide-react';

export default function AuthButton({ user: initialUser }: { user: any | null }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  // Default to false to avoid the "slow" pulse animation on every load
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setUser(initialUser);
    if (initialUser) setIsChecking(false);
  }, [initialUser]);

  useEffect(() => {
    // Client-side session sync
    const checkUser = async () => {
      // If we don't have initialUser from server, we check client-side
      if (!initialUser) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser({ ...session.user, ...profile });
        }
        setIsChecking(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...profile });
      } else {
        setUser(null);
      }
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length > 1 && nameParts[0][0] && nameParts[nameParts.length - 1][0]) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayName = user?.full_name || user?.username || user?.email || 'User';

  // Helper to check for admin/ceo role (case-insensitive)
  const isAdminOrCeo = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'admin' || r === 'ceo';
  };

  // Helper to check for vendor role (case-insensitive)
  const isVendor = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'vendor';
  };

  if (isChecking) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse border-2 border-transparent" />
    );
  }

  if (user) {
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-10 w-10 bg-brand-dark text-white rounded-full font-normal text-sm focus:outline-none ring-offset-2 hover:bg-brand-blue transition-all border-2 border-transparent hover:border-brand-sand shadow-sm uppercase overflow-hidden">
              {getInitials(displayName)}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64 bg-white p-2 shadow-2xl border border-gray-100 font-normal rounded-[6px]" align="end">
            <div className="px-3 py-3 mb-2 bg-gray-50/50 rounded-[6px] border border-gray-50">
              <p className="text-[10px] text-gray-400 font-normal uppercase tracking-widest mb-1">Signed in as</p>
              <p className="text-sm font-normal text-gray-900 truncate">
                {displayName}
              </p>
              <div className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-brand-sand/30 text-brand-text text-[10px] uppercase font-normal tracking-wider">
                {user.role || 'customer'}
              </div>
            </div>

            <DropdownMenuSeparator className="my-1 bg-gray-50" />

            <div className="py-1">
              {isAdminOrCeo(user.role) ? (
                <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-brand-sand/30 focus:text-brand-dark rounded-[4px] transition-colors">
                  <Link href="/admin/dashboard" className="flex items-center w-full">
                    <LayoutDashboard strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                    <span className="font-normal text-[13px]">Admin Control Center</span>
                  </Link>
                </DropdownMenuItem>
              ) : null}

              {isVendor(user.role) ? (
                <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-brand-sand/30 focus:text-brand-dark rounded-[4px] transition-colors">
                  <Link href="/my-business" className="flex items-center w-full">
                    <Briefcase strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                    <span className="font-normal text-[13px]">Vendor Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-brand-sand/30 focus:text-brand-dark rounded-[4px] transition-colors">
                <Link href="/profile" className="flex items-center w-full">
                  <UserIcon strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">User Settings</span>
                </Link>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-1 bg-gray-50" />

            <div className="py-1">
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/');
                  router.refresh();
                }}
                className="w-full"
              >
                <DropdownMenuItem className="flex items-center text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2.5 rounded-[4px] transition-colors">
                  <LogOut strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">Sign Out</span>
                </DropdownMenuItem>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
      <div className="flex items-center">
        <Link
            href="/login"
            className="px-6 py-2.5 text-sm font-normal text-white bg-brand-dark rounded-[6px] hover:bg-brand-blue transition-all shadow-lg shadow-brand-dark/10 active:scale-[0.98]"
        >
          Sign In
        </Link>
      </div>
  );
}
