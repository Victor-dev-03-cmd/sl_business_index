'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

// Convert stale blue values saved before the evergreen rebrand into the
// current palette. Other valid custom colors from the admin stay editable.
const BRAND_DEFAULTS = {
  dark: "#1B3430",
  emerald: "#2F765C",
  gold: "#C59A5E",
  goldLight: "#E1B579",
  sand: "#E8C58C",
  text: "#24483D",
};

const OLD_THEME_COLORS: Record<string, string> = {
  "#053765": BRAND_DEFAULTS.dark,
  "#2a7db4": BRAND_DEFAULTS.emerald,
  "#124272": BRAND_DEFAULTS.text,
};

function themeColor(value: string | null | undefined, fallback: string) {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return fallback;
  const hex = value.toLowerCase();
  if (OLD_THEME_COLORS[hex]) return OLD_THEME_COLORS[hex];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Prevent legacy blue/indigo theme settings from repainting green buttons.
  if (b > r * 1.25 && b > g * 1.13 && b > 80) return fallback;
  return value;
}

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

    // Preserve intentional custom radius, but migrate the old 6px default.
    if (typeof settings.button_border_radius === "number" &&
        Number.isFinite(settings.button_border_radius)) {
      const radius = settings.button_border_radius === 6
        ? 12
        : Math.max(0, Math.min(32, settings.button_border_radius));
      root.style.setProperty("--btn-radius", radius + "px");
    }

    root.style.setProperty("--brand-dark", themeColor(settings.theme_dark_color, BRAND_DEFAULTS.dark));
    // The database key is historical: blue now represents the emerald accent.
    root.style.setProperty("--brand-blue", themeColor(settings.theme_blue_color, BRAND_DEFAULTS.emerald));
    root.style.setProperty("--brand-gold", themeColor(settings.theme_gold_color, BRAND_DEFAULTS.gold));
    root.style.setProperty("--brand-gold-light", themeColor(settings.theme_gold_light_color, BRAND_DEFAULTS.goldLight));
    root.style.setProperty("--brand-sand", themeColor(settings.theme_sand_color, BRAND_DEFAULTS.sand));
    root.style.setProperty("--brand-text", themeColor(settings.theme_text_color, BRAND_DEFAULTS.text));
  }, [settings]);

  return null;
}
