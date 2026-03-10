'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Bell, Megaphone, Info, AlertCircle, Gift } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'promotion';
}

export default function GlobalAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Check if user already dismissed this specific announcement
        const dismissedId = localStorage.getItem(`dismissed_announcement_${data.id}`);
        if (!dismissedId) {
          setAnnouncement(data);
          setIsVisible(true);
        }
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const dismiss = () => {
    if (announcement) {
      localStorage.setItem(`dismissed_announcement_${announcement.id}`, 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible || !announcement) return null;

  const getIcon = () => {
    switch (announcement.type) {
      case 'promotion': return <Gift className="text-brand-gold" />;
      case 'warning': return <AlertCircle className="text-amber-500" />;
      case 'success': return <Info className="text-emerald-500" />;
      default: return <Megaphone className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
        <div className={`h-1 w-full ${
          announcement.type === 'promotion' ? 'bg-brand-gold' : 
          announcement.type === 'warning' ? 'bg-amber-500' : 
          announcement.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
        }`} />
        
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg">
                {getIcon()}
              </div>
              <h4 className="font-bold text-gray-900">{announcement.title}</h4>
            </div>
            <button 
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={18} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {announcement.message}
          </p>
          
          <button 
            onClick={dismiss}
            className="w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
