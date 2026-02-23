'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, ArrowLeft, Star, Navigation, Phone, Globe, Menu, X, ChevronDown, Stethoscope, Utensils, Briefcase, Palmtree, GraduationCap, Car, Home, Search } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
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

const categories = [
    { name: 'Medical', icon: <Stethoscope size={16} /> },
    { name: 'Hotel', icon: <Utensils size={16} /> },
    { name: 'Professional', icon: <Briefcase size={16} /> },
    { name: 'Tourism', icon: <Palmtree size={16} /> },
    { name: 'Education', icon: <GraduationCap size={16} /> },
    { name: 'Automotive', icon: <Car size={16} /> },
    { name: 'Real Estate', icon: <Home size={16} /> },
];

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

function SplitScreenResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
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
  const [searchType, setSearchType] = useState<'location' | 'district'>('location');

  useEffect(() => {
    if (lat && lng) {
      setSearchType('location');
      fetchLocationResults();
    } else if (district) {
      setSearchType('district');
      fetchDistrictResults();
    } else {
      setError('No search criteria provided. Please search again from home.');
      setLoading(false);
    }
  }, [lat, lng, district, searchQuery, selectedRadius, selectedCategory]);

  const fetchLocationResults = async () => {
    setLoading(true);
    setError(null);

    if (!lat || !lng) return;

    try {
      const finalQuery = [searchQuery, selectedCategory].filter(Boolean).join(' ');

      const { data, error: rpcError } = await supabase.rpc('get_nearby_businesses', {
        user_lat: parseFloat(lat),
        user_lng: parseFloat(lng),
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

      await enrichWithGoogleDistances(data, parseFloat(lat), parseFloat(lng));
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

    try {
      let query_builder = supabase
        .from('businesses')
        .select('*')
        .ilike('address', `%${district}%`);

      if (searchQuery) {
        query_builder = query_builder.or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      if (selectedCategory) {
        query_builder = query_builder.eq('category', selectedCategory);
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

  const enrichWithGoogleDistances = async (businesses: Business[], userLat: number, userLng: number) => {
    try {
      const destinations = businesses.map(b => ({ lat: b.latitude, lng: b.longitude }));
      
      const response = await fetch('/api/google-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: [{ lat: userLat, lng: userLng }],
          destinations,
        }),
      });

      if (!response.ok) {
        setResults(businesses);
        return;
      }

      const { distances } = await response.json();

      const enriched = businesses.map((business, idx) => ({
        ...business,
        distanceText: distances[idx]?.distanceText || `${((business.latitude || 0) / 1000).toFixed(1)} km`,
      }));

      setResults(enriched);
    } catch (err) {
      console.warn('Error enriching distances:', err);
      setResults(businesses);
    }
  };
  
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(0)} km`;
  };

  const handleDistrictSelect = (district: string) => {
    const params = new URLSearchParams({
      location: district,
      q: searchQuery,
    });
    router.push(`/search?${params.toString()}`);
  };

  const handleSearch = () => {
    if (searchType === 'location') {
      fetchLocationResults();
    } else {
      fetchDistrictResults();
    }
  };

  if (!lat && !lng && !district) {
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

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="flex flex-col h-screen bg-white">
        {/* Top Filter Bar */}
        <div className="h-16 border-b border-gray-200 grid grid-cols-3 items-center px-4 md:px-6 bg-white z-10">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-green-700 hover:text-green-800 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
            <div className="hidden md:flex items-center text-sm text-gray-600">
              <MapPin size={16} className="mr-1.5 text-green-700" />
              <span>Nearby Results</span>
            </div>
          </div>

          {/* Center Section: Search Bar */}
          <div className="flex justify-center">
            <div className="flex items-center w-full max-w-sm px-3 py-2 bg-gray-100 rounded-lg border border-transparent focus-within:bg-white focus-within:border-gray-300">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search within results..."
                className="w-full bg-transparent outline-none text-sm"
              />
              <button onClick={handleSearch} className="p-1 text-gray-500 hover:text-gray-800">
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Right Section: Filters */}
          <div className="flex items-center space-x-2 justify-end">
            {searchType === 'location' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-700">
                    <span>Radius: <span className="font-bold">{formatDistance(selectedRadius)}</span></span>
                    <ChevronDown size={16} className="text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-4 bg-white">
                  <Slider
                    defaultValue={[selectedRadius]}
                    max={50000}
                    min={1000}
                    step={1000}
                    onValueCommit={(value) => setSelectedRadius(value[0])}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-700">
                  <span>{selectedCategory || 'Category'}</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto bg-white">
                <DropdownMenuItem onSelect={() => setSelectedCategory(null)}>All Categories</DropdownMenuItem>
                {categories.map((cat) => (
                  <DropdownMenuItem key={cat.name} onSelect={() => setSelectedCategory(cat.name)}>
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-700">
                  <span>Change District</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto bg-white">
                {sriLankanDistricts.map((district) => (
                  <DropdownMenuItem key={district} onSelect={() => handleDistrictSelect(district)}>
                    {district}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side: Business List */}
          <div
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } md:block w-full md:w-96 lg:w-[450px] overflow-y-auto bg-gray-50 border-r border-gray-200`}
          >
            <div className="p-4 sticky top-0 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                {results.length} Registered Business{results.length !== 1 ? 'es' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block h-6 w-6 border-3 border-green-700 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-600">Finding nearby businesses...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-900 text-sm font-medium">No businesses found</p>
                  <p className="text-blue-700 text-xs mt-1">Try expanding the search radius</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {results.map((business) => (
                  <div
                    key={business.id}
                    onClick={() => {
                      setSelectedBusiness(business);
                      setMobileMenuOpen(false);
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
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {business.name}
                          </h3>
                          {business.rating > 0 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              <span className="font-semibold text-amber-900">{business.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-green-700 font-medium uppercase tracking-wide mt-1">
                          {business.category}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center">
                          <MapPin size={12} className="mr-1 flex-shrink-0" />
                          {business.address}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                          <Navigation size={11} className="text-green-600" />
                          <span className="font-semibold text-gray-700">
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

          {/* Right Side: Map or Empty State for District Search */}
          {searchType === 'location' && (
            <div className="hidden md:flex flex-1 relative bg-gray-100">
              {mapsApiKey ? (
                <APIProvider apiKey={mapsApiKey}>
                  <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={{
                      lat: lat ? parseFloat(lat) : 6.9271,
                      lng: lng ? parseFloat(lng) : 79.8612,
                    }}
                    defaultZoom={14}
                    gestureHandling="greedy"
                    fullscreenControl={true}
                  >
                  {/* User Location Marker */}
                  <AdvancedMarker
                    position={{
                      lat: parseFloat(lat!),
                      lng: parseFloat(lng!),
                    }}
                  >
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                  </AdvancedMarker>

                  {/* Business Markers */}
                  {results.map((business) => (
                    <AdvancedMarker
                      key={business.id}
                      position={{
                        lat: business.latitude,
                        lng: business.longitude,
                      }}
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs cursor-pointer transition-all ${
                          selectedBusiness?.id === business.id
                            ? 'bg-green-700 shadow-lg scale-125'
                            : 'bg-green-600 hover:bg-green-700 shadow-md'
                        }`}
                      >
                        {results.indexOf(business) + 1}
                      </div>
                    </AdvancedMarker>
                  ))}

                  {/* Info Window for Selected Business */}
                  {selectedBusiness && (
                    <InfoWindow
                      position={{
                        lat: selectedBusiness.latitude,
                        lng: selectedBusiness.longitude,
                      }}
                      onCloseClick={() => setSelectedBusiness(null)}
                    >
                      <div className="bg-white p-3 rounded-lg min-w-60 text-sm">
                        <h4 className="font-semibold text-gray-900">{selectedBusiness.name}</h4>
                        <p className="text-xs text-green-700 font-medium mt-1">{selectedBusiness.category}</p>
                        <p className="text-xs text-gray-600 mt-1 flex items-center">
                          <MapPin size={12} className="mr-1" />
                          {selectedBusiness.address}
                        </p>
                        {selectedBusiness.distanceText && (
                          <p className="text-xs text-gray-600 mt-1 flex items-center">
                            <Navigation size={12} className="mr-1 text-green-600" />
                            {selectedBusiness.distanceText}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          {selectedBusiness.phone && (
                            <a
                              href={`tel:${selectedBusiness.phone}`}
                              className="flex-1 text-xs bg-green-700 text-white rounded px-2 py-1 hover:bg-green-800 text-center transition-colors"
                            >
                              Call
                            </a>
                          )}
                          {selectedBusiness.website && (
                            <a
                              href={selectedBusiness.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-xs bg-gray-200 text-gray-900 rounded px-2 py-1 hover:bg-gray-300 text-center transition-colors"
                            >
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>

                {/* Map Status Indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 text-xs text-gray-700">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  Showing {results.length} business{results.length !== 1 ? 'es' : ''} within {(selectedRadius / 1000).toFixed(0)}km
                </div>
                </APIProvider>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <MapPin size={32} className="text-gray-400" />
                  <p className="text-gray-600 font-medium">Map Not Available</p>
                  <p className="text-sm text-gray-500">View locations from the list on the left</p>
                </div>
              )}
            </div>
          )}
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
