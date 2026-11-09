'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

export default function DynamicAppearance() {
  const { data: settings } = useQuery({
    queryKey: ['site-settings', 'vars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select(`
          primary_font, 
          button_border_radius,
          theme_dark_color,
          theme_blue_color,
          theme_gold_color,
          theme_gold_light_color,
          theme_sand_color,
          theme_text_color
        `)
        .eq('id', 1)
        .single();
      if (error) return null;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    
    // Typography is defined once in the root layout using Inter + Unicode fallbacks.
    // Do not override it from legacy primary_font values saved in site_settings.

    // Apply button border radius via CSS variable
    if (settings.button_border_radius !== undefined) {
      root.style.setProperty('--btn-radius', `${settings.button_border_radius}px`);
    }

    // Apply Theme Colors
    if (settings.theme_dark_color) root.style.setProperty('--brand-dark', settings.theme_dark_color);
    if (settings.theme_blue_color) root.style.setProperty('--brand-blue', settings.theme_blue_color);
    if (settings.theme_gold_color) root.style.setProperty('--brand-gold', settings.theme_gold_color);
    if (settings.theme_gold_light_color) root.style.setProperty('--brand-gold-light', settings.theme_gold_light_color);
    if (settings.theme_sand_color) root.style.setProperty('--brand-sand', settings.theme_sand_color);
    if (settings.theme_text_color) root.style.setProperty('--brand-text', settings.theme_text_color);
  }, [settings]);

  return null;
}
