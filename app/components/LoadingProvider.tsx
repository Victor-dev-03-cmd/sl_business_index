'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading time to 1 second (1000ms)
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // This effect can be used to trigger the loader on subsequent page navigations if needed.
    // Currently, it only runs on the initial load.
  }, [pathname]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {isLoading ? <LoadingScreen /> : children}
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-white text-brand-dark">
      {/* Replace SVG with animated text */}
      <h1 className="text-6xl font-bold tracking-widest animate-pulse">
        SLBI
      </h1>
    </div>
  );
}