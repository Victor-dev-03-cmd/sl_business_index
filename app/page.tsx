'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { categories } from '@/lib/categories';
import {
  Search,
  MapPin,
  ChevronRight,
  ChevronDown,
  Navigation,
  Check,
  LayoutGrid,
  Star
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  "Ampara": { lat: 7.2912, lng: 81.6724 },
  "Anuradhapura": { lat: 8.3122, lng: 80.4131 },
  "Badulla": { lat: 6.9899, lng: 81.0569 },
  "Batticaloa": { lat: 7.7102, lng: 81.6924 },
  "Colombo": { lat: 6.9271, lng: 79.8612 },
  "Galle": { lat: 6.0535, lng: 80.2210 },
  "Gampaha": { lat: 7.0873, lng: 79.9925 },
  "Hambantota": { lat: 6.1429, lng: 81.1212 },
  "Jaffna": { lat: 9.6615, lng: 80.0070 },
  "Kalutara": { lat: 6.5854, lng: 79.9607 },
  "Kandy": { lat: 7.2906, lng: 80.6337 },
  "Kegalle": { lat: 7.2513, lng: 80.3464 },
  "Kilinochchi": { lat: 9.3872, lng: 80.3948 },
  "Kurunegala": { lat: 7.4863, lng: 80.3647 },
  "Mannar": { lat: 8.9810, lng: 79.9044 },
  "Matale": { lat: 7.4675, lng: 80.6234 },
  "Matara": { lat: 5.9496, lng: 80.5469 },
  "Monaragala": { lat: 6.8718, lng: 81.3496 },
  "Mullaitivu": { lat: 9.2671, lng: 80.8144 },
  "Nuwara Eliya": { lat: 6.9697, lng: 80.7672 },
  "Polonnaruwa": { lat: 7.9403, lng: 81.0188 },
  "Puttalam": { lat: 8.0330, lng: 79.8259 },
  "Ratnapura": { lat: 6.6828, lng: 80.3992 },
  "Trincomalee": { lat: 8.5874, lng: 81.2152 },
  "Vavuniya": { lat: 8.7514, lng: 80.4971 }
};

import { SL_TOWNS, Town } from '@/lib/towns';
import TownSelector from '@/components/TownSelector';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'location' | 'nearby' | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const featuredCategories = categories.slice(0, 7);

  const handleUseCurrentLocation = (autoSearch: boolean = false) => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          setUserCoords(coords);
          setSearchMode('nearby');
          setSelectedLocation('Current Location');
          setIsFetchingLocation(false);
          
          if (autoSearch) {
            const finalQuery = [searchQuery, selectedCategory].filter(Boolean).join(' ');
            const params = new URLSearchParams({
              lat: coords.lat.toString(),
              lng: coords.lng.toString(),
              q: finalQuery,
              radius: '5000',
            });
            router.push(`/nearby?${params.toString()}`);
          }
        },
        (err) => {
          console.error("Error getting location: ", err.message);
          alert("Could not get your location. Please grant permission.");
          setIsFetchingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSearch = () => {
    let finalQuery = searchQuery;
    let finalDistrict = selectedLocation;
    let finalCategory = selectedCategory;
    let finalSearchMode = searchMode;

    // --- SMART PARSING ---
    const lowerQuery = searchQuery.toLowerCase();
    let finalLat = '';
    let finalLng = '';

    // 0. Use Selected Town (Highest Priority)
    if (selectedTown) {
      finalLat = selectedTown.lat.toString();
      finalLng = selectedTown.lng.toString();
      finalSearchMode = 'nearby';
    }

    // 1. Detect Town from search string (High Priority)
    if (!finalLat) {
      for (const town of SL_TOWNS) {
        if (lowerQuery.includes(town.name.toLowerCase())) {
          finalLat = town.lat.toString();
          finalLng = town.lng.toString();
          finalSearchMode = 'nearby';
          // Remove town name from query
          finalQuery = finalQuery.replace(new RegExp(town.name, 'gi'), '').trim();
          break;
        }
      }
    }

    // 2. Detect District from search string (if no town found)
    if (!finalLat) {
      for (const district of sriLankanDistricts) {
        if (lowerQuery.includes(district.toLowerCase())) {
          finalDistrict = district;
          finalSearchMode = 'location';
          finalQuery = finalQuery.replace(new RegExp(district, 'gi'), '').trim();
          break;
        }
      }
    }

    // 3. Detect Category from search string (if not already selected)
    if (!finalCategory) {
      for (const cat of categories) {
        const isNameMatch = lowerQuery.includes(cat.name.toLowerCase());
        const isKeywordMatch = cat.keywords?.some(kw => lowerQuery.includes(kw.toLowerCase()));
        
        if (isNameMatch || isKeywordMatch) {
          finalCategory = cat.name;
          break;
        }
      }
    }

    // 4. Default to Current Location if no explicit location found
    if (!finalLat && !finalDistrict && !finalSearchMode) {
      handleUseCurrentLocation(true);
      return;
    }

    const searchParams = new URLSearchParams();
    searchParams.set('q', finalQuery);
    if (finalCategory) searchParams.set('category', finalCategory);

    if (finalLat && finalLng) {
      searchParams.set('lat', finalLat);
      searchParams.set('lng', finalLng);
      searchParams.set('radius', '3000'); // Closer radius for specific towns
    } else if (finalSearchMode === 'nearby' && userCoords) {
      searchParams.set('lat', userCoords.lat.toString());
      searchParams.set('lng', userCoords.lng.toString());
      searchParams.set('radius', '5000');
    } else if (finalDistrict) {
      searchParams.set('district', finalDistrict);
    }

    router.push(`/nearby?${searchParams.toString()}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();
    
    if (searchMode === 'nearby' && userCoords) {
      params.set('lat', userCoords.lat.toString());
      params.set('lng', userCoords.lng.toString());
      params.set('radius', '5000');
    } else if (searchMode === 'location' && selectedLocation) {
      params.set('district', selectedLocation);
    }
    
    params.set('q', categoryName);
    router.push(`/nearby?${params.toString()}`);
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
              Find the best businesses in <br />
              <span className="text-emerald-400">Sri Lanka</span>
            </h1>
            <p className="text-green-100/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              Explore verified local businesses, clinics, and luxury villas across the island.
            </p>

            {/* --- New Search Bar Design --- */}
            <div className="relative max-w-2xl mx-auto space-y-4">
              {/* Main Search Input */}
              <div className="bg-white rounded-md overflow-hidden shadow-lg border border-white/10">
                <div className="flex items-center px-5 py-4 bg-white">
                  <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Service or Business..."
                      className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400"
                  />
                </div>
              </div>

            {/* Location and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                  onClick={() => handleUseCurrentLocation(true)}
                  disabled={isFetchingLocation}
                  className="flex items-center gap-2 w-full sm:w-auto px-5 py-3 text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition-all disabled:opacity-50 text-base rounded"
              >
                <Navigation size={16} className={cn(isFetchingLocation && "animate-pulse")} />
                {isFetchingLocation ? 'Locating...' : 'Search near me'}
              </button>

              <button
                  onClick={handleSearch}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold px-10 py-3 shadow-lg shadow-emerald-900/20 transition-all rounded"
              >
                Search
              </button>
            </div>
            </div>

            {/* Overlay to close category dropdown */}
            {isCategoryOpen && (
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsCategoryOpen(false)} />
            )}
          </div>
        </section>

        {/* --- CATEGORIES (Balanced Grid) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-14 px-2">
            <h2 className="text-2xl text-gray-800 tracking-tight font-normal">Browse Categories</h2>
            <Link href="/categories" className="text-sm text-emerald-700 flex items-center hover:underline font-medium">
              View All <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 px-2">
            {featuredCategories.map((cat, idx) => (
                <div
                    key={idx}
                    onClick={() => handleCategoryClick(cat.name)}
                    className="group cursor-pointer flex flex-col items-center p-6 bg-gray-50/30 border border-gray-50 rounded-2xl hover:bg-white hover:border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-4 rounded-full mb-4 bg-emerald-50 text-emerald-700 opacity-90 transition-transform group-hover:scale-110 group-hover:bg-emerald-100">
                    {cat.icon}
                  </div>
                  <span className="text-gray-700 text-sm font-medium text-center group-hover:text-emerald-700">{cat.name}</span>
                </div>
            ))}
          </div>
        </section>

        {/* --- LISTINGS (4-Column Modern Grid) --- */}
        <section className="py-24 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
              <div>
                <h2 className="text-2xl text-gray-900 tracking-tight font-medium">Featured Listings</h2>
                <p className="text-sm text-gray-500 mt-2">Discover handpicked and verified establishments across Sri Lanka</p>
              </div>
              <Link href="/nearby" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1 group">
                Explore All <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group bg-white rounded-sm overflow-hidden border border-gray-100 hover:border-emerald-600/20 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    {/* Image Section */}
                    <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                      <Image
                          src={`/business-${i}.jpg`}
                          alt="Business"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-3 left-3">
                        <span className="bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-sm shadow-sm">
                          Verified
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-sm shadow-lg text-gray-900">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold">4.9</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="mb-4">
                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest mb-1.5">
                          Hospitality & Leisure
                        </p>
                        <h3 className="text-sm text-gray-900 font-bold group-hover:text-emerald-700 transition-colors line-clamp-1">
                          Victoria Luxury Villa {i}
                        </h3>
                      </div>

                      <div className="flex items-start text-gray-500 mb-6 flex-1">
                        <MapPin size={12} className="mr-2 mt-0.5 flex-shrink-0 text-emerald-600/70" />
                        <p className="text-[11px] leading-relaxed line-clamp-2">
                          No 45, Gregory Lake Road, Nuwara Eliya
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400">#BUSINESS-{2024 + i}</span>
                        <button 
                          onClick={() => router.push('/nearby')}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group/btn"
                        >
                          View Details
                          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
}
