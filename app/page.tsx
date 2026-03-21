'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MorphingText } from '@/components/animate-ui/primitives/texts/morphing';
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
  Tags,
  Building2
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
import { SL_TOWNS, Town } from '@/lib/towns';
import VerifiedBadge from './components/VerifiedBadge';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';


const sriLankanDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

const words = ["businesses", "Enterprises", "Owners"];

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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [businessSuggestions, setBusinessSuggestions] = useState<any[]>([]);
  const [fuzzyBusinessSuggestions, setFuzzyBusinessSuggestions] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

  const { data: featuredBusinesses = [], isLoading: featuredLoading, error: featuredError } = useQuery({
    queryKey: ['featured-businesses-home'],
    queryFn: async () => {
      // Fetch from featured_listings table which references businesses
      const { data, error } = await supabase
        .from('featured_listings')
        .select(`
          business_id,
          businesses (
            id, name, category, address, image_url, logo_url, rating, is_verified, status, can_show_badge
          )
        `)
        .order('order_index', { ascending: true })
        .limit(4);
      
      if (error) {
        console.error('Featured listings fetch error:', error);
        throw error;
      }
      
      // Flatten the data and ensure we only have businesses that actually exist and are approved
      return (data as any[])
        .map(item => item.businesses)
        .filter(b => b && b.status === 'approved') as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    fetch('/srilanka.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data.features || []);
      })
      .catch(err => console.error("Error loading GeoJSON:", err));
  }, []);

  const fuse = React.useMemo(() => new Fuse(geoData, {
    keys: ['properties.name', 'properties.category', 'properties.location', 'properties.address'],
    threshold: 0.3,
    distance: 100,
  }), [geoData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    // 1. Immediate Local Search (GeoJSON)
    if (searchQuery.trim().length > 0) {
      const geoResults = fuse.search(searchQuery).slice(0, 4);
      setSuggestions(geoResults.map(r => r.item));
    } else {
      setSuggestions([]);
    }

    // 2. Database Fetch (Debounced)
    if (debouncedSearchQuery.trim().length > 0) {
      const fetchBusinesses = async () => {
        try {
          if (userCoords) {
            const { data } = await supabase.rpc('get_nearby_businesses', {
              user_lat: userCoords.lat,
              user_lng: userCoords.lng,
              search_query: debouncedSearchQuery,
              dist_limit: 10000 
            });
            if (data) {
              setBusinessSuggestions(data.slice(0, 4));
              const fuse = new Fuse(data, {
                keys: ['name', 'category', 'address'],
                threshold: 0.3,
                distance: 100,
              });
              const fuzzyResults = fuse.search(debouncedSearchQuery).slice(0, 4);
              setFuzzyBusinessSuggestions(fuzzyResults.map(r => r.item));
            }
          } else {
            const { data } = await supabase
              .from('businesses')
              .select('id, name, category, address, image_url, logo_url, rating, latitude, longitude')
              .or(`name.ilike.%${debouncedSearchQuery}%,category.ilike.%${debouncedSearchQuery}%,address.ilike.%${debouncedSearchQuery}%`)
              .eq('status', 'approved')
              .limit(20);
            
            if (data) {
              const fuse = new Fuse(data, {
                keys: ['name', 'category', 'address'],
                threshold: 0.3,
                distance: 100,
              });
              const fuzzyResults = fuse.search(debouncedSearchQuery).slice(0, 4);
              setFuzzyBusinessSuggestions(fuzzyResults.map(r => r.item));
              setBusinessSuggestions(data.slice(0, 4));
            }
          }
        } catch (err) {
          console.error("Error fetching business suggestions:", err);
        }
      };
      fetchBusinesses();
    } else {
      // Auto-show featured businesses when focused but empty
      setBusinessSuggestions(featuredBusinesses.slice(0, 4));
      setFuzzyBusinessSuggestions([]);
    }
  }, [debouncedSearchQuery, searchQuery, fuse, userCoords, featuredBusinesses]);

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
          toast.error("Could not get your location. Please grant permission.");
          setIsFetchingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
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

  const handleSelectPlace = (feature: any) => {
    const { name } = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    
    setSearchQuery(name);
    setSuggestions([]);

    const searchParams = new URLSearchParams();
    searchParams.set('q', name);
    searchParams.set('lat', lat.toString());
    searchParams.set('lng', lng.toString());
    searchParams.set('radius', '5000');
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
          <StarsBackground className="absolute inset-0 z-0" />

          <div className="relative z-10 max-w-5xl px-6 text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-[11px] tracking-[0.15em] uppercase text-brand-sand border border-brand-sand/20 rounded-md">
              Sri Lanka Business Index
            </span>
            <h1 className="text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
              Find the best{' '}
              <span className="inline-block min-w-[120px] md:min-w-[160px] h-[1.2em] overflow-hidden align-bottom text-left">
                <MorphingText
                  text={words}
                  loop
                  holdDelay={3000}
                  className="text-brand-sand"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </span>{' '}
              in <br />
              <span className="text-brand-sand">Sri Lanka</span>
            </h1>
            <p className="text-blue-100/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              Explore verified local businesses, clinics, and luxury villas across the island.
            </p>

            {/* --- New Search Bar Design --- */}
            <div className="relative max-w-2xl mx-auto space-y-4">
              {/* Main Search Input */}
              <div className="bg-white rounded-[6px] shadow-lg border border-gray-300 relative">
                <div className="flex items-center px-5 py-4 bg-white rounded-[6px]">
                  <Search className="text-gray-400 mr-3" size={20} strokeWidth={1.5} />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => {
                        // Delay to allow clicking suggestions
                        setTimeout(() => setIsSearchFocused(false), 200);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Service or Business... (e.g. Hospital in Colombo)"
                      className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400 font-normal"
                  />
                </div>

                {isSearchFocused && (suggestions.length > 0 || businessSuggestions.length > 0 || fuzzyBusinessSuggestions.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-[8px] shadow-2xl z-50 overflow-hidden text-left divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {/* Business Section */}
                    {(fuzzyBusinessSuggestions.length > 0 || businessSuggestions.length > 0) && (
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-3 py-2">
                          {searchQuery.trim() ? "Fuzzy Search for Suggestions" : "Recommended for You"}
                        </p>
                        {(fuzzyBusinessSuggestions.length > 0 ? fuzzyBusinessSuggestions : businessSuggestions).map((biz) => (
                          <button
                            key={biz.id}
                            onClick={() => {
                              router.push(`/business/${biz.id}`);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-[4px]"
                          >
                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                              {biz.logo_url || biz.image_url ? (
                                <img src={biz.logo_url || biz.image_url} alt={biz.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Building2 size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-700 font-semibold truncate">{biz.name}</span>
                              <span className="text-[11px] text-gray-400 truncate">
                                {biz.category} • {biz.address?.split(',').pop()?.trim()}
                              </span>
                            </div>
                            <div className="ml-auto flex items-center gap-1 shrink-0">
                                <Star size={10} className="text-brand-gold fill-brand-gold" />
                                <span className="text-[11px] font-bold text-gray-500">{biz.rating || 'New'}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Location Section */}
                    {suggestions.length > 0 && (
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-3 py-2">Locations</p>
                        {suggestions.map((feature, idx) => (
                          <button
                            key={feature.id || idx}
                            onClick={() => handleSelectPlace(feature)}
                            className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-[4px]"
                          >
                            <MapPin size={16} className="text-brand-dark" />
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700 font-medium">{feature.properties.name}</span>
                              <span className="text-[10px] text-gray-400 leading-tight">
                                {feature.properties.location || feature.properties.city || 'Sri Lanka'}
                              </span>
                            </div>
                            <ChevronRight size={14} className="ml-auto text-gray-300" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* Location and Action Buttons */}
            <div className="flex flex-row items-center justify-center gap-2">
              <button
                  onClick={() => handleUseCurrentLocation(true)}
                  disabled={isFetchingLocation}
                  className="flex items-center gap-2 w-1/2 sm:w-auto px-5 py-3 text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 font-normal transition-all disabled:opacity-50 text-base rounded-[6px]"
              >
                <Navigation size={16} strokeWidth={1.5} className={cn(isFetchingLocation && "animate-pulse")} />
                {isFetchingLocation ? 'Locating...' : 'Near me'}
              </button>

              <button
                  onClick={handleSearch}
                  className="w-1/2 sm:w-auto bg-brand-gold hover:bg-brand-gold-light text-white text-base font-normal px-10 py-3 shadow-lg shadow-brand-gold/20 transition-all rounded-[6px]"
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
                          src={encodeURI(cat.image_url)} 
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
              {featuredLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-[6px] overflow-hidden border border-gray-300 shadow-sm flex flex-col h-full">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 flex flex-col flex-1 space-y-3">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex justify-between pt-4 mt-auto">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                ))
              ) : featuredError ? (
                <div className="col-span-full text-center py-12 text-red-400">
                  <p>Failed to load featured listings. Please refresh.</p>
                </div>
              ) : featuredBusinesses.length > 0 ? (
                featuredBusinesses.map((business) => (
                  <Link 
                    key={business.id} 
                    href={`/business/${business.id}`}
                    className="group bg-white rounded-[6px] overflow-hidden border border-gray-300 hover:border-brand-gold/40 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative"
                  >
                    {/* Image Section */}
                    <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                      {business.image_url ? (
                        <Image
                            src={business.image_url}
                            alt={business.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                          <Building2 size={48} strokeWidth={1} />
                        </div>
                      )}
                      
                      {/* Logo Overlay on Hover */}
                      {business.logo_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px]">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-500">
                            <Image 
                              src={business.logo_url} 
                              alt={`${business.name} logo`}
                              fill
                              className="object-cover bg-white"
                            />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      
                      {(business.is_verified) && business.can_show_badge && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-brand-gold text-white text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-[4px] shadow-lg flex items-center gap-1.5">
                            <VerifiedBadge size={10} /> Verified
                          </span>
                        </div>
                      )}

                      {business.status === 'pending' && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="bg-amber-500 text-white text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-[4px] shadow-lg">
                            Pending
                          </span>
                        </div>
                      )}

                      <div className="absolute bottom-3 right-3 z-10">
                        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-[4px] shadow-lg text-gray-900 border border-white/50">
                          <Star size={12} strokeWidth={2} className="text-brand-gold fill-brand-gold" />
                          <span className="text-[11px] font-bold">{business.rating || 'New'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex flex-col flex-1 font-normal bg-white">
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.15em] mb-2 opacity-80">
                          {business.category}
                        </p>
                        <h3 className="text-base text-gray-900 font-normal group-hover:text-brand-gold transition-colors duration-300 line-clamp-1 leading-tight">
                          {business.name}
                        </h3>
                      </div>

                      <div className="flex items-start text-gray-500 mb-6 flex-1">
                        <MapPin size={14} strokeWidth={1.5} className="mr-2 mt-0.5 flex-shrink-0 text-brand-gold" />
                        <p className="text-[12px] leading-relaxed line-clamp-2 font-normal text-gray-600">
                          {business.address}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <span className="text-[10px] font-normal text-gray-400 font-mono tracking-tighter">ID: {business.id.toString().slice(0, 8)}</span>
                        <div className="text-[11px] font-bold text-brand-dark flex items-center gap-1 group/btn px-3 py-1.5 bg-gray-50 rounded-[4px] group-hover:bg-brand-gold group-hover:text-white transition-all duration-300">
                          Explore
                          <ChevronRight size={14} strokeWidth={2} className="group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <p>No featured businesses yet.</p>
                </div>
              )}
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
