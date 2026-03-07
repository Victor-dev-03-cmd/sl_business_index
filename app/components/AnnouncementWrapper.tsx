'use client';

import { usePathname } from 'next/navigation';

export default function AnnouncementWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show AnnouncementBar on specific pages, admin routes, or vendor routes
  if (
    pathname === '/nearby' || 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/vendor')
  ) {
    return null;
  }

  return <>{children}</>;
}
