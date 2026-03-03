'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ThemeSettings = {
  theme_primary_color: string;
  theme_accent_color: string;
};

type ThemeContextType = {
  settings: ThemeSettings;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>({
    theme_primary_color: '#059669', // Emerald 600
    theme_accent_color: '#10b981',  // Emerald 500
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Force Light Mode: Remove any dark class and set theme to light
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
    
    // Initial fetch for site settings
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('theme_primary_color, theme_accent_color')
          .eq('id', 1)
          .single();

        if (data) {
          setSettings(data);
          updateCSSVariables(data);
        }
      } catch (err) {
        console.error('Error fetching theme settings:', err);
      }
    };

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' },
        (payload) => {
          const newSettings = payload.new as ThemeSettings;
          setSettings(newSettings);
          updateCSSVariables(newSettings);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleDarkMode = () => {
    // Dark mode disabled
    console.log("Dark mode is disabled");
  };

  const updateCSSVariables = (theme: ThemeSettings) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', theme.theme_primary_color);
      root.style.setProperty('--accent-color', theme.theme_accent_color);
    }
  };

  return (
    <ThemeContext.Provider value={{ settings, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
