"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Palette, Save, Type, MousePointer2 } from "lucide-react";

interface SiteSettings {
  id: number;
  button_border_radius: number;
}

export default function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["site-settings", "appearance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, button_border_radius")
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
        .update({ button_border_radius: newSettings.button_border_radius })
        .eq("id", 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["site-settings", "appearance"],
      });
      queryClient.invalidateQueries({ queryKey: ["site-settings", "vars"] });
      toast.success("Appearance settings saved successfully");
    },
    onError: () => {
      toast.error("Error saving appearance settings");
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading || !localSettings)
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Palette className="h-6 w-6 text-brand-blue shrink-0" /> Appearance
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure global typography and UI component styles.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
          ) : (
            <Save size={16} />
          )}
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Read-only typography identity — site-wide font is managed by the design system. */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Type size={14} /> Brand Typography
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-2">
          <p className="text-sm font-bold text-gray-900">Inter — SL Business Index</p>
          <p className="text-2xl font-medium tracking-tight text-gray-900">Discover businesses with confidence.</p>
          <p className="text-sm text-gray-500">Inter is used throughout the public website, Admin Panel and Vendor Portal. Tamil and Sinhala use dedicated readable fallback fonts. Typography is centrally controlled for consistent branding.</p>
        </div>
      </section>

      {/* Component Styles */}
      <section className="space-y-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <MousePointer2 size={14} /> UI Components
        </h2>
        <div className="bg-gray-50/30 p-4 md:p-6 rounded-xl border border-gray-100 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
              <div>
                <label className="text-sm font-bold text-gray-700 block">
                  Button Border Radius
                </label>
                <p className="text-xs text-gray-500 font-normal mt-1">
                  Sets the roundness for buttons and interactive elements across
                  the site.
                </p>
              </div>
              <span className="text-brand-blue font-bold text-sm bg-brand-blue/10 px-3 py-1 rounded-full self-start sm:self-auto">
                {localSettings.button_border_radius || 6}px
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="range"
                min="0"
                max="30"
                value={localSettings.button_border_radius || 6}
                onChange={(e) =>
                  setLocalSettings((s) =>
                    s
                      ? { ...s, button_border_radius: parseInt(e.target.value) }
                      : null,
                  )
                }
                className="w-full sm:flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <div className="shrink-0 flex justify-center sm:w-32">
                <button
                  style={{
                    borderRadius: `${localSettings.button_border_radius || 6}px`,
                  }}
                  className="px-6 py-2 bg-brand-dark text-white text-sm font-bold transition-all hover:bg-brand-blue pointer-events-none"
                >
                  Preview Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
