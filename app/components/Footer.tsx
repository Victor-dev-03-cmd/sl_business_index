'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Facebook, 
  Instagram, 
  Mail, 
  Github, 
  Heart, 
  Map, 
  Search, 
  Sliders, 
  PlusCircle, 
  RefreshCw, 
  CreditCard, 
  ArrowUp,
  MessageCircle,
  Database,
  Zap,
  Wind,
  Layers
} from 'lucide-react';
import LogoLink from './LogoLink';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gray-950 text-gray-300 pt-16 pb-8 border-t border-emerald-900/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Grid: 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          {/* Column 1: Brand & Socials */}
          <div className="space-y-6">
            <div className="-ml-2">
              <LogoLink />
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              The heart of Sri Lankan commerce. Connecting customers with verified local businesses across the island.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:bg-emerald-900/30 hover:text-emerald-400 transition-all border border-gray-800">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:bg-emerald-900/30 hover:text-emerald-400 transition-all border border-gray-800">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:bg-emerald-900/30 hover:text-emerald-400 transition-all border border-gray-800">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: User Links */}
          <div className="md:pt-4">
            <h4 className="text-gray-400 mb-6 text-lg">User Links</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="/nearby" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <Map size={16} className="text-emerald-600 transition-transform" />
                  Find Nearby
                </Link>
              </li>
              <li>
                <Link href="/search" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <Search size={16} className="text-emerald-600 transition-transform" />
                  Search Map
                </Link>
              </li>
              <li>
                <Link href="/nearby" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <Sliders size={16} className="text-emerald-600 transition-transform" />
                  Advanced Filters
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Business Owners */}
          <div className="md:pt-4">
            <h4 className="text-gray-400 mb-6 text-lg">Business Owners</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="/register-business" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <PlusCircle size={16} className="text-emerald-600 transition-transform" />
                  Register Your Business
                </Link>
              </li>
              <li>
                <Link href="/register-business" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <RefreshCw size={16} className="text-emerald-600 transition-transform" />
                  Update Listing
                </Link>
              </li>
              <li>
                <Link href="#" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <CreditCard size={16} className="text-emerald-600 transition-transform" />
                  Pricing & Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Legal */}
          <div className="md:pt-4">
            <h4 className="text-gray-400 mb-6 text-lg">Contact & Legal</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a href="mailto:developerconsole03@gmail.com" className="flex items-center gap-3 hover:text-emerald-400 transition-colors group">
                  <Mail size={16} className="text-emerald-600 transition-transform" />
                  developerconsole03@gmail.com
                </a>
              </li>
              <li>
                <Link href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 bg-gray-900/50 w-fit px-3 py-1.5 rounded-full border border-gray-800">
                  <span>English</span> | <span>தமிழ்</span> | <span>සිංහල</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Section: Popular Areas */}
        <div className="border-t border-gray-900 pt-10 pb-10">
          <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-6">Popular Areas</h4>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/nearby?district=Jaffna" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors underline decoration-emerald-900 underline-offset-4">Businesses in Jaffna City</Link>
            <Link href="/nearby?district=Vavuniya" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors underline decoration-emerald-900 underline-offset-4">Businesses in Vavuniya Town</Link>
            <Link href="/nearby?q=Kanagarayankulam" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors underline decoration-emerald-900 underline-offset-4">Businesses in Kanagarayankulam</Link>
            <Link href="/nearby?district=Colombo" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors underline decoration-emerald-900 underline-offset-4">Businesses in Colombo</Link>
            <Link href="/nearby?district=Kandy" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors underline decoration-emerald-900 underline-offset-4">Businesses in Kandy</Link>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Developer Signature */}
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xs text-gray-500">
            © 2026 SL Business Index | <span className="text-gray-400">The Heart of Sri Lankan Commerce</span>
          </div>

          { /* <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              Built with <Heart size={12} className="text-red-500 fill-red-500" /> in Sri Lanka by 
              <span className="text-emerald-400 hover:underline cursor-pointer">Laxsan-Victor</span>
            </div>
            <div className="flex items-center gap-4 text-gray-600">
              <div title="Next.js" className="hover:text-white transition-colors"><Zap size={14} /></div>
              <div title="Tailwind CSS" className="hover:text-emerald-400 transition-colors"><Wind size={14} /></div>
              <div title="Supabase" className="hover:text-emerald-600 transition-colors"><Database size={14} /></div>
              <div title="Mapbox" className="hover:text-blue-400 transition-colors"><Layers size={14} /></div>
              <a href="https://github.com/Victor-dev-03-cmd" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-white transition-colors ml-2">
                <Github size={14} />
              </a>
            </div>
          </div> */}
        </div>
      </div>

      {/* Back to Top Arrow */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-900/40 z-50 transition-all hover:-translate-y-1 active:scale-95 border-2 border-white/20"
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </footer>
  );
};

export default Footer;
