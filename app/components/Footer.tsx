"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight, Compass, Heart, Mail, MapPin } from "lucide-react";
import LogoLink from "./LogoLink";
import { useSession } from "./SessionContext";
import { supabase } from "@/lib/supabaseClient";

const discoverLinks = [
  { label: "Explore categories", href: "/category" },
  { label: "Find businesses nearby", href: "/nearby" },
  { label: "Search the directory", href: "/search" },
  { label: "Business news", href: "/business-news" },
];

const companyLinks = [
  { label: "About us", href: "/about" },
  { label: "Help & FAQ", href: "/faq" },
  { label: "Contact us", href: "/contact" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms of service", href: "/terms-of-service" },
];

const areas = [
  { name: "Colombo", href: "/nearby?district=Colombo" },
  { name: "Jaffna", href: "/nearby?district=Jaffna" },
  { name: "Kandy", href: "/nearby?district=Kandy" },
  { name: "Vavuniya", href: "/nearby?district=Vavuniya" },
  { name: "Kanagarayankulam", href: "/nearby?q=Kanagarayankulam" },
];

export default function Footer() {
  const { user } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setUserRole(null);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        if (active) setUserRole(data?.role ?? null);
      } catch (error) {
        if (active) console.error("Error fetching footer role:", error);
      }
    };
    void fetchRole();
    return () => { active = false; };
  }, [user?.id]);

  const pricingHref = userRole === "vendor" ? "/vendor/billing" : "/pricing-plans";

  const footerLinkClass =
    "group inline-flex w-fit items-center gap-1.5 text-[13px] leading-6 text-[#B0CFB5] transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

  return (
    <footer aria-label="SL Business Index footer" className="relative isolate overflow-hidden border-t border-[#2E4035] bg-[#090B0A] text-[#E0EADB]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#203A2E]/35 to-transparent" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Editorial introduction and functional CTA. */}
        <div className="flex flex-col justify-between gap-6 border-b border-white/15 py-12 sm:py-14 lg:flex-row lg:items-center">
          <div className="max-w-[720px]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94BAA0]">
              Discover · Connect · Grow
            </p>
            <h2 className="text-balance text-[clamp(1.9rem,3vw,3.4rem)] font-semibold leading-[1.15] tracking-[-0.055em] text-white">
              Your next connection starts here.
            </h2>
          </div>
          <Link
            href="/register-business"
            className="group inline-flex h-12 w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-bold text-[#1B3430] transition-colors hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            List your business
            <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Unified evergreen wordmark for the nearly black footer. */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-[1.65fr_1fr_1fr_1fr] lg:gap-x-9 lg:py-16">
          <div className="max-w-[340px]">
            <div className="inline-flex min-h-[76px] items-center">
              <LogoLink tone="dark" />
            </div>
            <p className="mt-6 max-w-[320px] text-[14px] leading-[1.85] text-[#B0CFB5]">
              A home for Sri Lankan business discovery. Find local services,
              explore businesses and connect with opportunities across the island.
            </p>
            <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#F0D9AC] transition-colors hover:text-white">
              <Mail size={17} /> Get in touch <ArrowUpRight size={15} />
            </Link>
          </div>

          <nav aria-label="Discover links">
            <h3 className="mb-5 text-[12px] font-bold uppercase tracking-[0.13em] text-white">Discover</h3>
            <ul className="space-y-3.5">
              {discoverLinks.map(link => (
                <li key={link.href}>
                  <Link className={footerLinkClass} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Business owner links">
            <h3 className="mb-5 text-[12px] font-bold uppercase tracking-[0.13em] text-white">For business owners</h3>
            <ul className="space-y-3.5">
              <li><Link className={footerLinkClass} href="/register-business">List your business</Link></li>
              <li><Link className={footerLinkClass} href="/how-to-list">How to list</Link></li>
              <li><Link className={footerLinkClass} href={pricingHref}>Pricing &amp; plans</Link></li>
            </ul>
          </nav>

          <nav aria-label="Company and legal links">
            <h3 className="mb-5 text-[12px] font-bold uppercase tracking-[0.13em] text-white">Company</h3>
            <ul className="space-y-3.5">
              {companyLinks.map(link => (
                <li key={link.href}>
                  <Link className={footerLinkClass} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Search-friendly location links, no invented businesses or location counts. */}
        <div className="border-y border-white/15 py-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex shrink-0 items-center gap-2.5">
              <MapPin size={17} className="text-[#E7C58E]" />
              <h3 className="text-[13px] font-semibold text-white">Explore popular areas</h3>
            </div>
            <nav aria-label="Browse businesses by area" className="flex flex-wrap gap-2">
              {areas.map(area => (
                <Link
                  key={area.name}
                  href={area.href}
                  className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/[0.045] px-3.5 text-[12px] font-medium text-[#CADDCB] transition-colors hover:border-[#75AB8D]/60 hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {area.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Original credits remain acknowledged; no dead # social links. */}
        <div className="flex flex-col gap-5 py-7 text-[12px] text-[#75AB8D] md:flex-row md:items-center md:justify-between md:gap-7">
          <p>
            © {new Date().getFullYear()} SL Business Index. Built for Sri Lankan businesses.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="https://arud-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Design: Arud Graphics
            </a>
            <a
              href="https://laxsan-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Heart size={12} className="text-[#F0D9AC]" /> Developed by Laxsan Dev
            </a>
          </div>
          <button
            type="button"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-[#F0D9AC] transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
    </footer>
  );
}
