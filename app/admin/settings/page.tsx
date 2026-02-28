'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck,
  Palette,
  Save,
  RotateCcw,
  Layout,
  Settings,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    theme_primary_color: '#059669',
    theme_accent_color: '#10b981',
  });
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
    fetchSettings();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'ceo') {
      router.push('/');
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setSettings({
        theme_primary_color: data.theme_primary_color,
        theme_accent_color: data.theme_accent_color,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update(settings)
      .eq('id', 1);

    if (!error) {
      alert('Settings updated successfully! Changes are now live island-wide.');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setSettings({
      theme_primary_color: '#059669',
      theme_accent_color: '#10b981',
    });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ChevronLeft size={20} className="text-gray-400" />
            </Link>
            <div className="w-10 h-10 bg-emerald-100 rounded-[8px] flex items-center justify-center text-emerald-700">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-lg font-normal text-gray-900 tracking-tight">System Settings</h1>
              <p className="text-[10px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">Live Theme & Global Config</p>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-[6px] text-sm font-normal hover:bg-emerald-700 shadow-lg shadow-emerald-900/10 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-emerald-100 text-emerald-700 rounded-[6px] text-sm font-normal shadow-sm">
              <Palette size={18} /> Appearance & Branding
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white hover:text-gray-600 rounded-[6px] text-sm font-normal transition-all">
              <Layout size={18} /> Layout Options
            </button>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-gray-100 rounded-[6px] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
                <Palette className="text-emerald-500" size={24} />
                <div>
                  <h2 className="text-lg font-normal text-gray-900">Live Theme Management</h2>
                  <p className="text-xs text-gray-400 font-normal mt-0.5">Customize the global colors of SL Business Index.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Primary Color */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-1">Primary Brand Color</label>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed">Used for main buttons, active states, and primary navigation elements.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings.theme_primary_color}
                      onChange={(e) => setSettings({ ...settings, theme_primary_color: e.target.value })}
                      className="w-16 h-16 rounded-[6px] cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                    />
                    <div className="flex-grow">
                      <input 
                        type="text" 
                        value={settings.theme_primary_color}
                        onChange={(e) => setSettings({ ...settings, theme_primary_color: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-[6px] font-mono text-xs text-gray-600 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-1">Accent/Secondary Color</label>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed">Used for badges, highlights, and secondary interactive components.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings.theme_accent_color}
                      onChange={(e) => setSettings({ ...settings, theme_accent_color: e.target.value })}
                      className="w-16 h-16 rounded-[6px] cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                    />
                    <div className="flex-grow">
                      <input 
                        type="text" 
                        value={settings.theme_accent_color}
                        onChange={(e) => setSettings({ ...settings, theme_accent_color: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-[6px] font-mono text-xs text-gray-600 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="mt-12 p-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-[6px]">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4 font-normal">Real-time Preview</p>
                <div className="flex flex-wrap gap-4">
                  <button className="px-6 py-2.5 rounded-[6px] text-white text-xs font-normal shadow-lg transition-all" style={{ backgroundColor: settings.theme_primary_color }}>
                    Primary Button
                  </button>
                  <button className="px-6 py-2.5 rounded-[6px] text-white text-xs font-normal shadow-lg transition-all" style={{ backgroundColor: settings.theme_accent_color }}>
                    Accent Badge
                  </button>
                  <div className="px-4 py-2 border rounded-[6px] text-xs font-normal transition-all" style={{ borderColor: settings.theme_primary_color, color: settings.theme_primary_color }}>
                    Outline State
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50 flex justify-end">
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 font-normal transition-all"
                >
                  <RotateCcw size={14} /> Reset to Default Emerald
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
