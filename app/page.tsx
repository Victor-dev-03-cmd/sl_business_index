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
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sriLankanDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Location');

  const categories = [
    { name: 'Medical', icon: <Stethoscope size={22} strokeWidth={1.5} />, color: 'bg-emerald-50 text-emerald-700' },
    { name: 'Dining', icon: <Utensils size={22} strokeWidth={1.5} />, color: 'bg-orange-50 text-orange-700' },
    { name: 'Professional', icon: <Briefcase size={22} strokeWidth={1.5} />, color: 'bg-blue-50 text-blue-700' },
    { name: 'Tourism', icon: <Palmtree size={22} strokeWidth={1.5} />, color: 'bg-cyan-50 text-cyan-700' },
    { name: 'Education', icon: <GraduationCap size={22} strokeWidth={1.5} />, color: 'bg-purple-50 text-purple-700' },
    { name: 'Automotive', icon: <Car size={22} strokeWidth={1.5} />, color: 'bg-red-50 text-red-700' },
    { name: 'Real Estate', icon: <Home size={22} strokeWidth={1.5} />, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
      <div className="min-h-screen bg-white font-normal">
        {/* --- HERO SECTION (Balanced Height) --- */}
        <section className="relative h-[78vh] flex items-center justify-center overflow-hidden bg-green-950">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

          <div className="relative z-10 max-w-5xl px-6 text-center">
          <span className="inline-block px-4 py-1.5 mb-6 text-[11px] tracking-[0.15em] uppercase text-emerald-400 border border-emerald-400/20 rounded-md">
            Sri Lanka Business Index
          </span>

            <h1 className="text-4xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
              Find the best services in <br />
              <span className="text-emerald-400">Sri Lanka</span>
            </h1>

            <p className="text-green-100/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              Explore verified local businesses, clinics, and luxury villas across the island.
            </p>

            {/* Optimized Search Bar */}
            <div className="relative max-w-3xl mx-auto">
              <div className="flex flex-col md:flex-row bg-white rounded-xl shadow-md border border-white/10 p-1.5">
                <div className="flex items-center flex-1 px-5 py-3">
                  <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                  <input
                      type="text"
                      placeholder="Ex: Dentist, Restaurant..."
                      className="w-full outline-none text-gray-700 text-base placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center border-t md:border-t-0 md:border-l border-gray-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-between w-full md:w-48 px-5 py-3 text-gray-600 text-base outline-none">
                        <div className="flex items-center">
                          <MapPin className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                          <span>{selectedLocation}</span>
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto bg-white">
                      {sriLankanDistricts.map((district) => (
                        <DropdownMenuItem key={district} onSelect={() => setSelectedLocation(district)}>
                          {district}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <button className="bg-green-700 hover:bg-green-800 text-white text-base font-medium px-8 py-3 rounded-lg transition-all ml-1">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- CATEGORIES (Balanced Grid) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-14 px-2">
            <h2 className="text-2xl text-gray-800 tracking-tight font-normal">Browse Categories</h2>
            <Link href="/categories" className="text-sm text-green-700 flex items-center hover:underline">
              View All <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 px-2">
            {categories.map((cat, idx) => (
                <div
                    key={idx}
                    className="group cursor-pointer flex flex-col items-center p-6 bg-gray-50/50 border border-transparent rounded-2xl hover:bg-white hover:border-gray-100 hover:shadow-md transition-all duration-300"
                >
                  <div className={`p-4 rounded-full mb-4 ${cat.color} opacity-90 transition-transform group-hover:scale-110`}>
                    {cat.icon}
                  </div>
                  <span className="text-gray-700 text-sm font-normal text-center">{cat.name}</span>
                </div>
            ))}
          </div>
        </section>

        {/* --- LISTINGS (Balanced Card Sizes) --- */}
        <section className="py-24 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-14">
              <h2 className="text-2xl text-gray-800 tracking-tight font-normal">Featured Listings</h2>
              <p className="text-sm text-gray-400 mt-2">Handpicked verified establishments</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-500">
                    <div className="relative h-56 bg-gray-200">
                      <Image
                          src={`/business-${i}.jpg`}
                          alt="Business"
                          fill
                          className="object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="p-7">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg text-gray-800 font-normal">Victoria Luxury Villa</h3>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">4.9 ★</span>
                      </div>
                      <p className="text-[13px] text-gray-500 flex items-center mb-6">
                        <MapPin size={14} className="mr-1.5 opacity-60" /> Nuwara Eliya
                      </p>
                      <button className="text-[13px] text-center w-full py-3 border border-gray-100 text-gray-600 rounded-xl hover:bg-green-700 hover:text-white hover:border-green-700 transition-all font-medium">
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
