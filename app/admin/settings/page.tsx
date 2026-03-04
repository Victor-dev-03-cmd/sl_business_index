'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Palette, 
  Globe, 
  Save, 
  Layout, 
  Type, 
  ImageIcon
} from 'lucide-react';

interface SiteSettings {
  id: number;
  theme_primary_color: string;
  theme_accent_color: string;
  site_name: string;
  site_description: string;
  logo_url: string;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
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
        .from('site_settings')
        .update(newSettings)
        .eq('id', 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      alert('Settings saved successfully');
    },
    onError: () => {
      alert('Error saving settings');
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  const saving = saveMutation.isPending;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50  transition-colors">
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 ">Site Settings</h1>
            <p className="text-sm text-gray-500  mt-1">Configure global appearance and platform identity.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-normal disabled:opacity-50 shadow-sm"
          >
            {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-[6px]" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white  rounded-[6px] border border-gray-300  p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-300  pb-4">
              <div className="p-2 bg-blue-50  rounded-[6px]">
                <Globe size={18} className="text-blue-600 " />
              </div>
              <h2 className="text-lg font-normal text-gray-900 ">General Information</h2>
            </div>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-normal text-gray-600  flex items-center gap-2">
                  <Type size={14} className="text-gray-400" /> Site Name
                </label>
                <input 
                  type="text" 
                  value={localSettings?.site_name || ''}
                  onChange={(e) => setLocalSettings(s => s ? {...s, site_name: e.target.value} : null)}
                  className="w-full px-4 py-2.5 bg-gray-50  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm "
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-normal text-gray-600  flex items-center gap-2">
                  <Layout size={14} className="text-gray-400" /> Site Description
                </label>
                <textarea 
                  rows={3}
                  value={localSettings?.site_description || ''}
                  onChange={(e) => setLocalSettings(s => s ? {...s, site_description: e.target.value} : null)}
                  className="w-full px-4 py-2.5 bg-gray-50  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm  resize-none"
                />
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white  rounded-[6px] border border-gray-300  p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-300  pb-4">
              <div className="p-2 bg-brand-sand/20  rounded-[6px]">
                <Palette size={18} className="text-brand-dark " />
              </div>
              <h2 className="text-lg font-normal text-gray-900 ">Appearance & Theme</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-normal text-gray-600  block">Primary Theme Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={localSettings?.theme_primary_color || '#053765'}
                    onChange={(e) => setLocalSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                    className="h-12 w-20 rounded-[6px] border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={localSettings?.theme_primary_color || ''}
                      onChange={(e) => setLocalSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-50  border border-gray-300  rounded-[6px] font-mono text-xs uppercase "
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-normal text-gray-600  block">Accent Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={localSettings?.theme_accent_color || '#b4863b'}
                    onChange={(e) => setLocalSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                    className="h-12 w-20 rounded-[6px] border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={localSettings?.theme_accent_color || ''}
                      onChange={(e) => setLocalSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-50  border border-gray-300  rounded-[6px] font-mono text-xs uppercase "
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assets Settings */}
          <div className="bg-white  rounded-[6px] border border-gray-300  p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-300  pb-4">
              <div className="p-2 bg-amber-50  rounded-[6px]">
                <ImageIcon size={18} className="text-amber-600 " />
              </div>
              <h2 className="text-lg font-normal text-gray-900 ">Brand Assets</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-normal text-gray-600 ">Logo URL</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={localSettings?.logo_url || ''}
                  onChange={(e) => setLocalSettings(s => s ? {...s, logo_url: e.target.value} : null)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-4 py-2.5 bg-gray-50  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm "
                />
                <div className="h-11 w-11 rounded-[6px] bg-gray-50  border border-gray-300  flex items-center justify-center overflow-hidden">
                  {localSettings?.logo_url ? (
                    <img src={localSettings.logo_url} alt="Site Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <ImageIcon size={18} className="text-gray-300 " />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
