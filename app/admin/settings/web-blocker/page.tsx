"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShieldAlert,
  Save,
  Lock,
  Globe,
  Plus,
  X,
  ShieldCheck,
} from "lucide-react";

interface SiteSettings {
  id: number;
  spam_protection_enabled: boolean;
  ip_blocking_enabled: boolean;
  blocked_ips: string[];
}

export default function WebBlockerSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const [newIp, setNewIp] = useState("");

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["site-settings", "web-blocker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, spam_protection_enabled, ip_blocking_enabled, blocked_ips")
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
      queryClient.invalidateQueries({
        queryKey: ["site-settings", "web-blocker"],
      });
      toast.success("Security settings saved successfully");
    },
    onError: () => {
      toast.error("Error saving security settings");
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  const addIp = () => {
    if (!newIp || !localSettings) return;
    if (localSettings.blocked_ips.includes(newIp)) return;
    setLocalSettings({
      ...localSettings,
      blocked_ips: [...localSettings.blocked_ips, newIp],
    });
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      blocked_ips: localSettings.blocked_ips.filter((i) => i !== ip),
    });
  };

  if (loading)
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-normal text-gray-900 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" /> Web
            Blocker & Security
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure spam protection and IP-level access controls.
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

      <div className="grid gap-8">
        {/* Automated Protection */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck size={14} /> Automated Defense
          </h2>
          <div className="bg-gray-50/30 rounded-xl border border-gray-100 divide-y divide-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-50 text-red-600 shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Spam Protection
                  </p>
                  <p className="text-xs text-gray-500 font-normal">
                    Enable AI-driven analysis for reviews and messages to block
                    spam patterns.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalSettings((s) =>
                    s
                      ? {
                          ...s,
                          spam_protection_enabled: !s.spam_protection_enabled,
                        }
                      : null,
                  )
                }
                className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${localSettings?.spam_protection_enabled ? "bg-red-600" : "bg-gray-200"}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings?.spam_protection_enabled ? "right-1" : "left-1"}`}
                />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gray-100 text-gray-600 shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    IP-Level Blocking
                  </p>
                  <p className="text-xs text-gray-500 font-normal">
                    Restrict entire IP addresses from accessing any part of the
                    platform.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalSettings((s) =>
                    s
                      ? { ...s, ip_blocking_enabled: !s.ip_blocking_enabled }
                      : null,
                  )
                }
                className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${localSettings?.ip_blocking_enabled ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings?.ip_blocking_enabled ? "right-1" : "left-1"}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* IP Blocklist */}
        {localSettings?.ip_blocking_enabled && (
          <section className="space-y-6 animate-in slide-in-from-top-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Lock size={14} /> Blacklisted IP Addresses
            </h2>
            <div className="bg-gray-50/30 p-6 rounded-xl border border-gray-100 space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-[6px] focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-mono"
                />
                <button
                  onClick={addIp}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-[6px] hover:bg-black transition-all text-sm font-bold"
                >
                  <Plus size={16} /> Block IP
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {localSettings.blocked_ips.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-4 col-span-full text-center">
                    No IP addresses blocked yet.
                  </p>
                ) : (
                  localSettings.blocked_ips.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-[6px] shadow-sm"
                    >
                      <span className="text-sm font-mono text-gray-700">
                        {ip}
                      </span>
                      <button
                        onClick={() => removeIp(ip)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
