'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Navigation,
  Check,
  LayoutGrid,
  Star,
  Phone,
  Clock,
  Tags
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, expandSearchQuery } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

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

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'location' | 'nearby' | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const IconComponent = ({ name, className }: { name: string | null, className?: string }) => {
    if (!name) return <Tags className={className} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : <Tags className={className} />;
  };

  useEffect(() => {
    let animationId: number;
    const scrollStep = 0.3; // Slower speed (was 0.5)

    const autoScroll = () => {
      if (scrollContainerRef.current && !isPaused && !isDragging) {
        const { scrollLeft: sLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        
        // If we reached the end, reset to start or stop (resetting to start for continuous)
        if (sLeft >= scrollWidth - clientWidth - 5) {
          scrollContainerRef.current.scrollLeft = 0;
        } else {
          scrollContainerRef.current.scrollLeft += scrollStep;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    animationId = requestAnimationFrame(autoScroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, isDragging]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

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
    let lowerQuery = searchQuery.toLowerCase().trim();
    let finalLat = '';
    let finalLng = '';
    let extractedTown: Town | null = null;

    // Detect Town from search string (High Priority)
    // We check for "in [town]" or just "[town]"
    for (const town of SL_TOWNS) {
      const townName = town.name.toLowerCase();
      // Match "in Colombo", "at Colombo", or just "Colombo" at the end/start
      const patterns = [
        ` in ${townName}`,
        ` at ${townName}`,
        ` near ${townName}`,
        `${townName} `,
        ` ${townName}`
      ];

      if (lowerQuery === townName) {
        extractedTown = town;
        lowerQuery = '';
        break;
      }

      let found = false;
      for (const pattern of patterns) {
        if (lowerQuery.includes(pattern)) {
          extractedTown = town;
          lowerQuery = lowerQuery.replace(pattern, ' ').trim();
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (extractedTown) {
      finalLat = extractedTown.lat.toString();
      finalLng = extractedTown.lon.toString();
      finalSearchMode = 'nearby';
    }

    // Detect District from search string (if no town found)
    if (!finalLat) {
      for (const district of sriLankanDistricts) {
        const dLower = district.toLowerCase();
        const patterns = [` in ${dLower}`, ` at ${dLower}`, ` near ${dLower}`, `${dLower} `, ` ${dLower}`];
        
        if (lowerQuery === dLower) {
          finalDistrict = district;
          finalSearchMode = 'location';
          lowerQuery = '';
          break;
        }

        let found = false;
        for (const pattern of patterns) {
          if (lowerQuery.includes(pattern)) {
            finalDistrict = district;
            finalSearchMode = 'location';
            lowerQuery = lowerQuery.replace(pattern, ' ').trim();
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // Default to Current Location if no explicit location found and query is not empty
    if (!finalLat && !finalDistrict && !finalSearchMode) {
      if (!userCoords && !searchQuery.trim()) {
        handleUseCurrentLocation(true);
        return;
      }
      // If we have no location but have a query, search near current location if available
      if (userCoords) {
        finalSearchMode = 'nearby';
      }
    }

    const searchParams = new URLSearchParams();
    searchParams.set('q', expandSearchQuery(lowerQuery || searchQuery));
    if (selectedCategory) searchParams.set('category', selectedCategory);

    if (finalLat && finalLng) {
      searchParams.set('lat', finalLat);
      searchParams.set('lng', finalLng);
      searchParams.set('radius', '3000');
    } else if ((finalSearchMode === 'nearby' || (!finalDistrict && userCoords)) && userCoords) {
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
        <section className="relative h-[78vh] flex items-center justify-center overflow-hidden bg-brand-dark">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

          <div className="relative z-10 max-w-5xl px-6 text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-[11px] tracking-[0.15em] uppercase text-brand-sand border border-brand-sand/20 rounded-md">
              Sri Lanka Business Index
            </span>
            <h1 className="text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
              Find the best businesses in <br />
              <span className="text-brand-sand">Sri Lanka</span>
            </h1>
            <p className="text-blue-100/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              Explore verified local businesses, clinics, and luxury villas across the island.
            </p>

            {/* --- New Search Bar Design --- */}
            <div className="relative max-w-2xl mx-auto space-y-4">
              {/* Main Search Input */}
              <div className="bg-white rounded-[6px] overflow-hidden shadow-lg border border-gray-300">
                <div className="flex items-center px-5 py-4 bg-white">
                  <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Service or Business... (e.g. Hospital in Colombo)"
                      className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400 font-normal"
                  />
                </div>
              </div>

            {/* Location and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                  onClick={() => handleUseCurrentLocation(true)}
                  disabled={isFetchingLocation}
                  className="flex items-center gap-2 w-full sm:w-auto px-5 py-3 text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 font-normal transition-all disabled:opacity-50 text-base rounded-[6px]"
              >
                <Navigation size={16} strokeWidth={1.5} className={cn(isFetchingLocation && "animate-pulse")} />
                {isFetchingLocation ? 'Locating...' : 'Search near me'}
              </button>

              <button
                  onClick={handleSearch}
                  className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-light text-white text-base font-normal px-10 py-3 shadow-lg shadow-brand-gold/20 transition-all rounded-[6px]"
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

        {/* --- CATEGORIES (Slider) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
          <div className="flex justify-between items-center mb-10 px-2">
            <h2 className="text-2xl text-gray-800 tracking-tight font-normal">Browse Categories</h2>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 mr-2">
                <button
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >

                </button>
                <button
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                    className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >

                </button>
              </div>
              <Link href="/categories" className="text-sm text-brand-gold flex items-center hover:underline font-normal">
                View All
              </Link>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            onScroll={checkScroll}
            onMouseEnter={() => setIsPaused(true)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={cn(
              "flex gap-6 px-2 overflow-x-auto no-scrollbar pb-8 cursor-grab active:cursor-grabbing select-none",
              isDragging && "cursor-grabbing"
            )}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categoriesLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 md:w-48 flex flex-col items-center p-8 bg-white border border-gray-200 rounded-[12px]">
                  <Skeleton className="w-20 h-20 rounded-full mb-4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : (
              categories.map((cat, idx) => (
                  <div
                      key={cat.id || idx}
                      onClick={() => handleCategoryClick(cat.name)}
                      className="flex-shrink-0 w-44 md:w-48 group cursor-pointer flex flex-col items-center p-8 bg-white border border-gray-200 rounded-[12px] hover:border-brand-gold hover:shadow-xl hover:-translate-y-1 transition-all duration-300 select-none"
                      onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="relative w-20 h-20 mb-4 transition-transform group-hover:scale-110 pointer-events-none flex items-center justify-center">
                      {cat.image_url ? (
                        <Image 
                          src={cat.image_url} 
                          alt={cat.name} 
                          fill 
                          className="object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-brand-gold scale-[2]">
                          <IconComponent name={cat.icon} />
                        </div>
                      )}
                    </div>
                    <span className="text-gray-700 text-[11px] font-medium text-center group-hover:text-brand-gold transition-colors leading-tight line-clamp-2">{cat.name}</span>
                  </div>
              ))
            )}
          </div>
        </section>

        {/* --- LISTINGS (4-Column Modern Grid) --- */}
        <section className="py-24 bg-gray-50/50 border-t border-gray-300">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
              <div>
                <h2 className="text-2xl text-gray-900 tracking-tight font-normal">Featured Listings</h2>
                <p className="text-sm text-gray-500 mt-2 font-normal">Discover handpicked and verified establishments across Sri Lanka</p>
              </div>
              <Link href="/nearby" className="text-sm font-normal text-brand-gold hover:text-brand-gold-light transition-colors flex items-center gap-1 group">
                Explore All <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group bg-white rounded-[6px] overflow-hidden border border-gray-300 hover:border-brand-gold/20 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
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
                        <span className="bg-brand-gold text-white text-[9px] font-normal uppercase tracking-[0.1em] px-2 py-1 rounded-[6px] shadow-sm">
                          Verified
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-[6px] shadow-lg text-gray-900">
                          <Star size={10} strokeWidth={1.5} className="text-brand-gold fill-brand-gold" />
                          <span className="text-[10px] font-normal">4.9</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex flex-col flex-1 font-normal">
                      <div className="mb-4">
                        <p className="text-[10px] font-normal text-brand-blue uppercase tracking-widest mb-1.5">
                          Hospitality & Leisure
                        </p>
                        <h3 className="text-sm text-gray-900 font-normal group-hover:text-brand-gold transition-colors line-clamp-1">
                          Victoria Luxury Villa {i}
                        </h3>
                      </div>

                      <div className="flex items-start text-gray-500 mb-6 flex-1">
                        <MapPin size={12} strokeWidth={1.5} className="mr-2 mt-0.5 flex-shrink-0 text-brand-gold/70" />
                        <p className="text-[11px] leading-relaxed line-clamp-2 font-normal">
                          No 45, Gregory Lake Road, Nuwara Eliya
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-normal text-gray-400">#BUSINESS-{2024 + i}</span>
                        <button 
                          onClick={() => router.push('/nearby')}
                          className="text-[11px] font-normal text-brand-dark hover:text-brand-blue flex items-center gap-1 group/btn"
                        >
                          View Details
                          <ChevronRight size={14} strokeWidth={1.5} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS (Live Discovery) --- */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="text-brand-blue text-[10px] uppercase tracking-[0.2em] mb-4 block">Process</span>
              <h2 className="text-3xl text-gray-900 tracking-tight font-normal">How Live Discovery Works</h2>
              <div className="w-12 h-1 bg-brand-dark mx-auto mt-6 rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative font-normal">
              {/* Animated Connecting Arrows (Desktop Only) */}
              <div className="hidden md:block absolute top-12 left-[33%] -translate-x-1/2 w-24">
                <div className="h-[2px] w-full bg-gray-100 relative overflow-hidden">
                  <motion.div 
                    animate={{ 
                      x: ['-100%', '100%'],
                      opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent"
                  />
                </div>
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                >
                  <ChevronRight size={16} strokeWidth={1.5} className="text-brand-gold" />
                </motion.div>
              </div>

              <div className="hidden md:block absolute top-12 left-[66%] -translate-x-1/2 w-24">
                <div className="h-[2px] w-full bg-gray-100 relative overflow-hidden">
                  <motion.div 
                    animate={{ 
                      x: ['-100%', '100%'],
                      opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "linear",
                      delay: 1
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent"
                  />
                </div>
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                >
                  <ChevronRight size={16} strokeWidth={1.5} className="text-brand-gold" />
                </motion.div>
              </div>

              {/* Step 1 */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center text-center group relative"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                  />
                  <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                    <Navigation size={32} strokeWidth={1.5} />
                    <motion.div 
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                  </div>
                </div>
                <h3 className="text-lg font-normal text-gray-900 mb-4">1. Automatic Detection</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                  We pinpoint your exact spot—whether you're in the heart of Jaffna or a village in Vavuniya—to give you relevant results.
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center text-center group relative"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                  />
                  <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                    <Search size={32} strokeWidth={1.5} />
                    <motion.div 
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                  </div>
                </div>
                <h3 className="text-lg font-normal text-gray-900 mb-4">2. Intelligent Filtering</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                  Our system scans the local database for businesses within your chosen radius.
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center text-center group relative"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                  />
                  <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                    <MapPin size={32} strokeWidth={1.5} />
                    <motion.div 
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                  </div>
                </div>
                <h3 className="text-lg font-normal text-gray-900 mb-4">3. Instant Connection</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                  See the shops on the live map. Check if they are 'Open Now,' view their ratings, and get one-tap directions.
                </p>
              </motion.div>
            </div>

            {/* Final Conversion CTA */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mt-24 p-12 bg-brand-dark rounded-[6px] relative overflow-hidden text-center shadow-2xl"
            >
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
              <motion.div 
                animate={{ 
                  opacity: [0.05, 0.15, 0.05],
                  scale: [1, 1.05, 1] 
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-transparent"
              />
              <div className="relative z-10 font-normal">
                <h3 className="text-3xl text-white mb-6 font-normal">Ready to find something nearby?</h3>
                <p className="text-brand-sand text-base mb-10 max-w-xl mx-auto leading-relaxed">
                  Start your discovery journey now and support verified local businesses in your community across Sri Lanka.
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleUseCurrentLocation(true)}
                  className="bg-white text-black px-10 py-4 rounded-[6px] transition-all shadow-2xl shadow-brand-dark/40 border font-normal"
                >
                  Start Discovery Now
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
  );
}
