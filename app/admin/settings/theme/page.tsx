"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Palette,
  Save,
  RefreshCcw,
  MousePointer2,
  Layout,
  Type,
} from "lucide-react";

interface SiteSettings {
  id: number;
  theme_dark_color: string;
  theme_blue_color: string;
  theme_gold_color: string;
  theme_gold_light_color: string;
  theme_sand_color: string;
  theme_text_color: string;
}

const DEFAULT_COLORS = {
  theme_dark_color: "#053765",
  theme_blue_color: "#2a7db4",
  theme_gold_color: "#b4863b",
  theme_gold_light_color: "#c09a54",
  theme_sand_color: "#dfb85d",
  theme_text_color: "#124272",
};

export default function ThemeSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["site-settings", "theme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "id, theme_dark_color, theme_blue_color, theme_gold_color, theme_gold_light_color, theme_sand_color, theme_text_color",
        )
        .eq("id", 1)
        .single();

      if (error) throw error;
      return data as SiteSettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: SiteSettings) => {
      const { error } = await supabase
        .from("site_settings")
        .update(newSettings)
        .eq("id", 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "theme"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings", "vars"] });
      toast.success("Theme colors saved successfully");
    },
    onError: () => {
      toast.error("Error saving theme colors");
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  const resetToDefault = () => {
    if (confirm("Are you sure you want to reset all colors to default?")) {
      setLocalSettings((s) => (s ? { ...s, ...DEFAULT_COLORS } : null));
    }
  };

  if (loading)
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Palette className="h-6 w-6 text-brand-blue shrink-0" /> Theme
            Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize global brand colors for buttons, icons, and text.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={resetToDefault}
            className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[6px] transition-all text-sm font-bold"
          >
            <RefreshCcw size={16} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
            ) : (
              <Save size={16} />
            )}
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Core Brand Colors */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Layout size={14} /> Brand Identity
          </h2>
          <div className="bg-gray-50/30 p-4 md:p-6 rounded-xl border border-gray-100 space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Primary Dark Color
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_dark_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_dark_color || "#053765"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_dark_color: e.target.value } : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_dark_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_dark_color: e.target.value } : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Brand Blue Color
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_blue_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_blue_color || "#2a7db4"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_blue_color: e.target.value } : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_blue_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_blue_color: e.target.value } : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Main Text Color
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_text_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_text_color || "#124272"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_text_color: e.target.value } : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_text_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_text_color: e.target.value } : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Accent Colors */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <MousePointer2 size={14} /> Accent & Gold
          </h2>
          <div className="bg-gray-50/30 p-6 rounded-xl border border-gray-100 space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Primary Gold Color
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_gold_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_gold_color || "#b4863b"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_gold_color: e.target.value } : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_gold_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_gold_color: e.target.value } : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Gold Light Color
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_gold_light_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_gold_light_color || "#c09a54"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s
                        ? { ...s, theme_gold_light_color: e.target.value }
                        : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_gold_light_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s
                        ? { ...s, theme_gold_light_color: e.target.value }
                        : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex justify-between">
                Sand Color (Accents)
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  {localSettings?.theme_sand_color}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings?.theme_sand_color || "#dfb85d"}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_sand_color: e.target.value } : null,
                    )
                  }
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={localSettings?.theme_sand_color || ""}
                  onChange={(e) =>
                    setLocalSettings((s) =>
                      s ? { ...s, theme_sand_color: e.target.value } : null,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-[6px] text-sm font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Live Preview Section */}
      <section className="space-y-6 mt-12">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <RefreshCcw size={14} /> Live Component Preview
        </h2>
        <div className="bg-white p-12 rounded-xl border border-gray-300 shadow-inner flex flex-wrap items-center justify-center gap-8">
          <button
            style={{ backgroundColor: localSettings?.theme_dark_color }}
            className="px-8 py-3 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:brightness-110"
          >
            Primary Action
          </button>
          <button
            style={{ backgroundColor: localSettings?.theme_blue_color }}
            className="px-8 py-3 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:brightness-110"
          >
            Blue Variant
          </button>
          <button
            style={{ backgroundColor: localSettings?.theme_gold_color }}
            className="px-8 py-3 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:brightness-110"
          >
            Accent Gold
          </button>
          <div className="flex items-center gap-3">
            <Palette
              size={24}
              style={{ color: localSettings?.theme_blue_color }}
            />
            <span
              style={{ color: localSettings?.theme_text_color }}
              className="font-bold text-lg"
            >
              Sample Branding Text
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
