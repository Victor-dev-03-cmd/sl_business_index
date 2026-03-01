'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Settings, 
  Palette, 
  Globe, 
  Save, 
  RotateCcw,
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
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update(settings)
      .eq('id', 1);

    if (error) {
      alert('Error saving settings');
    } else {
      alert('Settings saved successfully');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950 transition-colors">
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 dark:text-white">Site Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure global appearance and platform identity.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-sm font-normal disabled:opacity-50 shadow-sm"
          >
            {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 dark:border-gray-800 pb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Globe size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-normal text-gray-900 dark:text-white">General Information</h2>
            </div>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Type size={14} className="text-gray-400" /> Site Name
                </label>
                <input 
                  type="text" 
                  value={settings?.site_name || ''}
                  onChange={(e) => setSettings(s => s ? {...s, site_name: e.target.value} : null)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Layout size={14} className="text-gray-400" /> Site Description
                </label>
                <textarea 
                  rows={3}
                  value={settings?.site_description || ''}
                  onChange={(e) => setSettings(s => s ? {...s, site_description: e.target.value} : null)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 dark:border-gray-800 pb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <Palette size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-normal text-gray-900 dark:text-white">Appearance & Theme</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-normal text-gray-600 dark:text-gray-400 block">Primary Theme Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={settings?.theme_primary_color || '#10b981'}
                    onChange={(e) => setSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                    className="h-12 w-20 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={settings?.theme_primary_color || ''}
                      onChange={(e) => setSettings(s => s ? {...s, theme_primary_color: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg font-mono text-xs uppercase dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-normal text-gray-600 dark:text-gray-400 block">Accent Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={settings?.theme_accent_color || '#3b82f6'}
                    onChange={(e) => setSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                    className="h-12 w-20 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={settings?.theme_accent_color || ''}
                      onChange={(e) => setSettings(s => s ? {...s, theme_accent_color: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg font-mono text-xs uppercase dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assets Settings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 dark:border-gray-800 pb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <ImageIcon size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-normal text-gray-900 dark:text-white">Brand Assets</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-normal text-gray-600 dark:text-gray-400">Logo URL</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={settings?.logo_url || ''}
                  onChange={(e) => setSettings(s => s ? {...s, logo_url: e.target.value} : null)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm dark:text-white"
                />
                <div className="h-11 w-11 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="Site Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <ImageIcon size={18} className="text-gray-300 dark:text-gray-600" />
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
