'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  ClipboardList, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import ThemeToggle from '@/app/components/ThemeToggle';
import { supabase } from '@/lib/supabaseClient';

const adminMenuItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { name: 'Business Requests', href: '/admin/requests', icon: ClipboardList },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Site Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUser({ ...user, ...profile });
      }
    };
    getUser();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out hidden md:flex flex-col`}
      >
        <div className="flex items-center h-20 px-6 border-b border-gray-100 dark:border-gray-800">
          <ShieldCheck className="h-6 w-6 text-emerald-600 mr-3 shrink-0" strokeWidth={1.5} />
          {sidebarOpen && (
            <span className="font-normal text-gray-900 dark:text-white truncate">Admin Panel</span>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors group ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} strokeWidth={1.5} />
                {sidebarOpen && (
                  <span className="ml-3 font-normal text-sm">{item.name}</span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'} transition-all duration-300`}>
        {/* Topbar */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300">
          <div className="h-full px-4 md:px-8 flex items-center justify-between">
            {/* Search */}
            <div className="relative w-full max-w-md group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search analytics, users, businesses..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100/50 dark:bg-gray-800/50 border-transparent focus:bg-white dark:focus:bg-gray-900 border focus:border-emerald-500/30 rounded-full text-sm outline-none transition-all placeholder:text-gray-400 dark:text-gray-200"
              />
            </div>

            <div className="flex items-center space-x-4 ml-auto">
              <ThemeToggle />
              <NotificationBell />
              <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-2" />
              <AuthButton user={user} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
