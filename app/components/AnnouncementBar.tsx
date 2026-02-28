'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

const announcements = [
  {
    text: "List your business today and get verified island-wide.",
    link: "/register-business",
    cta: "Register Now"
  },
  {
    text: "Need emergency help? Access our verified public service directory.",
    link: "/contact",
    cta: "View Directory"
  },
  {
    text: "Join 1,200+ businesses growing with SL Business Index.",
    link: "/about",
    cta: "Learn More"
  }
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-emerald-800 text-white overflow-hidden relative border-b border-emerald-900/50">
      <div className="container mx-auto px-4 h-10 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-400 flex-shrink-0 animate-pulse">
            <Megaphone size={12} strokeWidth={2.5} />
          </div>
          
          <div className="relative h-5 overflow-hidden flex-grow min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="flex items-center gap-4 whitespace-nowrap"
              >
                <p className="text-[11px] font-normal text-emerald-100/90 truncate">
                  {announcements[index].text}
                </p>
                <Link 
                  href={announcements[index].link}
                  className="hidden sm:flex items-center gap-1 text-[10px] font-normal text-emerald-400 hover:text-white transition-colors uppercase tracking-widest group"
                >
                  {announcements[index].cta}
                  <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/5 rounded-full text-emerald-100/30 hover:text-white transition-colors ml-4"
        >
          <X size={12} />
        </button>
      </div>

      {/* Subtle Bottom Glow Line */}
      <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent w-full"></div>
    </div>
  );
}
