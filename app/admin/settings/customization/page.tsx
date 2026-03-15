'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wrench, 
  Save, 
  Code, 
  FileCode,
  Layout,
  AlertTriangle
} from 'lucide-react';

interface SiteSettings {
  id: number;
  custom_css: string;
  custom_js: string;
}

export default function CustomizationSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ['site-settings', 'customization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, custom_css, custom_js')
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
      queryClient.invalidateQueries({ queryKey: ['site-settings', 'customization'] });
      alert('Customization settings saved successfully');
    },
    onError: () => {
      alert('Error saving customization settings');
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading) return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Wrench className="h-6 w-6 text-brand-blue" /> Advanced Customization
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inject custom CSS and JavaScript to override platform defaults.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-8 py-2.5 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {saveMutation.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save size={16} />}
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-4 items-start">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-bold text-amber-900">Developer Mode Warning</p>
          <p className="text-xs text-amber-700 font-normal mt-1">Adding custom scripts or styles can break the platform UI. Ensure your code is thoroughly tested before saving.</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Custom CSS */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Code size={14} /> Global CSS Overrides
          </h2>
          <div className="bg-gray-50/30 p-6 rounded-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Layout size={14} className="text-gray-400" /> Custom Stylesheet
              </label>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Injected into Head</span>
            </div>
            <textarea 
              rows={10}
              value={localSettings?.custom_css || ''}
              onChange={(e) => setLocalSettings(s => s ? {...s, custom_css: e.target.value} : null)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-[6px] focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm font-mono"
              placeholder="/* .my-button { background: red !important; } */"
            />
          </div>
        </section>

        {/* Custom JS */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <FileCode size={14} /> Global JavaScript
          </h2>
          <div className="bg-gray-50/30 p-6 rounded-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Code size={14} className="text-gray-400" /> External Scripts
              </label>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Async Execution</span>
            </div>
            <textarea 
              rows={10}
              value={localSettings?.custom_js || ''}
              onChange={(e) => setLocalSettings(s => s ? {...s, custom_js: e.target.value} : null)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-[6px] focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm font-mono"
              placeholder="// console.log('Custom script active');"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
