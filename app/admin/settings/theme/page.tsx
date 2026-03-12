'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette, Save, Pipette } from 'lucide-react';

interface SiteSettings {
  id: number;
  theme_primary_color: string;
  theme_accent_color: string;
}

export default function ThemeSettingsPage() {
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
      setLocalSettings({
        id: settings.id,
        theme_primary_color: settings.theme_primary_color,
        theme_accent_color: settings.theme_accent_color,
      });
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
      alert('Theme settings saved successfully');
    },
    onError: () => {
      alert('Error saving settings');
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-600" /> Theme Styling
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Manage the core color palette and visual identity.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {saveMutation.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save size={16} />}
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 block tracking-tight">Primary Theme Color</label>
          <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[6px] border border-gray-100">
            <div className="relative">
              <input 
                type="color" 
                value={localSettings?.theme_primary_color || '#053765'}
                onChange={(e) => setLocalSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                className="h-16 w-16 rounded-[6px] border-0 cursor-pointer p-0 bg-transparent ring-1 ring-gray-300 ring-offset-2"
              />
              <Pipette className="absolute -top-1 -right-1 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex-1">
              <input 
                type="text" 
                value={localSettings?.theme_primary_color || ''}
                onChange={(e) => setLocalSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-[6px] font-mono text-sm uppercase tracking-widest focus:ring-1 focus:ring-brand-dark outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 block tracking-tight">Accent Brand Color</label>
          <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[6px] border border-gray-100">
            <div className="relative">
              <input 
                type="color" 
                value={localSettings?.theme_accent_color || '#b4863b'}
                onChange={(e) => setLocalSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                className="h-16 w-16 rounded-[6px] border-0 cursor-pointer p-0 bg-transparent ring-1 ring-gray-300 ring-offset-2"
              />
              <Pipette className="absolute -top-1 -right-1 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex-1">
              <input 
                type="text" 
                value={localSettings?.theme_accent_color || ''}
                onChange={(e) => setLocalSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-[6px] font-mono text-sm uppercase tracking-widest focus:ring-1 focus:ring-brand-dark outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
