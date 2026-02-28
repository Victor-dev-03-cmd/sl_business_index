'use client';

import { usePathname } from 'next/navigation';

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show Footer on the nearby page, login, or signup
  if (pathname === '/nearby' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return <>{children}</>;
}
