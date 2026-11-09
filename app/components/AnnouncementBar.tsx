"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Megaphone, X } from "lucide-react";

const DISMISS_KEY = "slbusinessindex-announcement-dismissed";

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  // Respect a dismissal for the current browser session only.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "yes") setVisible(false);
    } catch {
      // Private browsing / storage disabled: the banner remains dismissible.
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "yes");
    } catch {
      // Storage is optional; hiding the banner still works.
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="SL Business Index announcement"
      className="relative isolate overflow-hidden border-b border-white/10 bg-[#0C3154] text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#082946] via-[#0C365C] to-[#103E63]" />
      <div className="relative mx-auto flex min-h-10 w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-200/10 text-[#A9D9FF]">
            <Megaphone size={13} strokeWidth={1.9} />
          </span>
          <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9CCCEB] lg:inline">
            SL Business Index
          </span>
          <span aria-hidden="true" className="hidden h-3.5 w-px bg-white/20 lg:inline" />
          <p className="min-w-0 truncate text-[11px] font-medium tracking-[-0.005em] text-[#E5F1FB] sm:text-xs">
            Discover Sri Lanka's businesses. Connect with local opportunities.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link
            href="/register-business"
            className="group inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.02em] text-[#B9E5FF] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:text-[11px]"
          >
            List your business
            <ArrowUpRight size={13} className="transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={dismiss}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#A8C5DB] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
