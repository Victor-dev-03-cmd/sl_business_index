'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Save, Type, Layout } from 'lucide-react';

interface SiteSettings {
  id: number;
  site_name: string;
  site_description: string;
}

export default function GeneralSettingsPage() {
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
        site_name: settings.site_name,
        site_description: settings.site_description,
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
      alert('General settings saved successfully');
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
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" /> General Information
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Manage basic platform details and search identity.</p>
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

      <div className="grid gap-8">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 tracking-tight">
            <Type size={14} className="text-gray-400" /> Platform Name
          </label>
          <input 
            type="text" 
            value={localSettings?.site_name || ''}
            onChange={(e) => setLocalSettings(s => s ? {...s, site_name: e.target.value} : null)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all font-normal text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 tracking-tight">
            <Layout size={14} className="text-gray-400" /> Meta Description
          </label>
          <textarea 
            rows={5}
            value={localSettings?.site_description || ''}
            onChange={(e) => setLocalSettings(s => s ? {...s, site_description: e.target.value} : null)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all font-normal text-sm resize-none"
            placeholder="Briefly describe the platform for search engines..."
          />
        </div>
      </div>
    </div>
  );
}
