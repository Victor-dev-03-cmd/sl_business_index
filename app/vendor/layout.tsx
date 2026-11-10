'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from '@/app/components/AuthButton';
import NotificationBell from '@/app/components/NotificationBell';
import VerifiedBadge from '@/app/components/VerifiedBadge';
import { useUser } from '@/lib/hooks/useUser';
import IconsaxIcon from './components/IconsaxIcon';

const primaryNav = [
  { name: 'Dashboard', href: '/vendor/dashboard', icon: 'category' },
  { name: 'Growth OS', href: '/vendor/growth', icon: 'chart' },
  { name: 'My Businesses', href: '/vendor/my-businesses', icon: 'shop' },
  { name: 'Leads', href: '/vendor/leads', icon: 'people' },
  { name: 'Reviews', href: '/vendor/reviews', icon: 'star' },
];
const toolsNav = [
  { name: 'Marketing', href: '/vendor/marketing', icon: 'flash' },
  { name: 'QR Code', href: '/vendor/qr-code', icon: 'scan-barcode' },
  { name: 'Billing', href: '/vendor/billing', icon: 'card' },
  { name: 'Settings', href: '/vendor/settings', icon: 'setting-2' },
];
const mobileNav = [
  { name: 'Dashboard', href: '/vendor/dashboard', icon: 'category' },
  { name: 'Businesses', href: '/vendor/my-businesses', icon: 'shop' },
  { name: 'Leads', href: '/vendor/leads', icon: 'people' },
  { name: 'Settings', href: '/vendor/settings', icon: 'setting-2' },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user, isLoading } = useUser();
  const [expanded, setExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  function navItems(items: typeof primaryNav, mobile = false) {
    return items.map(item => {
      const selected = active(item.href);
      return (
        <Link key={item.href} href={item.href} title={item.name} aria-current={selected ? 'page' : undefined}
          className={'group relative flex items-center gap-3 rounded-lg px-3 py-[10px] transition-colors ' +
            (selected ? 'bg-[#eaf3ed] font-bold text-[#1b5438]' : 'font-medium text-[#617068] hover:bg-[#f4f7f5] hover:text-[#1c4f39]')}>
          <IconsaxIcon name={item.icon} size={19} variant={selected ? 'bold' : 'linear'} color={selected ? '#236546' : '#77877d'} />
          {(expanded || mobile) && <span className="truncate text-[12px]">{item.name}</span>}
          {selected && <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l bg-[#28774e]" />}
        </Link>
      );
    });
  }

  if (isLoading) {
    return <div className="flex h-[100dvh] items-center justify-center bg-[#f8faf8]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d9e8de] border-t-[#236448]" />
    </div>;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f8f9fb]">
      {/* Desktop navigation */}
      <aside className={'fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-[#e4e9e5] bg-white transition-[width] duration-200 md:flex ' + (expanded ? 'w-[238px]' : 'w-[72px]')}>
        <Link href="/vendor/dashboard" className="flex h-[68px] shrink-0 items-center gap-2.5 border-b border-[#edf0ed] px-4">
          <img src="/slbi-mark.svg" className="h-9 w-9 shrink-0 object-contain" alt="SLBI" />
          {expanded && <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[12px] font-extrabold tracking-tight text-[#1f4131]">SL BUSINESS INDEX</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#a0ada3]">Vendor intelligence</span>
          </span>}
        </Link>
        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-4">
          {expanded && <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#9ba9a0]">Workspace</p>}
          <div className="space-y-0.5">{navItems(primaryNav)}</div>
          <div className="my-4 border-t border-[#f0f2f0]" />
          {expanded && <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#9ba9a0]">Tools & account</p>}
          <div className="space-y-0.5">{navItems(toolsNav)}</div>
        </div>
        <div className="shrink-0 border-t border-[#edf0ed] p-3">
          <Link href="/" title="Back to homepage" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#72837a] transition hover:bg-[#f5f7f5]">
            <IconsaxIcon name="home" size={18} /> {expanded && <span>Visit website</span>}
          </Link>
          {expanded && <div className="mt-2 rounded-lg border border-[#eaf0eb] bg-[#f7faf8] px-3 py-2.5">
            <p className="truncate text-[11px] font-semibold text-[#2a4a36]">{user?.email || 'Vendor'}</p>
            <p className="mt-1 text-[10px] text-[#9aa89f]">SLBI Vendor account</p>
          </div>}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && <div role="presentation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-[60] bg-[#122d22]/45 md:hidden" />}
      <aside className={'fixed inset-y-0 left-0 z-[70] flex w-[268px] flex-col bg-white shadow-2xl transition-transform duration-200 md:hidden ' + (drawerOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 border-b border-[#e9eeea] px-4">
          <img src="/slbi-mark.svg" className="h-9 w-9" alt="SLBI" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#1e4531]">SL Business Index</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Vendor workspace</p>
          </div>
          <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <IconsaxIcon name="close-circle" size={20} />
          </button>
        </div>
        <nav aria-label="Mobile vendor menu" className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems(primaryNav, true)}
          <div className="my-3 border-t border-[#edf0ed]" />
          {navItems(toolsNav, true)}
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-medium text-slate-500">
            <IconsaxIcon name="home" size={18} /> Visit website
          </Link>
        </nav>
      </aside>

      {/* Main workspace */}
      <div className={'flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ' + (expanded ? 'md:ml-[238px]' : 'md:ml-[72px]')}>
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-[#e4e9e5] bg-white px-4 sm:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open vendor menu"
            className="mr-3 rounded-lg p-2 text-[#6d8072] hover:bg-[#f1f6f2] md:hidden">
            <IconsaxIcon name="menu" size={20} />
          </button>
          <button type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="mr-4 hidden rounded-lg border border-[#edf1ed] p-2 text-[#708475] hover:bg-[#f4f8f5] md:inline-flex">
            <IconsaxIcon name="sidebar-left" size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-[#294734]">Vendor workspace</p>
            <p className="mt-0.5 hidden text-[10px] text-[#9eada2] sm:block">SL Business Index · Manage, analyse, grow</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/vendor/my-businesses" className="hidden h-8 items-center gap-2 rounded-lg border border-[#e7ece8] px-3 text-[11px] font-semibold text-[#476653] hover:bg-[#f5f9f6] sm:inline-flex">
              <IconsaxIcon name="shop" size={15} /> My businesses
            </Link>
            {user?.verification_status && <div className={'hidden items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold lg:inline-flex ' +
              (user.verification_status === 'verified' ? 'border-[#d5ebdb] bg-[#eff8f2] text-[#39815c]' : 'border-[#f0e1bf] bg-[#fff8eb] text-[#a57c36]')}>
              {user.verification_status === 'verified' && <VerifiedBadge size={13} />}
              {user.verification_status === 'verified' ? 'Verified vendor' : 'Verification: ' + user.verification_status}
            </div>}
            <NotificationBell />
            <span className="h-7 w-px bg-[#e7ebe7]" />
            <AuthButton user={user} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      <nav aria-label="Mobile quick navigation" className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-[#e2e9e3] bg-white md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNav.map(item => {
          const selected = active(item.href);
          return <Link key={item.href} href={item.href} aria-current={selected ? 'page' : undefined}
            className={'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ' + (selected ? 'text-[#2b7853]' : 'text-[#94a39a]')}>
            <IconsaxIcon name={item.icon} size={19} variant={selected ? 'bold' : 'linear'} />
            <span>{item.name}</span>
          </Link>;
        })}
      </nav>
    </div>
  );
}
