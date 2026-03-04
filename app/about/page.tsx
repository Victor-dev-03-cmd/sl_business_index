'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Cpu, 
  ShieldCheck, 
  Globe, 
  Zap, 
  Layers, 
  Search, 
  MapPin, 
  Navigation,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* --- HERO SECTION --- */}
      <section className="relative py-32 flex items-center justify-center overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full "></div>
        
        <div className="relative z-10 max-w-5xl px-6 text-center">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 mb-8 text-[11px] tracking-[0.2em] uppercase text-brand-sand border border-emerald-400/20 rounded-md bg-emerald-400/5"
          >
            About SL Business Index
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl text-white mb-8 leading-[1.1] font-normal tracking-tight"
          >
            Digitalizing the <br />
            <span className="text-brand-sand">Neighborhood</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light"
          >
            We are bridging the gap between traditional Sri Lankan commerce and the modern digital consumer through real-time, verified business discovery.
          </motion.p>
        </div>
      </section>

      {/* --- NARRATIVE SECTION --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-12 h-12 bg-brand-sand/20 rounded-[6px] border border-gray-300 flex items-center justify-center text-brand-blue">
              <Target size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-normal text-gray-900">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed font-normal">
              We want to help local shops in Jaffna, Vavuniya, and all over Sri Lanka get online. We believe every store—even the smallest one—should be easy for people to find on the internet.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="w-12 h-12 bg-brand-sand/20 rounded-[6px] border border-gray-300 flex items-center justify-center text-brand-blue">
              <ShieldCheck size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-normal text-gray-900">Verified Profiles</h3>
            <p className="text-gray-600 leading-relaxed font-normal">
              Are you tired of calling phone numbers that don't work or going to locations that are wrong? We fix this by making sure every shop on our list is real, checked by humans, and kept up to date for Sri Lanka.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="w-12 h-12 bg-brand-sand/20 rounded-[6px] border border-gray-300 flex items-center justify-center text-brand-blue">
              <Cpu size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-normal text-gray-900">Tech Ecosystem</h3>
            <p className="text-gray-600 leading-relaxed font-normal">
              We use the best tools to make this website fast and the maps very accurate. Our system is always alive and updates whenever a new business opens in Sri Lanka.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- SKELETON-TO-INTERACTIVE JOURNEY --- */}
      <section className="py-24 bg-gray-50/50 border-y border-gray-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl text-gray-900 mb-6 tracking-tight">The Professional Journey</h2>
            <p className="text-gray-500 max-w-xl mx-auto">How our platform transforms raw data into instant local connections.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1: Detect */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-[6px] border border-gray-300 shadow-sm group hover:border-blue-300 transition-all"
            >
              <div className="relative w-full h-48 bg-gray-200 border border-gray-300 rounded-[6px] mb-8 overflow-hidden flex items-center justify-center">
                {/* Skeleton Animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300/20 to-transparent animate-skeleton-shimmer" />
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-blue-100 animate-glow-pulse flex items-center justify-center">
                    <Navigation size={32} strokeWidth={1.5} className="text-brand-gold" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center text-white text-xs font-normal animate-bounce">
                    1
                  </div>
                </div>
              </div>
              <h4 className="text-xl font-normal text-gray-900 mb-3">Detect</h4>
              <p className="text-gray-500 text-sm leading-relaxed font-normal">
                High-accuracy geolocation identifies your district instantly. No manual typing required for nearby results.
              </p>
            </motion.div>

            {/* Step 2: Filter */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-[6px] border border-gray-300 shadow-sm group hover:border-blue-300 transition-all"
            >
              <div className="relative w-full h-48 bg-gray-200 border border-gray-300 rounded-[6px] mb-8 overflow-hidden flex flex-col items-center justify-center p-6 gap-3">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/20 to-transparent animate-skeleton-shimmer" style={{ animationDelay: '0.5s' }} />
                <div className="w-full h-8 bg-gray-300 rounded-[6px]" />
                <div className="w-3/4 h-8 bg-gray-300 rounded-[6px]" />
                <div className="w-1/2 h-8 bg-brand-gold/20 rounded-[6px] flex items-center px-3">
                  <Search size={18} strokeWidth={1.5} className="text-brand-gold" />
                </div>
              </div>
              <h4 className="text-xl font-normal text-gray-900 mb-3">Filter</h4>
              <p className="text-gray-500 text-sm leading-relaxed font-normal">
                Intelligent categorization scans our database to match your exact intent, from "Open Now" to specific towns.
              </p>
            </motion.div>

            {/* Step 3: Connect */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-[6px] border border-gray-300 shadow-sm group hover:border-blue-300 transition-all"
            >
              <div className="relative w-full h-48 bg-gray-200 border border-gray-300 rounded-[6px] mb-8 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/20 to-transparent animate-skeleton-shimmer" style={{ animationDelay: '1s' }} />
                <div className="space-y-3 w-2/3">
                  <div className="h-12 bg-white rounded-[6px] shadow-sm border border-emerald-50 p-3 flex items-center gap-3 transform group-hover:translate-x-2 transition-transform">
                    <div className="w-6 h-6 rounded-full bg-brand-sand/30 flex items-center justify-center">
                      <CheckCircle2 size={18} strokeWidth={1.5} className="text-brand-blue" />
                    </div>
                    <div className="h-2 w-20 bg-gray-200 rounded-[6px]" />
                  </div>
                  <div className="h-12 bg-white rounded-[6px] shadow-sm border border-emerald-50 p-3 flex items-center gap-3 transform translate-x-4 group-hover:translate-x-6 transition-transform">
                    <div className="w-6 h-6 rounded-full bg-brand-sand/30 flex items-center justify-center">
                      <MapPin size={18} strokeWidth={1.5} className="text-brand-blue" />
                    </div>
                    <div className="h-2 w-24 bg-gray-200 rounded-[6px]" />
                  </div>
                </div>
              </div>
              <h4 className="text-xl font-normal text-gray-900 mb-3">Connect</h4>
              <p className="text-gray-500 text-sm leading-relaxed font-normal">
                One-tap directions and direct contact. We remove all barriers between you and the local businesses you need.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- TECH STACK SECTION --- */}
      <section className="py-24 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl font-normal text-gray-900 mb-16 uppercase tracking-widest text-brand-blue/60">Our Technology Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <div className="flex flex-col items-center gap-4">
            <Layers size={30} strokeWidth={1.5} className="text-gray-900" />
            <span className="text-sm font-normal">Next.js 16</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <Globe size={30} strokeWidth={1.5} className="text-gray-900" />
            <span className="text-sm font-normal">Mapbox SDK</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <Zap size={30} strokeWidth={1.5} className="text-gray-900" />
            <span className="text-sm font-normal">Supabase</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <ShieldCheck size={30} strokeWidth={1.5} className="text-gray-900" />
            <span className="text-sm font-normal">Tailwind CSS</span>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 bg-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent animate-ambient-float gpu-accelerated" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl text-white mb-8 font-normal">Ready to put your business on the map?</h2>
          <p className="text-brand-sand text-lg mb-12 font-light">Join hundreds of verified businesses growing their local presence today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-10 py-4 border border-white/20 bg-brand-dark hover:bg-brand-blue text-white font-normal rounded-sm flex items-center justify-center gap-2 group">
              Register Listing <ArrowRight size={18} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-10 py-4 border border-white/20 hover:bg-white/10 text-white font-normal rounded-sm transition-all">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
