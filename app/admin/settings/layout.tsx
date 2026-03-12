'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Globe, 
  Palette, 
  Image as ImageIcon, 
  Bell, 
  ShieldAlert, 
  Wrench,
  ChevronRight
} from 'lucide-react';

const settingsSubMenu = [
  { name: 'General', href: '/admin/settings/general', icon: Globe, description: 'Site identity and metadata' },
  { name: 'Appearance', href: '/admin/settings/appearance', icon: ImageIcon, description: 'Logo and brand assets' },
  { name: 'Theme', href: '/admin/settings/theme', icon: Palette, description: 'Colors and platform styling' },
  { name: 'Notification', href: '/admin/settings/notification', icon: Bell, description: 'Email and push alerts' },
  { name: 'Web Blocker', href: '/admin/settings/web-blocker', icon: ShieldAlert, description: 'Spam and security rules' },
  { name: 'Customization', href: '/admin/settings/customization', icon: Wrench, description: 'Advanced UI overrides' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sub Navigation Sidebar */}
          <aside className="w-full md:w-72 shrink-0">
            <div className="bg-white border border-gray-300 rounded-[6px] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Settings Panel</h2>
              </div>
              <nav className="p-2 space-y-1">
                {settingsSubMenu.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-start gap-3 p-3 rounded-[6px] transition-all group ${
                        isActive 
                          ? 'bg-brand-dark text-white shadow-md' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-dark'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : 'text-gray-900 group-hover:text-brand-dark'}`}>
                          {item.name}
                        </p>
                        <p className={`text-[11px] leading-tight mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                          {item.description}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Settings Content Area */}
          <div className="flex-1 bg-white border border-gray-300 rounded-[6px] shadow-sm min-h-[600px] p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
