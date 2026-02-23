'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  Navigation
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'location' | 'nearby' | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const categories = [
    { name: 'Medical', icon: <Stethoscope size={40} strokeWidth={1.5} />, color: 'bg-emerald-50 text-emerald-700' },
    { name: 'Hotel', icon: <Utensils size={40} strokeWidth={1.5} />, color: 'bg-orange-50 text-orange-700' },
    { name: 'Professional', icon: <Briefcase size={40} strokeWidth={1.5} />, color: 'bg-blue-50 text-blue-700' },
    { name: 'Tourism', icon: <Palmtree size={40} strokeWidth={1.5} />, color: 'bg-cyan-50 text-cyan-700' },
    { name: 'Education', icon: <GraduationCap size={40} strokeWidth={1.5} />, color: 'bg-purple-50 text-purple-700' },
    { name: 'Automotive', icon: <Car size={40} strokeWidth={1.5} />, color: 'bg-red-50 text-red-700' },
    { name: 'Real Estate', icon: <Home size={40} strokeWidth={1.5} />, color: 'bg-amber-50 text-amber-700' },
  ];

  const handleUseCurrentLocation = () => {
    setSearchMode('nearby');
    setSelectedLocation('Current Location');
  };

  const handleSearch = () => {
    if (!searchMode) {
      alert("Please select a location or use your current location.");
      return;
    }

    if (searchMode === 'nearby') {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setIsFetchingLocation(false);
          const params = new URLSearchParams({
            lat: latitude.toString(),
            lng: longitude.toString(),
            q: searchQuery,
            radius: '5000',
          });
          router.push(`/nearby?${params.toString()}`);
        },
        (err) => {
          setIsFetchingLocation(false);
          alert("Could not get your location. Please grant permission.");
        }
      );
    } else if (searchMode === 'location' && selectedLocation) {
      const params = new URLSearchParams({
        district: selectedLocation,
        q: searchQuery,
      });
      router.push(`/nearby?${params.toString()}`);
    }
  };

  return (
      <div className="min-h-screen bg-white font-normal">
        {/* --- HERO SECTION --- */}
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

            {/* --- New Search Bar Design --- */}
            <div className="relative max-w-3xl mx-auto space-y-4">
              {/* Main Search Input */}
              <div className="flex items-center flex-1 px-5 py-4 bg-white rounded-md shadow-sm">
                <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What are you looking for? (e.g., Dentist, Restaurant...)"
                    className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400"
                />
              </div>

              {/* Location and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-between w-full sm:w-auto px-5 py-3 text-gray-200 text-base outline-none bg-white/5 hover:bg-white/10 transition-colors rounded">
                      <MapPin className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                      <span className="whitespace-nowrap">{selectedLocation || 'Select a District'}</span>
                      <ChevronDown size={16} className="text-gray-400 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto bg-white">
                    {sriLankanDistricts.map((district) => (
                      <DropdownMenuItem key={district} onSelect={() => { setSelectedLocation(district); setSearchMode('location'); }}>
                        {district}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={handleUseCurrentLocation}
                    disabled={isFetchingLocation}
                    className="flex items-center gap-2 w-full sm:w-auto px-5 py-3 text-gray-200 bg-white/5 hover:bg-white/10 font-medium transition-all disabled:opacity-50 text-base rounded"
                >
                  <Navigation size={16} />
                  {isFetchingLocation ? 'Locating...' : 'Use current location'}
                </button>

                <button
                    onClick={handleSearch}
                    className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white text-base font-bold px-8 py-3 transition-all rounded"
                >
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
