'use client';

import { usePathname } from 'next/navigation';

export default function AnnouncementWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show AnnouncementBar on specific pages or admin routes
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
