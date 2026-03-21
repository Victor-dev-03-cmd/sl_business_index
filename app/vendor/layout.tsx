'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Store, 
  Megaphone, 
  MessageSquare, 
  Users, 
  CreditCard, 
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  HelpCircle,
  Home
} from 'lucide-react';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import VerifiedBadge from '@/app/components/VerifiedBadge';
import { useUser } from '@/lib/hooks/useUser';

const vendorMenuItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
  { name: 'My Businesses', href: '/vendor/my-businesses', icon: Store },
  { name: 'Marketing', href: '/vendor/marketing', icon: Megaphone },
  { name: 'Reviews', href: '/vendor/reviews', icon: MessageSquare },
  { name: 'Leads', href: '/vendor/leads', icon: Users },
  { name: 'Billing', href: '/vendor/billing', icon: CreditCard },
  { name: 'Settings', href: '/vendor/settings', icon: Settings },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-1 border-brand-dark border-t-transparent" />
    </div>;
  }

  return (
    <div className="flex h-screen bg-gray-50/50 transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-300 transition-all duration-300 ease-in-out hidden md:flex flex-col`}
      >
        <div className="flex items-center h-20 px-6 border-b border-gray-300">
          <div className="h-10 w-10 bg-brand-dark rounded flex items-center justify-center mr-3 shrink-0 shadow-lg shadow-emerald-600/20">
            <Briefcase className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 text-sm tracking-tight uppercase">SL Business</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Vendor Portal</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {vendorMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-brand-dark text-white shadow-lg shadow-emerald-600/10'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} strokeWidth={isActive ? 2 : 1.5} />
                {sidebarOpen && (
                  <span className={`ml-3 text-[13px] font-bold tracking-tight ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>{item.name}</span>
                )}
                {isActive && !sidebarOpen && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {sidebarOpen && (
            <button 
              onClick={() => alert('Support Center coming soon! Please email support@slbusiness.com')}
              className="flex items-center w-full px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all text-[13px] font-bold"
            >
              <HelpCircle className="h-[18px] w-[18px] mr-3" strokeWidth={1.5} />
              Vendor Support
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'} transition-all duration-300`}>
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-300 sticky top-0 z-40 transition-colors duration-300">
          <div className="h-full px-4 md:px-8 flex items-center">
            {/* Sidebar Toggle */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-500 transition-all border border-transparent mr-4"
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search your businesses, reviews, leads..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border-gray-300 focus:bg-white border focus:border-blue-200 rounded-[6px] text-sm outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-4">
              {user && user.verification_status && (
                <div className={`flex items-center px-3 py-1.5 rounded-full border hidden lg:flex ${
                  user.verification_status === 'verified' 
                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                    : user.verification_status === 'pending'
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {user.verification_status === 'verified' && <VerifiedBadge size={14} className="mr-2" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {user.verification_status === 'verified' 
                      ? 'Verified Vendor' 
                      : `Verification: ${user.verification_status}`}
                  </span>
                </div>
              )}
              <NotificationBell />
              <div className="h-8 w-px bg-gray-300 mx-2" />
              <AuthButton user={user} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
