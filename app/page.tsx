'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MapPin,
  Stethoscope,
  Utensils,
  Briefcase,
  Palmtree,
  GraduationCap,
  Car,
  Home,
  ChevronRight
} from 'lucide-react';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { name: 'Medical', icon: <Stethoscope size={20} strokeWidth={1.5} />, color: 'bg-emerald-50 text-emerald-700' },
    { name: 'Dining', icon: <Utensils size={20} strokeWidth={1.5} />, color: 'bg-orange-50 text-orange-700' },
    { name: 'Professional', icon: <Briefcase size={20} strokeWidth={1.5} />, color: 'bg-blue-50 text-blue-700' },
    { name: 'Tourism', icon: <Palmtree size={20} strokeWidth={1.5} />, color: 'bg-cyan-50 text-cyan-700' },
    { name: 'Education', icon: <GraduationCap size={20} strokeWidth={1.5} />, color: 'bg-purple-50 text-purple-700' },
    { name: 'Automotive', icon: <Car size={20} strokeWidth={1.5} />, color: 'bg-red-50 text-red-700' },
    { name: 'Real Estate', icon: <Home size={20} strokeWidth={1.5} />, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
      <div className="min-h-screen bg-white font-normal">
        {/* --- HERO SECTION --- */}
        <section className="relative h-[75vh] flex items-center justify-center overflow-hidden bg-green-950">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

          <div className="relative z-10 max-w-4xl px-6 text-center">
          <span className="inline-block px-3 py-1 mb-6 text-[10px] tracking-[0.15em] uppercase text-emerald-400 border border-emerald-400/20 rounded-md">
            Sri Lanka's Business Directory
          </span>

            <h1 className="text-4xl md:text-5xl text-white mb-6 leading-tight tracking-tight">
              Find the best services in <br />
              <span className="text-emerald-400">Sri Lanka</span>
            </h1>

            <p className="text-green-100/60 text-sm mb-10 max-w-lg mx-auto">
              Explore verified local businesses, clinics, and luxury villas across the island.
            </p>

            {/* Minimal Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-sm border border-white/10 p-1">
                <div className="flex items-center flex-1 px-4 py-2">
                  <Search className="text-gray-400 mr-2" size={18} strokeWidth={1.5} />
                  <input
                      type="text"
                      placeholder="Ex: Dentist, Restaurant..."
                      className="w-full outline-none text-gray-600 text-sm placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center px-4 py-2 border-t md:border-t-0 md:border-l border-gray-100">
                  <MapPin className="text-gray-400 mr-2" size={18} strokeWidth={1.5} />
                  <select className="bg-transparent outline-none text-gray-500 text-sm w-full appearance-none cursor-pointer">
                    <option>All Island</option>
                    <option>Colombo</option>
                    <option>Jaffna</option>
                  </select>
                </div>
                <button className="bg-green-700 hover:bg-green-800 text-white text-sm px-6 py-2.5 rounded-md transition-all ml-1">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- CATEGORIES --- */}
        <section className="py-20 px-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-xl text-gray-800 tracking-tight">Browse Categories</h2>
            <Link href="/categories" className="text-xs text-green-700 flex items-center hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((cat, idx) => (
                <div
                    key={idx}
                    className="group cursor-pointer flex flex-col items-center p-5 bg-gray-50/50 border border-transparent rounded-xl hover:bg-white hover:border-gray-100 hover:shadow-sm transition-all"
                >
                  <div className={`p-3 rounded-full mb-3 ${cat.color} opacity-80`}>
                    {cat.icon}
                  </div>
                  <span className="text-gray-600 text-xs">{cat.name}</span>
                </div>
            ))}
          </div>
        </section>

        {/* --- LISTINGS --- */}
        <section className="py-20 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-12">
              <h2 className="text-xl text-gray-800 tracking-tight">Featured Listings</h2>
              <p className="text-xs text-gray-400 mt-1">Handpicked verified establishments</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="relative h-48 bg-gray-200">
                      <Image
                          src={`/business-${i}.jpg`}
                          alt="Business"
                          fill
                          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm text-gray-800">Victoria Luxury Villa</h3>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">4.9 ★</span>
                      </div>
                      <p className="text-[11px] text-gray-400 flex items-center mb-4">
                        <MapPin size={12} className="mr-1" /> Nuwara Eliya
                      </p>
                      <button className="text-[11px] text-center w-full py-2 border border-gray-100 text-gray-500 rounded-lg hover:bg-gray-50 transition-all">
                        View Profile
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
}