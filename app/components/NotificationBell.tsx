'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  time: string;
  isRead: boolean;
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Welcome to SL Business Index',
    message: 'Start exploring businesses near you in Sri Lanka.',
    type: 'success',
    time: '2 mins ago',
    isRead: false,
  },
  {
    id: '2',
    title: 'Profile Updated',
    message: 'Your business listing has been successfully updated.',
    type: 'info',
    time: '1 hour ago',
    isRead: false,
  },
  {
    id: '3',
    title: 'New Review!',
    message: 'Someone just left a 5-star review on your business.',
    type: 'success',
    time: '3 hours ago',
    isRead: true,
  }
];

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isShaking, setIsShaking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Periodic Shake if unread
  useEffect(() => {
    if (unreadCount > 0) {
      const interval = setInterval(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500); // Animation duration
      }, 5000); // Shake every 5 seconds

      return () => clearInterval(interval);
    }
  }, [unreadCount]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full hover:bg-gray-100 transition-all relative ${isShaking ? 'animate-bell-shake' : ''}`}
      >
        <Bell className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-normal text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-normal"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 border-b border-gray-50 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      notif.type === 'success' ? 'bg-green-100 text-green-600' : 
                      notif.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {notif.type === 'success' ? <Check size={18} strokeWidth={1.5} /> : 
                       notif.type === 'warning' ? <AlertTriangle size={18} strokeWidth={1.5} /> : 
                       <Info size={18} strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-normal text-gray-900 truncate`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 font-normal">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-normal">
                        <Clock size={10} strokeWidth={1.5} />
                        {notif.time}
                      </div>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm font-normal">No notifications yet</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <button className="text-xs text-gray-600 hover:text-gray-900 font-normal">
                View All Activity
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
