'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, LayoutDashboard, Briefcase } from 'lucide-react';

export default function AuthButton({ user }: { user: any | null }) {
  const router = useRouter();

  const getInitials = (name: string) => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayName = user?.full_name || user?.username || user?.email || 'User';

  if (user) {
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-10 w-10 bg-green-700 text-white rounded-full font-normal text-sm focus:outline-none ring-offset-2 hover:bg-green-800 transition-all border-2 border-transparent hover:border-green-100 shadow-sm">
              {getInitials(displayName)}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-60 bg-white p-2 shadow-xl border-gray-100 font-normal" align="end">
            <div className="px-3 py-3 mb-1 bg-gray-50/50 rounded-lg">
              <p className="text-xs text-gray-400 font-normal uppercase tracking-wider mb-1">Signed in as</p>
              <p className="text-sm font-normal text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 capitalize font-normal">{user.role}</p>
            </div>

            <DropdownMenuSeparator className="my-1" />

            {/* Role-based Menu Items */}
            {user.role === 'admin' && (
              <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-emerald-50 focus:text-emerald-700">
                <Link href="/admin/dashboard" className="flex items-center w-full">
                  <LayoutDashboard strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">Admin Dashboard</span>
                </Link>
              </DropdownMenuItem>
            )}
            {user.role === 'vendor' && (
              <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-emerald-50 focus:text-emerald-700">
                <Link href="/my-business" className="flex items-center w-full">
                  <Briefcase strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">My Business</span>
                </Link>
              </DropdownMenuItem>
            )}
            {user.role === 'customer' && (
              <DropdownMenuItem asChild className="cursor-pointer py-2.5 focus:bg-emerald-50 focus:text-emerald-700">
                <Link href="/profile" className="flex items-center w-full">
                  <UserIcon strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">My Profile</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1" />

            <form action="/auth/signout" method="post" className="w-full font-normal">
              <button type="submit" className="w-full font-normal">
                <DropdownMenuItem className="flex items-center text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2.5">
                  <LogOut strokeWidth={1.5} className="mr-3 h-4 w-4 opacity-70" />
                  <span className="font-normal text-[13px]">Sign Out</span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
      <div className="flex items-center space-x-2">
        <Link
            href="/login"
            className="hidden sm:block px-4 py-2 text-sm font-normal text-gray-600 hover:text-green-700 transition-colors"
        >
          Login/Signup
        </Link>
        <Link
            href="/register-business"
            className="px-5 py-2.5 text-sm font-normal text-white bg-green-700 rounded-lg hover:bg-green-800 transition-all shadow-sm hover:shadow-md"
        >
          Register Business
        </Link>
      </div>
  );
}
