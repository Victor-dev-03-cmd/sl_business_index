'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings/general');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
       <div className="h-8 w-8 border-4 border-brand-dark border-t-transparent animate-spin rounded-full mb-4" />
       <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading Settings Panel...</p>
    </div>
  );
}
