'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut } from 'lucide-react';

// This component will handle the display of the auth state
export default function AuthButton({ user }: { user: any | null }) {
  const getInitials = (name: string) => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return nameParts[0][0] + nameParts[1][0];
    }
    return name[0];
  };

  // Use first_name if available, otherwise fall back to username, then email
  const firstName = user?.first_name || user?.username?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const displayName = user?.username || user?.email;

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
            <div className="flex items-center justify-center h-8 w-8 bg-green-700 text-white rounded-full font-bold text-xs">
              {getInitials(firstName || displayName).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {firstName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white" align="end">
          <div className="px-2 py-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {displayName}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action="/auth/signout" method="post" className="w-full">
            <button type="submit" className="w-full">
              <DropdownMenuItem className="flex items-center text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Link href="/login" className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-green-700">
        Login/Signup
      </Link>
      <Link
        href="/signup"
        className="px-5 py-2.5 text-sm text-white bg-green-700 rounded-lg hover:bg-green-800 transition-shadow shadow-md hover:shadow-lg"
      >
        Register Business
      </Link>
    </>
  );
}
