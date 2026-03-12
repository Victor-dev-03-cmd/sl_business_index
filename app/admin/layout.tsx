'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Tags,
  ClipboardList,
  Bell,
  LogOut,
  HelpCircle,
  Star,
  CreditCard
} from 'lucide-react';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import LiveCounter from '@/app/components/LiveCounter';
import { supabase } from '@/lib/supabaseClient';

const adminMenuItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { name: 'Requests', href: '/admin/requests', icon: ClipboardList },
  { name: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
  { name: 'Featured', href: '/admin/featured', icon: Star },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'Categories', href: '/admin/categories', icon: Tags },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Site Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setUser({ ...user, ...profile });
        }
      } catch (err) {
        console.error('Admin layout auth error:', err);
        // If it's a lock timeout, we might want to retry once or just let it be
      }
    };
    getUser();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50/50  transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-300 transition-all duration-300 ease-in-out hidden md:flex flex-col`}
      >
        <div className="flex items-center h-20 px-6 border-b border-gray-300">
          <div className="h-10 w-10 bg-brand-dark rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-lg shadow-brand-dark/20">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 text-sm tracking-tight uppercase">SL business</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Admin Panel</span>
            </div>
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
                className={`flex items-center px-4 py-3 rounded transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/10'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-dark'}`} strokeWidth={isActive ? 2 : 1.5} />
                {sidebarOpen && (
                  <span className={`ml-3 text-[13px] font-bold tracking-tight ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>{item.name}</span>
                )}
                {isActive && !sidebarOpen && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-dark rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {sidebarOpen && (
            <button className="flex items-center w-full px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all text-[13px] font-bold">
              <HelpCircle className="h-[18px] w-[18px] mr-3" strokeWidth={1.5} />
              Support Center
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'} transition-all duration-300`}>
        {/* Topbar */}
        <header className="h-20 bg-white/80  backdrop-blur-md border-b border-gray-300  sticky top-0 z-40 transition-colors duration-300">
          <div className="h-full px-4 md:px-8 flex items-center">
            {/* Sidebar Toggle */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-brand-dark hover:bg-brand-blue/5 transition-all border border-transparent hover:border-brand-blue/10 mr-4"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>

            {/* Centered Search */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-md group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search analytics, users, businesses..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100/50  border-gray-300 focus:bg-white  border focus:border-brand-blue/30 rounded-[6px] text-sm outline-none transition-all placeholder:text-gray-400 "
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-4">
              <div className="hidden sm:block">
                <LiveCounter />
              </div>
              <NotificationBell />
              <div className="h-8 w-px bg-gray-300  mx-2" />
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
