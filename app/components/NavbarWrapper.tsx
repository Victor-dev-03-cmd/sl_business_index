'use client';

import { usePathname } from 'next/navigation';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show Navbar on specific pages or admin routes
  if (
    pathname === '/nearby' || 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return <>{children}</>;
}
