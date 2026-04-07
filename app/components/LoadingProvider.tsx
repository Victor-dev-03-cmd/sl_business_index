'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Adjust timing to allow the typing animation to complete
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {isLoading ? <LoadingScreen /> : children}
    </Suspense>
  );
}

export function LoadingScreen() {
  const [isLegacy, setIsLegacy] = useState(false);
  const text = "Sri Lanka Business Index";

  useEffect(() => {
    // Check for older iOS/Safari (iOS 12.5.7 uses Version/12)
    const ua = navigator.userAgent;
    if (ua.includes('iPad') && ua.includes('Version/12')) {
      setIsLegacy(true);
    }
    // Also check for motion support or other features if needed
  }, []);

  if (isLegacy) {
    return (
      <div className="fixed inset-0 flex items-center justify-center min-h-[100dvh] w-full bg-white z-[9999]">
        <div className="flex flex-col items-center">
          <h1 className="text-6xl font-medium tracking-widest text-brand-dark mb-4">
            SLBI
          </h1>
          <p className="text-lg font-medium tracking-widest text-center px-4 text-gray-600">
            {text}
          </p>
          <div className="mt-8 w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.5 },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-[100dvh] w-full bg-white z-[9999]">
      <div className="flex flex-col items-center">
        <h1 className="text-8xl font-medium tracking-widest animate-pulse text-brand-dark">
          SLBI
        </h1>
        <motion.p
          className="text-xl sm:text-3xl font-medium tracking-widest text-center px-4 overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {text.split("").map((char, index) => (
            <motion.span key={index} variants={letterVariants}>
              {char}
            </motion.span>
          ))}
        </motion.p>
      </div>
    </div>
  );
}