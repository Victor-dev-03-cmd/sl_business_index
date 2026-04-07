'use client';

import React, { useState, useEffect, startTransition } from 'react';
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
  Home,
  QrCode,
  Menu,
  X
} from 'lucide-react';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import VerifiedBadge from '@/app/components/VerifiedBadge';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';

const vendorMenuItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
  { name: 'My Businesses', href: '/vendor/my-businesses', icon: Store },
  { name: 'QR Code', href: '/vendor/qr-code', icon: QrCode },
  { name: 'Marketing', href: '/vendor/marketing', icon: Megaphone },
  { name: 'Reviews', href: '/vendor/reviews', icon: MessageSquare },
  { name: 'Leads', href: '/vendor/leads', icon: Users },
  { name: 'Billing', href: '/vendor/billing', icon: CreditCard },
  { name: 'Settings', href: '/vendor/settings', icon: Settings },
];

const mobileQuickNav = [
  { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/vendor/my-businesses', icon: Store },
  { name: 'Leads', href: '/vendor/leads', icon: Users },
  { name: 'Settings', href: '/vendor/settings', icon: Settings },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    startTransition(() => {
      setMobileDrawerOpen(false);
    });
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-gray-50/50 transition-colors duration-300 overflow-hidden">
      {/* ── Desktop Sidebar (hidden on mobile, visible md+) ───────────────── */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-300 transition-all duration-300 ease-in-out hidden md:flex flex-col`}
      >
        <div className="flex items-center h-20 px-6 border-b border-gray-300">
          <div className="h-10 w-10 bg-brand-dark rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-lg shadow-brand-dark/20">
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
            <button 
              onClick={() => toast.info('Support Center coming soon! Please email support@slbusiness.com')}
              className="flex items-center w-full px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all text-[13px] font-bold"
            >
              <HelpCircle className="h-[18px] w-[18px] mr-3" strokeWidth={1.5} />
              Vendor Support
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Slide-in Drawer (md:hidden) ───────────────────────────── */}
      <div className="md:hidden">
        {/* Backdrop */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Drawer Panel */}
        <div
          className={`fixed top-0 left-0 h-full w-72 bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ${
            mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200 shrink-0">
            <div className="h-9 w-9 bg-brand-dark rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-dark/20">
              <Briefcase className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col ml-3 flex-1 min-w-0">
              <span className="font-bold text-gray-900 text-sm tracking-tight uppercase">SL Business</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Vendor Portal</span>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 shrink-0 ml-2"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Drawer Nav */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {vendorMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded transition-all duration-200 group relative ${
                    isActive
                      ? "bg-brand-dark text-white shadow-lg shadow-brand-dark/10"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-brand-dark"
                    }`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span
                    className={`ml-3 text-[13px] font-bold tracking-tight ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-900"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Drawer Bottom – user info */}
          <div className="p-4 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-brand-dark/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-dark">
                  {user?.email?.charAt(0).toUpperCase() ?? "V"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.email ?? "Vendor"}
                </p>
                <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-brand-dark bg-brand-dark/10 px-2 py-0.5 rounded-full mt-0.5">
                  Vendor
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${
          mounted && sidebarOpen ? 'md:ml-64' : mounted && !sidebarOpen ? 'md:ml-20' : ''
        } transition-all duration-300 min-w-0`}>
        {/* Topbar */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-300 sticky top-0 z-40 transition-colors duration-300">
          <div className="h-full px-3 md:px-8 flex items-center">
            {/* Mobile: hamburger button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-brand-dark hover:bg-brand-blue/5 transition-all border border-transparent hover:border-brand-blue/10 mr-2 shrink-0"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {/* Desktop: Sidebar Toggle */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex items-center justify-center p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-brand-dark hover:bg-brand-blue/5 transition-all border border-transparent hover:border-brand-blue/10 mr-4 shrink-0"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>

            {/* Mobile: centered "Vendor" title */}
            <div className="flex-1 flex justify-center md:hidden overflow-hidden">
              <span className="font-bold text-gray-900 text-xs sm:text-sm tracking-tight uppercase truncate px-1">
                Vendor Portal
              </span>
            </div>

            {/* Centered Search */}
            <div className="flex-1 hidden md:flex justify-center">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-dark transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search your businesses, reviews, leads..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border-gray-300 focus:bg-white border focus:border-brand-dark/30 rounded-[6px] text-sm outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 ml-3 md:ml-4 shrink-0">
              {user && user.verification_status && (
                <div className={`items-center px-3 py-1.5 rounded-full border hidden lg:flex ${
                  user.verification_status === 'verified' 
                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                    : user.verification_status === 'pending'
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {user.verification_status === 'verified' && <VerifiedBadge size={14} className="mr-2" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {user.verification_status === 'verified' 
                      ? 'Verified' 
                      : `Verification: ${user.verification_status}`}
                  </span>
                </div>
              )}
              <NotificationBell />
              <div className="h-8 w-px bg-gray-300 mx-1 md:mx-2" />
              <AuthButton user={user} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Quick-Nav Bar (md:hidden) ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileQuickNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-brand-dark" : "text-gray-400"
              }`}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="text-[10px] font-bold tracking-tight">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
