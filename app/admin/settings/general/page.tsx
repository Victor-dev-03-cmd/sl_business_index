"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Globe,
  Save,
  Type,
  Layout,
  ImageIcon,
  Settings2,
  Hammer,
  AlertCircle,
} from "lucide-react";

interface SiteSettings {
  id: number;
  site_name: string;
  site_description: string;
  logo_url: string;
  logo_text: string;
  logo_width: number;
  logo_height: number;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["site-settings", "general"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
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
      // Remove id from the update payload
      const { id, ...updateData } = newSettings;

      const { error } = await supabase
        .from("site_settings")
        .update(updateData)
        .eq("id", 1);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both general and common site setting queries
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: any) => {
      console.error("Error saving settings:", error);
      toast.error(
        "Error saving settings: " + (error.message || "Unknown error"),
      );
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      // Keep it in a single "brand" folder but allow replacing the file
      const fileName = `site-logo.${fileExt}`;
      const filePath = `brand/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(filePath, file, {
          cacheControl: "0", // No cache during upload/testing
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("business-logos").getPublicUrl(filePath);

      // Add a timestamp to bypass browser cache
      const uniqueUrl = `${publicUrl}?t=${Date.now()}`;

      setLocalSettings((s) => (s ? { ...s, logo_url: uniqueUrl } : null));

      // Auto-save the logo URL to DB
      await supabase
        .from("site_settings")
        .update({ logo_url: uniqueUrl })
        .eq("id", 1);

      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(
        "Failed to upload logo: " + (error.message || "Unknown error"),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading)
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Globe className="h-6 w-6 text-brand-blue shrink-0" /> General
            Information
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage core site identity, brand assets, and platform status.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || isUploading}
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

      {/* Basic Identity */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Type size={14} /> Site Identity
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Site Name
              </label>
              <input
                type="text"
                value={localSettings?.site_name || ""}
                onChange={(e) =>
                  setLocalSettings((s) =>
                    s ? { ...s, site_name: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all text-sm"
                placeholder="e.g. SL Business Index"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Site Description
              </label>
              <textarea
                rows={4}
                value={localSettings?.site_description || ""}
                onChange={(e) =>
                  setLocalSettings((s) =>
                    s ? { ...s, site_description: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all text-sm resize-none"
                placeholder="Describe your platform for SEO..."
              />
            </div>
          </div>

          <div className="bg-gray-50/50 p-4 md:p-6 rounded-xl border border-dashed border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Search Preview
            </h3>
            <div className="space-y-1.5">
              <p className="text-[#1a0dab] text-xl font-normal hover:underline cursor-pointer truncate">
                {localSettings?.site_name || "Site Name"}
              </p>
              <p className="text-[#006621] text-sm truncate">
                https://slbusinessindex.com
              </p>
              <p className="text-[#545454] text-sm line-clamp-2 leading-snug">
                {localSettings?.site_description ||
                  "Add a site description to see how it appears in search results."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="space-y-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <ImageIcon size={14} /> Brand Assets
        </h2>
        <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-8 md:space-y-10">
          <div className="max-w-md space-y-2">
            <label className="text-sm font-bold text-gray-700">Logo Text</label>
            <p className="text-xs text-gray-400 mb-3">
              Fallback text when logo image is not available.
            </p>
            <input
              type="text"
              value={localSettings?.logo_text || ""}
              onChange={(e) =>
                setLocalSettings((s) =>
                  s ? { ...s, logo_text: e.target.value } : null,
                )
              }
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all text-sm font-bold tracking-tight"
            />
          </div>

          <div className="space-y-6">
            <label className="text-sm font-bold text-gray-700">
              Logo Configuration
            </label>
            <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-12">
              <div className="relative group shrink-0 w-full xl:w-auto">
                <div className="h-40 md:h-48 w-full xl:w-80 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-blue shadow-inner group-hover:bg-white">
                  {localSettings?.logo_url ? (
                    <img
                      src={localSettings.logo_url}
                      alt="Logo Preview"
                      style={{
                        width: `${localSettings.logo_width}px`,
                        height: `${localSettings.logo_height}px`,
                      }}
                      className="object-contain drop-shadow-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon size={48} strokeWidth={1} />
                      <span className="text-[10px] mt-3 font-bold uppercase tracking-[0.2em]">
                        Upload Brand Logo
                      </span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="h-8 w-8 border-2 border-brand-blue border-t-transparent animate-spin rounded-full" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-brand-dark text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                  Change Image
                </div>
              </div>

              <div className="flex-1 space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold text-gray-600">
                      <span className="uppercase tracking-[0.1em]">
                        Width Control
                      </span>
                      <span className="text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded">
                        {localSettings?.logo_width || 150}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      value={localSettings?.logo_width || 150}
                      onChange={(e) =>
                        setLocalSettings((s) =>
                          s
                            ? { ...s, logo_width: parseInt(e.target.value) }
                            : null,
                        )
                      }
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-dark"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                      <span>50px</span>
                      <span>400px</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold text-gray-600">
                      <span className="uppercase tracking-[0.1em]">
                        Height Control
                      </span>
                      <span className="text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded">
                        {localSettings?.logo_height || 50}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="150"
                      value={localSettings?.logo_height || 50}
                      onChange={(e) =>
                        setLocalSettings((s) =>
                          s
                            ? { ...s, logo_height: parseInt(e.target.value) }
                            : null,
                        )
                      }
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-dark"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                      <span>20px</span>
                      <span>150px</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-3">
                  <Settings2 className="h-5 w-5 text-brand-blue shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Adjust the dimensions to fit your site header perfectly.
                    Recommended ratio is 3:1.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Maintenance Mode */}
      <section className="space-y-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Hammer size={14} /> Platform Status
        </h2>
        <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 bg-gray-50 rounded-xl border border-gray-200 transition-all hover:bg-white hover:shadow-md group">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 md:p-4 rounded-xl transition-all shadow-sm shrink-0 ${localSettings?.maintenance_mode ? "bg-amber-500 text-white shadow-amber-200" : "bg-emerald-500 text-white shadow-emerald-200"}`}
              >
                {localSettings?.maintenance_mode ? (
                  <AlertCircle size={22} />
                ) : (
                  <Globe size={22} />
                )}
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">
                  Maintenance Mode
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Control public access to the entire platform.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setLocalSettings((s) =>
                  s ? { ...s, maintenance_mode: !s.maintenance_mode } : null,
                )
              }
              className={`w-16 h-8 rounded-full transition-all relative shadow-inner shrink-0 ${localSettings?.maintenance_mode ? "bg-brand-blue" : "bg-gray-300"}`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${localSettings?.maintenance_mode ? "right-1" : "left-1"}`}
              />
            </button>
          </div>

          {localSettings?.maintenance_mode && (
            <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Maintenance
                Message
              </label>
              <textarea
                rows={4}
                value={localSettings?.maintenance_message || ""}
                onChange={(e) =>
                  setLocalSettings((s) =>
                    s ? { ...s, maintenance_message: e.target.value } : null,
                  )
                }
                className="w-full px-6 py-4 bg-amber-50/30 border border-amber-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all text-sm leading-relaxed"
                placeholder="The site is currently under maintenance. We will be back shortly..."
              />
              <p className="text-[11px] text-amber-600 font-medium">
                This message will be displayed to all users except
                Administrators.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
