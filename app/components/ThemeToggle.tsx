'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-2 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none"
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-blue-600" />
      )}
    </button>
  );
}
