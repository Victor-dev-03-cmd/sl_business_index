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
  LayoutGrid
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

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
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
    if (!searchMode) {
      alert("Please select a location or use your current location.");
      return;
    }

    let finalCategory = selectedCategory;
    
    // Auto-detect category from keywords if none selected
    if (!finalCategory && searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchedCat = categories.find(cat => 
        cat.keywords?.some(kw => query.includes(kw.toLowerCase()))
      );
      if (matchedCat) {
        finalCategory = matchedCat.name;
      }
    }

    const finalQuery = [searchQuery, finalCategory].filter(Boolean).join(' ');

    if (searchMode === 'nearby') {
      if (userCoords) {
        const params = new URLSearchParams({
          lat: userCoords.lat.toString(),
          lng: userCoords.lng.toString(),
          q: finalQuery,
          radius: '5000',
        });
        router.push(`/nearby?${params.toString()}`);
      } else {
        // Fallback and auto-search once coords are found
        handleUseCurrentLocation(true);
      }
    } else if (searchMode === 'location' && selectedLocation) {
      const params = new URLSearchParams({
        district: selectedLocation,
        q: finalQuery,
      });
      router.push(`/nearby?${params.toString()}`);
    }
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
            <div className="relative max-w-3xl mx-auto space-y-4">
              {/* Main Search Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 rounded-md overflow-hidden shadow-lg border border-white/10">
                <div className="flex items-center px-5 py-4 bg-white">
                  <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Service or Business..."
                      className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400"
                  />
                </div>

                <div className="relative flex items-center bg-white border-l border-gray-100">
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left outline-none"
                    >
                      <div className="flex items-center overflow-hidden">
                        <span className="text-emerald-600 mr-3">
                          {selectedCategory ? categories.find(c => c.name === selectedCategory)?.icon : <ChevronDown size={20} strokeWidth={1.5} className="text-gray-400" />}
                        </span>
                        <span className={cn("block truncate text-base", !selectedCategory ? "text-gray-400" : "text-gray-700 font-medium")}>
                          {selectedCategory || "All Categories"}
                        </span>
                      </div>
                      <ChevronDown size={16} className={cn("ml-2 text-gray-400 transition-transform duration-200", isCategoryOpen && "rotate-180")} />
                    </button>

                    {isCategoryOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <Command shouldFilter={true}>
                          <CommandInput placeholder="Search categories..." className="h-12 border-none ring-0 focus:ring-0" />
                          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <CommandEmpty className="py-4 text-center text-gray-400 text-sm">No category found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all-categories"
                                onSelect={() => {
                                  setSelectedCategory(null);
                                  setIsCategoryOpen(false);
                                }}
                                className="flex items-center px-5 py-3 hover:bg-emerald-50 cursor-pointer transition-colors"
                              >
                                <span className="text-gray-500 mr-3 opacity-50"><LayoutGrid size={16} /></span>
                                <span className="text-sm font-medium text-gray-700">All Categories</span>
                                {selectedCategory === null && <Check className="ml-auto h-4 w-4 text-emerald-600" />}
                              </CommandItem>
                              {categories.map((category) => (
                                <CommandItem
                                  key={category.name}
                                  value={`${category.name} ${category.keywords?.join(' ')}`}
                                  onSelect={() => {
                                    setSelectedCategory(category.name === selectedCategory ? null : category.name);
                                    setIsCategoryOpen(false);
                                  }}
                                  className="flex items-center px-5 py-3 hover:bg-emerald-50 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center flex-1">
                                    <span className="text-emerald-600 mr-3">{category.icon}</span>
                                    <span className="text-sm font-normal text-gray-700">{category.name}</span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      selectedCategory === category.name ? "opacity-100 text-emerald-600" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-between w-full sm:w-auto px-5 py-3 text-gray-200 text-base outline-none bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded">
                      <MapPin className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                      <span className="whitespace-nowrap">{selectedLocation || 'Select a District'}</span>
                      <ChevronDown size={16} className="text-gray-400 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto bg-white shadow-2xl border-none rounded-xl">
                    {sriLankanDistricts.map((district) => (
                      <DropdownMenuItem key={district} onSelect={() => { setSelectedLocation(district); setSearchMode('location'); }} className="p-3 text-gray-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer">
                        {district}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={() => handleUseCurrentLocation(false)}
                    disabled={isFetchingLocation}
                    className="flex items-center gap-2 w-full sm:w-auto px-5 py-3 text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition-all disabled:opacity-50 text-base rounded"
                >
                  <Navigation size={16} className={cn(isFetchingLocation && "animate-pulse")} />
                  {isFetchingLocation ? 'Locating...' : 'Use current location'}
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
