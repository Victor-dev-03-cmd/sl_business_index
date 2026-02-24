'use client';

import { usePathname } from 'next/navigation';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show Navbar on the nearby page
  if (pathname === '/nearby') {
    return null;
  }

  return <>{children}</>;
}
