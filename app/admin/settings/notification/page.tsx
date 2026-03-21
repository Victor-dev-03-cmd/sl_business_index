'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Bell, 
  Save, 
  Mail, 
  Smartphone,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface SiteSettings {
  id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  admin_email: string;
}

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ['site-settings', 'notification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, email_notifications, push_notifications, admin_email')
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
      queryClient.invalidateQueries({ queryKey: ['site-settings', 'notification'] });
      toast.success('Notification settings saved successfully');
    },
    onError: () => {
      toast.error('Error saving notification settings');
    },
  });

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  if (loading) return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Bell className="h-6 w-6 text-brand-blue" /> Notification Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage global email, push alerts, and administrative routing.</p>
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

      <div className="grid gap-8">
        {/* Channel Management */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Smartphone size={14} /> Alert Channels
          </h2>
          <div className="bg-gray-50/30 rounded-xl border border-gray-100 divide-y divide-gray-100">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Email Notifications</p>
                  <p className="text-xs text-gray-500 font-normal">Send automated emails for registrations, leads, and status changes.</p>
                </div>
              </div>
              <button 
                onClick={() => setLocalSettings(s => s ? {...s, email_notifications: !s.email_notifications} : null)}
                className={`w-14 h-7 rounded-full transition-colors relative ${localSettings?.email_notifications ? 'bg-brand-blue' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings?.email_notifications ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Push Notifications</p>
                  <p className="text-xs text-gray-500 font-normal">Enable real-time browser notifications for critical system events.</p>
                </div>
              </div>
              <button 
                onClick={() => setLocalSettings(s => s ? {...s, push_notifications: !s.push_notifications} : null)}
                className={`w-14 h-7 rounded-full transition-colors relative ${localSettings?.push_notifications ? 'bg-brand-blue' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings?.push_notifications ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Administrative Routing */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck size={14} /> Administrative Routing
          </h2>
          <div className="bg-gray-50/30 p-6 rounded-xl border border-gray-100 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                Primary Admin Email
                <AlertCircle size={14} className="text-gray-400" />
              </label>
              <input 
                type="email" 
                value={localSettings?.admin_email || ''}
                onChange={(e) => setLocalSettings(s => s ? {...s, admin_email: e.target.value} : null)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-[6px] focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm"
                placeholder="admin@slbusiness.com"
              />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">All system alerts and backup logs will be sent to this address.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
