'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Save, TextCursorInput, Settings2 } from 'lucide-react';

interface SiteSettings {
  id: number;
  logo_url: string;
  logo_text: string;
  logo_width: number;
  logo_height: number;
}

export default function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
        logo_url: settings.logo_url,
        logo_text: settings.logo_text,
        logo_width: settings.logo_width,
        logo_height: settings.logo_height,
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
      alert('Appearance settings saved successfully');
    },
    onError: () => {
      alert('Error saving settings');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      setLocalSettings(s => s ? { ...s, logo_url: publicUrl } : null);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-amber-600" /> Brand Assets
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Customize platform logo and brand imagery.</p>
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

      <div className="grid gap-10">
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 tracking-tight">
            <TextCursorInput size={14} className="text-gray-400" /> Logo Text
          </label>
          <input 
            type="text" 
            value={localSettings?.logo_text || ''}
            onChange={(e) => setLocalSettings(s => s ? {...s, logo_text: e.target.value} : null)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all font-normal text-sm"
            placeholder="e.g. SL Business"
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 tracking-tight">
             <Settings2 size={14} className="text-gray-400" /> Brand Identity
          </label>
          <div className="flex flex-col md:flex-row items-center gap-10 bg-gray-50/50 p-8 rounded-[6px] border border-gray-100">
            <div className="relative group shrink-0">
              <div className="h-32 w-64 rounded-[6px] bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-dark shadow-sm">
                {localSettings?.logo_url ? (
                  <img 
                    src={localSettings.logo_url} 
                    alt="Logo Preview" 
                    style={{ 
                      width: `${localSettings.logo_width}px`, 
                      height: `${localSettings.logo_height}px` 
                    }}
                    className="object-contain" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon size={32} />
                    <span className="text-xs mt-2">Drop logo here</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-brand-dark border-t-transparent animate-spin rounded-full" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-widest font-bold">Click to replace logo</p>
            </div>

            <div className="flex-1 space-y-6 w-full max-w-sm">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-900 tracking-tight">
                  <span>Logo Width</span>
                  <span className="text-brand-dark">{localSettings?.logo_width || 150}px</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="400" 
                  value={localSettings?.logo_width || 150}
                  onChange={(e) => setLocalSettings(s => s ? {...s, logo_width: parseInt(e.target.value)} : null)}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-900 tracking-tight">
                  <span>Logo Height</span>
                  <span className="text-brand-dark">{localSettings?.logo_height || 50}px</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="150" 
                  value={localSettings?.logo_height || 50}
                  onChange={(e) => setLocalSettings(s => s ? {...s, logo_height: parseInt(e.target.value)} : null)}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
