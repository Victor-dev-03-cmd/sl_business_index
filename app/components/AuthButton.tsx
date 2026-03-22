"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./SessionContext"; // Import the session hook
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Briefcase,
} from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import { Skeleton } from "@/components/ui/skeleton";

// The user prop is now the single source of truth, passed from Navbar.
interface AuthUser {
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  hasBusiness?: boolean;
  verification_status?: string;
}

export default function AuthButton({ user }: { user?: AuthUser | null }) {
  const router = useRouter();
  const { refreshSession } = useSession(); // Get the refresh function

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await refreshSession(); // Manually trigger a session refresh
    router.push("/");
  };

  if (user === undefined) {
    // Still loading from Navbar
    return <Skeleton className="h-10 w-24 rounded-md" />;
  }

  if (user) {
    const displayName = user.full_name || user.username || user.email || "User";
    const isAdminOrCeo = user.role === "admin" || user.role === "ceo";
    const isVendor = user.role === "vendor" || user.hasBusiness;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="avatar flex items-center justify-center h-10 w-10 bg-brand-dark text-white rounded-full font-normal text-sm focus:outline-none hover:bg-brand-blue transition-all border-2 border-transparent hover:border-brand-sand shadow-sm uppercase overflow-hidden">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={displayName}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName[0]
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[calc(100vw-2rem)] max-w-[280px] sm:w-64 bg-white p-2 shadow-2xl border border-gray-100 rounded-[6px] z-[200]"
          align="center"
          sideOffset={8}
          collisionPadding={12}
        >
          <div className="px-3 py-3 mb-2 bg-gray-50/50 rounded-[6px]">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">
              Signed in as
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              {user.verification_status === "verified" && (
                <VerifiedBadge size={10} />
              )}
            </div>
            <div className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-brand-sand/30 text-brand-text text-[10px] uppercase">
              {user.role || "customer"}
            </div>
          </div>

          <DropdownMenuSeparator />

          {isAdminOrCeo && (
            <DropdownMenuItem asChild className="cursor-pointer py-2.5">
              <Link
                href="/admin/dashboard"
                className="flex items-center w-full"
              >
                <LayoutDashboard className="mr-3 h-4 w-4 opacity-70" />
                <span>Admin Control Center</span>
              </Link>
            </DropdownMenuItem>
          )}

          {isVendor && (
            <DropdownMenuItem asChild className="cursor-pointer py-2.5">
              <Link
                href="/vendor/dashboard"
                className="flex items-center w-full"
              >
                <Briefcase className="mr-3 h-4 w-4 opacity-70" />
                <span>Vendor Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild className="cursor-pointer py-2.5">
            <Link
              href={isAdminOrCeo ? "/admin/settings" : "/vendor/settings"}
              className="flex items-center w-full"
            >
              <UserIcon className="mr-3 h-4 w-4 opacity-70" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <button onClick={handleSignOut} className="w-full">
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
    <Link
      href="/login"
      className="px-6 py-2.5 text-sm text-white bg-brand-dark rounded-[6px] hover:bg-brand-blue transition-colors"
    >
      Sign In
    </Link>
  );
}
