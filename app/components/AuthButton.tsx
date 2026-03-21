'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser, AuthUser } from '@/lib/hooks/useUser';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, LayoutDashboard, Briefcase } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

export default function AuthButton({ user: initialUser }: { user?: AuthUser | null }) {
  const router = useRouter();
  const { data: user, isLoading } = useUser();

  const displayName = user?.full_name || user?.username || user?.email || 'User';

  const isAdminOrCeo = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'admin' || r === 'ceo';
  };

  const isVendor = (role?: string) => {
    if (user?.hasBusiness) return true;
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'vendor';
  };

  if (isLoading) {
    return <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (user) {
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="avatar flex items-center justify-center h-10 w-10 bg-brand-dark text-white rounded-full font-normal text-sm focus:outline-none hover:bg-brand-blue transition-all border-2 border-transparent hover:border-brand-sand shadow-sm uppercase overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                user.full_name ? user.full_name[0] : (user.email ? user.email[0] : '?')
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64 bg-white p-2 shadow-2xl border border-gray-100 rounded-[6px]" align="end">
            <div className="px-3 py-3 mb-2 bg-gray-50/50 rounded-[6px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                {user.verification_status === 'verified' && <VerifiedBadge size={10} />}
              </div>
              <div className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-brand-sand/30 text-brand-text text-[10px] uppercase">
                {user.role || 'customer'}
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Admin Dashboard */}
            {isAdminOrCeo(user.role) && (
                <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                  <Link href="/admin/dashboard" className="flex items-center w-full">
                    <LayoutDashboard className="mr-3 h-4 w-4 opacity-70" />
                    <span>Admin Control Center</span>
                  </Link>
                </DropdownMenuItem>
            )}

            {/* Vendor Dashboard */}
            {isVendor(user.role) && (
                <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                  <Link href="/vendor/dashboard" className="flex items-center w-full">
                    <Briefcase className="mr-3 h-4 w-4 opacity-70" />
                    <span>Vendor Dashboard</span>
                  </Link>
                </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="cursor-pointer py-2.5">
              <Link href={isAdminOrCeo(user.role) ? "/admin/settings" : "/vendor/settings"} className="flex items-center w-full">
                <UserIcon className="mr-3 h-4 w-4 opacity-70" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <button onClick={() => supabase.auth.signOut().then(() => {
              // Invalidate user query on sign out
              router.push('/');
              router.refresh();
            })} className="w-full">
              <DropdownMenuItem className="text-red-600 cursor-pointer py-2.5">
                <LogOut className="mr-3 h-4 w-4 opacity-70" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
      <Link href="/login" className="px-6 py-2.5 text-sm text-white bg-brand-dark rounded-[6px]">
        Sign In
      </Link>
  );
}