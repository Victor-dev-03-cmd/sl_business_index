'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { categories } from '@/lib/categories';
import { MapPin, ArrowLeft, Star, Navigation, Phone, Globe, Menu, X, ChevronDown, Search, Check, Clock, Zap } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, expandSearchQuery } from "@/lib/utils";

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { 
  ssr: false, 
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
});

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
  "Hambantota": { lat: 6.1241, lng: 81.1225 },
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

interface Business {
  id: number;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  reviews_count: number;
  image_url: string;
  latitude: number;
  longitude: number;
  distanceText?: string;
  durationText?: string;
}

import { SL_TOWNS, Town } from '@/lib/towns';
import TownSelector from '@/components/TownSelector';

function SplitScreenResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  let lat = searchParams.get('lat');
  let lng = searchParams.get('lng');
  const district = searchParams.get('district');
  const initialQuery = searchParams.get('q') || '';
  const radius = parseInt(searchParams.get('radius') || '5000');

  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(radius);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchType, setSearchType] = useState<'location' | 'district'>(district ? 'district' : 'location');
  const [currentLat, setCurrentLat] = useState<string | null>(lat);
  const [currentLng, setCurrentLng] = useState<string | null>(lng);
  const [mapCenter, setMapCenter] = useState({ 
    lat: lat ? parseFloat(lat) : (district && districtCoordinates[district] ? districtCoordinates[district].lat : 6.9271), 
    lng: lng ? parseFloat(lng) : (district && districtCoordinates[district] ? districtCoordinates[district].lng : 79.8612) 
  });
  const [mapZoom, setMapZoom] = useState(14);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(district);
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [isMapManual, setIsMapManual] = useState(false);

  // Set initial town if district matches a town name (or just clear it)
  useEffect(() => {
    if (district) {
      const town = SL_TOWNS.find(t => t.name === district);
      if (town) setSelectedTown(town);
    }
  }, [district]);

  useEffect(() => {
    if (district) {
      setSelectedDistrict(district);
      setSearchType('district');
      setCurrentLat(null);
      setCurrentLng(null);
      if (districtCoordinates[district]) {
        setMapCenter(districtCoordinates[district]);
        setMapZoom(11);
      }
    }
  }, [district]);

  useEffect(() => {
    if (searchType === 'district' && selectedDistrict) {
      fetchDistrictResults();
    }
  }, [selectedDistrict, searchQuery, selectedCategory, searchType]);

  useEffect(() => {
    if (searchType === 'location') {
      if (currentLat && currentLng) {
        const newCenter = { lat: parseFloat(currentLat), lng: parseFloat(currentLng) };
        setMapCenter(newCenter);
        setMapZoom(14);
        fetchLocationResults();
      } else if (!lat && !lng && !district) {
        findMyLocation();
      }
    }
  }, [currentLat, currentLng, searchQuery, selectedRadius, selectedCategory, searchType]);

  const fetchLocationResults = async () => {
    setLoading(true);
    setError(null);

    if (!currentLat || !currentLng) return;

    try {
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

      const { data, error: rpcError } = await supabase.rpc('get_nearby_businesses', {
        user_lat: parseFloat(currentLat),
        user_lng: parseFloat(currentLng),
        search_query: finalQuery,
        dist_limit: selectedRadius,
      });

      if (rpcError) {
        setError(`Error: ${rpcError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setResults([]);
        return;
      }

      // Local Haversine calculation instead of Google API
      const enriched = data.map((business: Business) => {
        const dist = calculateHaversineDistance(
          parseFloat(currentLat),
          parseFloat(currentLng),
          business.latitude,
          business.longitude
        );
        return {
          ...business,
          distanceText: `${dist.toFixed(1)} km`,
        };
      });

      setResults(enriched);
    } catch (err) {
      setError('Failed to fetch results.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistrictResults = async () => {
    setLoading(true);
    setError(null);

    const districtToSearch = selectedDistrict || district;
    if (!districtToSearch) {
      setError('Please select a district');
      setLoading(false);
      return;
    }

    try {
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

      let query_builder = supabase
        .from('businesses')
        .select('*')
        .ilike('address', `%${districtToSearch}%`);

      if (searchQuery) {
        query_builder = query_builder.or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      if (finalCategory) {
        query_builder = query_builder.eq('category', finalCategory);
      }

      const { data, error: dbError } = await query_builder;

      if (dbError) {
        setError(`Error: ${dbError.message}`);
        return;
      }

      setResults((data as Business[]) || []);
    } catch (err) {
      setError('Failed to fetch results.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(0)} km`;
  };

  const handleDistrictSelect = (districtName: string) => {
    setSearchType('district');
    setSelectedDistrict(districtName);
    setCurrentLat(null);
    setCurrentLng(null);
    if (districtCoordinates[districtName]) {
      setMapCenter(districtCoordinates[districtName]);
      setMapZoom(11);
    }
    setIsMapManual(false);
  };

  const findMyLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Geolocation success:', latitude, longitude);
          const newCenter = { lat: latitude, lng: longitude };
          setMapCenter(newCenter);
          setMapZoom(15);
          setCurrentLat(latitude.toString());
          setCurrentLng(longitude.toString());
          setSearchType('location');
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please grant permission.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearch = () => {
    setIsMapManual(false);
    
    let finalQuery = searchQuery;
    let finalCategory = selectedCategory;
    let finalDistrict = selectedDistrict;
    let finalLat = currentLat;
    let finalLng = currentLng;
    
    const lowerQuery = searchQuery.toLowerCase();

    // 1. Smart Town Detection (High Priority)
    for (const town of SL_TOWNS) {
      if (lowerQuery.includes(town.name.toLowerCase())) {
        finalLat = town.lat.toString();
        finalLng = town.lng.toString();
        setCurrentLat(finalLat);
        setCurrentLng(finalLng);
        setSearchType('location');
        setSelectedDistrict(null);
        setMapCenter({ lat: town.lat, lng: town.lng });
        setMapZoom(14);
        finalQuery = finalQuery.replace(new RegExp(town.name, 'gi'), '').trim();
        break;
      }
    }

    // 2. Smart District Detection (if no town)
    if (finalLat === currentLat) { // Only if we didn't just find a town
      for (const d of sriLankanDistricts) {
        if (lowerQuery.includes(d.toLowerCase())) {
          finalDistrict = d;
          setSelectedDistrict(d);
          setSearchType('district');
          setCurrentLat(null);
          setCurrentLng(null);
          finalQuery = finalQuery.replace(new RegExp(d, 'gi'), '').trim();
          if (districtCoordinates[d]) {
            setMapCenter(districtCoordinates[d]);
            setMapZoom(11);
          }
          break;
        }
      }
    }

    // 3. Smart Category Detection
    if (!finalCategory) {
      for (const cat of categories) {
        if (lowerQuery.includes(cat.name.toLowerCase()) || cat.keywords?.some(kw => lowerQuery.includes(kw.toLowerCase()))) {
          finalCategory = cat.name;
          setSelectedCategory(cat.name);
          // Don't break if it's one of the overlapping categories, keep looking
          if (!['Hotels & Restaurants', 'Food & Dining'].includes(cat.name)) {
            break;
          }
        }
      }
    }

    setSearchQuery(expandSearchQuery(finalQuery));

    // Trigger Fetch based on updated state
    if (finalLat || (searchType === 'location' && !finalDistrict)) {
      fetchLocationResults();
    } else {
      fetchDistrictResults();
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setCurrentLat(lat.toString());
    setCurrentLng(lng.toString());
    setSearchType('location');
    setIsMapManual(true);
  };

  const handleMarkerDragEnd = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setCurrentLat(lat.toString());
    setCurrentLng(lng.toString());
    setSearchType('location');
    setIsMapManual(true);
  };

  if (!currentLat && !currentLng && !district && error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <Link href="/" className="text-green-700 hover:text-green-800 font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLat && !currentLng && !district && loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 border-3 border-green-700 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
        {/* Top Filter Bar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 bg-white z-10 gap-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link href="/" className="text-green-700 hover:text-green-800 transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
            <div className="hidden md:flex items-center text-sm text-gray-600 font-normal">
              <MapPin size={16} strokeWidth={1.5} className="mr-1.5 text-green-700" />
              <span>Nearby</span>
            </div>
          </div>

          {/* Center Section: Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="flex items-center w-full px-3 bg-gray-50 rounded-lg border border-gray-200 focus-within:bg-white focus-within:border-green-600 h-10 transition-all shadow-sm">
              <Search size={16} strokeWidth={1.5} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search businesses..."
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 font-normal"
              />
            </div>
          </div>

          {/* Right Section: Filters */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={findMyLocation}
              className="flex items-center gap-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-lg px-3 h-10 outline-none focus:ring-1 focus:ring-green-600 transition-all shadow-sm group font-normal"
              title="Find my current location"
            >
              <Navigation size={14} strokeWidth={1.5} className="text-green-700 group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline whitespace-nowrap text-gray-600">Find Me</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-lg px-3 h-10 outline-none focus:ring-1 focus:ring-green-600 transition-all shadow-sm font-normal">
                  <span className="whitespace-nowrap text-gray-600">Radius: <span className="text-green-700 font-normal">{formatDistance(selectedRadius)}</span></span>
                  <ChevronDown size={14} strokeWidth={1.5} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-4 w-64 bg-white shadow-xl border border-gray-100 rounded-xl">
                <div className="mb-4 flex justify-between font-normal">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Search Radius</span>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{formatDistance(selectedRadius)}</span>
                </div>
                <Slider
                  defaultValue={[selectedRadius]}
                  max={50000}
                  min={1000}
                  step={1000}
                  onValueChange={(value) => setSelectedRadius(value[0])}
                  className="py-4"
                />
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative">
              <button 
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="hidden md:flex items-center gap-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-lg px-3 h-10 outline-none focus:ring-1 focus:ring-green-600 transition-all shadow-sm font-normal"
              >
                <span className="whitespace-nowrap text-gray-600">
                  {selectedCategory ? (
                    <div className="flex items-center">
                      <span className="text-green-600 mr-2">{categories.find(c => c.name === selectedCategory)?.icon}</span>
                      {selectedCategory}
                    </div>
                  ) : 'Category'}
                </span>
                <ChevronDown size={14} strokeWidth={1.5} className={cn("text-gray-400 transition-transform duration-200", isCategoryOpen && "rotate-180")} />
              </button>

              {isCategoryOpen && (
                <div className="absolute z-50 right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Search categories..." className="h-10 border-none ring-0 focus:ring-0" />
                    <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <CommandEmpty className="py-4 text-center text-gray-400 text-sm">No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-categories"
                          onSelect={() => {
                            setSelectedCategory(null);
                            setIsCategoryOpen(false);
                          }}
                          className="flex items-center px-4 py-2.5 hover:bg-green-50 cursor-pointer transition-colors"
                        >
                          <span className="text-gray-500 mr-3 opacity-50"><X size={14} /></span>
                          <span className="text-sm font-medium text-gray-700">All Categories</span>
                          {selectedCategory === null && <Check className="ml-auto h-4 w-4 text-green-600" />}
                        </CommandItem>
                        {categories.map((cat) => (
                          <CommandItem
                            key={cat.name}
                            value={`${cat.name} ${cat.keywords?.join(' ')}`}
                            onSelect={() => {
                              setSelectedCategory(cat.name === selectedCategory ? null : cat.name);
                              setIsCategoryOpen(false);
                            }}
                            className="flex items-center px-4 py-2.5 hover:bg-green-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center flex-1">
                              <span className="text-green-600 mr-3">{cat.icon}</span>
                              <span className="text-sm font-normal text-gray-700">{cat.name}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedCategory === cat.name ? "opacity-100 text-green-600" : "opacity-0"
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

            <div className="hidden md:block w-56">
              <TownSelector 
                onSelect={(town) => {
                  setSelectedTown(town);
                  setSelectedDistrict(town.district);
                  setSearchType('location');
                  setCurrentLat(town.lat.toString());
                  setCurrentLng(town.lng.toString());
                  setMapCenter({ lat: town.lat, lng: town.lng });
                  setMapZoom(14);
                  setIsMapManual(false);
                }} 
                selectedTownName={selectedTown?.name || selectedDistrict || undefined}
                placeholder="Select Town or District"
                className="h-10 border-gray-200 text-gray-600 rounded-lg shadow-sm"
                iconClassName="text-green-700"
              />
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors h-10 w-10 flex items-center justify-center border border-gray-200"
            >
              {mobileMenuOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>
          {isCategoryOpen && (
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsCategoryOpen(false)} />
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Quick Actions Sidebar (Hover to Open) */}
          <div className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 group">
            {/* Narrow Bar (Always Visible) */}
            <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-6 h-full shadow-sm">
              <div className="p-2 rounded-lg bg-green-50 text-green-700">
                <Menu size={20} />
              </div>
              <div className="flex flex-col gap-6 mt-4">
                <div className="p-2 text-gray-400 group-hover:text-green-600 transition-colors">
                  <Clock size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-green-600 transition-colors">
                  <Navigation size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-green-600 transition-colors">
                  <Star size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-green-600 transition-colors">
                  <Zap size={20} />
                </div>
              </div>
            </div>

            {/* Expanded Sidebar content on hover */}
            <div className="w-0 group-hover:w-64 overflow-hidden transition-all duration-300 bg-white border-r border-gray-200 shadow-xl flex flex-col h-full">
              <div className="p-6 w-64">
                <h2 className="text-lg font-normal text-gray-900 mb-6">Quick Actions</h2>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setSearchQuery("Open Now");
                      handleSearch();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-gray-700 hover:text-green-700 transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 group-hover/item:bg-green-100 transition-colors">
                      <Clock size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Open Now</p>
                      <p className="text-xs text-gray-500 font-normal">Businesses open right now</p>
                    </div>
                  </button>

                  <button 
                    onClick={findMyLocation}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-gray-700 hover:text-green-700 transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 group-hover/item:bg-green-100 transition-colors">
                      <Navigation size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Nearby Me</p>
                      <p className="text-xs text-gray-500 font-normal">Closest verified businesses</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setSearchQuery("Top Rated");
                      handleSearch();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-gray-700 hover:text-green-700 transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 group-hover/item:bg-green-100 transition-colors">
                      <Star size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Top Rated</p>
                      <p className="text-xs text-gray-500 font-normal">Highly reviewed locations</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setSearchQuery("Verified");
                      handleSearch();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-gray-700 hover:text-green-700 transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 group-hover/item:bg-green-100 transition-colors">
                      <Zap size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Verified Only</p>
                      <p className="text-xs text-gray-500 font-normal">Verified by our team</p>
                    </div>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 font-normal">
                  <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-4 px-3 font-normal">Recent Searches</h3>
                  <div className="space-y-1">
                    {['Hotels', 'Clinics', 'Restaurants'].map(item => (
                      <button 
                        key={item}
                        onClick={() => {
                          setSearchQuery(item);
                          handleSearch();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Left Side: Business List */}
          <div
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } md:block w-full md:w-96 lg:w-[450px] overflow-y-auto bg-gray-50 border-r border-gray-200 ml-0 md:ml-12 transition-all font-normal`}
          >
            <div className="p-4 sticky top-0 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-normal">
                {results.length} Registered Business{results.length !== 1 ? 'es' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 font-normal">
                <div className="text-center">
                  <div className="inline-block h-6 w-6 border-3 border-green-700 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-600">Finding nearby businesses...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 font-normal">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 font-normal">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-900 text-sm font-normal">No businesses found</p>
                  <p className="text-blue-700 text-xs mt-1 font-normal">Try expanding the search radius</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4 font-normal">
                {results.map((business) => (
                  <div
                    key={business.id}
                    onClick={() => {
                      setSelectedBusiness(business);
                      setMobileMenuOpen(false);
                      setMapCenter({ lat: business.latitude, lng: business.longitude });
                      setMapZoom(16);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedBusiness?.id === business.id
                        ? 'bg-green-50 border-green-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex gap-3">
                      {business.image_url && (
                        <div className="w-20 h-20 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          <img
                            src={business.image_url}
                            alt={business.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-normal text-gray-900 truncate">
                            {business.name}
                          </h3>
                          {business.rating > 0 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                              <Star size={12} strokeWidth={1.5} className="text-amber-500 fill-amber-500" />
                              <span className="font-normal text-amber-900">{business.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-green-700 font-normal uppercase tracking-wide mt-1">
                          {business.category}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center font-normal">
                          <MapPin size={12} strokeWidth={1.5} className="mr-1 flex-shrink-0" />
                          {business.address}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-normal">
                          <Navigation size={11} strokeWidth={1.5} className="text-green-600" />
                          <span className="text-gray-700">
                            {business.distanceText || 'Calculating...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Map */}
          <div className="hidden md:flex flex-1 relative bg-gray-100 font-normal">
              <MapboxMap 
                userLat={mapCenter.lat}
                userLng={mapCenter.lng}
                businesses={results}
                zoom={mapZoom}
                height="100%"
                onMapClick={handleMapClick}
                onMarkerDragEnd={handleMarkerDragEnd}
                draggableMarker={true}
              />

              {/* Search this area button (only shows when map is clicked/moved manually) */}
              {isMapManual && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
                  <button 
                    onClick={handleSearch}
                    className="bg-green-700 text-white px-6 py-2.5 rounded-full shadow-2xl hover:bg-green-800 transition-all font-normal flex items-center gap-2 border-2 border-white animate-in zoom-in-95"
                  >
                    <Search size={18} strokeWidth={1.5} />
                    Search this area
                  </button>
                </div>
              )}

              {/* Map Status Indicator */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 text-xs text-gray-700 z-[1000] font-normal">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                Showing {results.length} business{results.length !== 1 ? 'es' : ''} {searchType === 'location' ? `within ${(selectedRadius / 1000).toFixed(0)}km` : `in ${selectedDistrict || district}`}
              </div>
          </div>
        </div>
    </div>
  );
}

export default function NearbyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <SplitScreenResultsContent />
    </Suspense>
  );
}
