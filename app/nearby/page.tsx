"use client";

import React, {
  useEffect,
  useState,
  Suspense,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import {
  MapPin,
  ArrowLeft,
  Star,
  Navigation,
  Menu,
  X,
  ChevronDown,
  Search,
  Check,
  Clock,
  Zap,
  Tags,
  Building2,
  Map,
  List,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { Business } from "@/lib/types";
import Fuse from "fuse.js";
import { SL_TOWNS, Town } from "@/lib/towns";
import TownSelector from "@/components/TownSelector";
import VerifiedBadge from "@/app/components/VerifiedBadge";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  Ampara: { lat: 7.2912, lng: 81.6724 },
  Anuradhapura: { lat: 8.3122, lng: 80.4131 },
  Badulla: { lat: 6.9899, lng: 81.0569 },
  Batticaloa: { lat: 7.7102, lng: 81.6924 },
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Galle: { lat: 6.0535, lng: 80.221 },
  Gampaha: { lat: 7.0873, lng: 79.9925 },
  Hambantota: { lat: 6.1241, lng: 81.1225 },
  Jaffna: { lat: 9.6615, lng: 80.007 },
  Kalutara: { lat: 6.5854, lng: 79.9607 },
  Kandy: { lat: 7.2906, lng: 80.6337 },
  Kegalle: { lat: 7.2513, lng: 80.3464 },
  Kilinochchi: { lat: 9.3872, lng: 80.3948 },
  Kurunegala: { lat: 7.4863, lng: 80.3647 },
  Mannar: { lat: 8.981, lng: 79.9044 },
  Matale: { lat: 7.4675, lng: 80.6234 },
  Matara: { lat: 5.9496, lng: 80.5469 },
  Monaragala: { lat: 6.8718, lng: 81.3496 },
  Mullaitivu: { lat: 9.2671, lng: 80.8144 },
  "Nuwara Eliya": { lat: 6.9697, lng: 80.7672 },
  Polonnaruwa: { lat: 7.9403, lng: 81.0188 },
  Puttalam: { lat: 8.033, lng: 79.8259 },
  Ratnapura: { lat: 6.6828, lng: 80.3992 },
  Trincomalee: { lat: 8.5874, lng: 81.2152 },
  Vavuniya: { lat: 8.7514, lng: 80.4971 },
};

const CATEGORY_SUBGROUPS: Record<string, { group: string; items: string[] }[]> =
  {
    "Health & Medical": [
      {
        group: "Specialties",
        items: [
          "Anesthesiology",
          "Dermatology",
          "Emergency Medicine",
          "Family Medicine",
          "Internal Medicine",
          "Neurology",
          "OB/GYN",
          "Ophthalmology",
          "Orthopaedic",
          "Pediatrics",
          "Psychiatry",
          "Radiology",
          "Surgery",
        ],
      },
    ],
    "Food & Dining": [
      {
        group: "Cuisines",
        items: [
          "Sri Lankan",
          "Chinese",
          "Indian",
          "Italian",
          "Western",
          "Japanese",
          "Thai",
          "Arabic",
        ],
      },
      {
        group: "Type",
        items: [
          "Fine Dining",
          "Casual Dining",
          "Cafes",
          "Bakeries",
          "Fast Food",
          "Pubs",
          "Pastry Shops",
        ],
      },
    ],
    "Hotels & Accommodation": [
      {
        group: "Accommodation",
        items: [
          "Luxury Hotels",
          "Boutique Hotels",
          "Resorts",
          "Guest Houses",
          "Homestays",
          "Villas",
          "Budget Hotels",
          "Eco Lodges",
        ],
      },
    ],
  };

const CATEGORY_ALIASES: Record<string, string> = {
  "Agriculture Products": "Agriculture, Forestry & Aquaculture",
  Beauty: "Beauty & Health",
  Electronics: "Electronic Peripherals",
  "Home Services": "Home Appliances & Services",
  "Interior Design": "Interior Design Services",
  Pets: "Pet Care",
  Shopping: "Shopping & Retail",
  Travel: "Travel & Transportation",
  Sports: "Sports & Recreation",
  Vehicles: "Vehicles & Automotive",
  Arts: "Arts, Entertainment & Leisure",
  Construction: "Construction Services",
  Embassy: "Embassies & High commission",
  Government: "Government & Services",
  Hotels: "Hotels & Restaurants",
  Media: "Media & Advertising",
  Professional: "Professional Services",
  Baby: "Baby Care",
  Education: "Educational institutes & Services",
  Emergency: "Emergency Services",
  Hardware: "Hardware Equipment",
};

const EMPTY_ARRAY: any[] = [];

function SplitScreenResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Core States
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [radius, setRadius] = useState(() => {
    const r = parseInt(searchParams.get("radius") || "5000");
    return isNaN(r) ? 5000 : r;
  });

  // URL parameters
  const initialLat = searchParams.get("lat");
  const initialLng = searchParams.get("lng");
  const district = searchParams.get("district");

  const [currentLat, setCurrentLat] = useState<string | null>(initialLat);
  const [currentLng, setCurrentLng] = useState<string | null>(initialLng);
  const [mapCenter, setMapCenter] = useState({
    lat: initialLat
      ? parseFloat(initialLat)
      : district && districtCoordinates[district]
        ? districtCoordinates[district].lat
        : 7.8731,
    lng: initialLng
      ? parseFloat(initialLng)
      : district && districtCoordinates[district]
        ? districtCoordinates[district].lng
        : 80.7718,
  });
  const [mapZoom, setMapZoom] = useState(initialLat || district ? 14 : 8);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMapManual, setIsMapManual] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [mobileRadius, setMobileRadius] = useState(radius);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // 2. Core Search Logic (The sync function)
  const handleLocationSearch = useCallback(
    (lat: string, lng: string, rad: number, q: string = searchQuery) => {
      const params = new URLSearchParams(window.location.search);
      params.set("lat", lat);
      params.set("lng", lng);
      params.set("radius", rad.toString());
      if (q) params.set("q", q);
      else params.delete("q");

      // URL Update triggers React Query re-fetch via key change
      router.replace(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      });

      setCurrentLat(lat);
      setCurrentLng(lng);
      setRadius(rad);
    },
    [router, searchQuery],
  );

  // Handle Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // React Query fetch
  const {
    data: businessesData = EMPTY_ARRAY,
    isLoading: loadingBusinesses,
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "nearby-businesses",
      currentLat,
      currentLng,
      radius,
      searchQuery,
    ],
    queryFn: async () => {
      const lat = currentLat ? parseFloat(currentLat) : 7.8731;
      const lng = currentLng ? parseFloat(currentLng) : 80.7718;

      const { data, error } = await supabase.rpc("get_nearby_businesses", {
        user_lat: lat,
        user_lng: lng,
        search_query: searchQuery || "",
        dist_limit: radius,
      });

      if (error) throw error;
      return data.map((b: any) => ({
        ...b,
        id: b.id,
        latitude: b.latitude,
        longitude: b.longitude,
        distanceText:
          b.distance_meters < 1000
            ? `${Math.round(b.distance_meters)} m`
            : `${(b.distance_meters / 1000).toFixed(1)} km`,
      }));
    },
    enabled: !!currentLat && !!currentLng,
    staleTime: 60 * 1000,
  });

  // Fuzzy Search for Suggestions
  const suggestionFuse = useMemo(
    () =>
      new Fuse(businessesData, {
        keys: ["name", "category", "address"],
        threshold: 0.3,
        distance: 100,
      }),
    [businessesData],
  );

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = suggestionFuse
        .search(searchQuery)
        .slice(0, 5)
        .map((r) => r.item);
      // Only update if content changed to avoid render loops
      setSuggestions((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(results)) return prev;
        return results;
      });
    } else if (isSearchFocused) {
      // Auto-show nearby businesses when focused but empty
      const results = businessesData.slice(0, 5);
      setSuggestions((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(results)) return prev;
        return results;
      });
    } else {
      setSuggestions((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
    }
  }, [searchQuery, suggestionFuse, businessesData, isSearchFocused]);

  // 3. UI Helpers
  const findMyLocation = useCallback(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          setMapZoom(14);
          handleLocationSearch(latitude.toString(), longitude.toString(), 5000);
          setLocationLoading(false);
          setIsMapManual(false);
        },
        () => setLocationLoading(false),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, [handleLocationSearch]);

  // Initial Load
  useEffect(() => {
    if (!initialLat && !initialLng && !district) {
      findMyLocation();
    }
  }, [initialLat, initialLng, district, findMyLocation]);

  const formatDistance = (meters: number) => {
    return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(0)} km`;
  };

  const { businesses, isFuzzyResults } = useMemo(() => {
    let filtered = businessesData;
    if (selectedCategory) {
      filtered = filtered.filter((b: any) => b.category === selectedCategory);
    }

    if (!debouncedSearchQuery.trim()) {
      return { businesses: filtered, isFuzzyResults: false };
    }

    const fuse = new Fuse(filtered, {
      keys: ["name", "category", "address"],
      threshold: 0.3,
      distance: 100,
    });

    const results = fuse.search(debouncedSearchQuery);

    if (results.length > 0) {
      return { businesses: results.map((r) => r.item), isFuzzyResults: false };
    }

    // If no good matches, try a broader search (higher threshold)
    const broadFuse = new Fuse(filtered, {
      keys: ["name", "category", "address"],
      threshold: 0.5,
      distance: 100,
    });
    const broadResults = broadFuse.search(debouncedSearchQuery);

    return {
      businesses: broadResults.map((r) => r.item),
      isFuzzyResults: broadResults.length > 0,
    };
  }, [businessesData, selectedCategory, debouncedSearchQuery]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-nearby"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const activeSubgroups = useMemo(() => {
    if (selectedCategory && CATEGORY_SUBGROUPS[selectedCategory])
      return CATEGORY_SUBGROUPS[selectedCategory];
    return [];
  }, [selectedCategory]);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-white font-normal">
      {/* ═══════════════════════════════════════════
          MOBILE TOP BAR  (hidden on md+)
      ═══════════════════════════════════════════ */}
      <div className="flex md:hidden items-center gap-2 px-3 h-14 border-b border-gray-200 bg-white z-20 shrink-0">
        {/* Back */}
        <Link
          href="/"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-brand-dark hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>

        {/* Search bar */}
        <div className="flex-1 relative">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md h-9 px-3 focus-within:bg-white focus-within:border-brand-dark transition-all shadow-sm">
            <Search size={14} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleLocationSearch(
                  currentLat!,
                  currentLng!,
                  radius,
                  searchQuery,
                )
              }
              placeholder="Search businesses near you…"
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 min-w-0"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                }}
                className="shrink-0 ml-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Find-Me */}
        <button
          onClick={findMyLocation}
          className="shrink-0 w-9 h-9 border border-gray-200 rounded-md flex items-center justify-center bg-white hover:bg-gray-50 shadow-sm transition-colors"
        >
          <Navigation
            size={16}
            className={cn(
              "text-brand-dark",
              locationLoading && "animate-pulse",
            )}
          />
        </button>
      </div>

      {/* Mobile — full-screen suggestions overlay */}
      {isSearchFocused && (
        <div className="md:hidden fixed inset-0 top-14 z-[9998] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onMouseDown={() => setIsSearchFocused(false)}
          />
          {/* Panel */}
          <div className="relative bg-white shadow-xl overflow-y-auto max-h-[70vh]">
            {suggestions.length > 0 ? (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-4 pt-4 pb-2">
                  {searchQuery.trim() ? "Best Matches" : "Nearby Businesses"}
                </p>
                <div className="divide-y divide-gray-100">
                  {suggestions.map((biz: any) => (
                    <button
                      key={biz.id}
                      onMouseDown={() => {
                        setSelectedBusiness(biz);
                        setMapCenter({ lat: biz.latitude, lng: biz.longitude });
                        setMapZoom(16);
                        setSearchQuery(biz.name);
                        setIsSearchFocused(false);
                        setMobileView("map");
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-md bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                        {biz.logo_url || biz.image_url ? (
                          <img
                            src={biz.logo_url || biz.image_url}
                            alt={biz.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Building2 size={16} />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {biz.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {biz.category}
                          {biz.address && (
                            <> · {biz.address.split(",").pop()?.trim()}</>
                          )}
                        </p>
                      </div>
                      {/* Distance badge */}
                      {biz.distanceText && (
                        <span className="shrink-0 text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {biz.distanceText}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Search size={28} strokeWidth={1.2} />
                <p className="text-sm">
                  {searchQuery.trim()
                    ? "No matches found"
                    : "Start typing to search…"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile — filter bottom sheet */}
      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl shadow-2xl pb-8">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-base">Filters</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-5 space-y-7 max-h-[60vh] overflow-y-auto">
              {/* Radius */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Search Radius
                  </span>
                  <span className="text-sm font-semibold text-brand-dark bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {formatDistance(mobileRadius)}
                  </span>
                </div>
                <Slider
                  value={[mobileRadius]}
                  max={50000}
                  min={1000}
                  step={1000}
                  onValueChange={(val) => setMobileRadius(val[0])}
                  className="py-2"
                />
                <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <span className="text-sm font-medium text-gray-700 mb-3 block">
                  Category
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border font-medium transition-colors",
                      !selectedCategory
                        ? "bg-brand-dark text-white border-brand-dark"
                        : "text-gray-600 border-gray-300 hover:border-brand-dark",
                    )}
                  >
                    All
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === cat.name ? null : cat.name,
                        )
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border font-medium transition-colors",
                        selectedCategory === cat.name
                          ? "bg-brand-dark text-white border-brand-dark"
                          : "text-gray-600 border-gray-300 hover:border-brand-dark",
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply */}
            <div className="px-5 pt-6">
              <button
                onClick={() => {
                  handleLocationSearch(currentLat!, currentLng!, mobileRadius);
                  setIsMobileFilterOpen(false);
                }}
                className="w-full h-11 bg-brand-dark text-white rounded-md font-semibold text-sm hover:bg-brand-blue transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          DESKTOP TOP BAR  (hidden on mobile)
      ═══════════════════════════════════════════ */}
      <div className="hidden md:flex h-16 border-b border-gray-300 items-center justify-between px-4 bg-white z-10 gap-4 shrink-0">
        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/"
            className="text-brand-dark hover:text-brand-blue transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={16} className="mr-1.5 text-brand-dark" />
            <span>Nearby</span>
          </div>
        </div>

        {/* Desktop search + suggestions */}
        <div className="flex-1 max-w-md relative">
          <div className="flex items-center w-full px-3 bg-gray-50 rounded-[6px] border border-gray-300 focus-within:bg-white focus-within:border-brand-dark h-10 shadow-sm transition-all">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleLocationSearch(
                  currentLat!,
                  currentLng!,
                  radius,
                  searchQuery,
                )
              }
              placeholder="Search businesses..."
              className="w-full bg-transparent outline-none text-sm text-gray-700 font-normal"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                }}
                className="shrink-0 ml-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-[8px] shadow-2xl z-[9999] overflow-hidden text-left max-h-[420px] overflow-y-auto">
              {suggestions.length > 0 ? (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-4 pt-3 pb-2">
                    {searchQuery.trim() ? "Best Matches" : "Nearby Businesses"}
                  </p>
                  <div className="divide-y divide-gray-100 pb-1">
                    {suggestions.map((biz: any) => (
                      <button
                        key={biz.id}
                        onMouseDown={() => {
                          setSelectedBusiness(biz);
                          setMapCenter({
                            lat: biz.latitude,
                            lng: biz.longitude,
                          });
                          setMapZoom(16);
                          setSearchQuery(biz.name);
                        }}
                        className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-md bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                          {biz.logo_url || biz.image_url ? (
                            <img
                              src={biz.logo_url || biz.image_url}
                              alt={biz.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Building2 size={15} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {biz.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {biz.category}
                            {biz.address && (
                              <> · {biz.address.split(",").pop()?.trim()}</>
                            )}
                          </p>
                        </div>
                        {biz.distanceText && (
                          <span className="shrink-0 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                            {biz.distanceText}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Search size={24} strokeWidth={1.2} />
                  <p className="text-xs">
                    {searchQuery.trim()
                      ? "No matches found"
                      : "Start typing to search…"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={findMyLocation}
            className="flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 transition-all shadow-sm"
          >
            <Navigation
              size={14}
              className={cn(
                "text-brand-dark",
                locationLoading && "animate-pulse",
              )}
            />
            <span className="hidden lg:inline text-gray-600">Find Me</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 shadow-sm">
                <span className="text-gray-600">
                  Radius:{" "}
                  <span className="text-brand-dark">
                    {formatDistance(radius)}
                  </span>
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-4 w-64 bg-white shadow-xl border border-gray-300 rounded-[6px] z-[9999]">
              <div className="mb-4 flex justify-between">
                <span className="text-xs text-gray-500 uppercase">
                  Search Radius
                </span>
                <span className="text-xs text-brand-dark bg-blue-50 px-2 py-0.5 rounded">
                  {formatDistance(radius)}
                </span>
              </div>
              <Slider
                value={[radius]}
                max={50000}
                min={1000}
                step={1000}
                onValueChange={(val) => setRadius(val[0])}
                onValueCommit={(val) =>
                  handleLocationSearch(currentLat!, currentLng!, val[0])
                }
                className="py-4"
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 shadow-sm">
                <span className="text-gray-600">
                  {selectedCategory || "All Categories"}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-0 bg-white shadow-2xl border border-gray-200 rounded-[6px] overflow-hidden z-[9999]">
              <Command>
                <CommandInput
                  placeholder="Filter category..."
                  className="h-10 border-none focus:ring-0"
                />
                <CommandList className="max-h-72 overflow-y-auto custom-scrollbar">
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedCategory(null);
                        setIsCategoryOpen(false);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                    >
                      All Categories
                    </CommandItem>
                    {categories.map((cat: any) => (
                      <CommandItem
                        key={cat.id}
                        onSelect={() => {
                          setSelectedCategory(cat.name);
                          setIsCategoryOpen(false);
                        }}
                        className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        {cat.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Business List */}
        <div
          className={`${mobileView === "list" ? "flex" : "hidden"} md:flex flex-col w-full md:w-96 lg:w-[450px] bg-gray-50 border-r border-gray-300 min-h-0 overflow-hidden`}
        >
          <div className="p-4 bg-gray-50 border-b border-gray-300 flex justify-between items-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {isFuzzyResults
                ? "Closest matches"
                : `${businesses.length} Businesses Found`}
            </p>
            {isFetching && (
              <div className="text-[10px] text-brand-blue animate-pulse">
                Updating...
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingBusinesses ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-[6px]" />
              ))
            ) : businesses.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-[6px] border border-gray-200">
                <p className="text-sm text-gray-500">
                  No results in this area.
                </p>
              </div>
            ) : (
              businesses.map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBusiness(b);
                    setMapCenter({ lat: b.latitude, lng: b.longitude });
                    setMapZoom(16);
                  }}
                  className={cn(
                    "p-4 bg-white border border-gray-300 rounded-[6px] cursor-pointer hover:border-brand-dark transition-all flex gap-4",
                    selectedBusiness?.id === b.id && "border-brand-dark",
                  )}
                >
                  <div className="w-16 h-16 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                    {b.logo_url ? (
                      <img
                        src={b.logo_url}
                        alt={`${b.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <Building2 size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {b.name}
                    </h3>
                    <p className="text-xs text-brand-blue uppercase mt-1">
                      {b.category}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <MapPin
                        size={12}
                        className="text-brand-gold flex-shrink-0"
                      />
                      <span className="truncate">{b.address}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-full">
                        {b.distanceText}
                      </span>
                      <Link
                        href={`/business/${b.id}`}
                        className="text-[10px] text-brand-dark font-bold hover:underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div
          className={`${mobileView === "map" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 relative bg-gray-100`}
        >
          <div className="absolute inset-0">
            <LeafletMap
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              userLat={currentLat ? parseFloat(currentLat) : undefined}
              userLng={currentLng ? parseFloat(currentLng) : undefined}
              businesses={businesses.map((b: any) => ({
                type: "Feature",
                id: b.id,
                properties: { ...b },
                geometry: {
                  type: "Point",
                  coordinates: [b.longitude, b.latitude],
                },
              }))}
              zoom={mapZoom}
              height="100%"
              radius={radius}
              onMarkerClick={setSelectedBusiness}
              onMapMove={(lat, lng, zoom) => {
                setMapCenter({ lat, lng });
                setMapZoom(zoom);
                setIsMapManual(true);
              }}
              onMapClick={(lat, lng) => {
                setMapCenter({ lat, lng });
                handleLocationSearch(lat.toString(), lng.toString(), radius);
                setIsMapManual(false);
              }}
              wrapperClassName="h-full w-full overflow-hidden z-0"
            />
          </div>

          {/* Mobile — businesses found pill (map view only) */}
          {mobileView === "map" &&
            !loadingBusinesses &&
            businesses.length > 0 && (
              <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex items-center gap-2.5 bg-white rounded-full shadow-lg border border-gray-200 pl-3 pr-4 py-2.5 active:scale-95 transition-transform"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-dark shrink-0">
                    <List size={13} className="text-white" />
                  </span>
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    {businesses.length}{" "}
                    {businesses.length === 1 ? "business" : "businesses"} found
                  </span>
                  <ArrowRight size={14} className="text-gray-400 shrink-0" />
                </button>
              </div>
            )}

          {isMapManual && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
              <button
                onClick={() => {
                  handleLocationSearch(
                    mapCenter.lat.toString(),
                    mapCenter.lng.toString(),
                    radius,
                  );
                  setIsMapManual(false);
                }}
                className="bg-brand-dark text-white px-6 py-2.5 rounded-full shadow-xl hover:bg-brand-blue transition-all flex items-center gap-2"
              >
                <Search size={18} />
                Search this area
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile — bottom tab bar */}
      <div
        className="md:hidden flex shrink-0 border-t border-gray-200 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => setMobileView("map")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 h-14 transition-colors",
            mobileView === "map" ? "text-brand-dark" : "text-gray-400",
          )}
        >
          <Map size={20} strokeWidth={mobileView === "map" ? 2 : 1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            Map
          </span>
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 h-14 transition-colors",
            mobileView === "list" ? "text-brand-dark" : "text-gray-400",
          )}
        >
          <List size={20} strokeWidth={mobileView === "list" ? 2 : 1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            List
          </span>
        </button>
        <button
          onClick={() => {
            setMobileRadius(radius);
            setIsMobileFilterOpen(true);
          }}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 h-14 transition-colors relative",
            isMobileFilterOpen ? "text-brand-dark" : "text-gray-400",
          )}
        >
          <div className="relative">
            <SlidersHorizontal
              size={20}
              strokeWidth={isMobileFilterOpen ? 2 : 1.5}
            />
            {(selectedCategory || radius !== 5000) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-blue rounded-full border border-white" />
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            Filters
          </span>
        </button>
      </div>
    </div>
  );
}

export default function NearbyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      }
    >
      <SplitScreenResultsContent />
    </Suspense>
  );
}
