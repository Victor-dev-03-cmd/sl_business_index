'use client';

import { usePathname } from 'next/navigation';

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show Footer on the nearby page which is a full-screen app experience
  if (pathname === '/nearby') {
    return null;
  }

  return <>{children}</>;
}
